import React, { useState } from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { Community } from '../types';

interface FooterProps {
  selectedCommunity: Community;
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ selectedCommunity, setCurrentTab }) => {
  const [digestEmail, setDigestEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="bg-[#071B42] text-slate-300 border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-4 md:col-span-1">
            <img
              src="/assets/aistudio/civilsy-reversed_73537ff6.svg"
              alt="CIVILSY"
              className="h-8 w-auto object-contain"
            />
            <p className="text-xs text-slate-300 leading-relaxed">
              Civic discovery, plain-English policy breakdowns, and neighborhood action tools built for {selectedCommunity.name} and communities across America.
            </p>
          </div>

          <div>
            <h3 className="text-white text-xs font-bold mb-4">Platform</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentTab('discover')} className="hover:text-white transition-colors">
                  Discover &amp; Meetings
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('fix')} className="hover:text-white transition-colors">
                  Report a 311 Issue
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('budget')} className="hover:text-white transition-colors">
                  Taxes &amp; Spending
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('officials')} className="hover:text-white transition-colors">
                  Elected Officials
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('academy')} className="hover:text-white transition-colors">
                  Civics Guide
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs font-bold mb-4">
              {selectedCommunity.name} Office Info
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                {selectedCommunity.executiveTitle}: {selectedCommunity.executiveName}
              </li>
              <li>{selectedCommunity.councilType}</li>
              <li>{selectedCommunity.cityHallAddress}</li>
              <li>
                <a
                  href={selectedCommunity.officialPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 hover:text-white inline-flex items-center gap-1"
                >
                  <span>Official Municipal Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs font-bold mb-4">Weekly Civic Digest</h3>
            <p className="text-xs text-slate-300 mb-3">
              Upcoming council agendas and neighborhood updates for {selectedCommunity.name}.
            </p>
            {subscribed ? (
              <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-lg px-3 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Subscribed for {selectedCommunity.name} weekly updates.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (digestEmail.trim()) {
                    setSubscribed(true);
                    setDigestEmail('');
                  }
                }}
                className="space-y-2"
              >
                <input
                  type="email"
                  value={digestEmail}
                  onChange={(e) => setDigestEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-[#116BFF] hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <span>© 2026 CIVILSY. Your community. Your voice.</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCurrentTab('privacy')}
              className="hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setCurrentTab('terms')}
              className="hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Terms of Service
            </button>
            <span aria-hidden="true">·</span>
            <span>Non-partisan public information</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
