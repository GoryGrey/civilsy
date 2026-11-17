import React from 'react';
import { ArrowLeft, Shield, Scale, AlertCircle } from 'lucide-react';

interface LegalViewProps {
  docType: 'privacy' | 'terms';
  onSwitchDoc: (doc: 'privacy' | 'terms') => void;
  onBack: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({
  docType,
  onSwitchDoc,
  onBack,
}) => {
  return (
    <div className="space-y-6 pb-16 text-[#071B42] max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#071B42] hover:text-[#116BFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200">
          <button
            onClick={() => onSwitchDoc('privacy')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              docType === 'privacy'
                ? 'bg-[#071B42] text-white'
                : 'text-slate-600 hover:text-[#071B42]'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => onSwitchDoc('terms')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              docType === 'terms'
                ? 'bg-[#071B42] text-white'
                : 'text-slate-600 hover:text-[#071B42]'
            }`}
          >
            Terms of Service
          </button>
        </div>
      </div>

      {docType === 'privacy' ? (
        <article className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 space-y-8">
          <header className="space-y-2 border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116BFF]">
              <Shield className="w-4 h-4" />
              <span>CIVILSY Privacy Policy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
              How CIVILSY handles your civic data
            </h1>
            <p className="text-xs text-slate-500">
              Effective Date: November 2026 · Applies to the CIVILSY web &amp; installable app
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">1. Information You Provide</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              You can browse meetings, local officials, and educational guides without signing in. When you choose to sign in with Google (powered by Firebase Authentication), CIVILSY receives your display name, email address, and profile photo so your account stays synced across sessions and devices.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              If you submit a 311 neighborhood issue report, post a public comment, flag a comment, follow a proposal on your watchlist, or save items to your Action Checklist, that content is stored in Google Cloud Firestore.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">2. Public vs. Private Information</h2>
            <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>
                <span className="font-semibold text-[#071B42]">Publicly visible:</span> Approved comments on civic proposals and 311 neighborhood issue reports (category, description, approximate map location, and the display name you submit).
              </li>
              <li>
                <span className="font-semibold text-[#071B42]">Private to your account:</span> Your email address, personal Watchlist, personal Action Checklist, and any comments held as pending review prior to moderator approval.
              </li>
              <li>
                <span className="font-semibold text-[#071B42]">Moderator visibility:</span> Reports you flag for harassment, spam, or private info are visible only to authorized CIVILSY moderators so they can protect the community.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">3. Automated Safety &amp; Live Source Grounding</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Submitted comments and 311 issue descriptions are checked by an automated safety screening step before publishing to block hate speech, threats, doxxing, and spam. Plain-English policy summaries and Live Official Source Sync queries check public municipal, school board, and county records without attaching your personal account identity to external searches.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">4. No Sale of Resident Data</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              CIVILSY does not sell, rent, or broker your personal information to data brokers, political campaigns, or third-party advertising networks.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">5. Your Choices &amp; Deletion</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              You can delete your own comments directly from any proposal thread, remove items from your Watchlist or Action Checklist at any time, or contact us at{' '}
              <a
                href="mailto:smalltownbigcityent@gmail.com"
                className="text-[#116BFF] font-semibold hover:underline"
              >
                smalltownbigcityent@gmail.com
              </a>{' '}
              to request full account data removal.
            </p>
          </section>
        </article>
      ) : (
        <article className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 space-y-8">
          <header className="space-y-2 border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116BFF]">
              <Scale className="w-4 h-4" />
              <span>CIVILSY Terms of Service</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
              Community Guidelines &amp; Terms of Use
            </h1>
            <p className="text-xs text-slate-500">
              Effective Date: November 2026 · Your community. Your voice.
            </p>
          </header>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Important Emergency Notice:</span> CIVILSY is an independent civic information platform and is not an emergency service or official city 911 dispatch system. For life-safety emergencies, downed power lines, gas leaks, or active crimes, always call 911 immediately.
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">1. Independent Civic Information</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              CIVILSY helps residents follow local government decisions, estimate local tax splits, report non-emergency neighborhood issues, and learn how city, county, and school processes work. While we link to official portals and use live source checks, official meeting times, legal notices, and final tax assessments are governed solely by the respective municipal, school district, or county office.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">2. Respectful Civic Speech &amp; Moderation</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              CIVILSY protects vigorous, good-faith debate on public policies, city budgets, schools, and neighborhood issues. When posting comments or 311 reports, you agree NOT to post:
            </p>
            <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>Threats of violence, hate speech, slurs, or targeted harassment against neighbors or officials.</li>
              <li>Private personal information (doxxing), including private phone numbers, home addresses of private citizens, or personal financial details.</li>
              <li>Commercial spam, misleading scam links, or intentionally false 311 issue submissions.</li>
            </ul>
            <p className="text-sm text-slate-700 leading-relaxed">
              Posts may be automatically screened, held for review, flagged by residents, or removed by moderators if they violate these standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">3. Educational Calculators &amp; AI Briefs</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Plain-English policy breakdowns, constituent email drafts, and Ohio property tax calculators are provided for informational and educational convenience—not legal, tax, or financial advice. Always review drafted letters before sending and confirm tax calculations with the Ashtabula County Auditor or your local county auditor.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#071B42]">4. Accounts &amp; Contact</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              You are responsible for activity under your signed-in Google account. Questions about these terms or moderation appeals may be sent to{' '}
              <a
                href="mailto:smalltownbigcityent@gmail.com"
                className="text-[#116BFF] font-semibold hover:underline"
              >
                smalltownbigcityent@gmail.com
              </a>
              .
            </p>
          </section>
        </article>
      )}
    </div>
  );
};
