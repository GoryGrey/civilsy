import React from 'react';
import { Home, AlertTriangle, DollarSign, Users, BookmarkCheck } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const tabs = [
    { id: 'discover', label: 'Home', icon: Home },
    { id: 'fix', label: 'Report', icon: AlertTriangle },
    { id: 'budget', label: 'Taxes', icon: DollarSign },
    { id: 'officials', label: 'Officials', icon: Users },
    { id: 'dashboard', label: 'My City', icon: BookmarkCheck },
  ];

  return (
    <nav
      aria-label="Mobile app navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`min-h-[44px] min-w-[44px] h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-[#116BFF]' : 'text-slate-500 hover:text-[#071B42]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
