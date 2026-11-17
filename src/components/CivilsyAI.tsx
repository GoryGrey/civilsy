import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  CheckCircle2,
  ArrowRight,
  MapPin,
  FileText,
  ThumbsUp,
  PlusCircle,
} from 'lucide-react';
import { Community, CivicCartItem, CivicItem, Report311 } from '../types';
import { INITIAL_CIVIC_ITEMS, POPULAR_QUESTIONS } from '../data/mockData';

interface CivilsyAIProps {
  selectedCommunity: Community;
  reports: Report311[];
  onUpvoteReport: (id: string) => void;
  onSelectCivicItem: (item: CivicItem) => void;
  addToCart: (item: Omit<CivicCartItem, 'id'>) => void;
  setCurrentTab: (tab: string) => void;
  initialQuery?: string;
}

export const CivilsyAI: React.FC<CivilsyAIProps> = ({
  selectedCommunity,
  reports,
  onUpvoteReport,
  onSelectCivicItem,
  addToCart,
  setCurrentTab,
  initialQuery = '',
}) => {
  const [question, setQuestion] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuestion(initialQuery);
      handleAsk(initialQuery);
    }
  }, [initialQuery]);

  const handleAsk = async (queryText?: string) => {
    const q = (queryText ?? question).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          contextCommunity: `${selectedCommunity.name}, ${selectedCommunity.state}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to route your question');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Civilsy Action Router.');
    } finally {
      setLoading(false);
    }
  };

  // Find related 311 reports and proposals matching keywords
  const queryLower = question.toLowerCase();
  const matchingReports = reports.filter(
    (r) =>
      queryLower.includes('pothole') ||
      queryLower.includes('road') ||
      queryLower.includes('street') ||
      queryLower.includes('light') ||
      queryLower.includes('drain') ||
      queryLower.includes('water') ||
      queryLower.includes('tree') ||
      queryLower.includes('park') ||
      queryLower.includes('trash') ||
      queryLower.includes('sidewalk') ||
      r.location.toLowerCase().includes(queryLower) ||
      r.category.toLowerCase().includes(queryLower)
  );

  const matchingItems = INITIAL_CIVIC_ITEMS.filter((item) => {
    if (!queryLower) return false;
    return (
      item.title.toLowerCase().includes(queryLower) ||
      item.summary.toLowerCase().includes(queryLower) ||
      (queryLower.includes('tax') && item.departmentGroup === 'Taxes & Spending') ||
      ((queryLower.includes('road') || queryLower.includes('pothole') || queryLower.includes('street')) &&
        item.departmentGroup === 'Streets & Roads') ||
      ((queryLower.includes('park') || queryLower.includes('tree') || queryLower.includes('zoning')) &&
        item.departmentGroup === 'Neighborhood & Zoning') ||
      (queryLower.includes('school') && item.departmentGroup === 'Schools') ||
      (queryLower.includes('council') && item.departmentGroup === 'Upcoming Votes')
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 text-[#071B42]">
      {/* Action Router Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-[#116BFF]">
            Civilsy Action Router · {selectedCommunity.name}, {selectedCommunity.state}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
            What do you need help with?
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Ask a plain-English question about any city service, bill, rule, or neighborhood issue. We identify the responsible office, surface nearby existing reports or decisions, and route you to the exact next step.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. "a streetlight is out on my block" or "why are property taxes changing?"'
              className="w-full bg-[#F8F7F4] text-[#071B42] placeholder-slate-400 text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116BFF] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#116BFF] hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap shrink-0"
          >
            {loading ? 'Routing...' : 'Find Answer & Action'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500 font-medium">Try:</span>
          {POPULAR_QUESTIONS.map((pq) => (
            <button
              key={pq}
              onClick={() => {
                setQuestion(pq);
                handleAsk(pq);
              }}
              className="text-xs font-medium text-[#071B42] bg-[#F8F7F4] hover:bg-slate-200/70 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              {pq}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#116BFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">
            Matching your question with {selectedCommunity.name} offices and live community records...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Structured Action Router Results */}
      {!loading && result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Direct Answer + Steps */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="space-y-1.5 border-b border-slate-100 pb-4">
                <div className="text-xs font-bold text-[#116BFF]">Direct Answer</div>
                <p className="text-base font-bold text-[#071B42] leading-relaxed">
                  {result.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#071B42]">
                    <Building2 className="w-3.5 h-3.5 text-[#116BFF]" />
                    <span>Who Handles This</span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">{result.whoIsResponsible}</p>
                  <p className="text-[11px] text-slate-500">{result.officeContact}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                  <div className="text-xs font-bold text-[#071B42]">Why It Happens</div>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.whyItHappens}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h2 className="text-xs font-bold text-[#071B42]">Recommended Steps</h2>
                <div className="space-y-2">
                  {result.actionableSteps?.map((step: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-slate-700 bg-[#F8F7F4] p-3 rounded-xl border border-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1-Click Primary Routed Action */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setCurrentTab(result.recommendedTab || 'fix')}
                  className="bg-[#116BFF] hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>{result.recommendedActionLabel || 'Take Action Now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    addToCart({
                      title: question.slice(0, 80),
                      actionType: 'Email Official',
                      targetEntity: result.whoIsResponsible || `${selectedCommunity.name} Office`,
                      status: 'Queued',
                    });
                    setAdded(true);
                    setTimeout(() => setAdded(false), 2500);
                  }}
                  className="bg-white hover:bg-[#F8F7F4] text-[#071B42] font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#116BFF]" />
                  <span>{added ? 'Saved to Action Queue' : 'Save to Action Queue'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Nearby Existing 311 Reports & Related Local Decisions */}
          <div className="lg:col-span-5 space-y-6">
            {matchingReports.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-bold text-[#071B42]">
                    Existing Nearby Reports ({matchingReports.length})
                  </h3>
                  <button
                    onClick={() => setCurrentTab('fix')}
                    className="text-xs font-semibold text-[#116BFF] hover:underline"
                  >
                    File new report
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Upvote an existing report instead of filing a duplicate.
                </p>
                <div className="divide-y divide-slate-100">
                  {matchingReports.slice(0, 3).map((rep) => (
                    <div key={rep.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#071B42]">
                          <MapPin className="w-3.5 h-3.5 text-[#116BFF] shrink-0" />
                          <span className="truncate">{rep.location}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{rep.description}</p>
                        <div className="text-[10px] text-slate-400">
                          {rep.category} · {rep.status}
                        </div>
                      </div>
                      <button
                        onClick={() => onUpvoteReport(rep.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#116BFF] text-xs font-semibold flex items-center gap-1 shrink-0 tabular-nums"
                      >
                        <ThumbsUp className="w-3 h-3 text-[#116BFF]" />
                        <span>{rep.upvotes}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchingItems.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#071B42] border-b border-slate-100 pb-2.5">
                  Related Decisions &amp; Resources
                </h3>
                <div className="space-y-2.5">
                  {matchingItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectCivicItem(item)}
                      className="w-full text-left p-3 rounded-xl bg-[#F8F7F4] border border-slate-200 hover:border-[#116BFF] transition-colors space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-[#116BFF] font-semibold">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{item.departmentGroup}</span>
                      </div>
                      <div className="text-xs font-bold text-[#071B42]">{item.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
