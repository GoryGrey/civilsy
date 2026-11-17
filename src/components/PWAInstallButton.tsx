import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Suppress when already running as an installed standalone app
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleAction}
        className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 ${
          isInstallable
            ? 'bg-[#116BFF] hover:bg-blue-700 text-white px-3 py-2 text-xs'
            : compact
            ? 'bg-[#F8F7F4] hover:bg-slate-200/70 text-[#071B42] border border-slate-200 px-3 py-2 text-xs'
            : 'bg-[#F8F7F4] hover:bg-slate-200/70 text-[#071B42] border border-slate-200 px-3.5 py-2 text-xs'
        }`}
        title="Install CIVILSY as an app on your phone or computer"
      >
        <Download className="w-3.5 h-3.5 text-current" />
        <span>{compact ? 'Get App' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-[#071B42]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-[#071B42] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/civilsy-app-icon-192_e50679a2.png"
                  alt="CIVILSY app icon"
                  className="w-9 h-9 rounded-xl border border-slate-200"
                />
                <div>
                  <h3 className="text-sm font-bold text-[#071B42]">Install CIVILSY App</h3>
                  <p className="text-[11px] text-slate-500">Add to home screen or desktop</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-[#071B42] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-[#071B42] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#116BFF]" />
                  <span>On iPhone &amp; iPad (Safari):</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 bg-[#F8F7F4] p-3.5 rounded-xl border border-slate-200">
                  <li>
                    Tap the <span className="font-bold text-[#071B42]">Share</span> icon in the Safari toolbar.
                  </li>
                  <li>
                    Scroll down and tap <span className="font-bold text-[#071B42]">Add to Home Screen</span>.
                  </li>
                  <li>
                    Tap <span className="font-bold text-[#071B42]">Add</span> to launch CIVILSY full-screen.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-[#071B42] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#116BFF]" />
                  <span>Install from your browser:</span>
                </p>
                <div className="bg-[#F8F7F4] p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <p>
                    <span className="font-bold text-[#071B42]">Android / Chrome / Edge:</span> Open the browser menu (or click the Install icon in the address bar) and choose{' '}
                    <span className="font-semibold">Install CIVILSY</span> or <span className="font-semibold">Add to Home screen</span>.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    When opened outside an embedded preview frame, one-tap install activates automatically.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-[#071B42] hover:bg-[#0d2a61] text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
