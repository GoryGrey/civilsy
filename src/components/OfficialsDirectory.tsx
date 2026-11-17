import React, { useState, useMemo } from 'react';
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  Compass,
  Building2,
  ExternalLink,
  Users,
  HeartHandshake,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  Official,
  Community,
  BoardVolunteerOpportunity,
  VolunteerSignup,
  CivicCartItem,
} from '../types';
import { OFFICIALS, BOARD_VOLUNTEER_OPPORTUNITIES } from '../data/mockData';

interface OfficialsDirectoryProps {
  selectedCommunity: Community;
  onContactOfficial: (official: Official) => void;
  user?: User | null;
  onRequireLogin?: () => void;
  volunteerSignups?: VolunteerSignup[];
  onSaveVolunteerSignup?: (opp: BoardVolunteerOpportunity) => Promise<void>;
  onRemoveVolunteerSignup?: (opportunityId: string) => Promise<void>;
  onAddToActionQueue?: (item: Omit<CivicCartItem, 'id'>) => Promise<void>;
}

const ASHTABULA_AREAS = [
  { label: 'Harbor & Bridge St (Ward 1 / North)', ward: 'Ward 1' },
  { label: 'Lake Ave & Central (Ward 2)', ward: 'Ward 2' },
  { label: 'Midtown & East Central (Ward 3)', ward: 'Ward 3' },
  { label: 'Walnut Beach & East Side (Ward 4)', ward: 'Ward 4' },
  { label: 'West Side & South End (Ward 5)', ward: 'Ward 5' },
];

export const OfficialsDirectory: React.FC<OfficialsDirectoryProps> = ({
  selectedCommunity,
  onContactOfficial,
  user = null,
  onRequireLogin,
  volunteerSignups = [],
  onSaveVolunteerSignup,
  onRemoveVolunteerSignup,
  onAddToActionQueue,
}) => {
  const [directoryTab, setDirectoryTab] = useState<'directory' | 'volunteer'>('directory');
  const [bodyFilter, setBodyFilter] = useState<string>('All');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<string>('All');
  const [savingOppId, setSavingOppId] = useState<string | null>(null);
  const [volunteerNotice, setVolunteerNotice] = useState<string>('');

  const bodies = [
    'All',
    'City Administration',
    'City Council',
    'Township & Village',
    'School Board',
    'County',
  ];

  const filtered = OFFICIALS.filter((off) => {
    if (selectedWard) {
      return off.district === selectedWard || off.body !== 'City Council';
    }
    return bodyFilter === 'All' ? true : off.body === bodyFilter;
  });

  const matchedCouncilor = selectedWard
    ? OFFICIALS.find((o) => o.district === selectedWard)
    : null;

  const isAshtabulaCity = selectedCommunity.id === 'ashtabula-oh';

  const sortedOpportunities = useMemo(() => {
    const filteredOpps = BOARD_VOLUNTEER_OPPORTUNITIES.filter((opp) =>
      kindFilter === 'All' ? true : opp.kind === kindFilter
    );
    return [...filteredOpps].sort((a, b) => {
      const aMatch = a.communityIds?.includes(selectedCommunity.id) ? 1 : 0;
      const bMatch = b.communityIds?.includes(selectedCommunity.id) ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [kindFilter, selectedCommunity.id]);

  const handleToggleVolunteerInterest = async (opp: BoardVolunteerOpportunity) => {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    const alreadySignedUp = volunteerSignups.some((s) => s.opportunityId === opp.id);
    setSavingOppId(opp.id);
    setVolunteerNotice('');
    try {
      if (alreadySignedUp && onRemoveVolunteerSignup) {
        await onRemoveVolunteerSignup(opp.id);
        setVolunteerNotice(`Removed "${opp.title}" from your saved commitments.`);
      } else if (onSaveVolunteerSignup) {
        await onSaveVolunteerSignup(opp);
        if (onAddToActionQueue) {
          await onAddToActionQueue({
            title: `${opp.kind}: ${opp.title}`,
            actionType: 'Email Official',
            targetEntity: opp.communityScope,
            dueDate: opp.meetingSchedule,
            status: 'Queued',
          });
        }
        setVolunteerNotice(
          `Saved "${opp.title}" to your dashboard & added the next step to your Action Queue.`
        );
      }
    } catch (err: any) {
      setVolunteerNotice(err.message || 'Unable to update board/volunteer signup right now.');
    } finally {
      setSavingOppId(null);
    }
  };

  const handleDraftApplication = (opp: BoardVolunteerOpportunity) => {
    const matchedOfficial = OFFICIALS.find(
      (o) => o.email.toLowerCase() === opp.contactEmail.toLowerCase()
    );
    if (matchedOfficial) {
      onContactOfficial(matchedOfficial);
      return;
    }
    onContactOfficial({
      id: `opp-contact-${opp.id}`,
      name: opp.communityScope,
      initials: 'AC',
      title: `Board & Volunteer Intake (${opp.title})`,
      body: 'County',
      district: selectedCommunity.name,
      email: opp.contactEmail,
      phone: '(440) 992-7119',
      officeAddress: selectedCommunity.cityHallAddress,
      officeHours: opp.meetingSchedule,
      bio: opp.description,
      priorities: [opp.title, opp.seatsOrNeed],
    });
  };

  return (
    <div className="space-y-6 pb-16 text-[#071B42]">
      {/* Header + 2-Tab Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#116BFF]">
            Officials, Boards &amp; Service · {selectedCommunity.name}, {selectedCommunity.state}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071B42] tracking-tight">
            Who serves your community—and how to step in
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Verified local leadership across {selectedCommunity.name}, Ashtabula County offices, and open resident seats on local boards, commissions, and volunteer cleanups.
          </p>
        </div>

        {/* 2-Tab Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F8F7F4] rounded-xl border border-slate-200 w-fit overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setDirectoryTab('directory')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
              directoryTab === 'directory'
                ? 'bg-[#071B42] text-white'
                : 'text-slate-600 hover:bg-white hover:text-[#071B42]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#116BFF]" />
            <span>Officials Directory</span>
          </button>
          <button
            type="button"
            onClick={() => setDirectoryTab('volunteer')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors tabular-nums ${
              directoryTab === 'volunteer'
                ? 'bg-[#071B42] text-white'
                : 'text-slate-600 hover:bg-white hover:text-[#071B42]'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-[#116BFF]" />
            <span>Open Boards &amp; Volunteer ({BOARD_VOLUNTEER_OPPORTUNITIES.length})</span>
          </button>
        </div>

        {/* Jurisdiction-Specific Leadership Strip for Townships, Villages, Cities, and Countywide */}
        {directoryTab === 'directory' && !isAshtabulaCity && (
          <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#071B42]">
                <Building2 className="w-4 h-4 text-[#116BFF]" />
                <span>
                  {selectedCommunity.name} ({selectedCommunity.kind}) · {selectedCommunity.councilType}
                </span>
              </div>
              <div className="text-slate-600 space-y-0.5">
                <div>
                  <span className="font-semibold text-[#071B42]">{selectedCommunity.executiveTitle}:</span>{' '}
                  {selectedCommunity.executiveName} · <span className="font-semibold text-[#071B42]">Hall:</span>{' '}
                  {selectedCommunity.cityHallAddress}
                </div>
                <div>
                  <span className="font-semibold text-[#071B42]">Meetings:</span>{' '}
                  {selectedCommunity.councilMeetingSchedule}
                  {selectedCommunity.schoolDistrict && ` · Schools: ${selectedCommunity.schoolDistrict}`}
                </div>
                <div className="text-[11px] text-slate-500">
                  Countywide offices (County Auditor, Commissioners, and County Engineer) also serve {selectedCommunity.name}.
                </div>
              </div>
            </div>
            <a
              href={selectedCommunity.officialPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#071B42] hover:bg-[#0d2a61] text-white font-semibold whitespace-nowrap shrink-0"
            >
              <span>Official Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Interactive Ashtabula City Ward Finder */}
        {directoryTab === 'directory' && isAshtabulaCity && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#071B42]">
                <Compass className="w-4 h-4 text-[#116BFF]" />
                <span>Quick Ward Finder · Pick your Ashtabula City area</span>
              </div>
              {selectedWard && (
                <button
                  onClick={() => setSelectedWard('')}
                  className="text-xs font-semibold text-[#116BFF] hover:underline"
                >
                  Show all wards
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {ASHTABULA_AREAS.map((area) => {
                const active = selectedWard === area.ward;
                return (
                  <button
                    key={area.ward}
                    onClick={() => setSelectedWard(active ? '' : area.ward)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#071B42] text-white border-[#071B42]'
                        : 'bg-[#F8F7F4] text-[#071B42] border-slate-200 hover:border-[#116BFF]'
                    }`}
                  >
                    {area.label}
                  </button>
                );
              })}
            </div>

            {matchedCouncilor && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#116BFF]">{matchedCouncilor.district} Match: </span>
                  <span className="font-bold text-[#071B42]">{matchedCouncilor.name}</span>{' '}
                  <span className="text-slate-600">
                    — Also served by City Manager James M. Timonere &amp; Council President John S. Roskovics.
                  </span>
                </div>
                <button
                  onClick={() => onContactOfficial(matchedCouncilor)}
                  className="px-3.5 py-2 rounded-lg bg-[#116BFF] hover:bg-blue-700 text-white font-semibold whitespace-nowrap shrink-0"
                >
                  Message {matchedCouncilor.name.split(' ')[0]}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DIRECTORY VIEW */}
      {directoryTab === 'directory' && (
        <>
          {!selectedWard && (
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 w-fit overflow-x-auto max-w-full">
              {bodies.map((b) => (
                <button
                  key={b}
                  onClick={() => setBodyFilter(b)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    bodyFilter === b
                      ? 'bg-[#071B42] text-white'
                      : 'text-slate-600 hover:bg-[#F8F7F4] hover:text-[#071B42]'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((official) => (
              <div
                key={official.id}
                className={`bg-white rounded-2xl border p-6 space-y-4 flex flex-col justify-between ${
                  selectedWard && official.district === selectedWard
                    ? 'border-[#116BFF] ring-2 ring-[#116BFF]/15'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#071B42] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                      {official.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[#116BFF]">
                        {official.body} · {official.district}
                      </div>
                      <h3 className="text-base font-bold text-[#071B42]">{official.name}</h3>
                      <div className="text-xs text-slate-600 font-medium">{official.title}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{official.bio}</p>

                  <div className="text-xs text-slate-500">
                    Focus: {official.priorities.join(' · ')}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{official.officeAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#116BFF] shrink-0" />
                      <span className="truncate">{official.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="tabular-nums">{official.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{official.officeHours}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onContactOfficial(official)}
                  className="w-full bg-[#116BFF] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors mt-2"
                >
                  Draft Message to {official.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* OPEN BOARDS & VOLUNTEER FINDER VIEW */}
      {directoryTab === 'volunteer' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 w-fit overflow-x-auto max-w-full">
              {['All', 'Board Seat', 'Commission', 'Cleanup & Event'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(k)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    kindFilter === k
                      ? 'bg-[#071B42] text-white'
                      : 'text-slate-600 hover:bg-[#F8F7F4] hover:text-[#071B42]'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {volunteerSignups.length > 0 && (
              <div className="text-xs font-bold text-emerald-700 tabular-nums">
                {volunteerSignups.length} saved to your Civic Record
              </div>
            )}
          </div>

          {volunteerNotice && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs font-medium text-[#071B42]">
              {volunteerNotice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedOpportunities.map((opp) => {
              const saved = volunteerSignups.some((s) => s.opportunityId === opp.id);
              const isSaving = savingOppId === opp.id;
              const matchesJurisdiction = opp.communityIds?.includes(selectedCommunity.id);
              return (
                <div
                  key={opp.id}
                  className={`bg-white rounded-2xl border p-6 flex flex-col justify-between space-y-4 ${
                    matchesJurisdiction ? 'border-[#116BFF]' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#116BFF]">
                        {opp.kind} · {opp.communityScope}
                      </span>
                      <span className="font-semibold text-emerald-700 shrink-0">
                        {opp.seatsOrNeed}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#071B42] leading-snug">
                      {opp.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">{opp.description}</p>

                    <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-[#071B42]">
                        <Clock className="w-3.5 h-3.5 text-[#116BFF] shrink-0" />
                        <span>
                          <span className="font-semibold">Time:</span> {opp.timeCommitment}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#071B42]">
                        <Calendar className="w-3.5 h-3.5 text-[#116BFF] shrink-0" />
                        <span>
                          <span className="font-semibold">Schedule:</span> {opp.meetingSchedule}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      <span className="font-semibold text-[#071B42]">How to apply: </span>
                      {opp.howToApply}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleToggleVolunteerInterest(opp)}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        saved
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-[#116BFF] hover:bg-blue-700 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {!user
                          ? 'Sign In to RSVP / Track'
                          : isSaving
                          ? 'Saving...'
                          : saved
                          ? 'Saved · Cancel RSVP'
                          : 'Track Interest / RSVP'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDraftApplication(opp)}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-[#F8F7F4] text-[#071B42] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#116BFF]" />
                      <span>Draft Interest Email</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

