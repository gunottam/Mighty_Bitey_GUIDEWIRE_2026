import { useState, useEffect } from 'react';

export default function WorkerApp({ workerWallet, regName, regZone, actualPayout, payoutBannerActive, claimStage }) {
  const [workerData, setWorkerData] = useState(null);
  const [premiumDetails, setPremiumDetails] = useState(null);
  const [zoneRisk, setZoneRisk] = useState(null);

  useEffect(() => {
    if (!workerWallet) return;
    const poll = setInterval(() => {
      fetch(`/api/worker/${workerWallet}`)
        .then(res => res.json())
        .then(data => {
          if (data.targetWorker) {
            setWorkerData(data.targetWorker);
            setPremiumDetails(data.premium_details);
            setZoneRisk(data.zone_risk);
          }
        }).catch(() => {});
    }, 3000);
    // Initial fetch
    fetch(`/api/worker/${workerWallet}`)
      .then(res => res.json())
      .then(data => {
        if (data.targetWorker) {
          setWorkerData(data.targetWorker);
          setPremiumDetails(data.premium_details);
          setZoneRisk(data.zone_risk);
        }
      }).catch(() => {});
    return () => clearInterval(poll);
  }, [workerWallet]);

  const worker = workerData || {};
  const balance = worker.balance || 0;
  const fraudScore = worker.fraud_score || 0;
  const fraudReason = worker.fraud_reason || 'Clear';
  const riskScore = zoneRisk?.disruption_probability || 0;
  const classification = zoneRisk?.risk_classification || 'MEDIUM';
  const premium = premiumDetails?.weekly_premium || worker.ml_weekly_premium || 40;
  const coverageTier = worker.coverage_tier || 'STANDARD';
  const maxCoverage = coverageTier === 'BASIC' ? 2000 : coverageTier === 'STANDARD' ? 3500 : 5000;
  const hourlyRate = worker.avg_hourly_earnings || 85;
  const walletFragment = workerWallet ? workerWallet.slice(0, 8) + '...' : '0xWALLET';

  const classificationColor = classification === 'CRITICAL' || classification === 'HIGH' ? 'text-red-400' : classification === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400';
  const bgClassification = classification === 'CRITICAL' || classification === 'HIGH' ? 'bg-red-900/20 border-red-900/50' : classification === 'MEDIUM' ? 'bg-amber-900/20 border-amber-900/50' : 'bg-emerald-900/20 border-emerald-900/50';

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 min-h-[800px] border-[8px] border-black rounded-[45px] shadow-2xl relative overflow-hidden flex flex-col font-sans animate-fade-in my-8">
      <div className="absolute top-0 inset-x-0 h-7 bg-black rounded-b-3xl w-[160px] mx-auto z-20"></div>

      {/* Payout Banner */}
      {payoutBannerActive && (
        <div className="absolute inset-x-0 top-12 mx-4 z-40 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 shadow-[0_15px_50px_rgba(16,185,129,0.6)] border border-emerald-400 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="text-3xl animate-bounce mt-1">💰</div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1">Income Protected!</h4>
              <p className="text-teal-50 text-[11px] font-medium leading-tight">
                Disruption detected. Your lost wages have been calculated and credited.
                <span className="font-extrabold text-white text-[13px] block mt-1">₹{actualPayout} Credited</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-b from-blue-900/60 to-transparent pt-16 pb-6 px-6">
        <div className="flex justify-between items-end mb-1">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Hello, <span className="text-blue-400">{regName ? regName.split(' ')[0] : 'Worker'}.</span>
          </h2>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Balance</div>
            <div className="text-xl font-black text-emerald-400 tracking-tighter">₹{balance}</div>
          </div>
        </div>
        <p className="text-gray-400 text-sm font-medium">Your income is protected by AI-powered parametric insurance.</p>
      </div>

      {/* Policy Card */}
      <div className="px-6 mb-5">
        <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-3xl p-5 shadow-[0_10px_40px_rgba(16,185,129,0.3)] relative overflow-hidden">
          <div className="absolute -top-4 -right-4 text-8xl opacity-15">🛡️</div>
          <div className="relative z-10 flex justify-between items-start text-emerald-950">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/40 px-3 py-1 rounded inline-block mb-2 shadow-sm">
              {coverageTier} POLICY
            </span>
            <span className="text-[10px] font-black tracking-widest bg-white/30 px-3 py-1 rounded shadow-sm">
              ₹{maxCoverage} MAX
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-white text-lg font-bold leading-tight drop-shadow-sm">Income Protection</h3>
            <p className="text-teal-50 text-[10px] mt-2 font-medium opacity-90 leading-relaxed font-mono">
              Payout = ₹{hourlyRate}/hr × disruption_hours × {coverageTier === 'BASIC' ? '0.70' : coverageTier === 'STANDARD' ? '0.85' : '1.00'}
            </p>
            <p className="text-teal-100/60 text-[10px] mt-1">Wallet: {walletFragment} · {worker.delivery_platform || 'Zomato'}</p>
          </div>
        </div>
      </div>

      {/* ML Premium Card */}
      <div className="px-6 mb-5">
        <div className="bg-black/40 border border-gray-800 rounded-2xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300 font-bold text-sm">ML-Calculated Premium</span>
            <span className="text-2xl font-black text-rose-500">₹{premium} <span className="text-sm font-bold text-gray-500">/ wk</span></span>
          </div>
          {premiumDetails?.breakdown && (
            <div className="bg-gray-900/60 rounded-xl p-3 mt-2 border border-gray-800">
              <div className="text-[10px] text-gray-500 font-mono leading-relaxed space-y-1">
                <div className="flex justify-between">
                  <span>Weekly Earnings</span>
                  <span className="text-gray-300">₹{premiumDetails.breakdown.estimated_weekly_earnings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Rate</span>
                  <span className="text-gray-300">{premiumDetails.breakdown.base_premium_rate}</span>
                </div>
                <div className="flex justify-between">
                  <span>ML Risk Multiplier</span>
                  <span className="text-amber-400">{premiumDetails.breakdown.risk_multiplier}x</span>
                </div>
                <div className="w-full h-px bg-gray-700 my-1"></div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-gray-400">Formula</span>
                  <span className="text-gray-200">{premiumDetails.breakdown.formula}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integrity Engine */}
      <div className="px-6 mb-5">
        <div className={`bg-gray-800/40 border ${fraudScore >= 0.7 ? 'border-red-900/50' : fraudScore > 0 ? 'border-amber-900/50' : 'border-emerald-900/30'} rounded-2xl p-4 transition-all backdrop-blur-sm`}>
          <div className="flex justify-between items-center mb-1 border-b border-gray-700/50 pb-2">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Fraud Detection Engine</span>
            <span className={`text-[10px] font-black uppercase tracking-wider ${fraudScore >= 0.7 ? 'text-red-400' : fraudScore > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {fraudScore >= 0.7 ? 'High Risk' : fraudScore > 0 ? 'Monitor' : 'Clear'}
            </span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-[80%] font-mono">
              {fraudScore > 0 ? fraudReason : 'All signals nominal. Profile integrity verified.'}
            </p>
            <div className={`text-xl font-black ${fraudScore >= 0.7 ? 'text-red-400' : fraudScore > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {fraudScore.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="px-6 mb-5">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3 ml-2 flex items-center gap-2">
          Live Risk ({worker.zone || regZone})
          <div className="h-px bg-gray-800 flex-1"></div>
        </h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={`border rounded-2xl p-4 shadow-inner flex flex-col items-center justify-center ${bgClassification}`}>
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Zone Risk</span>
            <span className={`text-lg font-black tracking-wide ${classificationColor}`}>{classification}</span>
          </div>
          <div className="bg-black/30 border border-gray-800 rounded-2xl p-4 shadow-inner flex flex-col items-center justify-center">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">ML Score</span>
            <span className="text-lg font-black text-indigo-400 tracking-wide">{riskScore.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Claim Lifecycle */}
      <div className="px-6 mb-5">
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-2xl p-4 relative overflow-hidden">
          {claimStage === 2 && <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500 animate-pulse"></div>}
          {claimStage === 3 && <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500"></div>}
          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-3 block">Claim Lifecycle</span>
          <div className="flex justify-between items-center text-[11px] font-bold py-2">
            <span className={`${claimStage >= 1 ? 'text-amber-400 font-black' : 'text-gray-600'}`}>1. Trigger</span>
            <span className={`${claimStage >= 1 ? 'text-amber-400/50' : 'text-gray-700'}`}>→</span>
            <span className={`${claimStage === 2 ? 'text-blue-400 font-black animate-pulse' : claimStage > 2 ? 'text-emerald-400 font-black' : 'text-gray-600'}`}>2. ML Analysis</span>
            <span className={`${claimStage >= 2 ? 'text-blue-400/50' : 'text-gray-700'}`}>→</span>
            <span className={`${claimStage === 3 ? 'text-emerald-400 font-black bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500' : 'text-gray-600'}`}>
              3. {claimStage === 3 ? 'Paid' : 'Payout'}
            </span>
          </div>
          {claimStage === 2 && <p className="text-[10px] text-blue-300/90 mt-3 font-mono animate-pulse bg-blue-950/30 p-2 rounded text-center">Running Isolation Forest + Syndicate Graph Analysis...</p>}
          {claimStage === 3 && <p className="text-[10px] text-emerald-300/90 mt-3 font-mono border-t border-gray-700/50 pt-3 text-center">Income-tied payout calculated and disbursed.</p>}
        </div>
      </div>

      <div className="mt-auto h-1.5 bg-gray-700 w-1/3 mx-auto rounded-full mb-4 opacity-50"></div>
    </div>
  );
}
