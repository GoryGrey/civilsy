import React from 'react';
import { X, ClipboardList, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { CivicCartItem } from '../types';

interface CivicCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CivicCartItem[];
  onCompleteAction: (id: string) => void;
  removeFromCart: (id: string) => void;
}

export const CivicCartModal: React.FC<CivicCartModalProps> = ({
  isOpen,
  onClose,
  cart,
  onCompleteAction,
  removeFromCart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#071B42]/50 backdrop-blur-sm flex items-center justify-end">
      <div className="bg-white border-l border-slate-200 w-full max-w-md h-full flex flex-col shadow-2xl text-[#071B42]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-[#116BFF]" />
            <div>
              <h2 className="text-base font-bold text-[#071B42]">Action Queue</h2>
              <p className="text-xs text-slate-500 tabular-nums">
                {cart.filter((c) => c.status !== 'Completed').length} pending actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#071B42] p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-20 space-y-2">
              <h3 className="text-sm font-bold text-[#071B42]">Your Action Queue is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Open any city proposal or search answer and click “Save to Action Queue” to track meetings or comments.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-[#F8F7F4] p-4 rounded-xl border border-slate-200 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-[#116BFF]">
                      {item.actionType} · {item.status}
                    </div>
                    <h4
                      className={`text-xs font-bold mt-0.5 ${
                        item.status === 'Completed'
                          ? 'line-through text-slate-400'
                          : 'text-[#071B42]'
                      }`}
                    >
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status !== 'Completed' && (
                      <button
                        onClick={() => onCompleteAction(item.id)}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        title="Mark complete"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/70">
                  <div>Target: {item.targetEntity}</div>
                  {item.dueDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#116BFF]" />
                      <span>{item.dueDate}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-200 bg-[#F8F7F4]">
          <button
            onClick={onClose}
            className="w-full bg-[#071B42] hover:bg-[#0d2a61] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
