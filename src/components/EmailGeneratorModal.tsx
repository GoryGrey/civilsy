import React, { useState } from 'react';
import { X, Mail, CheckCircle2, Copy } from 'lucide-react';
import { Official } from '../types';

interface EmailGeneratorModalProps {
  official: Official | null;
  onClose: () => void;
}

export const EmailGeneratorModal: React.FC<EmailGeneratorModalProps> = ({
  official,
  onClose,
}) => {
  const [topic, setTopic] = useState('Road paving & neighborhood street maintenance');
  const [userStance, setUserStance] = useState('Constituent Request');
  const [userMessage, setUserMessage] = useState(
    'I live in the neighborhood and would like an update on street repair scheduling.'
  );
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  if (!official) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialName: official.name,
          officialTitle: official.title,
          topic,
          userStance,
          userMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to draft email');
      setGeneratedEmail(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error drafting email');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedEmail) return;
    const text = `To: ${official.email}\nSubject: ${generatedEmail.subject}\n\n${generatedEmail.salutation}\n\n${generatedEmail.body}\n\n${generatedEmail.signoff}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#071B42]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-[#071B42]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#071B42] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              {official.initials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#116BFF]">
                Message Assistant · {official.district}
              </div>
              <h2 className="text-base font-bold text-[#071B42]">
                {official.name} ({official.title})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#071B42] p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {!generatedEmail ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic or Ordinance
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Type
                </label>
                <select
                  value={userStance}
                  onChange={(e) => setUserStance(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                >
                  <option value="Support">Support Proposal</option>
                  <option value="Oppose">Oppose Proposal</option>
                  <option value="Question / Inquiry">Ask Question</option>
                  <option value="Constituent Request">Service Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Details from You
                </label>
                <textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-[#F8F7F4] border border-slate-200 rounded-xl p-3 text-xs text-[#071B42] focus:outline-none focus:ring-2 focus:ring-[#116BFF]"
                  required
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#116BFF] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors"
              >
                {loading ? 'Drafting message...' : 'Draft Constituent Email'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Draft ready. Review, copy, or open directly in your email app.</span>
              </div>

              <div className="bg-[#F8F7F4] rounded-xl border border-slate-200 p-4 space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">To:</span>{' '}
                  <span className="text-[#071B42]">{official.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Subject:</span>{' '}
                  <span className="text-[#071B42] font-bold">{generatedEmail.subject}</span>
                </div>
                <hr className="border-slate-200" />
                <div className="text-slate-700 space-y-2 leading-relaxed whitespace-pre-wrap">
                  {generatedEmail.salutation}
                  {'\n\n'}
                  {generatedEmail.body}
                  {'\n\n'}
                  {generatedEmail.signoff}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-white hover:bg-[#F8F7F4] text-[#071B42] font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
                <a
                  href={`mailto:${official.email}?subject=${encodeURIComponent(
                    generatedEmail.subject
                  )}&body=${encodeURIComponent(
                    `${generatedEmail.salutation}\n\n${generatedEmail.body}\n\n${generatedEmail.signoff}`
                  )}`}
                  className="flex-1 bg-[#116BFF] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open Mail App</span>
                </a>
              </div>

              <button
                onClick={() => setGeneratedEmail(null)}
                className="w-full text-center text-xs text-slate-500 hover:text-[#071B42] underline"
              >
                Draft a different message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
