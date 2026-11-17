import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MapPin,
  ChevronDown,
  Menu,
  X,
  ClipboardList,
  LogOut,
  User as UserIcon,
  Search,
  LocateFixed,
} from 'lucide-react';
import { Community, CommunityKind, CivicCartItem } from '../types';
import { COMMUNITIES } from '../data/mockData';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedCommunity: Community;
  setSelectedCommunity: (community: Community) => void;
  locationSource?: 'ip' | 'default' | 'manual';
  detectingLocation?: boolean;
  onAutoDetectLocation?: () => void;
  civicCart: CivicCartItem[];
  setIsCartOpen: (open: boolean) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

const GROUP_ORDER: { kind: CommunityKind; label: string }[] = [
  { kind: 'City', label: 'Cities' },
  { kind: 'County', label: 'Countywide' },
  { kind: 'Village', label: 'Villages' },
  { kind: 'Township', label: 'Townships (All 27)' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  selectedCommunity,
  setSelectedCommunity,
  locationSource = 'default',
  detectingLocation = false,
  onAutoDetectLocation,
  civicCart,
  setIsCartOpen,
  user,
  onLogin,
  onLogout,
}) => {
  const [isCommunityDropdownOpen, setIsCommunityDropdownOpen] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCommunityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { id: 'discover', label: 'Home' },
    { id: 'fix', label: 'Report 311' },
    { id: 'budget', label: 'Taxes & Spending' },
    { id: 'officials', label: 'Officials' },
    { id: 'academy', label: 'Civics Guide' },
  ];

  const queuedCount = civicCart.filter((a) => a.status !== 'Completed').length;

  const groupedCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    const filtered = q
      ? COMMUNITIES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.kind.toLowerCase().includes(q) ||
            (c.zipCodes && c.zipCodes.some((z) => z.includes(q)))
        )
      : COMMUNITIES;

    return GROUP_ORDER.map((group) => ({
      ...group,
      items: filtered.filter((c) => c.kind === group.kind),
    })).filter((g) => g.items.length > 0);
  }, [communitySearch]);

  const locationHint =
    locationSource === 'ip'
      ? 'IP detected'
      : locationSource === 'manual'
      ? 'Selected'
      : 'Default';

  return (
    <header className="sticky top-0 z-40 bg-white text-[#071B42] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 sm:gap-6 h-16">
          {/* Zone 1: Official Brand Wordmark */}
          <button
            onClick={() => setCurrentTab('discover')}
            className="flex items-center shrink-0 focus:outline-none"
          >
            <img
              src="/assets/aistudio/civilsy-primary_6a847fb1.svg"
              alt="CIVILSY"
              className="h-8 w-auto object-contain"
            />
          </button>

          {/* Zone 2: Clean Single-Line Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const active = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setCurrentTab(link.id)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#116BFF] text-[#071B42] font-semibold'
                      : 'border-transparent text-slate-600 hover:text-[#071B42]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Searchable Ashtabula County Jurisdiction Picker + Queue + Account */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsCommunityDropdownOpen(!isCommunityDropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#071B42] px-3 py-2 rounded-lg border border-slate-200 bg-[#F8F7F4] whitespace-nowrap shrink-0 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#116BFF] shrink-0" />
                <span className="max-w-[170px] truncate">{selectedCommunity.name}</span>
                <span className="text-[10px] text-slate-400 font-medium hidden xl:inline">
                  · {locationHint}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isCommunityDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-100 space-y-2 bg-[#F8F7F4]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#071B42]">
                        Ashtabula County Jurisdictions (38)
                      </span>
                      {onAutoDetectLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            onAutoDetectLocation();
                          }}
                          disabled={detectingLocation}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#116BFF] hover:underline disabled:opacity-60"
                        >
                          <LocateFixed className="w-3 h-3" />
                          <span>{detectingLocation ? 'Detecting...' : 'Auto-detect from IP'}</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={communitySearch}
                        onChange={(e) => setCommunitySearch(e.target.value)}
                        placeholder="Search city, village, township, or ZIP..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {groupedCommunities.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No matching Ashtabula County jurisdiction found.
                      </div>
                    ) : (
                      groupedCommunities.map((group) => (
                        <div key={group.kind} className="py-1.5">
                          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {group.label}
                          </div>
                          {group.items.map((comm) => (
                            <button
                              key={comm.id}
                              type="button"
                              onClick={() => {
                                setSelectedCommunity(comm);
                                setIsCommunityDropdownOpen(false);
                                setCommunitySearch('');
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 hover:bg-[#F8F7F4] transition-colors ${
                                selectedCommunity.id === comm.id
                                  ? 'text-[#116BFF] font-bold bg-blue-50/50'
                                  : 'text-slate-700'
                              }`}
                            >
                              <span className="truncate">{comm.name}</span>
                              <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                                {comm.population}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:block">
              <PWAInstallButton compact />
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 text-xs font-semibold text-[#071B42] hover:bg-[#F8F7F4] px-3 py-2 rounded-lg border border-slate-200 whitespace-nowrap shrink-0 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-[#116BFF]" />
              <span className="hidden md:inline">Action Queue</span>
              {queuedCount > 0 && (
                <span className="text-xs font-bold text-[#116BFF] tabular-nums">
                  ({queuedCount})
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-1">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="flex items-center gap-2 text-xs font-semibold text-[#071B42] hover:text-[#116BFF] whitespace-nowrap shrink-0"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Account'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  <span className="hidden md:inline max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || 'Account'}
                  </span>
                </button>
                <button
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-[#071B42] hover:bg-[#0d2a61] text-white font-semibold px-4 py-2 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-[#071B42] p-2 rounded-lg hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 flex flex-col gap-2">
            {/* Mobile Jurisdiction Selector */}
            <div className="px-2 pb-2 border-b border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Your Ashtabula County Community ({locationHint})</span>
                {onAutoDetectLocation && (
                  <button
                    type="button"
                    onClick={onAutoDetectLocation}
                    disabled={detectingLocation}
                    className="text-[#116BFF] font-semibold inline-flex items-center gap-1"
                  >
                    <LocateFixed className="w-3 h-3" />
                    <span>{detectingLocation ? 'Detecting...' : 'Auto-detect'}</span>
                  </button>
                )}
              </div>
              <select
                value={selectedCommunity.id}
                onChange={(e) => {
                  const found = COMMUNITIES.find((c) => c.id === e.target.value);
                  if (found) setSelectedCommunity(found);
                }}
                className="w-full bg-[#F8F7F4] border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#071B42]"
              >
                {GROUP_ORDER.map((group) => {
                  const items = COMMUNITIES.filter((c) => c.kind === group.kind);
                  return (
                    <optgroup key={group.kind} label={group.label}>
                      {items.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.population})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              {[...navLinks, { id: 'dashboard', label: `My ${selectedCommunity.name}` }].map(
                (tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCurrentTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                      currentTab === tab.id
                        ? 'bg-blue-50 text-[#116BFF] font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              )}
            </div>
            <div className="pt-2 px-3 border-t border-slate-100">
              <PWAInstallButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

