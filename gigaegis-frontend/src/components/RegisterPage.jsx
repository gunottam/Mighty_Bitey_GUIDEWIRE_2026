import { useState } from 'react';

export default function RegisterPage({ onRegistered, setRegZone: parentSetZone }) {
  const [regName, setRegName] = useState('');
  const [regZone, setRegZone] = useState('Koramangala_1');
  const [platform, setPlatform] = useState('Zepto');
  const [hourlyRate, setHourlyRate] = useState(85);
  const [weeklyHours, setWeeklyHours] = useState(45);
  const [coverageTier, setCoverageTier] = useState('STANDARD');
  const [isRegistering, setIsRegistering] = useState(false);

  const zones = [
    { id: 'Koramangala_1', label: 'Koramangala Block 1', risk: 'HIGH', color: 'text-red-400' },
    { id: 'Koramangala_2', label: 'Koramangala Block 5-6', risk: 'CRITICAL', color: 'text-red-500' },
    { id: 'Koramangala_3', label: 'Koramangala Block 8', risk: 'HIGH', color: 'text-red-400' },
    { id: 'Indiranagar_1', label: 'Indiranagar Stage 1', risk: 'LOW', color: 'text-emerald-400' },
    { id: 'Indiranagar_2', label: 'Indiranagar Stage 2', risk: 'LOW', color: 'text-emerald-400' },
    { id: 'Whitefield_1', label: 'Whitefield Main', risk: 'MEDIUM', color: 'text-amber-400' },
    { id: 'Whitefield_2', label: 'Whitefield Kadugodi', risk: 'MEDIUM', color: 'text-amber-400' },
    { id: 'HSR_Layout', label: 'HSR Layout', risk: 'HIGH', color: 'text-red-400' },
    { id: 'Bellandur', label: 'Bellandur', risk: 'CRITICAL', color: 'text-red-500' },
    { id: 'Electronic_City', label: 'Electronic City', risk: 'HIGH', color: 'text-red-400' },
    { id: 'Marathahalli', label: 'Marathahalli', risk: 'MEDIUM', color: 'text-amber-400' },
    { id: 'JP_Nagar', label: 'JP Nagar', risk: 'LOW', color: 'text-emerald-400' },
  ];

  const tiers = [
    { id: 'BASIC', label: 'Basic', desc: '70% coverage, ₹2000 cap', color: 'border-gray-600' },
    { id: 'STANDARD', label: 'Standard', desc: '85% coverage, ₹3500 cap', color: 'border-blue-500' },
    { id: 'PREMIUM', label: 'Premium', desc: '100% coverage, ₹5000 cap', color: 'border-amber-500' },
  ];

  const estimatedWeeklyEarnings = hourlyRate * weeklyHours;
  const estimatedCoverage = coverageTier === 'BASIC' ? 2000 : coverageTier === 'STANDARD' ? 3500 : 5000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!regName) return;
    setIsRegistering(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName, zone: regZone,
          delivery_platform: platform,
          avg_hourly_earnings: hourlyRate,
          typical_hours_per_week: weeklyHours,
          coverage_tier: coverageTier,
        }),
      });
      const data = await response.json();
      if (data.status === "SUCCESS") {
        if (parentSetZone) parentSetZone(regZone);
        onRegistered(data.worker, data.premium_details, data.zone_risk);
      }
    } catch (err) {
      console.error("Registration offline:", err);
    } finally { setIsRegistering(false); }
  };

  return (
    <div className="w-full max-w-lg mx-auto my-12 animate-fade-in">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <span className="text-3xl">🛡️</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Secure Your Income</h2>
          <p className="text-[11px] font-medium text-gray-500 mt-2 uppercase tracking-widest">AI-Powered Parametric Income Protection</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Full Name</label>
            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} required placeholder="E.g. Arjun Kumar"
              className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-3.5 text-[13px] font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>

          {/* Q-Commerce Platform — Two glowing toggles */}
          <div>
            <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Q-Commerce Platform</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Zepto', icon: '⚡', tagline: '10-min delivery' },
                { id: 'Blinkit', icon: '🟡', tagline: 'Instant grocery' },
              ].map(p => (
                <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
                  className={`relative py-4 rounded-2xl text-center font-bold tracking-wide transition-all duration-300 border-2 ${
                    platform === p.id
                      ? 'bg-violet-950/60 border-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35),inset_0_0_20px_rgba(139,92,246,0.08)]'
                      : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  }`}>
                  <span className="text-xl block mb-1">{p.icon}</span>
                  <span className="text-sm font-black block">{p.id}</span>
                  <span className={`text-[9px] mt-0.5 block uppercase tracking-widest ${platform === p.id ? 'text-violet-400' : 'text-gray-600'}`}>{p.tagline}</span>
                  {platform === p.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Operating Zone</label>
            <select value={regZone} onChange={e => setRegZone(e.target.value)}
              className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-3.5 text-[13px] font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-colors">
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.label} ({z.risk})</option>
              ))}
            </select>
          </div>

          {/* Earnings Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Avg ₹/Hour</label>
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} min={30} max={300}
                className="w-full bg-black/60 border border-gray-800 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Hours/Week</label>
              <input type="number" value={weeklyHours} onChange={e => setWeeklyHours(Number(e.target.value))} min={10} max={80}
                className="w-full bg-black/60 border border-gray-800 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>

          {/* Earnings Preview */}
          <div className="bg-gradient-to-r from-indigo-950/40 to-blue-950/40 border border-indigo-900/40 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Est. Weekly Earnings</span>
            <div className="text-xl font-black text-white mt-1">₹{estimatedWeeklyEarnings.toLocaleString()}</div>
          </div>

          {/* Coverage Tier */}
          <div>
            <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Coverage Tier</label>
            <div className="grid grid-cols-3 gap-2">
              {tiers.map(tier => (
                <button key={tier.id} type="button" onClick={() => setCoverageTier(tier.id)}
                  className={`py-3 px-2 rounded-xl text-center transition-all border-2 ${coverageTier === tier.id ? `${tier.color} bg-gray-800` : 'border-gray-800 bg-black/30'}`}>
                  <div className={`text-xs font-black ${coverageTier === tier.id ? 'text-white' : 'text-gray-400'}`}>{tier.label}</div>
                  <div className="text-[9px] text-gray-500 mt-1">{tier.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Coverage Preview Card */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Max Coverage</div>
                <div className="text-lg font-black text-emerald-400">₹{estimatedCoverage.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Payout Formula</div>
                <div className="text-[11px] text-gray-400 font-mono">₹{hourlyRate}/hr × hours × {coverageTier === 'BASIC' ? '0.70' : coverageTier === 'STANDARD' ? '0.85' : '1.00'}</div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isRegistering}
            className="mt-2 w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 py-4 rounded-2xl font-black tracking-widest text-xs text-white transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
            {isRegistering ? 'CREATING POLICY...' : 'ACTIVATE INCOME PROTECTION ⚡'}
          </button>

          <p className="text-center text-[9px] text-gray-600 font-medium uppercase tracking-widest border-t border-gray-800 pt-3">
            ML-Powered Premium · Income-Tied Payouts · Fraud Protected
          </p>
        </form>
      </div>
    </div>
  );
}
