import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
const app = express();
app.use(express.json({ limit: '4mb' }));
app.use('/uploads', express.static(uploadsDir));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const LIVE_SYNC_CACHE_TTL_MS = 15 * 60 * 1000;
const liveSyncCache = new Map<string, { expiresAt: number; payload: any }>();
let quotaCooldownUntil = 0;

function parseJsonLoose(rawText: string) {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

function isQuotaError(error: any): boolean {
  const msg = String(error?.message || error || '');
  return (
    error?.status === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.toLowerCase().includes('quota')
  );
}

function formatGeminiError(error: any, fallbackMessage: string): { status: number; message: string } {
  if (isQuotaError(error)) {
    return {
      status: 429,
      message:
        'AI quota limit reached for your current API key. You can review quota details in Settings > Secrets, or continue browsing verified official portals and local records.',
    };
  }
  return {
    status: 500,
    message: fallbackMessage,
  };
}

async function callGeminiWithFallback(
  buildRequest: (model: string) => Parameters<typeof ai.models.generateContent>[0]
) {
  const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: any;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent(buildRequest(model));
      return response;
    } catch (err: any) {
      lastError = err;
      if (isQuotaError(err)) {
        // Brief pause before trying lite fallback model
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw err;
    }
  }
  if (isQuotaError(lastError)) {
    quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
  }
  throw lastError;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyCivicTopic(text: string): {
  departmentGroup: string;
  category: string;
  status: string;
} {
  const lower = text.toLowerCase();
  if (/tax|reappraisal|valuation|budget|levy|auditor|homestead|cauv|sewer|trash bill/.test(lower)) {
    return { departmentGroup: 'Taxes & Spending', category: 'Budget', status: 'Open' };
  }
  if (/school|student|board of education|superintendent|lakeside|aacs/.test(lower)) {
    return { departmentGroup: 'Schools', category: 'School', status: 'Open' };
  }
  if (/road|street|streetlight|paving|traffic|water|pollution|wastewater|drain|park/.test(lower)) {
    return { departmentGroup: 'Streets & Roads', category: 'Proposal', status: 'In Progress' };
  }
  if (/comprehensive plan|zoning|planning|development|permit|housing/.test(lower)) {
    return { departmentGroup: 'Neighborhood & Zoning', category: 'Zoning', status: 'Open' };
  }
  return { departmentGroup: 'Upcoming Votes', category: 'Meeting', status: 'Open' };
}

async function scrapeOfficialPortalLinks(portal: {
  label: string;
  url: string;
  location: string;
  department: string;
}) {
  try {
    const res = await fetch(portal.url, {
      signal: AbortSignal.timeout(5500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CivilsyCivicSync/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      return { ok: false, portal, items: [] as any[] };
    }
    const html = await res.text();
    const rawMatches = [
      ...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
    ];

    const seen = new Set<string>();
    const scored: { score: number; title: string; href: string }[] = [];

    for (const m of rawMatches) {
      let href = (m[1] || '').trim();
      const title = decodeHtmlEntities((m[2] || '').replace(/<[^>]+>/g, ' '));
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue;
      }
      if (title.length < 18 || title.length > 130) continue;
      if (/skip to|cookie|privacy|facebook|twitter|instagram|youtube|staff intranet|login|sign in|translate/i.test(title + href)) {
        continue;
      }

      try {
        href = new URL(href, portal.url).toString();
      } catch {
        continue;
      }
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let score = 0;
      if (/notice|announcement|comprehensive plan|reappraisal|agenda|council|board of education|meeting|2026|2025|budget|tax|streetlight|wastewater|pollution|planning/i.test(title + ' ' + href)) {
        score += 5;
      }
      if (/home|employment|history|time capsule/i.test(title)) {
        score -= 2;
      }
      scored.push({ score, title, href });
    }

    scored.sort((a, b) => b.score - a.score);

    const topItems = scored
      .filter((s) => s.score >= 0)
      .slice(0, 3)
      .map((s) => {
        const meta = classifyCivicTopic(s.title);
        return {
          title: s.title,
          departmentGroup: meta.departmentGroup,
          category: meta.category,
          summary: `Live official posting checked on ${portal.label}: "${s.title}". Open the verified official source link below for full municipal details and schedules.`,
          date: `Checked ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          location: portal.location,
          department: portal.department,
          status: meta.status,
          sourceLabel: portal.label,
          sourceUrl: s.href,
        };
      });

    return { ok: true, portal, items: topItems };
  } catch {
    return { ok: false, portal, items: [] as any[] };
  }
}

async function fetchDirectOfficialUpdates(communityName: string, state: string, portalUrl?: string) {
  const lowerCity = (communityName || 'Ashtabula City').toLowerCase();
  const portals: { label: string; url: string; location: string; department: string }[] = [
    {
      label: 'Ashtabula County Official Portal',
      url: 'https://www.ashtabulacounty.us',
      location: '25 W Jefferson St, Jefferson, OH 44047',
      department: 'Ashtabula County Commissioners',
    },
    {
      label: 'Ashtabula County Auditor',
      url: 'https://auditor.ashtabulacounty.gov',
      location: '25 W Jefferson St, Jefferson, OH 44047',
      department: 'Ashtabula County Auditor',
    },
  ];

  if (lowerCity.includes('ashtabula') && !lowerCity.includes('township') && !lowerCity.includes('county')) {
    portals.unshift(
      {
        label: 'City of Ashtabula Official Portal',
        url: 'https://www.cityofashtabula.com',
        location: '4250 Lake Ave, Ashtabula, OH 44004',
        department: 'City of Ashtabula',
      },
      {
        label: 'Ashtabula Area City Schools',
        url: 'https://www.aacs.net',
        location: '541 W 34th St, Ashtabula, OH 44004',
        department: 'Ashtabula Area City Schools',
      }
    );
  } else if (portalUrl && !portalUrl.includes('ashtabulacounty.us')) {
    portals.unshift({
      label: `${communityName} Official Portal`,
      url: portalUrl,
      location: `${communityName}, Ashtabula County, OH`,
      department: communityName,
    });
  } else {
    portals.push({
      label: 'City of Ashtabula Official Portal',
      url: 'https://www.cityofashtabula.com',
      location: '4250 Lake Ave, Ashtabula, OH 44004',
      department: 'City of Ashtabula',
    });
  }

  const results = await Promise.all(portals.map(scrapeOfficialPortalLinks));
  const reachablePortals = results.filter((r) => r.ok);
  const updates = reachablePortals.flatMap((r) => r.items).slice(0, 6).map((item, idx) => ({
    id: `live-${idx + 1}`,
    ...item,
  }));

  const groundedSources = (reachablePortals.length > 0 ? reachablePortals : results).map((r) => ({
    title: r.portal.label,
    url: r.portal.url,
  }));

  const verificationSummary =
    updates.length > 0
      ? `Checked ${reachablePortals.length} live official portal${reachablePortals.length === 1 ? '' : 's'} directly (${reachablePortals.map((r) => r.portal.label).join(', ')}).`
      : `Connected to official directory portals for ${communityName}, ${state}. Follow the verified portal links below for live municipal agendas.`;

  return {
    updates,
    verificationSummary,
    groundedSources,
    syncedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

// IP-Based Location Detection for Ashtabula County (falls back cleanly to Ashtabula City)
const ZIP_TO_COMMUNITY_ID: Record<string, string> = {
  '44004': 'ashtabula-oh',
  '44005': 'ashtabula-oh',
  '44030': 'conneaut-oh',
  '44041': 'geneva-oh',
  '44047': 'jefferson-village-oh',
  '44003': 'andover-village-oh',
  '44076': 'orwell-village-oh',
  '44068': 'north-kingsville-oh',
  '44084': 'rock-creek-oh',
  '44010': 'austinburg-twp-oh',
  '44048': 'kingsville-twp-oh',
  '44032': 'dorset-twp-oh',
  '44082': 'pierpont-twp-oh',
  '44085': 'rome-twp-oh',
  '44093': 'williamsfield-twp-oh',
  '44099': 'windsor-twp-oh',
};

const CITY_NAME_TO_COMMUNITY_ID: Record<string, string> = {
  ashtabula: 'ashtabula-oh',
  conneaut: 'conneaut-oh',
  geneva: 'geneva-oh',
  'geneva-on-the-lake': 'geneva-on-the-lake-oh',
  jefferson: 'jefferson-village-oh',
  'north kingsville': 'north-kingsville-oh',
  andover: 'andover-village-oh',
  orwell: 'orwell-village-oh',
  'roaming shores': 'roaming-shores-oh',
  'rock creek': 'rock-creek-oh',
  saybrook: 'saybrook-twp-oh',
  austinburg: 'austinburg-twp-oh',
  kingsville: 'kingsville-twp-oh',
  dorset: 'dorset-twp-oh',
  pierpont: 'pierpont-twp-oh',
  rome: 'rome-twp-oh',
  williamsfield: 'williamsfield-twp-oh',
  windsor: 'windsor-twp-oh',
};

app.get('/api/location/detect', async (req, res) => {
  const defaultResponse = {
    communityId: 'ashtabula-oh',
    detectedLabel: 'Ashtabula City',
    source: 'default',
  };

  try {
    const forwarded = String(req.headers['x-forwarded-for'] || '');
    const clientIp = (forwarded.split(',')[0] || req.socket.remoteAddress || '').trim();
    const isPrivateIp =
      !clientIp ||
      clientIp === '::1' ||
      clientIp.startsWith('127.') ||
      clientIp.startsWith('10.') ||
      clientIp.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(clientIp);

    if (isPrivateIp) {
      return res.json(defaultResponse);
    }

    const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!geoRes.ok) {
      return res.json(defaultResponse);
    }
    const geo: any = await geoRes.json();
    if (!geo || geo.success === false) {
      return res.json(defaultResponse);
    }

    const postal = String(geo.postal || '').trim();
    const cityLower = String(geo.city || '').trim().toLowerCase();

    if (ZIP_TO_COMMUNITY_ID[postal]) {
      return res.json({
        communityId: ZIP_TO_COMMUNITY_ID[postal],
        detectedLabel: `${geo.city || 'Ashtabula County'}, ${geo.region_code || 'OH'}`,
        source: 'ip',
      });
    }
    if (CITY_NAME_TO_COMMUNITY_ID[cityLower]) {
      return res.json({
        communityId: CITY_NAME_TO_COMMUNITY_ID[cityLower],
        detectedLabel: `${geo.city}, ${geo.region_code || 'OH'}`,
        source: 'ip',
      });
    }
    return res.json(defaultResponse);
  } catch {
    return res.json(defaultResponse);
  }
});

function validateImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;
  if (ext === 'jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (ext === 'png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (ext === 'webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

async function screenUploadedImage(
  base64Data: string,
  mimeType: string,
  contextHint = ''
): Promise<{
  decision: 'approve' | 'flag' | 'block';
  reason: string;
  categories: string[];
}> {
  if (!apiKey || Date.now() < quotaCooldownUntil) {
    return {
      decision: 'flag',
      reason: 'Held for quick moderator visual check before appearing in the public feed.',
      categories: ['pending_review'],
    };
  }

  try {
    const response = await callGeminiWithFallback((model) => ({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `You are the non-partisan community safety and privacy moderator for CIVILSY, a neighborhood 311 issue tracker in Ashtabula County, Ohio.
Evaluate this uploaded photo${contextHint ? ` (submitted context: "${contextHint}")` : ''}.

Rules:
- APPROVE ("approve"): Clearly shows outdoor neighborhood, road, sidewalk, streetlight, drainage, park/tree, signage, building maintenance, or trash/property context with no safety violations or exposed sensitive personal information.
- FLAG ("flag"): Borderline or unclear image, contains clearly recognizable faces/children, clearly readable license plates or personal mail/packages, or off-topic meme/selfie that needs a human moderator check before public display.
- BLOCK ("block"): Explicit nudity or sexual content, graphic violence or gore, hate symbols/slurs, threats, harassment, or sensitive documents (SSNs, IDs, bank cards).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: {
              type: Type.STRING,
              description: 'Must be exactly one of: approve, flag, block',
            },
            reason: {
              type: Type.STRING,
              description: 'Short plain-English explanation for the resident or moderator.',
            },
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['decision', 'reason', 'categories'],
        },
      },
    }));

    const raw = response.text;
    if (!raw) throw new Error('Empty image moderation response');
    const parsed = parseJsonLoose(raw);
    const decision =
      parsed.decision === 'approve' || parsed.decision === 'block' || parsed.decision === 'flag'
        ? parsed.decision
        : 'flag';
    return {
      decision,
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim().slice(0, 220)
          : 'Screened for neighborhood 311 safety.',
      categories: Array.isArray(parsed.categories) ? parsed.categories : ['screened'],
    };
  } catch (err: any) {
    if (!isQuotaError(err)) {
      console.warn('Image moderation fallback:', err?.message);
    }
    return {
      decision: 'flag',
      reason: 'Held for quick human moderator visual check before public display.',
      categories: ['pending_review'],
    };
  }
}

// Standalone Image Moderation Endpoint
app.post('/api/moderation/check-image', async (req, res) => {
  try {
    const { dataUrl, contextHint = '' } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Image data is required.' });
    }
    const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Please provide a valid JPEG, PNG, or WebP photo.' });
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 2 * 1024 * 1024 || !validateImageMagicBytes(buffer, ext)) {
      return res.status(400).json({ error: 'Invalid or oversized image file.' });
    }
    const result = await screenUploadedImage(match[2], mimeType, String(contextHint).slice(0, 180));
    return res.json(result);
  } catch (err: any) {
    console.error('Image moderation endpoint error:', err);
    return res.json({
      decision: 'flag',
      reason: 'Held for quick human moderator review.',
      categories: ['pending_review'],
    });
  }
});

// Validated & Moderated 311 Issue Photo Upload Endpoint
app.post('/api/uploads/report-photo', async (req, res) => {
  try {
    const { dataUrl, category = '', description = '' } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Image data is required.' });
    }
    const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Please upload a valid JPEG, PNG, or WebP photo.' });
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Photo must be under 2 MB.' });
    }
    if (!validateImageMagicBytes(buffer, ext)) {
      return res.status(400).json({ error: 'Uploaded file does not match a valid image signature.' });
    }

    const contextHint = [category, description].filter(Boolean).join(' — ').slice(0, 200);
    const mod = await screenUploadedImage(match[2], mimeType, contextHint);

    if (mod.decision === 'block') {
      return res.json({
        decision: 'block',
        moderationStatus: 'removed',
        reason:
          mod.reason ||
          'Photo blocked: please upload only safe, non-sensitive neighborhood issue photos.',
      });
    }

    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `311-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    return res.json({
      photoUrl: `/uploads/${filename}`,
      decision: mod.decision,
      moderationStatus: mod.decision === 'approve' ? 'approved' : 'pending_review',
      reason: mod.reason,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Could not save report photo.' });
  }
});

function buildFallbackAiAsk(question: string, contextCommunity?: string) {
  const q = (question || '').toLowerCase();
  const community = contextCommunity || 'Ashtabula City, Ohio';

  if (/tax|reappraisal|valuation|millage|levy|auditor|homestead/.test(q)) {
    return {
      intentType: 'taxes_budget',
      summary: `Property taxes in ${community} are calculated on 35% of your county-appraised market value across your school district, Ashtabula County, and local municipal or township levies. Under Ohio HB 920, voted levy rates adjust downward when valuations rise so tax bills do not automatically double.`,
      whoIsResponsible: 'Ashtabula County Auditor Scott Yamamoto & Local Taxing Districts',
      officeContact: '25 W Jefferson St, Jefferson, OH 44047 · (440) 576-3783 · auditor.ashtabulacounty.gov',
      whyItHappens:
        'Countywide reappraisals happen every 6 years (with 3-year updates), while local school, township, and municipal levies set the effective millage.',
      actionableSteps: [
        'Use the Taxes & Spending estimator tab to see your 35% assessed value and local split.',
        'Check the On My Ballot & Levies section to see exact dollar impact per $100k of home value.',
        'Verify Homestead or Owner-Occupancy credits with the County Auditor at (440) 576-3783.',
        'File a Board of Revision valuation review between January 1 and March 31 if market value looks off.',
      ],
      recommendedTab: 'budget',
      recommendedActionLabel: 'Open Taxes & Ballot Levies',
    };
  }

  if (/school|student|bus|board of education|aacs|lakeside|buckeye|geneva area|grand valley|pymatuning/.test(q)) {
    return {
      intentType: 'school',
      summary: `Public schools in ${community} are governed by an independent elected Board of Education rather than City Council or Township Trustees. Agendas, permanent improvement budgets, and bus routing updates are reviewed at monthly public school board sessions.`,
      whoIsResponsible: 'Local Board of Education & District Superintendent',
      officeContact: 'Ashtabula Area City Schools: 541 W 34th St · (440) 992-1201 · board.members@aacs.net',
      whyItHappens:
        'Ohio separates municipal/township government from school districts so boards focus directly on classrooms, facilities, and school levies.',
      actionableSteps: [
        'Inspect upcoming School Board meetings and vote recaps on Civilsy Home.',
        'Check your district’s levy impact under Taxes & Spending > On My Ballot & Levies.',
        'Draft a constituent message directly to the School Board under Officials.',
      ],
      recommendedTab: 'officials',
      recommendedActionLabel: 'Contact School Officials',
    };
  }

  if (/streetlight|light|pothole|road|street|paving|drain|flood|water|tree|park|trash|dumping|sidewalk|sign/.test(q)) {
    return {
      intentType: 'road_issue',
      summary: `Street, drainage, park, and safety maintenance in ${community} depends on road ownership: local streets go to City/Village Public Works, township roads go to Township Trustees & the County Engineer, and US-20/SR-11/SR-531 go to ODOT District 4. Standard pole streetlights are often serviced with FirstEnergy / The Illuminating Company.`,
      whoIsResponsible: `${community} Public Works / Township Trustees & Ashtabula County Engineer`,
      officeContact: 'Log directly in Civilsy Report 311 or call County Engineer at (440) 576-3700',
      whyItHappens:
        'Lake-effect freeze-thaw cycles and coastal storms create recurring pavement, catch-basin, and tree-limb work orders across Ashtabula County.',
      actionableSteps: [
        'Check the Neighborhood Issue Map to upvote an existing 311 ticket near you.',
        'Submit a new 311 issue with a quick photo and exact cross-streets.',
        'Track crew dispatch through the 4-step tracker up to Neighborhood Wins.',
      ],
      recommendedTab: 'fix',
      recommendedActionLabel: 'Open Report 311',
    };
  }

  if (/meeting|council|trustee|vote|ordinance|agenda|commissioner|volunteer|board/.test(q)) {
    return {
      intentType: 'meeting_vote',
      summary: `In ${community}, legislative decisions and ordinances are voted on in open public meetings—typically 1st & 3rd Mondays at 6:00 PM for Ashtabula City Council, Tuesdays/Thursdays at 9:30 AM for County Commissioners, or scheduled evenings for Township Trustees.`,
      whoIsResponsible: `${community} Council / Trustees & Ashtabula County Commissioners`,
      officeContact: 'Ashtabula Council Clerk Stacy L. Millberg · (440) 992-7119 · 4230 Lake Ave',
      whyItHappens:
        'Ohio Open Meetings law requires agendas, readings, and votes to take place in public sessions with opportunity for resident input.',
      actionableSteps: [
        'Download the next meeting directly with 1-tap Add to Calendar (.ics).',
        'Share your quick non-binding Resident Pulse on Before-the-Vote proposals.',
        'Read 2-Minute Meeting Recaps to see how each member voted on recent motions.',
      ],
      recommendedTab: 'discover',
      recommendedActionLabel: 'See Upcoming Votes & Recaps',
    };
  }

  return {
    intentType: 'general',
    summary: `Civilsy connects ${community} residents directly to the right local city, village, township, county, or school office. Browse live meeting schedules, report neighborhood issues in 311, or compare local tax rates across all 38 Ashtabula County jurisdictions.`,
    whoIsResponsible: `${community} Municipal / Township Hall & Ashtabula County Offices`,
    officeContact: 'County Courthouse: 25 W Jefferson St, Jefferson, OH · (440) 576-3750',
    whyItHappens:
      'Local services in Ohio are shared among Cities/Villages, Townships, School Districts, and County offices depending on the service type.',
    actionableSteps: [
      'Explore Officials & Open Boards to message the exact person or volunteer seat.',
      'Open Report 311 to submit any non-emergency neighborhood concern with a photo.',
      'Check Taxes & Spending to estimate property taxes and compare county communities.',
    ],
    recommendedTab: 'officials',
    recommendedActionLabel: 'Browse Local Officials',
  };
}

function buildFallbackTranslateDoc(documentTitle: string, documentText: string) {
  const sentences = (documentText || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    plainEnglishTitle: `${documentTitle} (Plain-English Summary)`,
    tldr:
      sentences[0] ||
      `This local notice covers "${documentTitle}" and outlines planned public work, schedule, and taxpayer considerations.`,
    keyTakeaways: [
      sentences[0] || 'Outlines the core local decision or infrastructure scope.',
      sentences[1] || 'Public input can be submitted before final board or council action.',
      'Funding and implementation schedules are reviewed in open Ashtabula County public sessions.',
    ],
    financialImpact:
      sentences.find((s) => /cost|tax|levy|fund|grant|budget|mill/i.test(s)) ||
      'Review the Cost & Tax Impact line in the Decision Summary panel and verify exact parcel impact in Taxes & Spending.',
    prosAndCons: {
      pros: [
        'Addresses documented neighborhood infrastructure, safety, or public service priorities.',
        'Moves through open public hearings where residents can ask questions before final votes.',
      ],
      cons: [
        'May involve temporary construction detours or multi-year budget tradeoffs.',
        'Exact timelines and phase boundaries should be confirmed on the official agenda.',
      ],
    },
    recommendedAction:
      'Share your Resident Pulse above or save this item to your Action Queue and download the meeting reminder (.ics).',
  };
}

function buildFallbackGenerateEmail(
  officialName: string,
  officialTitle: string,
  topic: string,
  userStance: string,
  userMessage: string
) {
  return {
    subject: `${userStance || 'Resident Input'}: ${topic}`,
    salutation: `Dear ${officialTitle ? `${officialTitle} ` : ''}${officialName || 'Official'},`,
    body: `I am a local resident writing regarding ${topic}. My position on this matter is: ${userStance || 'Constituent Input'}.\n\n${
      userMessage ||
      'I would appreciate an update on how this issue is being prioritized and when residents can share additional feedback.'
    }\n\nThank you for your public service and for taking constituent feedback into account ahead of upcoming decisions.`,
    signoff: 'Sincerely,\n[Your Name]\n[Your Street / Neighborhood]',
  };
}

app.post('/api/ai/ask', async (req, res) => {
  const { question = '', contextCommunity = 'Ashtabula City, Ohio' } = req.body || {};
  if (!apiKey || Date.now() < quotaCooldownUntil) {
    return res.json(buildFallbackAiAsk(question, contextCommunity));
  }
  try {
    const response = await callGeminiWithFallback((model) => ({
      model,
      contents: `You are Civilsy Civic Guide for ${contextCommunity || 'Ashtabula, Ohio'}. Answer the resident's question accurately in plain English without political bias, identifying the exact local office responsible (e.g., City of Ashtabula Public Works at 4250 Lake Ave, Ashtabula County Auditor at 25 W Jefferson St, Ashtabula Area City Schools at 541 W 34th St, or ODOT District 4 for state routes).

Resident question: "${question}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intentType: {
              type: Type.STRING,
              description: 'One of: road_issue, taxes_budget, meeting_vote, school, zoning, general',
            },
            summary: {
              type: Type.STRING,
              description: 'A clear 2-sentence plain English direct answer.',
            },
            whoIsResponsible: {
              type: Type.STRING,
              description: 'Exact government body, department, or official in charge.',
            },
            officeContact: {
              type: Type.STRING,
              description: 'Address, phone number, or official website reference.',
            },
            whyItHappens: {
              type: Type.STRING,
              description: 'Plain-English background or cause.',
            },
            actionableSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 concrete steps the resident can take right now.',
            },
            recommendedTab: {
              type: Type.STRING,
              description: 'Best matching section in Civilsy: fix, budget, officials, discover, or academy',
            },
            recommendedActionLabel: {
              type: Type.STRING,
              description: 'Short button label like "Report an Issue" or "Open Tax Estimator"',
            },
          },
          required: [
            'intentType',
            'summary',
            'whoIsResponsible',
            'officeContact',
            'whyItHappens',
            'actionableSteps',
            'recommendedTab',
            'recommendedActionLabel',
          ],
        },
      },
    }));

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    return res.json(parseJsonLoose(text));
  } catch (error: any) {
    if (!isQuotaError(error)) console.warn('AI Ask fallback activated:', error?.message);
    return res.json(buildFallbackAiAsk(question, contextCommunity));
  }
});

app.post('/api/ai/translate-doc', async (req, res) => {
  const { documentTitle = 'Local Proposal', documentText = '' } = req.body || {};
  if (!apiKey || Date.now() < quotaCooldownUntil) {
    return res.json(buildFallbackTranslateDoc(documentTitle, documentText));
  }
  try {
    const response = await callGeminiWithFallback((model) => ({
      model,
      contents: `Translate the following municipal proposal or official document ("${documentTitle}") into crystal-clear, neutral plain English for local residents.

Document Text:
${documentText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plainEnglishTitle: { type: Type.STRING },
            tldr: { type: Type.STRING },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            financialImpact: { type: Type.STRING },
            prosAndCons: {
              type: Type.OBJECT,
              properties: {
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['pros', 'cons'],
            },
            recommendedAction: { type: Type.STRING },
          },
          required: [
            'plainEnglishTitle',
            'tldr',
            'keyTakeaways',
            'financialImpact',
            'prosAndCons',
            'recommendedAction',
          ],
        },
      },
    }));

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return res.json(parseJsonLoose(text));
  } catch (error: any) {
    if (!isQuotaError(error)) console.warn('Translate doc fallback activated:', error?.message);
    return res.json(buildFallbackTranslateDoc(documentTitle, documentText));
  }
});

app.post('/api/ai/generate-email', async (req, res) => {
  const {
    officialName = 'Local Official',
    officialTitle = '',
    topic = 'Community Inquiry',
    userStance = 'Constituent Input',
    userMessage = '',
  } = req.body || {};
  if (!apiKey || Date.now() < quotaCooldownUntil) {
    return res.json(
      buildFallbackGenerateEmail(officialName, officialTitle, topic, userStance, userMessage)
    );
  }
  try {
    const response = await callGeminiWithFallback((model) => ({
      model,
      contents: `Draft a respectful, concise, and persuasive constituent email to a local elected or appointed official.
Official Name: ${officialName} (${officialTitle})
Topic: ${topic}
Constituent Stance: ${userStance}
Key points from constituent: ${userMessage}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            salutation: { type: Type.STRING },
            body: { type: Type.STRING },
            signoff: { type: Type.STRING },
          },
          required: ['subject', 'salutation', 'body', 'signoff'],
        },
      },
    }));

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return res.json(parseJsonLoose(text));
  } catch (error: any) {
    if (!isQuotaError(error)) console.warn('Generate email fallback activated:', error?.message);
    return res.json(
      buildFallbackGenerateEmail(officialName, officialTitle, topic, userStance, userMessage)
    );
  }
});

// Live Official Source Grounding Sync (with Direct Official Portal Fallback + 15-min Cache)
app.post('/api/civic/live-sync', async (req, res) => {
  const { communityName = 'Ashtabula', state = 'Ohio', portalUrl } = req.body || {};
  const cacheKey = `${communityName.toLowerCase()}-${state.toLowerCase()}`;
  const cached = liveSyncCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.payload);
  }

  const cityLabel = `${communityName}, ${state}`;

  // Try Gemini Search Grounding when API key exists and quota is not in cooldown
  if (apiKey && Date.now() > quotaCooldownUntil) {
    try {
      const response = await callGeminiWithFallback((model) => ({
        model,
        contents: `Search official municipal, city council, public works, school district, and county auditor sources for ${cityLabel} (including ${portalUrl || 'cityofashtabula.com'}) for the most recent public notices, city council agendas, infrastructure/street projects, property tax/revaluation updates, and upcoming public meetings.

Return strictly a valid JSON object (no markdown fences) matching this structure:
{
  "updates": [
    {
      "id": "live-1",
      "title": "Short factual headline from official source",
      "departmentGroup": "One of: Streets & Roads | Taxes & Spending | Schools | Neighborhood & Zoning | Upcoming Votes",
      "category": "One of: Meeting | Proposal | Budget | Zoning | School",
      "summary": "2-sentence neutral plain-English summary of what changed or is scheduled.",
      "date": "Verified meeting or notice date/schedule",
      "location": "Official venue or department office",
      "department": "Responsible municipal, school, or county body",
      "status": "One of: Open | Voting Soon | In Progress | Passed",
      "sourceLabel": "Official source name",
      "sourceUrl": "Direct URL from search results"
    }
  ],
  "verificationSummary": "One sentence summarizing what was checked across official portals."
}
Provide 4 to 5 factual items grounded in search results. Do not invent meeting dates or facts not found in sources.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      }));

      const text = response.text;
      if (text) {
        const parsed = parseJsonLoose(text);
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const groundedSources = chunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => ({
            title: c.web.title || c.web.uri,
            url: c.web.uri,
          }));

        if (Array.isArray(parsed.updates) && parsed.updates.length > 0) {
          const payload = {
            updates: parsed.updates,
            verificationSummary:
              parsed.verificationSummary ||
              `Checked official municipal, school, and county portals for ${cityLabel}.`,
            groundedSources,
            syncedAt: new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
          };
          liveSyncCache.set(cacheKey, {
            expiresAt: Date.now() + LIVE_SYNC_CACHE_TTL_MS,
            payload,
          });
          return res.json(payload);
        }
      }
    } catch (error: any) {
      if (!isQuotaError(error)) {
        console.warn('Live search grounding fallback to direct official portals:', error?.message);
      }
    }
  }

  // Fallback: Direct live check of official municipal, county auditor, and school district websites
  try {
    const directPayload = await fetchDirectOfficialUpdates(communityName, state, portalUrl);
    liveSyncCache.set(cacheKey, {
      expiresAt: Date.now() + LIVE_SYNC_CACHE_TTL_MS,
      payload: directPayload,
    });
    return res.json(directPayload);
  } catch (fallbackErr: any) {
    console.warn('Direct official sync warning:', fallbackErr?.message);
    return res.status(503).json({
      error: 'Official portals did not respond in time. Please try again in a moment.',
    });
  }
});

// Automated AI Moderation Pre-Screening for Comments & 311 Reports
app.post('/api/moderation/check', async (req, res) => {
  try {
    const { contentType, text, location } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for moderation.' });
    }

    // Fast deterministic safety check before calling Gemini
    const ssnOrSpamPattern = /\b\d{3}-\d{2}-\d{4}\b|(https?:\/\/[^\s]+){2,}|crypto|casino|whatsapp me/i;
    if (ssnOrSpamPattern.test(text)) {
      return res.json({
        decision: 'block',
        reason: 'Blocked: appears to contain sensitive personal numbers or commercial spam links.',
        categories: ['spam_or_pii'],
      });
    }

    if (!apiKey || Date.now() < quotaCooldownUntil) {
      return res.json({
        decision: 'flag',
        reason: 'Held for quick human moderator review.',
        categories: ['pending_review'],
      });
    }

    const response = await callGeminiWithFallback((model) => ({
      model,
      contents: `You are the non-partisan community safety moderator for CIVILSY, a local civic platform.
Evaluate the following resident ${contentType === 'report' ? '311 neighborhood issue report' : 'public proposal comment'} for community safety and civic standards.

Rules:
- APPROVE: Constructive civic feedback, criticism of public policies or city services, neighborhood issue reports, questions, disagreement expressed respectfully. (Political disagreement with officials or policies MUST be approved if civil!)
- FLAG (hold for human review): Borderline heated profanity, unverified accusations against named private individuals, or unclear off-topic statements.
- BLOCK: Hate speech or slurs, threats of violence, harassment/bullying, doxxing (sharing someone else's private phone number, home address, or SSN), or commercial spam/scam links.

${location ? `Location field: ${location}\n` : ''}Submitted text: "${text}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: {
              type: Type.STRING,
              description: 'Must be exactly one of: approve, flag, block',
            },
            reason: {
              type: Type.STRING,
              description: 'Short plain-English explanation for the user or moderator.',
            },
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['decision', 'reason', 'categories'],
        },
      },
    }));

    const raw = response.text;
    if (!raw) throw new Error('Empty moderation response');
    res.json(parseJsonLoose(raw));
  } catch (error: any) {
    if (!isQuotaError(error)) {
      console.warn('Moderation check fallback:', error?.message);
    }
    res.json({
      decision: 'flag',
      reason: 'Held for quick moderator review.',
      categories: ['review'],
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Civilsy running on http://0.0.0.0:${port}`);
  });
}

startServer();
