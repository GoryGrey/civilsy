import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Mail,
  FileText,
  ExternalLink,
  MessageSquare,
  Send,
  PlusCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Flag,
  Trash2,
  ShieldCheck,
  Clock,
  Share2,
  Copy,
  Check,
  X,
  CalendarPlus,
  Vote,
} from 'lucide-react';
import { CivicItem, CivicComment, CivicCartItem, CommentFlag, ResidentPulse } from '../types';
import { User } from 'firebase/auth';
import {
  subscribeApprovedComments,
  subscribeOwnPendingComments,
  postCloudComment,
  deleteOwnCloudComment,
  flagCloudComment,
  subscribeResidentPulses,
  submitResidentPulse,
} from '../firebase';
import {
  downloadCivicCalendarEvent,
  formatClosingCountdown,
  getNextCouncilMeetingDate,
} from '../utils/calendar';

interface CivicDetailViewProps {
  item: CivicItem;
  onBack: () => void;
  user: User | null;
  isModerator?: boolean;
  onRequireLogin: () => void;
  isWatched: boolean;
  onToggleWatchlist: (item: CivicItem) => void;
  onAddAction: (action: Omit<CivicCartItem, 'id'>) => void;
  onContactOfficial: () => void;
}

export const CivicDetailView: React.FC<CivicDetailViewProps> = ({
  item,
  onBack,
  user,
  isModerator = false,
  onRequireLogin,
  isWatched,
  onToggleWatchlist,
  onAddAction,
  onContactOfficial,
}) => {
  const [aiTranslation, setAiTranslation] = useState<any>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [approvedComments, setApprovedComments] = useState<CivicComment[]>([]);
  const [ownPendingComments, setOwnPendingComments] = useState<CivicComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [stance, setStance] = useState<CivicComment['stance']>('Support');
  const [postAsOfficial, setPostAsOfficial] = useState(false);
  const [officialRoleLabel, setOfficialRoleLabel] = useState('Verified Official / Moderator');
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentNotice, setCommentNotice] = useState('');
  const [flaggingCommentId, setFlaggingCommentId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState<CommentFlag['reason']>('Harassment');
  const [flagDetails, setFlagDetails] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [actionAdded, setActionAdded] = useState(false);
  const [showProcessGuide, setShowProcessGuide] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [pulses, setPulses] = useState<ResidentPulse[]>([]);
  const [pulseStance, setPulseStance] = useState<ResidentPulse['stance']>('Support');
  const [pulseReason, setPulseReason] = useState('');
  const [pulseSaving, setPulseSaving] = useState(false);
  const [pulseNotice, setPulseNotice] = useState('');
  const [calendarSaved, setCalendarSaved] = useState(false);

  useEffect(() => {
    const unsubApproved = subscribeApprovedComments(item.id, (loaded) => {
      setApprovedComments(loaded);
    });
    const unsubPulses = subscribeResidentPulses(item.id, (loaded) => {
      setPulses(loaded);
    });
    return () => {
      unsubApproved();
      unsubPulses();
    };
  }, [item.id]);

  useEffect(() => {
    if (!user) {
      setOwnPendingComments([]);
      return;
    }
    const unsubOwn = subscribeOwnPendingComments(item.id, user.uid, (loaded) => {
      setOwnPendingComments(loaded);
    });
    return () => unsubOwn();
  }, [item.id, user]);

  useEffect(() => {
    if (user) {
      const existing = pulses.find((p) => p.userId === user.uid);
      if (existing) {
        setPulseStance(existing.stance);
        setPulseReason(existing.reason || '');
      }
    }
  }, [pulses, user]);

  const comments = [...ownPendingComments, ...approvedComments];

  const handleSavePulse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }
    setPulseSaving(true);
    setPulseNotice('');
    try {
      await submitResidentPulse(item.id, pulseStance, pulseReason);
      setPulseNotice('Your non-binding Resident Pulse was saved.');
    } catch (err: any) {
      setPulseNotice(err.message || 'Unable to save Resident Pulse right now.');
    } finally {
      setPulseSaving(false);
    }
  };

  // Combine seeded county baseline with live Firestore resident pulses
  const baseSupport = item.officialVoteComparison?.baselineSupportPct ? 18 : 9;
  const baseConcern = item.officialVoteComparison?.baselineConcernPct ? 2 : 3;
  const baseQuestion = 2;
  const supportCount = baseSupport + pulses.filter((p) => p.stance === 'Support').length;
  const concernCount = baseConcern + pulses.filter((p) => p.stance === 'Concerned').length;
  const questionCount = baseQuestion + pulses.filter((p) => p.stance === 'Question').length;
  const totalPulseCount = supportCount + concernCount + questionCount;
  const supportPct = Math.round((supportCount / totalPulseCount) * 100);
  const concernPct = Math.round((concernCount / totalPulseCount) * 100);
  const questionPct = Math.max(0, 100 - supportPct - concernPct);

  const handleRunPlainEnglish = async () => {
    setTranslating(true);
    setTranslateError('');
    try {
      const res = await fetch('/api/ai/translate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: item.title,
          documentText: `${item.summary}\n\n${item.fullDescription}\n\nCost impact: ${item.costImpact}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate breakdown');
      setAiTranslation(data);
    } catch (err: any) {
      setTranslateError(err.message || 'Unable to load plain-English breakdown');
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!commentBody.trim()) return;
    setPostingComment(true);
    setCommentError('');
    setCommentNotice('');
    try {
      const modRes = await fetch('/api/moderation/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'comment',
          text: commentBody.trim(),
        }),
      });
      const modData = await modRes.json();

      if (modData.decision === 'block') {
        setCommentError(
          modData.reason ||
            'Your comment could not be posted because it violates community safety guidelines.'
        );
        return;
      }

      const moderationStatus =
        modData.decision === 'flag' && !(isModerator && postAsOfficial)
          ? 'pending_review'
          : 'approved';

      await postCloudComment({
        civicItemId: item.id,
        authorName: user.displayName || 'Ashtabula Resident',
        stance,
        body: commentBody.trim(),
        createdAtLabel: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        moderationStatus,
        moderationNote: modData.reason || undefined,
        ...(isModerator && postAsOfficial
          ? {
              isOfficialResponse: true,
              officialRole: officialRoleLabel.trim() || 'Verified Official / Moderator',
            }
          : {}),
      });

      setCommentBody('');
      setPostAsOfficial(false);
      if (moderationStatus === 'pending_review') {
        setCommentNotice(
          'Your comment was submitted and is held for quick moderator review before appearing publicly.'
        );
      } else {
        setCommentNotice('Your comment is now live.');
      }
    } catch (err: any) {
      setCommentError(err.message || 'Unable to post comment right now.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteOwnComment = async (commentId: string) => {
    setCommentError('');
    try {
      await deleteOwnCloudComment(commentId);
    } catch (err: any) {
      setCommentError(err.message || 'Unable to delete comment.');
    }
  };

  const handleFlagSubmit = async (comment: CivicComment) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    setFlagSubmitting(true);
    setCommentError('');
    try {
      await flagCloudComment(comment, flagReason, flagDetails);
      setFlaggingCommentId(null);
      setFlagDetails('');
      setCommentNotice(
        'Comment flagged and routed to the Civilsy moderator review queue.'
      );
    } catch (err: any) {
      setCommentError(err.message || 'Unable to submit report right now.');
    } finally {
      setFlagSubmitting(false);
    }
  };

  const verifiedShareSummary = [
    `${item.title}`,
    `Department: ${item.department}`,
    `Date & Location: ${item.date} · ${item.location}`,
    `Bottom Line: ${item.summary}`,
    `Cost & Tax Impact: ${item.costImpact}`,
    `Verified Source (${item.sourceLabel}): ${item.sourceUrl || window.location.href}`,
    `Shared via CIVILSY — Your community. Your voice.`,
  ].join('\n');

  const handleCopyShareCard = async () => {
    try {
      await navigator.clipboard.writeText(verifiedShareSummary);
      setCopiedShare(true);
      setShareStatus('Verified summary & source copied.');
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      setShareStatus('Copy blocked by browser—select the summary text below.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `${item.summary}\n\n${item.date} · ${item.location}`,
          url: item.sourceUrl || window.location.href,
        });
        setShareStatus('Shared successfully.');
      } catch {
        // User dismissed share sheet cleanly
      }
    } else {
      await handleCopyShareCard();
    }
  };

  const stages = [
    { step: 1, label: 'Introduced' },
    { step: 2, label: 'Reviewed' },
    { step: 3, label: 'Public Hearing' },
    { step: 4, label: 'Final Decision' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb & Back */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#071B42] hover:text-[#116BFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover</span>
        </button>

        <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
          <span>{item.departmentGroup}</span>
          <span aria-hidden="true">/</span>
          <span className="text-[#071B42] font-medium">{item.category}</span>
        </div>
      </div>

      {/* Main 2-Column Product-Grade Civic Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Structured Breakdown & Community Discussion */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Block */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#116BFF]">{item.departmentGroup}</span>
              <span aria-hidden="true">·</span>
              <span>{item.status}</span>
              <span aria-hidden="true">·</span>
              <span>Impact: {item.impactLevel}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
              {item.title}
            </h1>

            {/* Bottom Line */}
            <div className="bg-[#F8F7F4] rounded-xl p-4 border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-[#071B42]">Bottom Line</div>
              <p className="text-sm text-slate-700 leading-relaxed">{item.summary}</p>
            </div>

            {/* 4-Step Delivery-Style Legislative Tracker + Optional Process Guide */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-[#071B42]">Where This Stands</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Stage {item.progressStage} of 4</span>
                  <button
                    type="button"
                    onClick={() => setShowProcessGuide(!showProcessGuide)}
                    className="text-[#116BFF] font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showProcessGuide ? 'Hide guide' : 'How this process works'}</span>
                    {showProcessGuide ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {stages.map((st) => {
                  const reached = item.progressStage >= st.step;
                  return (
                    <div key={st.step} className="space-y-1.5">
                      <div
                        className={`h-2 rounded-full ${
                          reached ? 'bg-[#116BFF]' : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`text-[11px] font-medium ${
                          reached ? 'text-[#071B42]' : 'text-slate-400'
                        }`}
                      >
                        {st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showProcessGuide && (
                <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-slate-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <div className="font-bold text-[#071B42]">Optional Context: How Ashtabula County Decisions Move</div>
                  <p>
                    Municipal ordinances and township resolutions normally go through public readings or board sessions before final votes. Committee reviews and public hearings during Stages 2 and 3 are when resident testimony and written comments carry the strongest impact.
                  </p>
                </div>
              )}
            </div>

            {/* Full Official Context */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h2 className="text-sm font-bold text-[#071B42]">Official Details</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{item.fullDescription}</p>
            </div>

            {/* Who Benefits / Who Pays / Open Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-[#071B42]">Who Benefits</div>
                <p className="text-xs text-slate-700 leading-relaxed">{item.whoBenefits}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-[#071B42]">Who Pays</div>
                <p className="text-xs text-slate-700 leading-relaxed">{item.whoPays}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-[#071B42]">Key Questions Residents Are Asking</div>
              <ul className="space-y-1.5">
                {item.openQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-[#116BFF] font-bold">·</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Before the Vote: Resident Pulse + Final Vote Comparison */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-[#116BFF]" />
                <div>
                  <h2 className="text-base font-bold text-[#071B42]">
                    {item.officialVoteComparison
                      ? 'Resident Pulse vs. Final Official Vote'
                      : 'Before the Vote · Resident Pulse'}
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {item.closingSoonDeadline && item.calendarStartIso
                      ? formatClosingCountdown(
                          item.id === 'item-5'
                            ? new Date(new Date(item.calendarStartIso).getTime() - 2 * 3600000)
                            : new Date(item.calendarStartIso),
                          item.id === 'item-5'
                            ? 'Clerk speaker cutoff'
                            : item.id === 'item-3'
                            ? 'Board Work Session'
                            : 'Council reading'
                        )
                      : item.closingSoonDeadline ||
                        'Quick non-binding neighborhood temperature check shared ahead of official sessions.'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">
                {totalPulseCount} responses
              </span>
            </div>

            {item.officialVoteComparison && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#116BFF]">Resident Pulse</div>
                  <div className="text-lg font-extrabold text-[#071B42] tabular-nums">
                    {item.officialVoteComparison.baselineSupportPct}% Support
                  </div>
                  <div className="text-slate-600 tabular-nums">
                    {item.officialVoteComparison.baselineConcernPct}% Concerned ·{' '}
                    {100 -
                      item.officialVoteComparison.baselineSupportPct -
                      item.officialVoteComparison.baselineConcernPct}
                    % Questions
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-emerald-700">Final Official Vote</div>
                  <div className="text-lg font-extrabold text-[#071B42]">
                    {item.officialVoteComparison.resultLabel}
                  </div>
                  <p className="text-slate-600 leading-snug">{item.officialVoteComparison.note}</p>
                </div>
              </div>
            )}

            {/* Aggregate Pulse Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                <div style={{ width: `${supportPct}%` }} className="bg-emerald-600" />
                <div style={{ width: `${questionPct}%` }} className="bg-[#116BFF]" />
                <div style={{ width: `${concernPct}%` }} className="bg-amber-500" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                <span className="font-semibold text-emerald-700">Support {supportPct}%</span>
                <span className="font-semibold text-[#116BFF]">Questions {questionPct}%</span>
                <span className="font-semibold text-amber-700">Concerned {concernPct}%</span>
              </div>
            </div>

            <form onSubmit={handleSavePulse} className="space-y-3 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                {(['Support', 'Question', 'Concerned'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPulseStance(option)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      pulseStance === option
                        ? 'bg-[#071B42] text-white border-[#071B42]'
                        : 'bg-[#F8F7F4] text-[#071B42] border-slate-200 hover:border-[#116BFF]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={pulseReason}
                  onChange={(e) => setPulseReason(e.target.value)}
                  maxLength={240}
                  placeholder="Optional 1-sentence reason for Council or Trustees..."
                  className="flex-1 bg-[#F8F7F4] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                />
                <button
                  type="submit"
                  disabled={pulseSaving}
                  className="px-4 py-2 rounded-xl bg-[#116BFF] hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? (pulseSaving ? 'Saving...' : 'Save Pulse') : 'Sign In to Weigh In'}
                </button>
              </div>
              {pulseNotice && (
                <p className="text-xs text-[#071B42] bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  {pulseNotice}
                </p>
              )}
            </form>
          </div>

          {/* On-Demand AI Plain-English Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#071B42]">Plain-English Policy Breakdown</h2>
                <p className="text-xs text-slate-500">
                  Translate official terms, pros, cons, and taxpayer cost using Civilsy AI.
                </p>
              </div>
              {!aiTranslation && (
                <button
                  onClick={handleRunPlainEnglish}
                  disabled={translating}
                  className="px-4 py-2 rounded-lg bg-[#071B42] hover:bg-[#0d2a61] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {translating ? 'Analyzing...' : 'Generate Plain-English Brief'}
                </button>
              )}
            </div>

            {translateError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                {translateError}
              </p>
            )}

            {aiTranslation && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <p className="text-sm font-semibold text-[#071B42]">{aiTranslation.tldr}</p>
                <div className="space-y-2">
                  {aiTranslation.keyTakeaways?.map((t: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <div className="font-bold text-emerald-900">Potential Upsides</div>
                    <ul className="list-disc list-inside space-y-1 text-emerald-900/90">
                      {aiTranslation.prosAndCons?.pros?.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-900">Questions &amp; Trade-offs</div>
                    <ul className="list-disc list-inside space-y-1 text-amber-900/90">
                      {aiTranslation.prosAndCons?.cons?.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Firestore Moderated Public Comments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#116BFF]" />
                <h2 className="text-base font-bold text-[#071B42]">
                  Resident Input ({comments.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#116BFF]" />
                <span>Automated screening &amp; community moderation</span>
              </span>
            </div>

            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {(['Support', 'Concern', 'Question'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStance(option)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        stance === option
                          ? 'bg-[#071B42] text-white border-[#071B42]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {isModerator && (
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#071B42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postAsOfficial}
                      onChange={(e) => setPostAsOfficial(e.target.checked)}
                      className="rounded border-slate-300 text-[#116BFF] focus:ring-[#116BFF]"
                    />
                    <span>Post as Verified Official Response</span>
                  </label>
                )}
              </div>

              {isModerator && postAsOfficial && (
                <input
                  type="text"
                  value={officialRoleLabel}
                  onChange={(e) => setOfficialRoleLabel(e.target.value)}
                  placeholder="Official title or department (e.g., Township Trustee / City Intake)"
                  className="w-full bg-blue-50/70 border border-blue-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                />
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder={
                    user
                      ? 'Share your perspective with neighbors and local officials...'
                      : 'Sign in with Google to add your public comment...'
                  }
                  className="flex-1 bg-[#F8F7F4] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                />
                <button
                  type="submit"
                  disabled={postingComment}
                  className="px-4 py-2.5 rounded-xl bg-[#116BFF] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{user ? (postingComment ? 'Checking...' : 'Post') : 'Sign In'}</span>
                </button>
              </div>
              {commentError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  {commentError}
                </p>
              )}
              {commentNotice && (
                <p className="text-xs text-[#071B42] bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  {commentNotice}
                </p>
              )}
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No public comments posted here yet. Be the first resident to weigh in.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {comments.map((c) => {
                  const isOwn = Boolean(user && c.authorUid === user.uid);
                  const isPending = c.moderationStatus !== 'approved';
                  const isFlagging = flaggingCommentId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`py-3.5 space-y-2 ${
                        c.isOfficialResponse
                          ? 'bg-blue-50/50 -mx-3 px-3 rounded-xl border border-blue-200 my-1'
                          : ''
                      }`}
                    >
                      {c.isOfficialResponse && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#116BFF]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Official · {c.officialRole || 'Municipal / Township Update'}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#071B42]">{c.authorName}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              c.stance === 'Support'
                                ? 'text-emerald-700'
                                : c.stance === 'Concern'
                                ? 'text-amber-700'
                                : 'text-[#116BFF]'
                            }`}
                          >
                            {c.stance}
                          </span>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" />
                              <span>
                                {c.moderationStatus === 'flagged'
                                  ? 'Flagged for Review'
                                  : 'Pending Moderator Review'}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-slate-400 tabular-nums">{c.createdAtLabel}</span>
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOwnComment(c.id)}
                              className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 text-[11px] font-medium"
                              title="Delete your comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                          {!isOwn && c.moderationStatus === 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!user) {
                                  onRequireLogin();
                                  return;
                                }
                                setFlaggingCommentId(isFlagging ? null : c.id);
                              }}
                              className="text-slate-400 hover:text-amber-700 inline-flex items-center gap-1 text-[11px] font-medium"
                              title="Flag comment for moderation"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Flag</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{c.body}</p>

                      {isFlagging && (
                        <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-2.5">
                          <div className="text-[11px] font-bold text-[#071B42]">
                            Report comment to moderators
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(['Harassment', 'Spam', 'Private Info', 'Misleading'] as const).map(
                              (reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => setFlagReason(reason)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                    flagReason === reason
                                      ? 'bg-[#071B42] text-white border-[#071B42]'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {reason}
                                </button>
                              )
                            )}
                          </div>
                          <input
                            type="text"
                            value={flagDetails}
                            onChange={(e) => setFlagDetails(e.target.value)}
                            placeholder="Optional context for moderators..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={flagSubmitting}
                              onClick={() => handleFlagSubmit(c)}
                              className="px-3 py-1.5 rounded-lg bg-[#071B42] text-white text-xs font-semibold hover:bg-[#0d2a61]"
                            >
                              {flagSubmitting ? 'Submitting...' : 'Submit Flag'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFlaggingCommentId(null)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-[#071B42]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Sticky Decision & 1-Click Action Panel */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-base font-bold text-[#071B42] border-b border-slate-100 pb-3">
              Decision Summary &amp; Actions
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-[#116BFF] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-500">Responsible Body</div>
                  <div className="font-semibold text-[#071B42]">{item.department}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#116BFF] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-500">Next Scheduled Session</div>
                  <div className="font-semibold text-[#071B42] tabular-nums">{item.date}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#116BFF] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-500">Location</div>
                  <div className="font-semibold text-[#071B42]">{item.location}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-[#116BFF] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-500">Cost &amp; Tax Impact</div>
                  <div className="font-semibold text-[#071B42]">{item.costImpact}</div>
                </div>
              </div>
            </div>

            {/* Primary 1-Click Action Stack */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onAddAction({
                    civicItemId: item.id,
                    title: item.title,
                    actionType: item.category === 'Meeting' ? 'Attend Meeting' : 'Public Comment',
                    targetEntity: item.department,
                    dueDate: item.date,
                    status: 'Queued',
                  });
                  setActionAdded(true);
                  setTimeout(() => setActionAdded(false), 2500);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#116BFF] hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{actionAdded ? 'Saved to Action Queue' : 'Save to Action Queue'}</span>
              </button>

              <button
                onClick={() => onToggleWatchlist(item)}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isWatched
                    ? 'bg-blue-50 border-[#116BFF] text-[#116BFF]'
                    : 'bg-white border-slate-200 text-[#071B42] hover:bg-[#F8F7F4]'
                }`}
              >
                {isWatched ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Following on Watchlist</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Follow Updates</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadCivicCalendarEvent({
                    title: item.title,
                    description: `${item.summary}\n\nSource: ${item.sourceUrl || item.sourceLabel}`,
                    location: item.location,
                    startIso: item.calendarStartIso || getNextCouncilMeetingDate().toISOString(),
                    durationMinutes: item.calendarDurationMin || 90,
                  });
                  setCalendarSaved(true);
                  setTimeout(() => setCalendarSaved(false), 2500);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-[#F8F7F4] text-[#071B42] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <CalendarPlus className="w-4 h-4 text-[#116BFF]" />
                <span>{calendarSaved ? 'Calendar File (.ics) Downloaded' : 'Add Session to Calendar (.ics)'}</span>
              </button>

              <button
                onClick={onContactOfficial}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-[#F8F7F4] text-[#071B42] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                <span>Email Responsible Official</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareStatus('');
                  setIsShareOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-[#F8F7F4] hover:bg-slate-200/70 text-[#071B42] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-[#116BFF]" />
                <span>Share Verified Card</span>
              </button>
            </div>

            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 hover:text-[#116BFF]"
              >
                <span>Verified Source: {item.sourceLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                Source: {item.sourceLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verify Before You Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 bg-[#071B42]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl text-[#071B42]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#116BFF]" />
                <h2 className="text-base font-bold">Verify Before You Share</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="text-slate-400 hover:text-[#071B42] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source-Verified Summary Card */}
            <div className="rounded-xl bg-[#F8F7F4] border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#116BFF]">
                <span>{item.department}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">{item.date}</span>
              </div>
              <h3 className="text-sm font-extrabold text-[#071B42] leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">{item.summary}</p>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div>
                  <span className="font-bold text-[#071B42]">Location:</span> {item.location}
                </div>
                <div>
                  <span className="font-bold text-[#071B42]">Cost Impact:</span> {item.costImpact}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="font-bold text-[#071B42] truncate">
                    Official Source: {item.sourceLabel}
                  </span>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#116BFF] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Verify</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {shareStatus && (
              <p className="text-xs text-[#071B42] bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                {shareStatus}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#116BFF] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via Device</span>
              </button>
              <button
                type="button"
                onClick={handleCopyShareCard}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#071B42] hover:bg-[#0d2a61] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {copiedShare ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedShare ? 'Copied Summary' : 'Copy Summary Text'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

