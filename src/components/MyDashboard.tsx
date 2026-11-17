import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Flag,
  Check,
  XCircle,
  AlertTriangle,
  Bell,
  HeartHandshake,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Community,
  CivicCartItem,
  CivicComment,
  CivicItem,
  CommentFlag,
  Report311,
  UserAlertPreference,
  VolunteerSignup,
  WatchlistEntry,
} from '../types';
import { COMMUNITIES, INITIAL_CIVIC_ITEMS } from '../data/mockData';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';
import {
  subscribeModerationComments,
  subscribeCommentFlags,
  moderateCloudComment,
  resolveCommentFlag,
  moderateCloudReportPhoto,
} from '../firebase';

const ALERT_TOPIC_OPTIONS = [
  'Streets & Roads',
  'Taxes & Spending',
  'Schools',
  'Neighborhood & Zoning',
  'Upcoming Votes',
  '311 Status Updates',
];

interface MyDashboardProps {
  selectedCommunity: Community;
  civicCart: CivicCartItem[];
  watchlist: WatchlistEntry[];
  reportsCount: number;
  reports?: Report311[];
  isModerator?: boolean;
  onUpdateReportStatus?: (id: string, status: Report311['status'], afterPhotoUrl?: string) => Promise<void>;
  onRespondToReport?: (
    id: string,
    status: Report311['status'],
    officialResponse: string,
    officialResponderName: string,
    afterPhotoUrl?: string
  ) => Promise<void>;
  onDeleteReport?: (id: string) => Promise<void>;
  alertPreference?: UserAlertPreference | null;
  onSaveAlertPreference?: (
    pref: Omit<UserAlertPreference, 'userId' | 'updatedAtLabel'>
  ) => Promise<void>;
  volunteerSignups?: VolunteerSignup[];
  onRemoveVolunteerSignup?: (opportunityId: string) => Promise<void>;
  onSelectCivicItem: (item: CivicItem) => void;
  onToggleWatchlist: (item: CivicItem) => void;
  onCompleteAction: (id: string) => void;
  onDeleteAction: (id: string) => void;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogin: () => void;
}

export const MyDashboard: React.FC<MyDashboardProps> = ({
  selectedCommunity,
  civicCart,
  watchlist,
  reportsCount,
  reports = [],
  isModerator = false,
  onUpdateReportStatus,
  onRespondToReport,
  onDeleteReport,
  alertPreference,
  onSaveAlertPreference,
  volunteerSignups = [],
  onRemoveVolunteerSignup,
  onSelectCivicItem,
  onToggleWatchlist,
  onCompleteAction,
  onDeleteAction,
  setCurrentTab,
  user,
  onLogin,
}) => {
  const completedCount = civicCart.filter((a) => a.status === 'Completed').length;
  const [modComments, setModComments] = useState<CivicComment[]>([]);
  const [commentFlags, setCommentFlags] = useState<CommentFlag[]>([]);
  const [modFeedback, setModFeedback] = useState('');
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [afterPhotoDrafts, setAfterPhotoDrafts] = useState<Record<string, string>>({});
  const [savingResponseId, setSavingResponseId] = useState<string | null>(null);
  const [moderatingPhotoId, setModeratingPhotoId] = useState<string | null>(null);
  const [uploadingAfterPhotoId, setUploadingAfterPhotoId] = useState<string | null>(null);

  // Alert Preferences state
  const [alertCommunityId, setAlertCommunityId] = useState<string>(selectedCommunity.id);
  const [alertTopics, setAlertTopics] = useState<string[]>([
    'Streets & Roads',
    'Taxes & Spending',
    'Upcoming Votes',
  ]);
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(false);
  const [digestEmail, setDigestEmail] = useState('');
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertStatusMsg, setAlertStatusMsg] = useState('');

  useEffect(() => {
    if (alertPreference) {
      setAlertCommunityId(alertPreference.communityId || selectedCommunity.id);
      setAlertTopics(alertPreference.topics || []);
      setEmailDigestEnabled(Boolean(alertPreference.emailDigestEnabled));
      setDigestEmail(alertPreference.digestEmail || user?.email || '');
    } else {
      setAlertCommunityId(selectedCommunity.id);
      if (user?.email) setDigestEmail(user.email);
    }
  }, [alertPreference, selectedCommunity.id, user]);

  useEffect(() => {
    if (!isModerator || !user) {
      setModComments([]);
      setCommentFlags([]);
      return;
    }
    const unsubComments = subscribeModerationComments(setModComments);
    const unsubFlags = subscribeCommentFlags(setCommentFlags);
    return () => {
      unsubComments();
      unsubFlags();
    };
  }, [isModerator, user]);

  const queueComments = modComments.filter(
    (c) => c.moderationStatus === 'pending_review' || c.moderationStatus === 'flagged'
  );
  const openFlags = commentFlags.filter((f) => f.status === 'open');
  const cloudReports = reports.filter((r) => !r.id.startsWith('rep-'));
  const queuePhotos = cloudReports.filter(
    (r) =>
      Boolean(r.photoUrl) &&
      (r.photoModerationStatus === 'pending_review' || r.photoModerationStatus === 'flagged')
  );

  const handleModerateComment = async (
    commentId: string,
    decision: 'approved' | 'removed'
  ) => {
    setModFeedback('');
    try {
      await moderateCloudComment(
        commentId,
        decision,
        decision === 'approved' ? 'Approved by moderator' : 'Removed by moderator'
      );
      const matchingFlags = openFlags.filter((f) => f.commentId === commentId);
      await Promise.all(matchingFlags.map((f) => resolveCommentFlag(f.id)));
      setModFeedback(
        decision === 'approved'
          ? 'Comment approved and published.'
          : 'Comment removed from public feed.'
      );
    } catch (err: any) {
      setModFeedback(err.message || 'Unable to update comment status.');
    }
  };

  const handleModeratePhoto = async (
    report: Report311,
    decision: 'approved' | 'removed'
  ) => {
    setModeratingPhotoId(report.id);
    setModFeedback('');
    try {
      await moderateCloudReportPhoto(
        report.id,
        decision,
        decision === 'approved' ? 'Photo approved by moderator' : 'Photo removed by moderator'
      );
      setModFeedback(
        decision === 'approved'
          ? `Uploaded photo for "${report.location}" approved and published.`
          : `Uploaded photo for "${report.location}" removed from public view.`
      );
    } catch (err: any) {
      setModFeedback(err.message || 'Unable to update photo moderation status.');
    } finally {
      setModeratingPhotoId(null);
    }
  };

  const handleAfterPhotoFile = async (
    report: Report311,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAfterPhotoId(report.id);
    setModFeedback('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Invalid image file.'));
          img.onload = () => {
            const scale = img.width > 960 ? 960 / img.width : 1;
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas unavailable.'));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/uploads/report-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          category: report.category,
          description: `Resolved proof for ${report.location}`,
        }),
      });
      const data = await res.json();
      if (data.decision === 'block') {
        setModFeedback(data.reason || 'After-photo blocked by safety screening.');
        return;
      }
      if (!res.ok || !data.photoUrl) {
        throw new Error(data.error || 'Could not upload after-photo.');
      }
      setAfterPhotoDrafts((prev) => ({ ...prev, [report.id]: data.photoUrl }));
      setModFeedback(`After-photo uploaded and screened for ${report.location}. Click Publish to attach.`);
    } catch (err: any) {
      setModFeedback(err.message || 'Unable to process after-photo.');
    } finally {
      setUploadingAfterPhotoId(null);
    }
  };

  const handleSaveOfficialResponse = async (rep: Report311) => {
    if (!onRespondToReport) return;
    const draft = (responseDrafts[rep.id] ?? rep.officialResponse ?? '').trim();
    const afterUrl = (afterPhotoDrafts[rep.id] ?? rep.afterPhotoUrl ?? '').trim();
    if (!draft) return;
    setSavingResponseId(rep.id);
    setModFeedback('');
    try {
      await onRespondToReport(
        rep.id,
        rep.status,
        draft,
        user?.displayName || 'Ashtabula Moderator / Staff',
        afterUrl || undefined
      );
      setModFeedback(`Official response saved on 311 ticket at ${rep.location}.`);
    } catch (err: any) {
      setModFeedback(err.message || 'Unable to save official response.');
    } finally {
      setSavingResponseId(null);
    }
  };

  const toggleAlertTopic = (topic: string) => {
    setAlertTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSaveAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLogin();
      return;
    }
    if (!onSaveAlertPreference) return;
    setSavingAlerts(true);
    setAlertStatusMsg('');
    try {
      await onSaveAlertPreference({
        communityId: alertCommunityId,
        topics: alertTopics,
        emailDigestEnabled,
        ...(emailDigestEnabled && digestEmail.trim()
          ? { digestEmail: digestEmail.trim() }
          : {}),
      });
      setAlertStatusMsg('Alert preferences saved to your account.');
    } catch (err: any) {
      setAlertStatusMsg(err.message || 'Could not save alert preferences.');
    } finally {
      setSavingAlerts(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 text-[#071B42]">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-[#116BFF]">
            My {selectedCommunity.name} · Personal Tracker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
            {user
              ? `${user.displayName || user.email}’s Watchlist & Actions`
              : `Track local issues & decisions in ${selectedCommunity.name}`}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {user
              ? 'Your followed proposals, neighborhood topic alerts, and action checklist are synced with Firestore.'
              : 'Sign in with Google to save your watchlist, topic alerts, and action checklist across devices.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          {!user && (
            <button
              onClick={onLogin}
              className="bg-[#116BFF] hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-xs whitespace-nowrap shrink-0"
            >
              Sign In to Sync
            </button>
          )}
        </div>
      </div>

      {/* Real Activity Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
          <div className="text-xs text-slate-500">Followed Issues</div>
          <div className="text-2xl font-extrabold text-[#071B42] tabular-nums">
            {watchlist.length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
          <div className="text-xs text-slate-500">Completed Actions</div>
          <div className="text-2xl font-extrabold text-[#116BFF] tabular-nums">
            {completedCount} / {civicCart.length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1">
          <div className="text-xs text-slate-500">Community 311 Reports</div>
          <div className="text-2xl font-extrabold text-[#071B42] tabular-nums">
            {reportsCount}
          </div>
        </div>
      </div>

      {/* Moderator Review Queue (Role-Gated via Firestore RBAC) */}
      {isModerator && user && (
        <section className="bg-white rounded-2xl border-2 border-[#116BFF]/30 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-base font-bold text-[#071B42]">
                <ShieldCheck className="w-5 h-5 text-[#116BFF]" />
                <span>Moderator &amp; Official Queue</span>
              </div>
              <p className="text-xs text-slate-500">
                Review held or flagged resident comments, update 311 statuses, and publish official department responses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tabular-nums">
              <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {queueComments.length} Comments Waiting
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {queuePhotos.length} Photos Waiting
              </span>
              <span className="px-3 py-1 rounded-lg bg-blue-50 text-[#116BFF] border border-blue-200">
                {openFlags.length} Open Flags
              </span>
            </div>
          </div>

          {modFeedback && (
            <div className="text-xs font-medium text-[#071B42] bg-[#F8F7F4] border border-slate-200 rounded-xl p-3">
              {modFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flagged & Pending Comments */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#071B42] uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-600" />
                <span>Comments Needing Review ({queueComments.length})</span>
              </h3>

              {queueComments.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#F8F7F4] border border-slate-200 text-xs text-slate-500 text-center">
                  All caught up. No comments currently flagged or held for review.
                </div>
              ) : (
                <div className="space-y-3">
                  {queueComments.map((c) => {
                    const relatedFlags = openFlags.filter((f) => f.commentId === c.id);
                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-bold text-[#071B42]">
                            {c.authorName} ·{' '}
                            <span className="text-amber-700 font-semibold">
                              {c.moderationStatus === 'flagged'
                                ? `Flagged (${c.flagCount || relatedFlags.length})`
                                : 'Held by Pre-Screen'}
                            </span>
                          </div>
                          <span className="text-slate-400 tabular-nums">{c.createdAtLabel}</span>
                        </div>
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                          {c.body}
                        </p>
                        {c.moderationNote && (
                          <div className="text-[11px] text-slate-500">
                            Screening note: {c.moderationNote}
                          </div>
                        )}
                        {relatedFlags.length > 0 && (
                          <div className="space-y-1 text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2">
                            {relatedFlags.map((fl) => (
                              <div key={fl.id}>
                                <span className="font-bold">{fl.reason}:</span>{' '}
                                {fl.details || 'Reported by resident'}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleModerateComment(c.id, 'approved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleModerateComment(c.id, 'removed')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Cloud 311 Reports Status, Official Response & Removal Controls */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#071B42] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#116BFF]" />
                <span>Live 311 Tickets &amp; Official Responses ({cloudReports.length})</span>
              </h3>

              {cloudReports.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#F8F7F4] border border-slate-200 text-xs text-slate-500 text-center">
                  No new resident-submitted 311 tickets in Firestore yet. Baseline map pins remain read-only.
                </div>
              ) : (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {cloudReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-[#071B42]">
                            {rep.category} · {rep.location}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            By {rep.reporterName} · {rep.submittedDate}
                          </div>
                        </div>
                        {onDeleteReport && (
                          <button
                            onClick={() => onDeleteReport(rep.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete invalid 311 report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{rep.description}</p>

                      {onUpdateReportStatus && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                          <select
                            value={rep.status}
                            onChange={(e) =>
                              onUpdateReportStatus(rep.id, e.target.value as Report311['status'])
                            }
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="Dispatched">Dispatched</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                      )}

                      {onRespondToReport && (
                        <div className="pt-1 space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={responseDrafts[rep.id] ?? rep.officialResponse ?? ''}
                              onChange={(e) =>
                                setResponseDrafts((prev) => ({
                                  ...prev,
                                  [rep.id]: e.target.value,
                                }))
                              }
                              placeholder="Write official city or township crew update..."
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                            />
                            <button
                              type="button"
                              disabled={savingResponseId === rep.id}
                              onClick={() => handleSaveOfficialResponse(rep)}
                              className="px-3 py-1.5 rounded-lg bg-[#071B42] hover:bg-[#0d2a61] text-white text-xs font-semibold shrink-0 transition-colors"
                            >
                              {savingResponseId === rep.id ? 'Saving...' : 'Publish'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={afterPhotoDrafts[rep.id] ?? rep.afterPhotoUrl ?? ''}
                              onChange={(e) =>
                                setAfterPhotoDrafts((prev) => ({
                                  ...prev,
                                  [rep.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional resolved after-photo URL (/uploads/... or https://...)"
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                            />
                            <label className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-[#071B42] cursor-pointer inline-flex items-center gap-1 shrink-0">
                              <Camera className="w-3 h-3 text-[#116BFF]" />
                              <span>{uploadingAfterPhotoId === rep.id ? 'Screening...' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleAfterPhotoFile(rep, e)}
                                disabled={uploadingAfterPhotoId === rep.id}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 311 Photos Needing Review Queue */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-[#071B42] uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Uploaded 311 Photos Needing Review ({queuePhotos.length})</span>
            </h3>

            {queuePhotos.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#F8F7F4] border border-slate-200 text-xs text-slate-500 text-center">
                All caught up. No uploaded 311 photos currently held or flagged for visual review.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queuePhotos.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-[#071B42]">
                          {rep.category} · {rep.location}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          By {rep.reporterName} · {rep.submittedDate} ·{' '}
                          <span className="font-semibold text-amber-700">
                            {rep.photoModerationStatus === 'flagged'
                              ? `Flagged (${rep.photoFlagCount || 1})`
                              : 'Held by Pre-Screen'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {rep.photoUrl && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={rep.photoUrl}
                          alt={`Moderation preview for ${rep.location}`}
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}

                    {rep.photoModerationNote && (
                      <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                        Note: {rep.photoModerationNote}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={moderatingPhotoId === rep.id}
                        onClick={() => handleModeratePhoto(rep, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Photo</span>
                      </button>
                      <button
                        type="button"
                        disabled={moderatingPhotoId === rep.id}
                        onClick={() => handleModeratePhoto(rep, 'removed')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-60"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Neighborhood Topic & Jurisdiction Alerts Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#116BFF]" />
            <div>
              <h2 className="text-base font-bold text-[#071B42]">
                Neighborhood Topic &amp; Jurisdiction Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Choose which Ashtabula County city, village, or township topics you want prioritized in your feed and digest.
              </p>
            </div>
          </div>
          {alertPreference?.updatedAtLabel && (
            <span className="text-[11px] text-slate-500 tabular-nums">
              Last saved: {alertPreference.updatedAtLabel}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveAlerts} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Alert Jurisdiction
              </label>
              <select
                value={alertCommunityId}
                onChange={(e) => setAlertCommunityId(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
              >
                {COMMUNITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.kind})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailDigestEnabled}
                  onChange={(e) => setEmailDigestEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-[#116BFF] focus:ring-[#116BFF]"
                />
                <span>Enable weekly email summary digest</span>
              </label>
              <input
                type="email"
                value={digestEmail}
                onChange={(e) => setDigestEmail(e.target.value)}
                disabled={!emailDigestEnabled}
                placeholder="you@example.com"
                className="w-full bg-[#F8F7F4] disabled:opacity-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">Topics to Follow</div>
            <div className="flex flex-wrap gap-2">
              {ALERT_TOPIC_OPTIONS.map((topic) => {
                const active = alertTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleAlertTopic(topic)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#071B42] text-white border-[#071B42]'
                        : 'bg-[#F8F7F4] text-[#071B42] border-slate-200 hover:border-[#116BFF]'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {alertStatusMsg && (
            <p className="text-xs font-medium text-[#071B42] bg-blue-50 border border-blue-200 rounded-xl p-2.5">
              {alertStatusMsg}
            </p>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={savingAlerts}
              className="px-5 py-2.5 rounded-xl bg-[#116BFF] hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              {user
                ? savingAlerts
                  ? 'Saving Preferences...'
                  : 'Save Alert Preferences'
                : 'Sign In to Save Alerts'}
            </button>
          </div>
        </form>
      </section>

      {/* Watchlist & Action Queue 2-Col Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Followed Proposals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#071B42] flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#116BFF]" />
              <span>Followed Proposals</span>
            </h2>
            <button
              onClick={() => setCurrentTab('discover')}
              className="text-xs text-[#116BFF] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 space-y-3">
              <p>You aren’t following any proposals yet.</p>
              <button
                onClick={() => setCurrentTab('discover')}
                className="bg-[#071B42] text-white font-semibold px-4 py-2 rounded-lg text-xs"
              >
                Browse Proposals
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {watchlist.map((entry) => {
                const matched = INITIAL_CIVIC_ITEMS.find((i) => i.id === entry.itemId);
                return (
                  <div key={entry.id} className="py-3.5 flex items-start justify-between gap-3">
                    <button
                      onClick={() => matched && onSelectCivicItem(matched)}
                      className="text-left space-y-1 min-w-0"
                    >
                      <div className="text-xs font-bold text-[#071B42] hover:text-[#116BFF]">
                        {entry.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {entry.department} · {entry.status}
                      </div>
                    </button>
                    {matched && (
                      <button
                        onClick={() => onToggleWatchlist(matched)}
                        className="text-xs text-slate-400 hover:text-rose-600 shrink-0"
                        title="Unfollow"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#071B42] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#116BFF]" />
              <span>Action Checklist</span>
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">{civicCart.length} total</span>
          </div>

          {civicCart.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 space-y-3">
              <p>No civic actions queued yet.</p>
              <button
                onClick={() => setCurrentTab('discover')}
                className="bg-[#116BFF] text-white font-semibold px-4 py-2 rounded-lg text-xs"
              >
                Find Ways to Act
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {civicCart.map((action) => (
                <div key={action.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[#116BFF]">
                      {action.actionType} · {action.status}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        action.status === 'Completed'
                          ? 'line-through text-slate-400'
                          : 'text-[#071B42]'
                      }`}
                    >
                      {action.title}
                    </div>
                    <div className="text-[11px] text-slate-500">{action.targetEntity}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {action.status !== 'Completed' && (
                      <button
                        onClick={() => onCompleteAction(action.id)}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        title="Mark completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteAction(action.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Board & Volunteer Commitments */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-[#071B42] flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#116BFF]" />
            <span>Open Boards &amp; Volunteer Commitments</span>
          </h2>
          <button
            type="button"
            onClick={() => setCurrentTab('officials')}
            className="text-xs text-[#116BFF] font-semibold hover:underline flex items-center gap-1"
          >
            <span>Browse Seats &amp; Cleanups</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {volunteerSignups.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 space-y-2">
            <p>No local board or volunteer seats tracked yet.</p>
            <button
              type="button"
              onClick={() => setCurrentTab('officials')}
              className="bg-[#F8F7F4] hover:bg-slate-200/70 text-[#071B42] border border-slate-200 font-semibold px-4 py-2 rounded-lg text-xs"
            >
              Explore Open Boards &amp; Volunteer Finder
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {volunteerSignups.map((signup) => (
              <div key={signup.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-[#071B42]">{signup.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {signup.kind} · {signup.communityName} · {signup.status} ({signup.createdAtLabel})
                  </div>
                </div>
                {onRemoveVolunteerSignup && (
                  <button
                    type="button"
                    onClick={() => onRemoveVolunteerSignup(signup.opportunityId)}
                    className="text-xs text-slate-400 hover:text-rose-600 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

