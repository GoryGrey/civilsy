import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#071B42] border border-amber-400 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Offline Mode — Viewing cached civic guides &amp; data</span>
    </div>
  );
};
