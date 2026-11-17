import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  MapPin,
  Plus,
  ThumbsUp,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Wrench,
  Lightbulb,
  Droplets,
  Trees,
  Trash2,
  Footprints,
  Signpost,
  MessageSquarePlus,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Flag,
  Clock,
} from 'lucide-react';
import { Report311, Report311Category, Community } from '../types';
import { User } from 'firebase/auth';
import { flagCloudReportPhoto } from '../firebase';

interface CivicFix311Props {
  selectedCommunity: Community;
  reports: Report311[];
  upvotedReportIds?: string[];
  onCreateReport: (report: Omit<Report311, 'id'>) => Promise<void>;
  onUpvoteReport: (id: string) => void;
  user: User | null;
  onRequireLogin: () => void;
}

const ISSUE_GUIDE: Record<
  string,
  { icon: any; office: string; explainer: string; timeline: string }
> = {
  'Roads & Paving': {
    icon: Wrench,
    office: 'Local Street Dept., Township Road Crew, or County Engineer',
    explainer:
      'City streets are patched by City Public Works; township roads go to your Township Trustees or the Ashtabula County Engineer; state routes (US-20, SR-11) route to ODOT District 4.',
    timeline: 'Crew assessment typically in 2–5 business days',
  },
  'Streetlight & Safety': {
    icon: Lightbulb,
    office: 'Municipal Services & Utility Pole Partner',
    explainer:
      'Include the intersection or nearest house number—and if visible, the metal pole tag number—so crews can dispatch the exact repair team.',
    timeline: 'Utility routing typically in 3–7 business days',
  },
  'Water & Drainage': {
    icon: Droplets,
    office: 'Stormwater, County Soil & Water, or Sanitation Division',
    explainer:
      'Blocked catch basins, roadside ditches, and curb flooding are cleared before heavy Lake Erie storms.',
    timeline: 'Stormwater triage typically in 1–4 business days',
  },
  'Parks & Trees': {
    icon: Trees,
    office: 'Local Parks & Forestry / Township Grounds',
    explainer:
      'Covers fallen limbs in the public right-of-way (between sidewalk and curb), parks, and beach access trails.',
    timeline: 'Safety hazards prioritized within 48 hours',
  },
  'Trash & Property': {
    icon: Trash2,
    office: 'Local Code Enforcement & Sanitation',
    explainer:
      'Report illegal dumping, missed municipal collection, overgrown lots, or unsafe vacant structures for inspection.',
    timeline: 'Inspector review within 3–5 business days',
  },
  'Sidewalk & Crosswalk': {
    icon: Footprints,
    office: 'Municipal Engineering & Traffic Safety',
    explainer:
      'Heaved concrete panels, missing ADA curb ramps, or faded school-zone crosswalk markings.',
    timeline: 'Logged for safety review & capital scheduling',
  },
  'Traffic & Signage': {
    icon: Signpost,
    office: 'Traffic Signals & Road Maintenance',
    explainer:
      'Damaged stop signs, flickering traffic signals, or obstructed visibility at neighborhood corners.',
    timeline: 'Urgent signage hazards dispatched within 24–48 hours',
  },
  'Other Local Issue': {
    icon: MessageSquarePlus,
    office: 'Local Hall / Township Intake',
    explainer:
      'Not sure which department handles your concern? Describe it clearly here and it will be logged for local routing.',
    timeline: 'Reviewed and routed by local intake',
  },
};

function resizeImageToJpegDataUrl(file: File, maxWidth = 960, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a supported image.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas unavailable for image resizing.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const CivicFix311: React.FC<CivicFix311Props> = ({
  selectedCommunity,
  reports,
  upvotedReportIds = [],
  onCreateReport,
  onUpvoteReport,
  user,
  onRequireLogin,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<Report311Category>('Roads & Paving');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState(user?.displayName || '');
  const [pinCoords, setPinCoords] = useState<{ x: number; y: number }>({ x: 46, y: 48 });
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoModerationStatus, setPhotoModerationStatus] = useState<'approved' | 'pending_review'>('approved');
  const [photoModerationNote, setPhotoModerationNote] = useState('');
  const [photoNotice, setPhotoNotice] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [flaggingReportId, setFlaggingReportId] = useState<string | null>(null);
  const [photoFlagReason, setPhotoFlagReason] = useState('Private Info / Faces');
  const [flaggingBusy, setFlaggingBusy] = useState(false);
  const [flagStatusMsg, setFlagStatusMsg] = useState<Record<string, string>>({});

  const [filter, setFilter] = useState<string>('All');
  const [showEducation, setShowEducation] = useState(false);
  const [showModalEducation, setShowModalEducation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (user?.displayName && !reporterName) {
      setReporterName(user.displayName);
    }
  }, [user]);

  const categories: Report311Category[] = [
    'Roads & Paving',
    'Streetlight & Safety',
    'Water & Drainage',
    'Parks & Trees',
    'Trash & Property',
    'Sidewalk & Crosswalk',
    'Traffic & Signage',
    'Other Local Issue',
  ];

  const resolvedReports = reports.filter((r) => r.status === 'Resolved');
  const helpedWinsCount = resolvedReports.filter((r) => upvotedReportIds.includes(r.id)).length;
  const resolvedDaysValues = resolvedReports
    .map((r) => r.resolvedDays)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgDaysToFix =
    resolvedDaysValues.length > 0
      ? (resolvedDaysValues.reduce((a, b) => a + b, 0) / resolvedDaysValues.length).toFixed(1)
      : '3.0';

  const filteredReports = reports.filter((rep) => {
    if (filter === 'All') return true;
    if (filter === 'Neighborhood Wins') return rep.status === 'Resolved';
    return rep.status === filter;
  });

  const statusStage = (status: Report311['status']) => {
    if (status === 'Submitted') return 1;
    if (status === 'Dispatched') return 2;
    if (status === 'In Progress') return 3;
    return 4;
  };

  const handleOpenModal = (preselectedCat?: Report311Category) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    if (preselectedCat) setCategory(preselectedCat);
    setSubmitError('');
    setPhotoError('');
    setPhotoNotice('');
    setIsModalOpen(true);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(12, Math.min(88, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    setPinCoords({ x, y });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoError('');
    setPhotoNotice('');
    try {
      const dataUrl = await resizeImageToJpegDataUrl(file, 960, 0.78);
      const res = await fetch('/api/uploads/report-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          category,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (data.decision === 'block') {
        setPhotoUrl('');
        setPhotoModerationStatus('approved');
        setPhotoModerationNote('');
        setPhotoError(
          data.reason || 'Photo blocked: please upload only safe, non-sensitive neighborhood issue photos.'
        );
        return;
      }
      if (!res.ok || !data.photoUrl) {
        throw new Error(data.error || 'Could not upload photo.');
      }
      setPhotoUrl(data.photoUrl);
      if (data.moderationStatus === 'pending_review') {
        setPhotoModerationStatus('pending_review');
        setPhotoModerationNote(
          data.reason || 'Held for quick moderator visual check before public display.'
        );
        setPhotoNotice(
          'Photo uploaded and held for quick moderator review before appearing publicly.'
        );
      } else {
        setPhotoModerationStatus('approved');
        setPhotoModerationNote(data.reason || 'Photo screened for neighborhood 311 safety.');
        setPhotoNotice('Photo screened for neighborhood 311 safety.');
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Unable to process photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFlagPhotoSubmit = async (reportId: string) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    setFlaggingBusy(true);
    try {
      await flagCloudReportPhoto(reportId, photoFlagReason);
      setFlagStatusMsg((prev) => ({
        ...prev,
        [reportId]: 'Photo flagged for moderator review and hidden pending check.',
      }));
      setFlaggingReportId(null);
    } catch (err: any) {
      setFlagStatusMsg((prev) => ({
        ...prev,
        [reportId]: err.message || 'Unable to flag photo right now.',
      }));
    } finally {
      setFlaggingBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !description.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const modRes = await fetch('/api/moderation/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'report',
          location: location.trim(),
          text: description.trim(),
        }),
      });
      const modData = await modRes.json();

      if (modData.decision === 'block') {
        setSubmitError(
          modData.reason ||
            'Please revise your report to focus on the neighborhood issue without personal info, harassment, or spam.'
        );
        return;
      }

      await onCreateReport({
        category,
        location: location.trim(),
        description: description.trim(),
        status: 'Submitted',
        submittedDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        upvotes: 1,
        reporterName: reporterName.trim() || user?.displayName || 'Ashtabula Resident',
        communityId: selectedCommunity.id,
        mapX: pinCoords.x,
        mapY: pinCoords.y,
        ...(photoUrl
          ? {
              photoUrl,
              photoModerationStatus,
              ...(photoModerationNote ? { photoModerationNote } : {}),
            }
          : {}),
      });
      setIsModalOpen(false);
      setLocation('');
      setDescription('');
      setPhotoUrl('');
      setPhotoModerationStatus('approved');
      setPhotoModerationNote('');
      setPhotoNotice('');
      setPhotoError('');
    } catch (err: any) {
      setSubmitError(err.message || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeGuide = ISSUE_GUIDE[category] || ISSUE_GUIDE['Other Local Issue'];

  return (
    <div className="space-y-6 pb-16 text-[#071B42]">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-xs font-bold text-[#116BFF]">
              311 Community Issue Tracker · {selectedCommunity.name}, {selectedCommunity.state}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
              Report any neighborhood or county issue
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              From streetlights, drainage, and fallen tree limbs to sidewalks, trash, traffic signs, or any other local concern—attach a photo in under a minute and track every stage to completion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="bg-[#F8F7F4] hover:bg-slate-200/70 text-[#071B42] font-semibold px-4 py-3 rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-[#116BFF]" />
              <span>{showEducation ? 'Hide 311 Guide' : 'How 311 Works (Optional)'}</span>
              {showEducation ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="bg-[#116BFF] hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{user ? 'Report Any Issue' : 'Sign In to Report'}</span>
            </button>
          </div>
        </div>

        {/* Quick Clickable Issue Launcher Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-slate-100">
          {categories.map((cat) => {
            const Icon = ISSUE_GUIDE[cat].icon;
            return (
              <button
                key={cat}
                onClick={() => handleOpenModal(cat)}
                className="text-left p-3 rounded-xl bg-[#F8F7F4] hover:bg-blue-50/70 border border-slate-200 hover:border-[#116BFF] transition-colors space-y-1.5 group"
              >
                <Icon className="w-4 h-4 text-[#116BFF]" />
                <div className="text-[11px] font-bold text-[#071B42] group-hover:text-[#116BFF] leading-tight">
                  {cat}
                </div>
              </button>
            );
          })}
        </div>

        {/* Optional Educational Drawer */}
        {showEducation && (
          <div className="p-5 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-[#071B42]">
              Optional Guide: What happens after you submit an issue in {selectedCommunity.name}?
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
              <div className="space-y-1">
                <div className="font-bold text-[#116BFF]">1. Jurisdiction Routing</div>
                <p className="leading-relaxed">
                  Local issues route to {selectedCommunity.name} ({selectedCommunity.cityHallAddress}). County roads coordinate with the Ashtabula County Engineer, while state routes (US-20/SR-11) coordinate with ODOT District 4.
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#116BFF]">2. Photo Context &amp; Upvotes</div>
                <p className="leading-relaxed">
                  Attaching a quick photo helps maintenance crews assess equipment needs before dispatch, and neighbor upvotes eliminate duplicate reports.
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#116BFF]">3. Emergency vs. 311</div>
                <p className="leading-relaxed">
                  Use 311 for non-emergency maintenance. For downed power lines, gas leaks, or active safety emergencies, always call 911 immediately.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Neighborhood Wins Proof Banner */}
      {resolvedReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-extrabold text-[#071B42] flex flex-wrap items-center gap-2">
                <span>Neighborhood Wins · {resolvedReports.length} Completed Fixes</span>
                {helpedWinsCount > 0 && (
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    · You helped fix {helpedWinsCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 tabular-nums">
                Average verified turnaround: {avgDaysToFix} days with before &amp; after crew proof across {selectedCommunity.name} and surrounding communities.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFilter(filter === 'Neighborhood Wins' ? 'All' : 'Neighborhood Wins')
            }
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              filter === 'Neighborhood Wins'
                ? 'bg-[#071B42] text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {filter === 'Neighborhood Wins' ? 'Show All Reports' : 'View Neighborhood Wins'}
          </button>
        </div>
      )}

      {/* Filter Segment */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 w-fit overflow-x-auto max-w-full">
        {['All', 'Neighborhood Wins', 'Submitted', 'Dispatched', 'In Progress'].map((st) => {
          const count =
            st === 'Neighborhood Wins'
              ? resolvedReports.length
              : reports.filter((r) => r.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors tabular-nums ${
                filter === st
                  ? 'bg-[#071B42] text-white'
                  : 'text-slate-600 hover:bg-[#F8F7F4] hover:text-[#071B42]'
              }`}
            >
              {st} {st !== 'All' && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Reports List with 4-Stage Delivery-Style Progress, Before/After Photo Proof & Official Response */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReports.map((report) => {
          const stage = statusStage(report.status);
          const userHelpedFix =
            report.status === 'Resolved' && upvotedReportIds.includes(report.id);
          const hasUpvoted = upvotedReportIds.includes(report.id);
          return (
            <div
              key={report.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#071B42]">{report.category}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        report.status === 'Resolved'
                          ? 'text-emerald-700'
                          : report.status === 'In Progress'
                          ? 'text-[#116BFF]'
                          : 'text-amber-700'
                      }`}
                    >
                      {report.status}
                    </span>
                    {report.status === 'Resolved' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          {report.resolvedDays
                            ? `Fixed in ${report.resolvedDays} days`
                            : `Resolved ${report.resolvedDate || ''}`.trim()}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="tabular-nums shrink-0">{report.submittedDate}</span>
                </div>

                {userHelpedFix && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>You helped fix this · Your upvote prioritized this report.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#071B42]">
                    <MapPin className="w-4 h-4 text-[#116BFF] shrink-0" />
                    <span>{report.location}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{report.description}</p>
                </div>

                {/* Before / After Photo Proof or Moderated Single Photo */}
                {(() => {
                  const photoApproved =
                    !report.photoModerationStatus || report.photoModerationStatus === 'approved';
                  const photoPending =
                    report.photoModerationStatus === 'pending_review' ||
                    report.photoModerationStatus === 'flagged';
                  const photoRemoved = report.photoModerationStatus === 'removed';
                  const isCloudReport = !report.id.startsWith('rep-');

                  return (
                    <div className="space-y-2">
                      {report.photoUrl && photoApproved && report.afterPhotoUrl ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#F8F7F4]">
                            <img
                              src={report.photoUrl}
                              alt={`Before photo for ${report.location}`}
                              className="w-full h-36 object-cover"
                            />
                            <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 border-t border-slate-200">
                              Before · {report.submittedDate}
                            </div>
                          </div>
                          <div className="rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/40">
                            <img
                              src={report.afterPhotoUrl}
                              alt={`After resolution photo for ${report.location}`}
                              className="w-full h-36 object-cover"
                            />
                            <div className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 border-t border-emerald-200">
                              After · {report.resolvedDate || 'Resolved'}
                            </div>
                          </div>
                        </div>
                      ) : report.photoUrl && photoApproved ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#F8F7F4]">
                          <img
                            src={report.photoUrl}
                            alt={`Attached resident photo for ${report.location}`}
                            className="w-full h-44 object-cover"
                          />
                        </div>
                      ) : report.afterPhotoUrl ? (
                        <div className="rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/40">
                          <img
                            src={report.afterPhotoUrl}
                            alt={`Resolved photo for ${report.location}`}
                            className="w-full h-44 object-cover"
                          />
                          <div className="px-3 py-1.5 text-[11px] font-bold text-emerald-700 border-t border-emerald-200">
                            Completed Fix Proof · {report.resolvedDate || 'Resolved'}
                          </div>
                        </div>
                      ) : null}

                      {report.photoUrl && photoPending && (
                        <div className="rounded-xl bg-[#F8F7F4] border border-slate-200 px-3 py-2.5 flex items-center gap-2 text-[11px] text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {user?.uid && user.uid === report.authorUid
                              ? 'Your uploaded photo is awaiting quick moderator review before appearing publicly.'
                              : 'Attached photo awaiting moderator review.'}
                          </span>
                        </div>
                      )}

                      {photoRemoved && (
                        <div className="rounded-xl bg-[#F8F7F4] border border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                          Uploaded photo removed by moderator.
                        </div>
                      )}

                      {isCloudReport && report.photoUrl && photoApproved && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                if (!user) {
                                  onRequireLogin();
                                  return;
                                }
                                setFlaggingReportId(
                                  flaggingReportId === report.id ? null : report.id
                                );
                              }}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-700 font-semibold transition-colors"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Flag Photo</span>
                            </button>
                          </div>

                          {flaggingReportId === report.id && (
                            <div className="rounded-xl bg-[#F8F7F4] border border-slate-200 p-3 flex flex-wrap items-center gap-2 text-xs">
                              <select
                                value={photoFlagReason}
                                onChange={(e) => setPhotoFlagReason(e.target.value)}
                                className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#071B42]"
                              >
                                <option value="Private Info / Faces">Private Info / Faces</option>
                                <option value="Inappropriate Content">Inappropriate Content</option>
                                <option value="Off-Topic / Spam">Off-Topic / Spam</option>
                              </select>
                              <button
                                type="button"
                                disabled={flaggingBusy}
                                onClick={() => handleFlagPhotoSubmit(report.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                              >
                                {flaggingBusy ? 'Flagging...' : 'Submit Flag'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {flagStatusMsg[report.id] && (
                        <div className="text-[11px] text-slate-700 bg-[#F8F7F4] border border-slate-200 rounded-lg px-2.5 py-1.5">
                          {flagStatusMsg[report.id]}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {report.officialResponse && (
                  <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 font-bold text-[#071B42]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#116BFF]" />
                        <span>
                          Official Update · {report.officialResponderName || 'Local Department'}
                        </span>
                      </span>
                      {report.officialRespondedAt && (
                        <span className="text-slate-500 tabular-nums">
                          {report.officialRespondedAt}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {report.officialResponse}
                    </p>
                  </div>
                )}

                {/* 4-Step Parcel-Style Issue Tracker */}
                <div className="pt-2 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full ${
                          stage >= step
                            ? report.status === 'Resolved'
                              ? 'bg-emerald-600'
                              : 'bg-[#116BFF]'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-4 text-[10px] text-slate-500">
                    <span>Reported</span>
                    <span>Dispatched</span>
                    <span>In Progress</span>
                    <span className="text-right">Resolved</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Reported by <span className="font-semibold text-[#071B42]">{report.reporterName}</span>
                </span>

                <button
                  onClick={() => onUpvoteReport(report.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors tabular-nums ${
                    hasUpvoted
                      ? 'bg-blue-50 border-[#116BFF] text-[#116BFF]'
                      : 'bg-[#F8F7F4] hover:bg-slate-200/70 text-[#071B42] border-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-[#116BFF]" />
                  <span className="font-bold">{report.upvotes}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Universal Report Any Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#071B42]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl text-[#071B42]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#116BFF]" />
                <h2 className="text-base font-bold">Report a Local Issue ({selectedCommunity.name})</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-[#071B42] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  What kind of issue is it?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((cat) => {
                    const Icon = ISSUE_GUIDE[cat].icon;
                    const active = category === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`text-left p-2.5 rounded-xl border text-[11px] font-semibold transition-colors flex flex-col gap-1 ${
                          active
                            ? 'bg-[#071B42] text-white border-[#071B42]'
                            : 'bg-[#F8F7F4] text-[#071B42] border-slate-200 hover:border-[#116BFF]'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-300' : 'text-[#116BFF]'}`} />
                        <span className="leading-tight">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Educational "Who Handles This?" Card */}
              <div className="rounded-xl bg-[#F8F7F4] border border-slate-200 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#116BFF] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Optional Context: {activeGuide.office}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModalEducation(!showModalEducation)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-[#071B42]"
                  >
                    {showModalEducation ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showModalEducation && (
                  <div className="text-[11px] text-slate-600 space-y-1 leading-relaxed">
                    <p>{activeGuide.explainer}</p>
                    <p className="font-semibold text-[#071B42]">Typical step: {activeGuide.timeline}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address, Landmark, or Nearest Intersection
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bridge St & W 6th St, or Walnut Beach Park entrance"
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                  required
                />
              </div>

              {/* Photo Attachment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Attach Photo (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Helps crews verify scope</span>
                </div>

                {photoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-[#F8F7F4]">
                    <img
                      src={photoUrl}
                      alt="Uploaded 311 report preview"
                      className="w-full h-36 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl('');
                        setPhotoModerationStatus('approved');
                        setPhotoModerationNote('');
                        setPhotoNotice('');
                      }}
                      className="absolute top-2 right-2 bg-[#071B42]/85 hover:bg-[#071B42] text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-[#F8F7F4] hover:border-[#116BFF] hover:bg-blue-50/40 cursor-pointer text-xs font-semibold text-[#071B42] transition-colors">
                    <Camera className="w-4 h-4 text-[#116BFF]" />
                    <span>
                      {uploadingPhoto
                        ? 'Screening & uploading photo...'
                        : 'Take or upload a photo'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                )}

                {photoNotice && !photoError && (
                  <p
                    className={`text-[11px] rounded-lg p-2 border ${
                      photoModerationStatus === 'pending_review'
                        ? 'text-amber-800 bg-amber-50 border-amber-200'
                        : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {photoNotice}
                  </p>
                )}

                {photoError && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    {photoError}
                  </p>
                )}
              </div>

              {/* Click-to-Place Map Pin Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Click map to place pin (Optional)</span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Pin: {pinCoords.x}%, {pinCoords.y}%
                  </span>
                </div>
                <div
                  onClick={handleMapClick}
                  className="relative h-28 rounded-xl bg-[#E8EFF7] border border-slate-200 overflow-hidden cursor-crosshair select-none"
                >
                  <svg viewBox="0 0 800 320" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
                    <path d="M0,0 L800,0 L800,85 C650,95 450,80 180,95 L0,105 Z" fill="#BFDBFE" />
                    <path d="M295,85 L302,320" stroke="#93C5FD" strokeWidth="18" fill="none" />
                    <line x1="0" y1="180" x2="800" y2="180" stroke="#CBD5E1" strokeWidth="2" />
                    <line x1="435" y1="90" x2="435" y2="320" stroke="#CBD5E1" strokeWidth="2" />
                    <text x="444" y="165" fill="#334155" fontSize="14" fontWeight="700">Lake Ave</text>
                    <text x="145" y="135" fill="#334155" fontSize="14" fontWeight="700">Bridge St</text>
                  </svg>
                  <div
                    style={{ left: `${pinCoords.x}%`, top: `${pinCoords.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#116BFF] border-2 border-white shadow-md flex items-center justify-center"
                  >
                    <MapPin className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Describe the issue
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Share what's happening, how long it's been there, or any helpful landmarks..."
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl p-3 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Ashtabula Resident"
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                />
              </div>

              {submitError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || uploadingPhoto}
                className="w-full bg-[#116BFF] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors disabled:opacity-60"
              >
                {submitting ? 'Checking & Submitting...' : 'Submit Issue Report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

