import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Shield,
  Truck,
  Flame,
  Trees,
  Building2,
  Calculator,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Vote,
  Scale,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Community, BallotLevyItem } from '../types';
import {
  BALLOT_LEVIES,
  COMMUNITIES,
  getBenchmarkForCommunity,
} from '../data/mockData';

interface BudgetExplorerProps {
  selectedCommunity: Community;
}

type ExplorerTab = 'estimator' | 'ballot' | 'compare';

export const BudgetExplorer: React.FC<BudgetExplorerProps> = ({ selectedCommunity }) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('estimator');
  const [homeValue, setHomeValue] = useState<number>(150000);
  const [selectedDept, setSelectedDept] = useState<string>('Police & Public Safety');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showTaxMath, setShowTaxMath] = useState(false);

  // Comparison selections (always compare selectedCommunity + 2 peers)
  const [peerOneId, setPeerOneId] = useState<string>(
    selectedCommunity.id === 'conneaut-oh' ? 'ashtabula-oh' : 'conneaut-oh'
  );
  const [peerTwoId, setPeerTwoId] = useState<string>(
    selectedCommunity.id === 'saybrook-twp-oh' ? 'jefferson-village-oh' : 'saybrook-twp-oh'
  );

  const activeBenchmark = getBenchmarkForCommunity(selectedCommunity);
  // Ohio 35% assessed value math using selected community's illustrative effective millage
  const assessedValue = Math.round(homeValue * 0.35);
  const estimatedAnnualTax = Math.round((assessedValue / 1000) * activeBenchmark.effectiveMills);
  const schoolShare = Math.round(estimatedAnnualTax * (activeBenchmark.schoolPct / 100));
  const countyShare = Math.round(estimatedAnnualTax * (activeBenchmark.countyPct / 100));
  const cityShare = Math.round(estimatedAnnualTax * (activeBenchmark.localPct / 100));
  const libraryAndOtherShare = Math.max(
    0,
    estimatedAnnualTax - schoolShare - countyShare - cityShare
  );

  const budgetDepartments = [
    {
      name: 'Police & Public Safety',
      share: '32%',
      icon: Shield,
      description: 'Patrol operations, dispatch, traffic enforcement, and community safety.',
    },
    {
      name: 'Public Works & Streets',
      share: '27%',
      icon: Truck,
      description: 'Road resurfacing, pothole patching, snow plowing, and storm drains.',
    },
    {
      name: 'Fire & EMS',
      share: '19%',
      icon: Flame,
      description: 'Fire suppression, paramedic response, and safety code inspections.',
    },
    {
      name: 'Parks & Waterfront',
      share: '11%',
      icon: Trees,
      description: 'Walnut Beach, Lake Shore Park, playgrounds, and public green spaces.',
    },
    {
      name: 'City Operations & Finance',
      share: '11%',
      icon: Building2,
      description: 'Council Clerk, finance administration, IT, and building inspections.',
    },
  ];

  // Personalized Ashtabula County ballot & levy matching
  const matchingLevies: BallotLevyItem[] = useMemo(() => {
    const schoolLower = (selectedCommunity.schoolDistrict || '').toLowerCase();
    const matched: BallotLevyItem[] = [];
    let matchedSpecificSchool = false;

    for (const levy of BALLOT_LEVIES) {
      if (levy.scopeKind === 'Countywide') {
        matched.push(levy);
        continue;
      }
      if (levy.communityIds && levy.communityIds.includes(selectedCommunity.id)) {
        matched.push(levy);
        continue;
      }
      if (levy.scopeKind === 'Township' && selectedCommunity.kind === 'Township') {
        matched.push(levy);
        continue;
      }
      if (levy.scopeKind === 'School' && levy.schoolKeyword) {
        if (schoolLower.includes(levy.schoolKeyword.toLowerCase())) {
          matched.push(levy);
          matchedSpecificSchool = true;
        }
      }
    }

    if (!matchedSpecificSchool) {
      const genericSchool = BALLOT_LEVIES.find((l) => l.id === 'levy-county-schools-pi');
      if (genericSchool) matched.push(genericSchool);
    }
    return matched;
  }, [selectedCommunity]);

  const compareCommunities = useMemo(() => {
    const peerOne =
      COMMUNITIES.find((c) => c.id === peerOneId) ||
      COMMUNITIES.find((c) => c.id !== selectedCommunity.id) ||
      COMMUNITIES[0];
    const peerTwo =
      COMMUNITIES.find((c) => c.id === peerTwoId) ||
      COMMUNITIES.find((c) => c.id !== selectedCommunity.id && c.id !== peerOne.id) ||
      COMMUNITIES[1];

    const list = [selectedCommunity];
    if (peerOne.id !== selectedCommunity.id) list.push(peerOne);
    if (peerTwo.id !== selectedCommunity.id && peerTwo.id !== peerOne.id) list.push(peerTwo);
    return list;
  }, [selectedCommunity, peerOneId, peerTwoId]);

  const handleExplainBudget = async (deptName: string) => {
    setSelectedDept(deptName);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `In plain English, what does ${selectedCommunity.name}'s ${deptName} department pay for, and how can residents inspect or give input on its budget?`,
          contextCommunity: `${selectedCommunity.name}, ${selectedCommunity.state}`,
        }),
      });
      if (!res.ok) {
        throw new Error('Could not reach budget assistant');
      }
      const data = await res.json();
      setAiAnalysis(
        data.summary ||
          data.whyItHappens ||
          `Budgets for ${deptName} in ${selectedCommunity.name} are reviewed in open public meetings before annual adoption.`
      );
    } catch {
      setAiAnalysis(
        `${selectedCommunity.name}'s ${deptName} budget is reviewed in open public meetings (${selectedCommunity.councilMeetingSchedule}). Residents can inspect line items under Ohio Revised Code § 149.43.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 text-[#071B42]">
      {/* Header + 3-Tab Segmented Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#116BFF]">
            Taxes, Ballots &amp; Benchmarks · {selectedCommunity.name}, {selectedCommunity.state}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
            Property taxes, local levies &amp; county comparisons
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            See how Ohio’s 35% assessed-value rule splits a homeowner’s bill, preview local levies for {selectedCommunity.name}, and compare millage and 311 speed across Ashtabula County.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#F8F7F4] rounded-xl border border-slate-200 w-fit overflow-x-auto max-w-full">
          {[
            { id: 'estimator', label: 'Tax Estimator & Spending', icon: Calculator },
            { id: 'ballot', label: `On My Ballot & Levies (${matchingLevies.length})`, icon: Vote },
            { id: 'compare', label: 'Compare Ashtabula County', icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ExplorerTab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-[#071B42] text-white'
                    : 'text-slate-600 hover:bg-white hover:text-[#071B42]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-300' : 'text-[#116BFF]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shared Home Value Slider Card across Estimator & Ballot Tabs */}
      {(activeTab === 'estimator' || activeTab === 'ballot') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-[#116BFF]" />
              <div>
                <h2 className="text-base font-bold text-[#071B42]">
                  {activeTab === 'estimator'
                    ? `Ohio Homeowner Tax Estimator · ${selectedCommunity.name}`
                    : `Your Home Value for Levy Estimates · ${selectedCommunity.name}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Ohio taxes 35% of County-appraised market value (1 mill = $1 per $1,000 assessed value).
                </p>
              </div>
            </div>

            <div className="text-right tabular-nums">
              <div className="text-xs text-slate-500">
                Est. Total Annual Tax ({activeBenchmark.effectiveMills} eff. mills)
              </div>
              <div className="text-2xl font-extrabold text-[#071B42]">
                ${estimatedAnnualTax.toLocaleString()}/yr
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">County-Appraised Market Value</span>
              <span className="text-[#116BFF] font-bold tabular-nums">
                ${homeValue.toLocaleString()} (35% Assessed = ${assessedValue.toLocaleString()})
              </span>
            </div>
            <input
              type="range"
              min={60000}
              max={450000}
              step={5000}
              value={homeValue}
              onChange={(e) => setHomeValue(Number(e.target.value))}
              className="w-full accent-[#116BFF] cursor-pointer"
            />
          </div>

          {activeTab === 'estimator' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">
                    {selectedCommunity.schoolDistrict || 'Local Schools'} (~{activeBenchmark.schoolPct}%)
                  </div>
                  <div className="text-lg font-extrabold text-[#071B42] tabular-nums">
                    ${schoolShare.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">
                    Ashtabula County (~{activeBenchmark.countyPct}%)
                  </div>
                  <div className="text-lg font-extrabold text-[#071B42] tabular-nums">
                    ${countyShare.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">
                    {selectedCommunity.name} (~{activeBenchmark.localPct}%)
                  </div>
                  <div className="text-lg font-extrabold text-[#116BFF] tabular-nums">
                    ${cityShare.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1">
                  <div className="text-xs text-slate-500">
                    Library, A-Tech &amp; Parks (~{activeBenchmark.otherPct}%)
                  </div>
                  <div className="text-lg font-extrabold text-[#071B42] tabular-nums">
                    ${libraryAndOtherShare.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-500">
                  Note: Estimate uses Ohio’s 35% taxable value rule before Homestead or owner-occupancy credits. Verify exact parcel figures with Ashtabula County Auditor Scott Yamamoto at (440) 576-3783.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTaxMath(!showTaxMath)}
                  className="text-xs font-semibold text-[#116BFF] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{showTaxMath ? 'Hide Tax Math' : 'Explain Ohio Tax Math (Optional)'}</span>
                  {showTaxMath ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showTaxMath && (
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
                  <div className="space-y-1">
                    <div className="font-bold text-[#071B42]">Step 1: 35% Assessed Value</div>
                    <p className="leading-relaxed tabular-nums">
                      Ohio only taxes 35% of your home’s appraised market value: ${homeValue.toLocaleString()} × 35% ={' '}
                      <span className="font-bold text-[#116BFF]">${assessedValue.toLocaleString()}</span>.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-[#071B42]">Step 2: What is a Mill?</div>
                    <p className="leading-relaxed tabular-nums">
                      1 mill equals $1 of tax per $1,000 of assessed value. At ~{activeBenchmark.effectiveMills} effective mills, ({(assessedValue / 1000).toFixed(1)} × ${activeBenchmark.effectiveMills}) ≈{' '}
                      <span className="font-bold text-[#071B42]">${estimatedAnnualTax.toLocaleString()}/yr</span>.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-[#071B42]">Step 3: Why HB 920 Matters</div>
                    <p className="leading-relaxed">
                      When county revaluations raise home prices, Ohio HB 920 reduces voted levy rates so they do not spike dollar-for-dollar, while inside millage adjusts with value.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 1: Department Spending & Plain-English Guide */}
      {activeTab === 'estimator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <div className="p-5">
              <h2 className="text-base font-bold text-[#071B42]">
                Local Service Spending Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Select a service area for a plain-English explanation.
              </p>
            </div>

            {budgetDepartments.map((dept) => {
              const Icon = dept.icon;
              const active = selectedDept === dept.name;
              return (
                <button
                  key={dept.name}
                  onClick={() => handleExplainBudget(dept.name)}
                  className={`w-full text-left p-5 flex items-center justify-between gap-4 transition-colors ${
                    active ? 'bg-blue-50/50' : 'hover:bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] border border-slate-200 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#116BFF]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#071B42]">{dept.name}</div>
                      <p className="text-xs text-slate-600 line-clamp-1">{dept.description}</p>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-[#071B42] tabular-nums shrink-0">
                    {dept.share}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-[#116BFF]" />
              <h3 className="text-sm font-bold text-[#071B42]">Plain-English Department Guide</h3>
            </div>

            {loading ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-[#116BFF] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Preparing plain-English guide...</p>
              </div>
            ) : (
              <div className="bg-[#F8F7F4] p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-[#071B42]">{selectedDept}</div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {aiAnalysis ||
                    'Click any service area on the left to learn how funds are used and when your local board reviews its budget.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Personalized "On My Ballot" & Levy Explainer */}
      {activeTab === 'ballot' && (
        <div className="space-y-4">
          {/* Renewal vs Replacement vs New Mini Primer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-emerald-700">Renewal Levy</div>
              <p className="text-slate-600 leading-relaxed">
                Keeps the same voted tax collection on older property values—does <span className="font-semibold text-[#071B42]">not</span> raise your tax rate.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-amber-700">Replacement Levy</div>
              <p className="text-slate-600 leading-relaxed">
                Resets the levy’s effective rate to current county property values—meaning bills generally rise compared to a renewal.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-[#116BFF]">New / Additional Levy</div>
              <p className="text-slate-600 leading-relaxed">
                Adds brand-new millage on top of your existing property tax bill for new services or construction.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {matchingLevies.map((levy) => {
              const annualCost = Math.round((assessedValue / 1000) * levy.mills);
              const monthlyCost = (annualCost / 12).toFixed(2);
              return (
                <div
                  key={levy.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#116BFF]">
                        {levy.scopeKind} ·{' '}
                        <span
                          className={
                            levy.levyType === 'Renewal'
                              ? 'text-emerald-700'
                              : levy.levyType === 'Replacement'
                              ? 'text-amber-700'
                              : 'text-[#071B42]'
                          }
                        >
                          {levy.levyType}
                        </span>{' '}
                        · {levy.term}
                      </span>
                      <span className="text-slate-500 tabular-nums">{levy.electionDate}</span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-[#071B42] leading-snug">
                        {levy.title}
                      </h3>
                      <div className="text-xs text-slate-500">{levy.authority}</div>
                    </div>

                    {/* Exact Cost Box */}
                    <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-slate-200 flex items-center justify-between gap-3 tabular-nums">
                      <div>
                        <div className="text-[11px] text-slate-500">
                          {levy.mills} mills on ${homeValue.toLocaleString()} home
                        </div>
                        <div className="text-lg font-extrabold text-[#071B42]">
                          ${annualCost}/yr{' '}
                          <span className="text-xs font-semibold text-slate-500">
                            (${monthlyCost}/mo)
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-semibold text-slate-600">
                        {levy.levyType === 'Renewal'
                          ? 'Existing rate continued'
                          : 'Updated valuation rate'}
                      </div>
                    </div>

                    {/* What YES does vs What NO does */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>If YES Passes</span>
                        </div>
                        <p className="text-emerald-950/90 leading-relaxed">{levy.yesOutcome}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>If NO / Expires</span>
                        </div>
                        <p className="text-amber-950/90 leading-relaxed">{levy.noOutcome}</p>
                      </div>
                    </div>
                  </div>

                  <a
                    href={levy.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-[#116BFF]"
                  >
                    <span>Source: {levy.sourceLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Compare Across Ashtabula County Benchmarks */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          {/* Jurisdiction Picker Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#071B42]">
                  Side-by-Side Ashtabula County Comparison
                </h2>
                <p className="text-xs text-slate-500">
                  Compare {selectedCommunity.name} with any two Ashtabula County cities, villages, or townships on effective millage, tax split, 311 speed, and public meetings.
                </p>
              </div>
              <div className="text-xs font-bold text-[#116BFF] tabular-nums">
                Based on ${homeValue.toLocaleString()} home
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200">
                <div className="text-[11px] font-semibold text-[#116BFF] mb-1">
                  Your Active Jurisdiction
                </div>
                <div className="font-bold text-[#071B42]">
                  {selectedCommunity.name} ({selectedCommunity.kind})
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Compare Against #1
                </label>
                <select
                  value={peerOneId}
                  onChange={(e) => setPeerOneId(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                >
                  {COMMUNITIES.filter((c) => c.id !== selectedCommunity.id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.kind})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Compare Against #2
                </label>
                <select
                  value={peerTwoId}
                  onChange={(e) => setPeerTwoId(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                >
                  {COMMUNITIES.filter((c) => c.id !== selectedCommunity.id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.kind})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Benchmark Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {compareCommunities.map((comm, idx) => {
              const bm = getBenchmarkForCommunity(comm);
              const taxBill = Math.round((assessedValue / 1000) * bm.effectiveMills);
              const isPrimary = idx === 0;
              return (
                <div
                  key={comm.id}
                  className={`bg-white rounded-2xl border p-6 space-y-4 ${
                    isPrimary ? 'border-[#116BFF]' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[#116BFF]">
                      {comm.kind} {isPrimary ? '· Selected' : ''}
                    </div>
                    <h3 className="text-lg font-extrabold text-[#071B42]">{comm.name}</h3>
                    <div className="text-xs text-slate-500">Pop. {comm.population}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 tabular-nums">
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Effective Rate</div>
                      <div className="text-base font-extrabold text-[#071B42]">
                        {bm.effectiveMills} mills
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Est. Annual Bill</div>
                      <div className="text-base font-extrabold text-[#116BFF]">
                        ${taxBill.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200">
                      <div className="text-[11px] text-slate-500">311 Turnaround</div>
                      <div className="text-base font-extrabold text-[#071B42]">
                        {bm.median311Days} days
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Open Meetings</div>
                      <div className="text-base font-extrabold text-[#071B42]">
                        {bm.openMeetingsPerMonth}/mo
                      </div>
                    </div>
                  </div>

                  {/* Tax Split Bar */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Tax Dollar Split (Schools / County / Local / Other)
                    </div>
                    <div className="h-3 w-full rounded-full overflow-hidden flex border border-slate-200">
                      <div style={{ width: `${bm.schoolPct}%` }} className="bg-[#071B42]" />
                      <div style={{ width: `${bm.countyPct}%` }} className="bg-[#116BFF]" />
                      <div style={{ width: `${bm.localPct}%` }} className="bg-sky-400" />
                      <div style={{ width: `${bm.otherPct}%` }} className="bg-emerald-500" />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 tabular-nums">
                      <span>Schools {bm.schoolPct}%</span>
                      <span>County {bm.countyPct}%</span>
                      <span>Local {bm.localPct}%</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {bm.highlightNote}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

