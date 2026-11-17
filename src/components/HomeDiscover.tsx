import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Users,
  FileText,
  BookmarkCheck,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  MessageSquare,
  Wrench,
  DollarSign,
  GraduationCap,
  Trees,
  Vote,
  BookOpen,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Bell,
  Clock,
  CheckCircle2,
  CalendarPlus,
  Vote as VoteIcon,
} from 'lucide-react';
import {
  Community,
  CivicItem,
  DepartmentCategory,
  GroundedSource,
  Report311,
  WatchlistEntry,
} from '../types';
import { INITIAL_CIVIC_ITEMS, BRAND_IMAGES, MEETING_RECAPS } from '../data/mockData';
import { CivicMap } from './CivicMap';
import {
  downloadCivicCalendarEvent,
  formatClosingCountdown,
  getNextCouncilMeetingDate,
  getTimeOfDayGreeting,
} from '../utils/calendar';

interface HomeDiscoverProps {
  selectedCommunity: Community;
  locationSource?: 'ip' | 'default' | 'manual';
  reports: Report311[];
  onUpvoteReport: (id: string) => void;
  watchlist: WatchlistEntry[];
  queuedActionsCount: number;
  onSelectCivicItem: (item: CivicItem) => void;
  onAskAIQuery: (q: string) => void;
  setCurrentTab: (tab: string) => void;
}

const VALID_GROUPS: DepartmentCategory[] = [
  'Streets & Roads',
  'Taxes & Spending',
  'Schools',
  'Neighborhood & Zoning',
  'Upcoming Votes',
];

const VALID_CATEGORIES: CivicItem['category'][] = [
  'Meeting',
  'Proposal',
  'Budget',
  'Petition',
  'Zoning',
  'School',
];

const VALID_STATUSES: CivicItem['status'][] = [
  'Open',
  'Voting Soon',
  'In Progress',
  'Passed',
  'Closed',
];

export const HomeDiscover: React.FC<HomeDiscoverProps> = ({
  selectedCommunity,
  locationSource = 'default',
  reports,
  onUpvoteReport,
  watchlist,
  queuedActionsCount,
  onSelectCivicItem,
  onAskAIQuery,
  setCurrentTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCategory | 'All'>('All');
  const [showCivicLesson, setShowCivicLesson] = useState(false);
  const [activeLessonTab, setActiveLessonTab] = useState<'who' | 'ordinance' | 'taxes'>('who');

  const [liveItems, setLiveItems] = useState<CivicItem[]>([]);
  const [groundedSources, setGroundedSources] = useState<GroundedSource[]>([]);
  const [verificationSummary, setVerificationSummary] = useState('');
  const [syncedAt, setSyncedAt] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [expandedScorecardId, setExpandedScorecardId] = useState<string | null>(null);
  const [calendarToast, setCalendarToast] = useState<string>('');
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const closingSoonItems = INITIAL_CIVIC_ITEMS.filter((i) => i.closingSoonDeadline);

  const getLiveDeadlineText = (item: CivicItem): string => {
    if (!item.closingSoonDeadline) return '';
    if (item.calendarStartIso) {
      const target = new Date(item.calendarStartIso);
      if (!Number.isNaN(target.getTime())) {
        if (item.id === 'item-5') {
          const cutoff = new Date(target.getTime() - 2 * 3600000);
          if (cutoff.getTime() > now.getTime()) {
            return formatClosingCountdown(cutoff, 'Clerk speaker cutoff', now);
          }
        }
        return formatClosingCountdown(
          target,
          item.id === 'item-3' ? 'Board Work Session' : 'Council reading',
          now
        );
      }
    }
    return item.closingSoonDeadline;
  };

  const handleDownloadCalendar = (item: CivicItem) => {
    downloadCivicCalendarEvent({
      title: item.title,
      description: `${item.summary}\n\nLocation: ${item.location}\nSource: ${item.sourceUrl || selectedCommunity.officialPortalUrl}`,
      location: item.location,
      startIso: item.calendarStartIso || getNextCouncilMeetingDate(now).toISOString(),
      durationMinutes: item.calendarDurationMin || 90,
    });
    setCalendarToast(`Added "${item.title.slice(0, 38)}..." (.ics) to your calendar.`);
    setTimeout(() => setCalendarToast(''), 3500);
  };

  useEffect(() => {
    setLiveItems([]);
    setGroundedSources([]);
    setVerificationSummary('');
    setSyncedAt('');
    setSyncError('');
  }, [selectedCommunity.id]);

  const handleLiveSync = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const res = await fetch('/api/civic/live-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityName: selectedCommunity.name,
          state: selectedCommunity.state,
          portalUrl: selectedCommunity.officialPortalUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not sync official sources');
      }
      const mapped: CivicItem[] = (data.updates || []).map((u: any, idx: number) => {
        const deptGroup = VALID_GROUPS.includes(u.departmentGroup)
          ? u.departmentGroup
          : 'Upcoming Votes';
        const cat = VALID_CATEGORIES.includes(u.category) ? u.category : 'Meeting';
        const st = VALID_STATUSES.includes(u.status) ? u.status : 'Open';
        return {
          id: `${selectedCommunity.id}-live-${idx + 1}`,
          title: u.title || 'Municipal Update',
          category: cat,
          departmentGroup: deptGroup,
          summary: u.summary || '',
          fullDescription:
            u.summary ||
            `Verified update from ${u.sourceLabel || selectedCommunity.officialPortalUrl}.`,
          date: u.date || 'Check official agenda',
          location: u.location || selectedCommunity.cityHallAddress,
          department: u.department || `${selectedCommunity.name} Municipal Office`,
          impactLevel: 'High',
          status: st,
          progressStage: 2,
          costImpact: 'See official municipal or district source notice',
          whoBenefits: `${selectedCommunity.name} residents and taxpayers`,
          whoPays: 'Existing municipal, school, or county budgets unless noted',
          openQuestions: [
            'Review the linked official agenda or notice for full public comment times.',
          ],
          sourceLabel: u.sourceLabel || `${selectedCommunity.name} Official Source`,
          sourceUrl: u.sourceUrl || selectedCommunity.officialPortalUrl,
        };
      });
      setLiveItems(mapped);
      setGroundedSources(data.groundedSources || []);
      setVerificationSummary(data.verificationSummary || '');
      setSyncedAt(data.syncedAt || 'Just now');
    } catch (err: any) {
      setSyncError(err.message || 'Unable to verify live sources right now.');
    } finally {
      setSyncing(false);
    }
  };

  const departments: { label: DepartmentCategory | 'All'; icon: any }[] = [
    { label: 'All', icon: Building2 },
    { label: 'Streets & Roads', icon: Wrench },
    { label: 'Taxes & Spending', icon: DollarSign },
    { label: 'Schools', icon: GraduationCap },
    { label: 'Neighborhood & Zoning', icon: Trees },
    { label: 'Upcoming Votes', icon: Vote },
  ];

  const combinedItems = [...liveItems, ...INITIAL_CIVIC_ITEMS];

  const filteredItems = combinedItems.filter((item) =>
    selectedDepartment === 'All' ? true : item.departmentGroup === selectedDepartment
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onAskAIQuery(searchQuery.trim());
    }
  };

  const activeWatchlistPreview =
    watchlist.length > 0
      ? watchlist.slice(0, 2)
      : [
          {
            id: 'preview-1',
            itemId: INITIAL_CIVIC_ITEMS[0].id,
            title: INITIAL_CIVIC_ITEMS[0].title,
            category: INITIAL_CIVIC_ITEMS[0].category,
            status: INITIAL_CIVIC_ITEMS[0].status,
            department: INITIAL_CIVIC_ITEMS[0].department,
            userId: '',
          },
        ];

  return (
    <div className="space-y-6 pb-8 text-[#071B42]">
      {/* Hero Banner with Generated Lakefront Lighthouse Image */}
      <section className="relative overflow-hidden rounded-2xl bg-[#071B42] text-white border border-slate-200">
        <img
          src={BRAND_IMAGES.heroHarbor}
          alt={`${selectedCommunity.name} shoreline and harbor`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/92 via-[#071B42]/55 to-[#071B42]/45" />

        <div className="relative z-10 px-6 py-10 sm:py-12 max-w-3xl mx-auto text-center space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {getTimeOfDayGreeting(now)}, {selectedCommunity.name}.
            </h1>
            <p className="text-base sm:text-lg text-slate-100 font-medium">
              Your community. Your voice.
            </p>
          </div>

          {/* Action Router Search Bar */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto flex items-center bg-white rounded-xl p-1.5 shadow-lg border border-slate-200"
          >
            <div className="flex items-center flex-1 pl-3">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Ask or report anything: "streetlight out", "trash pickup", or "property taxes"'
                className="w-full text-[#071B42] placeholder-slate-400 text-xs sm:text-sm focus:outline-none bg-transparent py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-[#116BFF] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
            >
              Search
            </button>
          </form>

          {/* 4 Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setCurrentTab('fix')}
              className="bg-white/95 hover:bg-white text-[#071B42] text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Report an issue</span>
            </button>
            <button
              onClick={() => setCurrentTab('officials')}
              className="bg-white/95 hover:bg-white text-[#071B42] text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-[#116BFF]" />
              <span>Contact an official</span>
            </button>
            <button
              onClick={() => onSelectCivicItem(INITIAL_CIVIC_ITEMS[0])}
              className="bg-white/95 hover:bg-white text-[#071B42] text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-[#071B42]" />
              <span>See decisions</span>
            </button>
            <button
              onClick={() => setShowCivicLesson((prev) => !prev)}
              className="bg-[#116BFF] hover:bg-blue-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>How {selectedCommunity.name} works</span>
            </button>
          </div>
        </div>
      </section>

      {/* Active Ashtabula County Jurisdiction Context Strip */}
      <section className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#071B42]">
            <MapPin className="w-3.5 h-3.5 text-[#116BFF]" />
            <span>
              {selectedCommunity.name} ({selectedCommunity.kind})
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {locationSource === 'ip'
              ? 'Location detected via IP'
              : locationSource === 'manual'
              ? 'Selected in Ashtabula County'
              : 'Defaulting to Ashtabula City'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{selectedCommunity.councilMeetingSchedule}</span>
          {selectedCommunity.schoolDistrict && (
            <>
              <span aria-hidden="true">·</span>
              <span>{selectedCommunity.schoolDistrict}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentTab('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#116BFF] hover:underline whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Topic Alerts</span>
          </button>
          <a
            href={selectedCommunity.officialPortalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#071B42] hover:text-[#116BFF] whitespace-nowrap"
          >
            <span>Official Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      {/* Before the Vote: Closing-Soon Public Input Window */}
      {closingSoonItems.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#116BFF]" />
              <div>
                <h2 className="text-sm font-bold text-[#071B42]">
                  Before the Vote · Public Input Windows Closing Soon
                </h2>
                <p className="text-[11px] text-slate-500">
                  Share a 1-tap Resident Pulse before Council or Board voting closes.
                </p>
              </div>
            </div>
            {calendarToast && (
              <span className="text-xs font-semibold text-emerald-700">{calendarToast}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {closingSoonItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-amber-700 tabular-nums">
                    {getLiveDeadlineText(item)}
                  </div>
                  <h3 className="text-xs font-bold text-[#071B42] leading-snug">{item.title}</h3>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{item.summary}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectCivicItem(item)}
                    className="flex-1 bg-[#116BFF] hover:bg-blue-700 text-white text-[11px] font-semibold py-2 px-3 rounded-lg transition-colors text-center"
                  >
                    Weigh In Now
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadCalendar(item)}
                    className="bg-white hover:bg-slate-100 text-[#071B42] border border-slate-200 text-[11px] font-semibold py-2 px-2.5 rounded-lg inline-flex items-center gap-1 transition-colors shrink-0"
                    title="Download meeting reminder (.ics)"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#116BFF]" />
                    <span>.ics</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Optional Educational Layer: 60-Second Civic Explainer */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#116BFF] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#071B42]">
                Civic Minute (Optional) · Understand {selectedCommunity.name} in 60 seconds
              </div>
              <p className="text-[11px] text-slate-500">
                Curious who handles what, how an ordinance passes, or where tax dollars go? Expand anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab('academy')}
              className="text-xs font-semibold text-slate-600 hover:text-[#116BFF] whitespace-nowrap"
            >
              Full Civics Guide
            </button>
            <button
              onClick={() => setShowCivicLesson(!showCivicLesson)}
              className="px-3.5 py-1.5 rounded-lg bg-[#F8F7F4] hover:bg-slate-200/70 border border-slate-200 text-xs font-semibold text-[#071B42] flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>{showCivicLesson ? 'Hide Guide' : 'Show Visual Guide'}</span>
              {showCivicLesson ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {showCivicLesson && (
          <div className="border-t border-slate-200 p-5 bg-[#F8F7F4] space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'who', label: '1. Who Handles What?' },
                { id: 'ordinance', label: '2. How a City Decision Passes' },
                { id: 'taxes', label: '3. Where $100 of Property Tax Goes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLessonTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeLessonTab === tab.id
                      ? 'bg-[#071B42] text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-[#116BFF]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeLessonTab === 'who' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-[#116BFF]">{selectedCommunity.name}</div>
                  <div className="font-semibold text-[#071B42]">{selectedCommunity.cityHallAddress}</div>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedCommunity.councilType}: local roads, parks, zoning, and municipal/township services.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-[#116BFF]">County Auditor &amp; County</div>
                  <div className="font-semibold text-[#071B42]">25 W Jefferson St, Jefferson</div>
                  <p className="text-slate-600 leading-relaxed">
                    Property tax appraisals, valuation reviews, county roads, engineer, sheriff, and courts.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-[#116BFF]">Local School District</div>
                  <div className="font-semibold text-[#071B42]">
                    {selectedCommunity.schoolDistrict || 'County Area Schools'}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Independent elected Board of Education overseeing schools, buses, and school levies.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-[#116BFF]">ODOT District 4</div>
                  <div className="font-semibold text-[#071B42]">State Routes &amp; I-90</div>
                  <p className="text-slate-600 leading-relaxed">
                    State highway corridors like US-20, SR-11, SR-531, and interstate ramps.
                  </p>
                </div>
              </div>
            )}

            {activeLessonTab === 'ordinance' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                {[
                  {
                    step: 'Stage 1 · 1st Reading',
                    desc: 'Proposal is introduced at City Council (1st & 3rd Mondays at 6:00 PM) and assigned to committee.',
                  },
                  {
                    step: 'Stage 2 · Committee Review',
                    desc: 'Council members, City Manager, and department heads examine costs, grants, and feasibility.',
                  },
                  {
                    step: 'Stage 3 · Public Comment',
                    desc: '2nd & 3rd readings give residents the strongest window to speak or email their Ward Councilor.',
                  },
                  {
                    step: 'Stage 4 · Final Vote',
                    desc: 'Council votes on the ordinance. Approved measures take effect or start scheduled work.',
                  },
                ].map((s) => (
                  <div key={s.step} className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-[#116BFF]">{s.step}</div>
                    <p className="text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeLessonTab === 'taxes' && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#071B42]">
                    How $100 of Ashtabula Property Tax Splits Across Local Taxing Bodies
                  </div>
                  <button
                    onClick={() => setCurrentTab('budget')}
                    className="text-xs font-semibold text-[#116BFF] hover:underline flex items-center gap-1"
                  >
                    <span>Estimate your own bill</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="h-4 w-full rounded-full overflow-hidden flex border border-slate-200">
                  <div style={{ width: '56%' }} className="bg-[#071B42]" title="Schools 56%" />
                  <div style={{ width: '22%' }} className="bg-[#116BFF]" title="County 22%" />
                  <div style={{ width: '14%' }} className="bg-sky-400" title="City 14%" />
                  <div style={{ width: '8%' }} className="bg-emerald-500" title="Library & Parks 8%" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                  <div>
                    <span className="font-bold text-[#071B42]">$56</span>{' '}
                    <span className="text-slate-600">Public Schools</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#116BFF]">$22</span>{' '}
                    <span className="text-slate-600">Ashtabula County</span>
                  </div>
                  <div>
                    <span className="font-bold text-sky-700">$14</span>{' '}
                    <span className="text-slate-600">City Services</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-700">$8</span>{' '}
                    <span className="text-slate-600">Library, A-Tech &amp; Parks</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Department-First Browsing Strip */}
      <section aria-label="Browse by City Department">
        <div className="bg-white rounded-2xl border border-slate-200 p-2 flex items-center gap-1.5 overflow-x-auto">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const active = selectedDepartment === dept.label;
            return (
              <button
                key={dept.label}
                onClick={() => setSelectedDepartment(dept.label)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#071B42] text-white'
                    : 'text-slate-600 hover:bg-[#F8F7F4] hover:text-[#071B42]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-300' : 'text-slate-500'}`} />
                <span>{dept.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main 3-Column Civic Dashboard Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols): For You Proposals & Live Source-Verified Civic Feed */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="space-y-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#071B42]">For You</h2>
                <p className="text-xs text-slate-500">
                  Active decisions and notices in {selectedCommunity.name}
                </p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">
                {filteredItems.length} items
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleLiveSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F7F4] hover:bg-blue-50 border border-slate-200 hover:border-[#116BFF] text-xs font-semibold text-[#071B42] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#116BFF] ${syncing ? 'animate-spin' : ''}`} />
                <span>
                  {syncing
                    ? 'Checking official portals...'
                    : syncedAt
                    ? 'Refresh Official Sources'
                    : 'Sync Live Official Sources'}
                </span>
              </button>

              <a
                href={selectedCommunity.officialPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-[#116BFF] hover:underline inline-flex items-center gap-1"
              >
                <span>City Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {syncError && (
              <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                {syncError}
              </p>
            )}

            {syncedAt && (
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between font-bold text-[#071B42]">
                  <span className="inline-flex items-center gap-1 text-[#116BFF]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Official Sources Checked</span>
                  </span>
                  <span className="text-slate-500 font-normal tabular-nums">{syncedAt}</span>
                </div>
                {verificationSummary && (
                  <p className="text-slate-700 leading-relaxed">{verificationSummary}</p>
                )}
                {groundedSources.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    {groundedSources.slice(0, 3).map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#116BFF] font-semibold hover:underline inline-flex items-center gap-1 max-w-full truncate"
                      >
                        <span className="truncate max-w-[170px]">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isLiveSynced = item.id.includes('-live-');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCivicItem(item)}
                  className="w-full text-left py-4 first:pt-1 last:pb-1 group flex flex-col gap-2 focus:outline-none"
                >
                  <div className="flex gap-3 items-start">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-14 rounded-lg bg-[#F8F7F4] border border-slate-200 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-[#116BFF]">{item.departmentGroup}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.status}</span>
                        {isLiveSynced && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-700">Live Sync</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#071B42] group-hover:text-[#116BFF] transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#116BFF] shrink-0 mt-1" />
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
                    <span className="truncate">Source: {item.sourceLabel}</span>
                    {item.sourceUrl && (
                      <span className="text-[#116BFF] font-medium shrink-0">Verified link</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Column (5 cols): Interactive Neighborhood Map + Photographic Action Cards + Community Banner */}
        <div className="lg:col-span-5 space-y-6">
          <CivicMap
            reports={reports}
            onUpvote={onUpvoteReport}
            onOpenReportTracker={() => setCurrentTab('fix')}
            communityName={selectedCommunity.name}
          />

          {/* Eye-Catching Photographic "Take action in 2 minutes" */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#071B42]">Take action in 2 minutes</h2>
              <button
                onClick={() => setCurrentTab('fix')}
                className="text-xs text-[#116BFF] font-semibold hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>All actions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setCurrentTab('fix')}
                className="text-left rounded-xl bg-[#F8F7F4] border border-slate-200 hover:border-[#116BFF] transition-colors overflow-hidden group flex flex-col"
              >
                <div className="relative h-20 w-full bg-[#071B42]">
                  <img
                    src={BRAND_IMAGES.roadRepair}
                    alt="Report a community issue"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/70 to-transparent" />
                  <AlertTriangle className="absolute bottom-2 left-2.5 w-4 h-4 text-amber-300" />
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-xs font-bold text-[#071B42] group-hover:text-[#116BFF]">
                    Report an issue
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Roads, streetlights, drainage, parks, trash, or safety concerns.
                  </p>
                </div>
              </button>

              <button
                onClick={() => onSelectCivicItem(INITIAL_CIVIC_ITEMS[0])}
                className="text-left rounded-xl bg-[#F8F7F4] border border-slate-200 hover:border-[#116BFF] transition-colors overflow-hidden group flex flex-col"
              >
                <div className="relative h-20 w-full bg-[#071B42]">
                  <img
                    src={BRAND_IMAGES.waterfrontWalk}
                    alt="Comment on a city decision"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/70 to-transparent" />
                  <MessageSquare className="absolute bottom-2 left-2.5 w-4 h-4 text-blue-300" />
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-xs font-bold text-[#071B42] group-hover:text-[#116BFF]">
                    Comment on a plan
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Post public input on local council &amp; school proposals.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setCurrentTab('officials')}
                className="text-left rounded-xl bg-[#F8F7F4] border border-slate-200 hover:border-[#116BFF] transition-colors overflow-hidden group flex flex-col"
              >
                <div className="relative h-20 w-full bg-[#071B42]">
                  <img
                    src={BRAND_IMAGES.cityHall}
                    alt="Contact a local official"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/70 to-transparent" />
                  <Users className="absolute bottom-2 left-2.5 w-4 h-4 text-white" />
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-xs font-bold text-[#071B42] group-hover:text-[#116BFF]">
                    Contact an official
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Draft a message to your ward councilor or county auditor.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Community Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-[#071B42] text-white border border-slate-200">
            <img
              src={BRAND_IMAGES.waterfrontWalk}
              alt={`${selectedCommunity.name} community waterfront`}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#071B42]/92 via-[#071B42]/72 to-transparent" />
            <div className="relative z-10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-white">
                  A stronger {selectedCommunity.name} is built by people like you.
                </h3>
                <p className="text-xs text-slate-200 max-w-md">
                  Follow council decisions, verify where tax dollars go, and report any neighborhood issue in minutes.
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('academy')}
                className="px-4 py-2 rounded-lg bg-white text-[#071B42] hover:bg-slate-100 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
              >
                Explore Civics Guide
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (3 cols): Watchlist Tracker, Upcoming Decisions, Civic Record */}
        <div className="lg:col-span-3 space-y-6">
          {/* My Watchlist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-[#071B42]">My Watchlist</h2>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="text-xs font-semibold text-[#116BFF] hover:underline"
              >
                See all
              </button>
            </div>

            <div className="space-y-3">
              {activeWatchlistPreview.map((entry) => {
                const matchedItem =
                  combinedItems.find((i) => i.id === entry.itemId) ||
                  INITIAL_CIVIC_ITEMS[0];
                const stage = matchedItem.progressStage;
                return (
                  <button
                    key={entry.id}
                    onClick={() => onSelectCivicItem(matchedItem)}
                    className="w-full text-left p-3.5 bg-[#F8F7F4] rounded-xl border border-slate-200 hover:border-[#116BFF] transition-colors space-y-2.5"
                  >
                    <div className="text-xs font-bold text-[#071B42] line-clamp-2">
                      {entry.title}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full ${
                            stage >= step ? 'bg-[#116BFF]' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{entry.status}</span>
                      <span className="text-[#116BFF] font-semibold">Stage {stage}/4</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming Decisions with 1-Tap .ics Calendar Export */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-[#071B42]">Upcoming Decisions</h2>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {[
                { badgeTop: '1st/3rd', badgeBot: 'MON', item: INITIAL_CIVIC_ITEMS[4], title: 'City Council Regular Meeting', sub: '4230 Lake Ave · 6:00 PM', dark: false },
                { badgeTop: 'AACS', badgeBot: 'BOE', item: INITIAL_CIVIC_ITEMS[2], title: 'School Board Session', sub: '541 W 34th St · 6:30 PM', dark: true },
                { badgeTop: 'TUE', badgeBot: '9:30', item: INITIAL_CIVIC_ITEMS[1], title: 'County Commissioners', sub: '25 W Jefferson St · Jefferson', dark: true },
              ].map((row) => (
                <div
                  key={row.title}
                  className="p-2.5 rounded-xl bg-[#F8F7F4] border border-slate-200 flex items-center justify-between gap-2"
                >
                  <button
                    onClick={() => onSelectCivicItem(row.item)}
                    className="flex items-start gap-2.5 text-left min-w-0 flex-1 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg font-bold flex flex-col items-center justify-center text-[10px] shrink-0 tabular-nums ${
                        row.dark ? 'bg-white border border-slate-200 text-[#071B42]' : 'bg-blue-50 text-[#116BFF]'
                      }`}
                    >
                      <span>{row.badgeTop}</span>
                      <span className="text-xs">{row.badgeBot}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#071B42] group-hover:text-[#116BFF] truncate">
                        {row.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">{row.sub}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadCalendar(row.item)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#116BFF] text-[11px] font-semibold text-[#071B42] inline-flex items-center gap-1 shrink-0"
                    title="Add meeting to calendar (.ics)"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#116BFF]" />
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Your Civic Activity (Real Counts) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-[#071B42]">Your Activity</h2>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="text-xs font-semibold text-[#116BFF] hover:underline"
              >
                Open tracker
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#F8F7F4] p-2.5 rounded-xl border border-slate-200">
                <div className="text-base font-extrabold text-[#071B42] tabular-nums">
                  {reports.length}
                </div>
                <div className="text-[10px] text-slate-500">Local 311</div>
              </div>
              <div className="bg-[#F8F7F4] p-2.5 rounded-xl border border-slate-200">
                <div className="text-base font-extrabold text-[#071B42] tabular-nums">
                  {watchlist.length}
                </div>
                <div className="text-[10px] text-slate-500">Following</div>
              </div>
              <div className="bg-[#F8F7F4] p-2.5 rounded-xl border border-slate-200">
                <div className="text-base font-extrabold text-[#071B42] tabular-nums">
                  {queuedActionsCount}
                </div>
                <div className="text-[10px] text-slate-500">Queued</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Minute Meeting Recaps & Vote Scorecards */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <VoteIcon className="w-5 h-5 text-[#116BFF]" />
            <div>
              <h2 className="text-base font-bold text-[#071B42]">
                2-Minute Meeting Recaps &amp; Vote Scorecards
              </h2>
              <p className="text-xs text-slate-500">
                What Ashtabula City Council, County Commissioners, and School Board decided—in 3 plain-English bullets plus individual roll-call votes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('budget')}
            className="text-xs font-semibold text-[#116BFF] hover:underline whitespace-nowrap shrink-0"
          >
            Check Ballot Levies &amp; Benchmarks →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {MEETING_RECAPS.map((recap) => {
            const isExpanded = expandedScorecardId === recap.id;
            const primaryVote = recap.voteItems[0];
            return (
              <div
                key={recap.id}
                className="rounded-xl bg-[#F8F7F4] border border-slate-200 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[#116BFF]">
                      {recap.jurisdictionScope}
                    </div>
                    <h3 className="text-sm font-extrabold text-[#071B42]">{recap.bodyName}</h3>
                    <div className="text-[11px] text-slate-500">{recap.dateLabel}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[#071B42]">
                      3 Key Decisions Made:
                    </div>
                    <ul className="space-y-1.5">
                      {recap.threeDecisions.map((dec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{dec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {recap.residentPulseSummary && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5 text-[11px]">
                      <div className="font-bold text-[#071B42]">
                        Resident Pulse vs. Final Vote
                      </div>
                      <div className="flex items-center justify-between text-slate-600 tabular-nums">
                        <span>Resident Support: {recap.residentPulseSummary.supportPct}%</span>
                        <span className="font-bold text-emerald-700">
                          Board Vote: {recap.residentPulseSummary.finalPassedPct}% Yes
                        </span>
                      </div>
                      <p className="text-slate-500 leading-snug">
                        {recap.residentPulseSummary.summaryNote}
                      </p>
                    </div>
                  )}

                  {primaryVote && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#071B42] line-clamp-1">
                          {primaryVote.motion}
                        </span>
                        <span className="font-bold text-emerald-700 shrink-0 tabular-nums">
                          {primaryVote.result} ({primaryVote.yesCount}–{primaryVote.noCount}
                          {primaryVote.abstainCount > 0 ? `–${primaryVote.abstainCount}` : ''})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Effective: {primaryVote.effectiveWhen}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedScorecardId(isExpanded ? null : recap.id)}
                        className="text-[11px] font-semibold text-[#116BFF] hover:underline inline-flex items-center gap-1"
                      >
                        <span>
                          {isExpanded ? 'Hide member-by-member votes' : 'View roll-call scorecard'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 pt-1">
                          {recap.voteItems.map((vi) => (
                            <div
                              key={vi.motion}
                              className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#071B42]">
                                <span>{vi.motion}</span>
                                <span className="text-emerald-700 tabular-nums shrink-0">
                                  {vi.yesCount}Y / {vi.noCount}N
                                </span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {vi.votes.map((v) => (
                                  <div
                                    key={`${vi.motion}-${v.member}`}
                                    className="py-1 flex items-center justify-between text-[11px]"
                                  >
                                    <span className="text-slate-700">
                                      {v.member}{' '}
                                      <span className="text-slate-400">({v.district})</span>
                                    </span>
                                    <span
                                      className={`font-bold ${
                                        v.vote === 'Yes'
                                          ? 'text-emerald-700'
                                          : v.vote === 'No'
                                          ? 'text-rose-700'
                                          : 'text-amber-700'
                                      }`}
                                    >
                                      {v.vote}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <a
                  href={recap.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-[#116BFF] hover:underline inline-flex items-center gap-1 pt-2 border-t border-slate-200"
                >
                  <span>Verify: {recap.sourceLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Explore Bar */}
      <section className="bg-[#071B42] text-white rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-[#116BFF] shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-white">Explore {selectedCommunity.name}</h3>
            <p className="text-xs text-slate-300">
              Jump directly to officials &amp; open boards, ballot levies, county comparisons, or 311 neighborhood wins.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setCurrentTab('officials')}
            className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Officials &amp; Open Boards
          </button>
          <button
            onClick={() => setCurrentTab('budget')}
            className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Ballot Levies &amp; Compare County
          </button>
          <button
            onClick={() => setCurrentTab('fix')}
            className="bg-[#116BFF] hover:bg-blue-600 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Report Issue &amp; Wins</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
