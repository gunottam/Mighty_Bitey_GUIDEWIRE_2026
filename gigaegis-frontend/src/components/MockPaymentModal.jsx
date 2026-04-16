import { useState, useEffect } from 'react';

/**
 * MockPaymentModal — Simulates a Razorpay/UPI instant settlement.
 * State 1 (0-1.5s): Processing spinner
 * State 2 (1.5s+): Success with green checkmark
 */
export default function MockPaymentModal({ amount, onClose }) {
  const [stage, setStage] = useState('processing'); // 'processing' | 'success'

  useEffect(() => {
    const timer = setTimeout(() => setStage('success'), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && stage === 'success') onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease-out' }}></div>

      {/* Modal */}
      <div className="relative w-full max-w-sm" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <div className="bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)]">

          {/* Header bar — mimics UPI app */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-xs">🔐</div>
              <span className="text-white text-xs font-bold uppercase tracking-widest">GigAegis SecurePay</span>
            </div>
            <div className="text-white/60 text-[10px] font-mono">UPI</div>
          </div>

          {/* Body */}
          <div className="px-6 py-8">
            {stage === 'processing' ? (
              <div className="text-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                {/* Spinner */}
                <div className="w-16 h-16 mx-auto mb-5 relative">
                  <div className="absolute inset-0 rounded-full border-[3px] border-gray-700"></div>
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-violet-500" style={{ animation: 'spin 0.8s linear infinite' }}></div>
                  <div className="absolute inset-2 rounded-full border-[2px] border-transparent border-b-indigo-400" style={{ animation: 'spin 1.2s linear infinite reverse' }}></div>
                </div>

                <p className="text-white font-bold text-sm mb-1">Processing Direct Transfer</p>
                <p className="text-gray-400 text-xs font-mono mb-4">to UPI ID arjun.kumar@okblinkit</p>

                {/* Amount */}
                <div className="bg-black/40 border border-gray-800 rounded-xl py-3 px-4 inline-block">
                  <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold block">Settling</span>
                  <span className="text-2xl font-black text-white">₹{(amount || 3500).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-center mt-5 gap-2">
                  <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" style={{ animation: 'pulse 1s ease-in-out infinite' }}></div>
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Verifying with bank...</span>
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {/* Green checkmark with glow */}
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-500/10 flex items-center justify-center"
                  style={{ boxShadow: '0 0 40px rgba(16,185,129,0.3), 0 0 80px rgba(16,185,129,0.1)' }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ animation: 'drawCheck 0.5s ease-out 0.2s both' }} />
                    </svg>
                  </div>
                </div>

                <p className="text-emerald-400 font-black text-sm uppercase tracking-widest mb-2">Payment Successful</p>
                <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl py-3 px-4 mb-4 inline-block">
                  <span className="text-emerald-500 text-[10px] uppercase tracking-widest font-bold block">Settled</span>
                  <span className="text-3xl font-black text-white">₹{(amount || 3500).toLocaleString()}</span>
                </div>

                <p className="text-gray-400 text-xs mb-1">Credited to your bank account</p>
                <p className="text-gray-600 text-[10px] font-mono">Ref: GA-{Date.now().toString(36).toUpperCase()}</p>

                {/* Details */}
                <div className="mt-5 bg-black/30 border border-gray-800 rounded-xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Method</span>
                    <span className="text-gray-300 font-bold">UPI Instant</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-300 font-bold">GigAegis Reserve Pool</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Settlement</span>
                    <span className="text-emerald-400 font-bold">Instant (T+0)</span>
                  </div>
                </div>

                <button onClick={onClose}
                  className="mt-6 w-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-colors">
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between">
            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">256-bit encrypted</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Secure Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes drawCheck { from { stroke-dasharray: 30; stroke-dashoffset: 30; } to { stroke-dasharray: 30; stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
