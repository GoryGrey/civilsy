import React, { useState } from 'react';
import { BookOpen, Clock, CheckCircle2, ChevronRight, X, Compass } from 'lucide-react';
import { AcademyModule } from '../types';
import { ACADEMY_MODULES } from '../data/mockData';

const SCENARIOS = [
  {
    id: 'scen-1',
    prompt: 'A storm drain on Bridge St is backed up and flooding the curb.',
    options: ['Ashtabula County Auditor', 'City Public Works (311)', 'Area City Schools'],
    correctIndex: 1,
    explanation:
      'City Public Works (4250 Lake Ave) maintains municipal catch basins and street storm drains. Logging it in Report 311 dispatches the right crew.',
  },
  {
    id: 'scen-2',
    prompt: 'Your triennial county property appraisal looks higher than neighborhood sales.',
    options: ['Ashtabula City Council', 'ODOT District 4', 'Ashtabula County Auditor (Board of Revision)'],
    correctIndex: 2,
    explanation:
      'Property valuations are set by the Ashtabula County Auditor (25 W Jefferson St, Jefferson · 440-576-3783), not City Hall. Homeowners can file a Board of Revision review Jan 1 – Mar 31.',
  },
  {
    id: 'scen-3',
    prompt: 'You want to speak about an upcoming neighborhood streetscape ordinance.',
    options: [
      'Ashtabula City Council (1st & 3rd Mondays)',
      'State Treasurer Office',
      'County Sheriff Dispatch',
    ],
    correctIndex: 0,
    explanation:
      'City Council meets the 1st and 3rd Mondays at 6:00 PM at 4230 Lake Ave. Contact Clerk Stacy L. Millberg at (440) 992-7119 to confirm the agenda.',
  },
];

export const CivicsAcademy: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<AcademyModule | null>(null);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [pickedOption, setPickedOption] = useState<number | null>(null);

  const scenario = SCENARIOS[scenarioIdx];

  return (
    <div className="space-y-6 pb-16 text-[#071B42]">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-2">
        <div className="text-xs font-bold text-[#116BFF]">Civics Guide · Plain-English Handbook</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
          How local government actually works
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Optional plain-English guides and an interactive jurisdiction challenge explaining Ohio local offices, property taxes, public records, and how to speak at City Council.
        </p>
      </div>

      {/* Interactive "Who Handles It?" Scenario Challenge */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#116BFF]" />
            <h2 className="text-base font-bold text-[#071B42]">
              Quick Practice: Who Do You Contact?
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {SCENARIOS.map((sc, i) => (
              <button
                key={sc.id}
                onClick={() => {
                  setScenarioIdx(i);
                  setPickedOption(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                  scenarioIdx === i
                    ? 'bg-[#071B42] text-white'
                    : 'bg-[#F8F7F4] text-slate-600 hover:text-[#071B42]'
                }`}
              >
                Scenario {i + 1}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm font-bold text-[#071B42]">{scenario.prompt}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {scenario.options.map((opt, idx) => {
            const isPicked = pickedOption === idx;
            const isCorrect = idx === scenario.correctIndex;
            let style =
              'bg-[#F8F7F4] border-slate-200 text-[#071B42] hover:border-[#116BFF]';
            if (pickedOption !== null) {
              if (isCorrect) style = 'bg-emerald-50 border-emerald-500 text-emerald-900';
              else if (isPicked) style = 'bg-amber-50 border-amber-400 text-amber-900';
            }
            return (
              <button
                key={opt}
                onClick={() => setPickedOption(idx)}
                className={`text-left p-3.5 rounded-xl border text-xs font-semibold transition-colors ${style}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {pickedOption !== null && (
          <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#071B42]">
                {pickedOption === scenario.correctIndex ? 'Exactly right: ' : 'Good to know: '}
              </span>
              {scenario.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ACADEMY_MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => setSelectedModule(mod)}
            className="text-left bg-white rounded-2xl border border-slate-200 p-6 space-y-4 flex flex-col justify-between hover:border-[#116BFF] transition-colors group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-[#116BFF]">{mod.category}</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{mod.readTime}</span>
                </span>
              </div>

              <h3 className="text-base font-bold text-[#071B42] group-hover:text-[#116BFF] transition-colors">
                {mod.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">{mod.summary}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs w-full">
              <span className="text-slate-500">Level: {mod.level}</span>
              <span className="text-[#116BFF] font-semibold flex items-center gap-1">
                <span>Read guide</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Module Reader Modal */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 bg-[#071B42]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl text-[#071B42]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#116BFF] font-bold">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {selectedModule.category} · {selectedModule.level}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#071B42]">
                  {selectedModule.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-slate-400 hover:text-[#071B42] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedModule.content.map((para, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-[#F8F7F4] p-4 rounded-xl border border-slate-200 text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-slate-700 leading-relaxed">{para}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedModule(null)}
              className="w-full bg-[#071B42] hover:bg-[#0d2a61] text-white font-semibold py-3 rounded-xl text-xs transition-colors"
            >
              Done Reading
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
