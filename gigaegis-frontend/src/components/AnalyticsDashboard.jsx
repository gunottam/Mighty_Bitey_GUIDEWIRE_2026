import { useState, useEffect } from 'react';

export default function AnalyticsDashboard() {
  const [dashData, setDashData] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [mlExplain, setMlExplain] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/dashboard').then(r => r.json()),
      fetch('/api/analytics/predictions').then(r => r.json()),
      fetch('/api/analytics/ml-explainability').then(r => r.json()),
    ]).then(([dash, preds, ml]) => {
      setDashData(dash);
      setPredictions(preds);
      setMlExplain(ml);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-20 text-center animate-pulse">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Analytics Engine...</p>
      </div>
    );
  }

  const overview = dashData?.overview || {};
  const zones = dashData?.zones || [];
  const preds = predictions?.predictions || [];
  const modelInfo = mlExplain?.model_info || {};
  const featureImportance = mlExplain?.global_feature_importance || {};

  // Sort features for chart
  const sortedFeatures = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]);
  const maxFeatValue = sortedFeatures.length > 0 ? sortedFeatures[0][1] : 1;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Analytics <span className="text-indigo-400">Dashboard</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time insurer metrics, ML predictions, and fraud analytics</p>
        </div>
        <div className="flex bg-gray-900 border border-gray-700 rounded-xl p-1 gap-1">
          {['overview', 'zones', 'ml-model', 'predictions'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — Always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <KPICard label="Active Policies" value={overview.active_policies || 0} color="text-blue-400" />
        <KPICard label="Reserve Pool" value={`₹${(overview.reserve_pool || 0).toLocaleString()}`} color="text-emerald-400" />
        <KPICard label="Premiums Collected" value={`₹${(overview.total_premiums_collected || 0).toLocaleString()}`} color="text-indigo-400" />
        <KPICard label="Payouts Issued" value={`₹${(overview.total_payouts_issued || 0).toLocaleString()}`} color="text-amber-400" />
        <KPICard label="Loss Ratio" value={overview.loss_ratio?.toFixed(2) || '0.00'} color={overview.loss_ratio > 1 ? 'text-red-400' : 'text-emerald-400'} subtitle={overview.loss_ratio > 1 ? 'UNPROFITABLE' : 'HEALTHY'} />
        <KPICard label="Fraud Rate" value={`${((overview.fraud_rate || 0) * 100).toFixed(1)}%`} color="text-rose-400" />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Recent Transactions</h3>
            {(dashData?.recent_transactions || []).length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {dashData.recent_transactions.slice(0, 10).map((tx, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/30 border border-gray-800 rounded-xl p-3">
                    <div>
                      <div className="text-sm font-bold text-white">{tx.worker_name || tx.worker_wallet?.slice(0, 10)}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">{tx.event_type} · {tx.status}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${tx.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}`}>₹{tx.payout_amount}</div>
                      {tx.payout_breakdown?.raw_calculation && (
                        <div className="text-[9px] text-gray-500 font-mono">{tx.payout_breakdown.raw_calculation}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-3xl mb-2 opacity-30">📋</div>
                <p className="text-gray-600 text-sm">No transactions yet. Trigger an event to see data.</p>
              </div>
            )}
          </div>

          {/* Zone Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Zone Risk Distribution</h3>
            <div className="space-y-3">
              {zones.sort((a, b) => b.ml_risk_score - a.ml_risk_score).map(zone => (
                <div key={zone.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.risk_color }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-300 truncate">{zone.display_name}</span>
                      <span className="text-[10px] font-black text-gray-400 ml-2">{(zone.ml_risk_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, zone.ml_risk_score * 100)}%`, backgroundColor: zone.risk_color }}></div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0">₹{zone.ml_premium}/wk</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map(zone => (
            <div key={zone.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.risk_color }}></div>
                <h3 className="text-sm font-bold text-white">{zone.display_name}</h3>
              </div>
              <div className="text-[10px] text-gray-500 font-mono mb-3">{zone.grid_id}</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-black/30 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">ML Risk</div>
                  <div className="text-lg font-black" style={{ color: zone.risk_color }}>{(zone.ml_risk_score * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-black/30 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Premium</div>
                  <div className="text-lg font-black text-white">₹{zone.ml_premium}/wk</div>
                </div>
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-center ${zone.classification === 'CRITICAL' ? 'bg-red-950/40 text-red-400 border border-red-900/40' : zone.classification === 'HIGH' ? 'bg-red-950/30 text-red-400 border border-red-900/30' : zone.classification === 'MEDIUM' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/30' : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'}`}>
                {zone.classification} RISK
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'ml-model' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">ML Model Architecture</h3>
            <div className="space-y-3">
              {Object.entries(modelInfo).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center bg-black/30 border border-gray-800 rounded-xl px-4 py-3">
                  <span className="text-xs font-mono text-gray-400">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-bold text-white">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Importance Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Feature Importance (GBDT)</h3>
            <div className="space-y-3">
              {sortedFeatures.map(([feature, score]) => (
                <div key={feature}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono text-gray-300">{feature}</span>
                    <span className="text-[10px] font-bold text-indigo-400">{(score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(score / maxFeatValue) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-4 mb-4">
            <p className="text-sm text-indigo-300">
              <span className="font-bold">Next-week forecasts</span> — ML-predicted disruption probability per zone, with top contributing risk factors.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preds.map(p => (
              <div key={p.zone_id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white">{p.display_name}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${p.trend === 'INCREASING' ? 'bg-red-950/40 text-red-400 border border-red-900/40' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'}`}>
                    {p.trend === 'INCREASING' ? '↑ RISING' : '→ STABLE'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Current</div>
                    <div className="text-lg font-black text-white">{(p.current_risk * 100).toFixed(1)}%</div>
                    <div className={`text-[9px] font-bold ${p.current_classification === 'CRITICAL' || p.current_classification === 'HIGH' ? 'text-red-400' : p.current_classification === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>{p.current_classification}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Next Week</div>
                    <div className="text-lg font-black text-indigo-400">{(p.predicted_next_week_risk * 100).toFixed(1)}%</div>
                    <div className={`text-[9px] font-bold ${p.predicted_classification === 'CRITICAL' || p.predicted_classification === 'HIGH' ? 'text-red-400' : p.predicted_classification === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>{p.predicted_classification}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Premium</div>
                    <div className="text-lg font-black text-rose-400">₹{p.recommended_premium}</div>
                    <div className="text-[9px] text-gray-500 font-bold">/ week</div>
                  </div>
                </div>
                {p.top_risk_factors && (
                  <div className="bg-black/30 rounded-xl p-3 border border-gray-800">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Top Risk Factors</div>
                    {p.top_risk_factors.map((f, i) => (
                      <div key={i} className="text-[11px] font-mono text-gray-400 flex justify-between">
                        <span>{f.feature}</span>
                        <span className={f.contribution > 0 ? 'text-red-400' : 'text-emerald-400'}>{f.contribution > 0 ? '+' : ''}{f.contribution.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, color, subtitle }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className={`text-xl font-black ${color}`}>{value}</div>
      {subtitle && <div className="text-[9px] text-gray-600 font-bold uppercase mt-1">{subtitle}</div>}
    </div>
  );
}
