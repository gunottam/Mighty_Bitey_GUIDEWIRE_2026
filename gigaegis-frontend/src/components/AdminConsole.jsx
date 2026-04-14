import { useState, useEffect } from 'react';

export default function AdminConsole({
  reservePool, setReservePool, healthStatus, setHealthStatus,
  actualPayout, setActualPayout, regZone,
  workerWallet, setPayoutBannerActive, setClaimStage, claimStage
}) {
  const [eventType, setEventType] = useState('FLOOD');
  const [intensityValue, setIntensityValue] = useState(50);
  const [adminSystemState, setAdminSystemState] = useState('IDLE');
  const [lastEventSummary, setLastEventSummary] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [logs, setLogs] = useState([
    `[${new Date(Date.now() - 3000).toLocaleTimeString()}] [SYSTEM] GigAegis ML Engine initialized. 50 GBDT trees trained.`,
    `[${new Date(Date.now() - 2000).toLocaleTimeString()}] [SYSTEM] Isolation Forest fraud detector online.`,
    `[${new Date(Date.now() - 1000).toLocaleTimeString()}] [SYSTEM] 12 micro-zones loaded with H3 grid indexing.`,
  ]);

  const [liveRisk, setLiveRisk] = useState(null);

  // Fetch live risk data
  useEffect(() => {
    fetch(`/api/live-risk/${regZone}`)
      .then(r => r.json())
      .then(data => setLiveRisk(data))
      .catch(() => {});
  }, [regZone]);

  // Event type defaults
  useEffect(() => {
    if (eventType === 'FLOOD') setIntensityValue(80);
    if (eventType === 'SMOG') setIntensityValue(460);
    if (eventType === 'HEATWAVE') setIntensityValue(45);
    if (eventType === 'CURFEW') setIntensityValue(1);
  }, [eventType]);

  // Live mode polling
  useEffect(() => {
    let interval;
    if (isLiveMode) {
      interval = setInterval(() => {
        triggerLiveOracleCheck();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isLiveMode]);

  const triggerLiveOracleCheck = async () => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [AUTO] Polling parametric triggers...`]);
    try {
      const resp = await fetch('/api/disaster-check');
      const data = await resp.json();
      if (data.status === "DISASTER_TRIGGER") {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [CRITICAL] THRESHOLD BREACHED. Auto-executing payout.`]);
        const ev = data.triggerPayload;
        executePayload(ev.zone, ev.event_type, ev.intensity_value);
      } else {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [AUTO] All thresholds stable.`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [AUTO] Oracle timeout.`]);
    }
  };

  const handleCollectPremiums = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYN... Collecting ML-priced premiums...`]);
    try {
      const response = await fetch('/api/collect-premiums', { method: 'POST' });
      const data = await response.json();
      if (data.status === "SUCCESS") {
        setReservePool(data.reservePool);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [SUCCESS] ₹${data.collectedThisBatch} collected from ${data.workerCount} workers (ML-priced per zone risk).`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Network timeout.`]);
    } finally { setIsProcessing(false); }
  };

  const executePayload = async (zone, event, intensity) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setAdminSystemState("DETECTING EVENT");
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYN... Initializing ${event} response for ${zone}...`]);

    try {
      const response = await fetch('/api/trigger-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, event_type: event, intensity_value: intensity }),
      });
      const data = await response.json();

      if (data.status === "PROCESSED") {
        setClaimStage(1);
        setTimeout(() => { setClaimStage(2); setAdminSystemState("ML FRAUD ANALYSIS"); }, 1000);
        setTimeout(() => { setAdminSystemState("INCOME-TIED PAYOUT"); }, 2000);

        setTimeout(() => {
          setClaimStage(3);
          setReservePool(data.reservePool);
          setActualPayout(data.actualPayout);
          setHealthStatus(data.healthStatus);
          setAdminSystemState(data.healthStatus.includes('PRORATING') ? "PRORATION ACTIVE" : "IDLE");
          setTimeout(() => { if (!data.healthStatus.includes('BANKRUPT')) setAdminSystemState("IDLE"); }, 4000);

          const blockedCount = (data.logs || []).filter(l => l.includes('[BLOCKED]')).length;
          const paidCount = data.fundedWallets?.length || 0;
          setLastEventSummary({
            event, paid: paidCount, blocked: blockedCount,
            total: data.actualPayout || 0,
            avgPayout: paidCount > 0 ? Math.round(data.actualPayout / paidCount) : 0,
            mlRisk: data.ml_analysis?.disruption_probability || 0,
            mlClass: data.ml_analysis?.risk_classification || 'N/A',
            processingMs: data.processing_time_ms || 0,
          });

          if (workerWallet && data.fundedWallets?.includes(workerWallet)) {
            setPayoutBannerActive(true);
            setTimeout(() => setPayoutBannerActive(false), 9000);
          }
          setTimeout(() => setClaimStage(0), 12000);
        }, 3000);

        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((logItem, index) => {
            setTimeout(() => {
              setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logItem}`]);
            }, 60 * index);
          });
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Gateway Offline.`]);
    } finally { setIsProcessing(false); }
  };

  const handleManualSimulate = () => {
    let val = intensityValue;
    if (eventType === 'CURFEW') val = intensityValue > 0;
    executePayload(regZone, eventType, val);
  };

  // Slider config
  let maxSlider = 200, minSlider = 0, stepSlider = 10, unit = '';
  let intensityGradient = 'from-indigo-500 to-blue-500';
  if (eventType === 'FLOOD') {
    maxSlider = 200; unit = 'mm';
    intensityGradient = intensityValue >= 120 ? 'from-red-600 to-rose-600' : intensityValue >= 50 ? 'from-amber-400 to-orange-500' : 'from-emerald-500 to-teal-500';
  } else if (eventType === 'SMOG') {
    maxSlider = 550; stepSlider = 20; unit = ' AQI';
    intensityGradient = intensityValue >= 450 ? 'from-purple-600 to-fuchsia-600' : intensityValue >= 300 ? 'from-amber-500 to-orange-500' : 'from-yellow-400 to-amber-500';
  } else if (eventType === 'HEATWAVE') {
    maxSlider = 55; minSlider = 30; stepSlider = 1; unit = '°C';
    intensityGradient = intensityValue >= 45 ? 'from-red-600 to-rose-600' : 'from-amber-500 to-orange-500';
  } else if (eventType === 'CURFEW') {
    maxSlider = 1; minSlider = 0; stepSlider = 1; unit = '';
    intensityGradient = intensityValue === 1 ? 'from-red-600 to-rose-600' : 'from-gray-500 to-gray-400';
  }

  return (
    <div className="w-full animate-fade-in pb-10">
      {/* System State Banner */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-center mb-6 mt-4">
        <div className={`px-6 py-2 rounded-full font-black text-[12px] tracking-widest uppercase border flex items-center gap-3 transition-colors duration-300 shadow-md
          ${adminSystemState === 'IDLE' ? 'bg-gray-900 border-gray-700 text-gray-500' :
            adminSystemState.includes('DETECTING') ? 'bg-blue-900/40 border-blue-500 text-blue-400 animate-pulse' :
            adminSystemState.includes('FRAUD') ? 'bg-amber-900/40 border-amber-500 text-amber-400 animate-pulse' :
            adminSystemState.includes('INCOME') ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400 animate-pulse' :
            adminSystemState.includes('PRORATION') ? 'bg-red-900/40 border-red-500 text-red-500 animate-pulse' :
            'bg-indigo-900/40 border-indigo-500 text-indigo-400'}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-current shadow-sm" />
          SYSTEM: {adminSystemState}
        </div>
      </div>

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center mb-8 pb-6 border-b border-gray-800 gap-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white min-w-max">
          GigAegis <span className="text-indigo-400">Command Center</span>
        </h1>
        <div className="flex flex-wrap justify-center gap-4 w-full xl:w-auto">
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center min-w-[130px] cursor-help group relative">
            <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold mb-1">ML Risk Score</span>
            <span className="text-lg font-black text-indigo-400">{liveRisk?.riskScore?.toFixed(3) || '...'}</span>
            <div className="absolute top-full mt-2 w-56 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-[10px] text-gray-300 hidden group-hover:block z-50 text-center">
              Gradient Boosted DT prediction using {liveRisk?.isFallback ? 'simulated' : 'live'} weather data.
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center min-w-[130px]">
            <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold mb-1">Zone Risk</span>
            <span className={`text-lg font-black ${liveRisk?.classification === 'CRITICAL' ? 'text-red-500' : liveRisk?.classification === 'HIGH' ? 'text-red-400' : liveRisk?.classification === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {liveRisk?.classification || '...'}
            </span>
          </div>
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center min-w-[130px]">
            <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold mb-1">Health</span>
            <span className={`text-[12px] font-black mt-1 ${healthStatus.includes('HEALTHY') ? 'text-emerald-400' : 'text-red-500'}`}>{healthStatus}</span>
          </div>
          <div className="bg-gradient-to-tr from-emerald-400 to-teal-500 px-6 py-2 rounded-xl font-black text-gray-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex flex-col items-center min-w-[160px]">
            <span className="text-[0.65rem] text-gray-800 uppercase tracking-widest font-bold mb-1 opacity-80">Reserve Pool</span>
            <span className="text-xl drop-shadow-sm font-extrabold">₹{typeof reservePool === 'number' ? reservePool.toLocaleString() : reservePool}</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-0">
        {/* Left: Controls */}
        <section className="col-span-1 lg:col-span-5 bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
          {/* Mode Toggle */}
          <div className="w-full bg-gray-800/80 p-2 rounded-xl flex items-center mb-6 border border-gray-700/50">
            <button onClick={() => setIsLiveMode(false)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${!isLiveMode ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>
              Simulation
            </button>
            <button onClick={() => setIsLiveMode(true)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 ${isLiveMode ? 'bg-red-500 text-white shadow-md animate-pulse' : 'text-gray-400 hover:bg-gray-700'}`}>
              Live Mode {isLiveMode && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
            </button>
          </div>

          <button onClick={handleCollectPremiums} disabled={isProcessing}
            className={`w-full py-4 px-6 mb-6 rounded-2xl font-bold tracking-wide shadow-lg transition-all border-2 ${isProcessing ? 'border-gray-700 text-gray-500 bg-gray-800 cursor-not-allowed' : 'border-blue-500/80 text-blue-400 hover:bg-blue-500 hover:text-white'}`}>
            {isProcessing ? 'PROCESSING...' : 'COLLECT ML-PRICED PREMIUMS'}
            <div className={`text-[10px] font-medium mt-1 uppercase tracking-widest ${isProcessing ? 'opacity-40' : 'opacity-80 text-blue-300'}`}>
              Income-Proportional Pricing
            </div>
          </button>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

          {!isLiveMode ? (
            <div className="w-full bg-black/40 border border-gray-800 rounded-2xl p-6 shadow-inner animate-fade-in">
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest flex items-center gap-2 mb-5">
                <span className="text-xl">⚡</span> Parametric Simulator
              </h3>
              <div className="w-full mb-5 flex bg-gray-800 rounded-xl p-1 gap-1">
                {['FLOOD', 'SMOG', 'HEATWAVE', 'CURFEW'].map(type => (
                  <button key={type} onClick={() => setEventType(type)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors ${eventType === type ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                    {type}
                  </button>
                ))}
              </div>
              <div className="w-full mb-6 px-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Min</span>
                  <span className={`text-xl font-black bg-clip-text text-transparent bg-gradient-to-r ${intensityGradient}`}>
                    {eventType === 'CURFEW' ? (intensityValue === 1 ? 'ACTIVE' : 'PEACEFUL') : `${intensityValue}${unit}`}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-500">Max</span>
                </div>
                <input type="range" min={minSlider} max={maxSlider} step={stepSlider} value={intensityValue}
                  onChange={e => setIntensityValue(Number(e.target.value))}
                  className="w-full h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
              </div>
              <button onClick={handleManualSimulate} disabled={isProcessing}
                className={`w-full py-4 rounded-2xl font-bold text-[1.1rem] tracking-wide text-white transition-all ${isProcessing ? 'bg-gray-800 cursor-not-allowed opacity-70' : `bg-gradient-to-r ${intensityGradient} hover:brightness-110 shadow-lg`}`}>
                {isProcessing ? 'PROCESSING...' : 'EXECUTE PAYLOAD'}
              </button>
            </div>
          ) : (
            <div className="w-full bg-red-950/20 border border-red-900/50 rounded-2xl p-6 shadow-inner animate-fade-in relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-red-500/50"></div>
              <div className="flex flex-col items-center text-center my-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <span className="text-2xl animate-pulse">📡</span>
                </div>
                <h3 className="text-lg font-bold text-gray-100 uppercase tracking-widest mb-2">Live Oracle Active</h3>
                <p className="text-xs text-gray-400 max-w-[220px] mb-6">
                  Polling OpenWeather API for {regZone} every 10 seconds.
                </p>
                {liveRisk && (
                  <div className="grid grid-cols-3 gap-3 w-full">
                    <div className="bg-black/50 rounded-xl p-3 border border-gray-800 text-center">
                      <span className="text-[9px] uppercase font-black text-gray-500 block">Rain</span>
                      <span className="text-lg font-bold text-blue-400">{liveRisk.liveRainfall || 0}mm</span>
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-gray-800 text-center">
                      <span className="text-[9px] uppercase font-black text-gray-500 block">Temp</span>
                      <span className="text-lg font-bold text-orange-400">{liveRisk.liveTemp || '--'}°C</span>
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-gray-800 text-center">
                      <span className="text-[9px] uppercase font-black text-gray-500 block">AQI</span>
                      <span className="text-lg font-bold text-purple-400">{liveRisk.liveAQI || '--'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right: Logs */}
        <section className="col-span-1 lg:col-span-7 h-full flex flex-col">
          {/* Event Summary */}
          {lastEventSummary && (
            <div className="mb-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4 shadow-sm animate-fade-in relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
              <div className="pl-2">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-950 px-2 py-1 rounded tracking-widest border border-emerald-900/40">Last Event</span>
                  <span className="text-[10px] text-gray-500 font-mono">ML Risk: {lastEventSummary.mlRisk?.toFixed(3)} ({lastEventSummary.mlClass}) · {lastEventSummary.processingMs}ms</span>
                </div>
                <div className="text-[13px] font-semibold text-gray-300 flex items-center gap-3 flex-wrap font-mono">
                  <span className="text-blue-400">🚨 {lastEventSummary.event}</span>
                  <span className="text-gray-700">→</span>
                  <span className="text-emerald-400">💰 {lastEventSummary.paid} paid (avg ₹{lastEventSummary.avgPayout})</span>
                  <span className="text-gray-700">→</span>
                  <span className="text-rose-400">🛡️ {lastEventSummary.blocked} blocked</span>
                  <span className="text-gray-700">→</span>
                  <span className="text-amber-400 font-black">₹{lastEventSummary.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end mb-4 px-2">
            <div>
              <h2 className="text-lg font-mono font-bold text-indigo-400 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                CENTRAL LOG STREAM
              </h2>
            </div>
            <div className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border ${isLiveMode ? 'bg-red-950/40 border-red-900/80 text-red-400' : 'bg-indigo-950/40 border-indigo-900/80 text-indigo-300'}`}>
              {isLiveMode ? 'LIVE' : 'SIMULATION'}
            </div>
          </div>

          <div className="flex-1 bg-black border border-gray-800 rounded-2xl p-6 overflow-y-auto font-mono text-[13px] shadow-inner min-h-[500px] scroll-smooth">
            {logs.length === 0 ? (
              <span className="text-gray-600 italic">Waiting for telemetry...</span>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map((log, idx) => {
                  let text = log;
                  let color = 'text-gray-400';
                  let tag = null;

                  if (text.includes('[SUCCESS]')) { color = 'text-emerald-400 font-semibold'; tag = <span className="inline-block bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest">💰 PAID</span>; text = text.replace('[SUCCESS]', '').trim(); }
                  else if (text.includes('[BLOCKED]')) { color = 'text-rose-400 font-bold'; tag = <span className="inline-block bg-rose-950/50 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest">🛡️ BLOCKED</span>; text = text.replace('[BLOCKED]', '').trim(); }
                  else if (text.includes('[FLAG]')) { color = 'text-yellow-400'; tag = <span className="inline-block bg-yellow-950/50 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest">⚠️ FLAG</span>; text = text.replace('[FLAG]', '').trim(); }
                  else if (text.includes('[INFO]')) { color = 'text-blue-300'; tag = <span className="inline-block bg-blue-950/50 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest">ℹ️ INFO</span>; text = text.replace('[INFO]', '').trim(); }
                  else if (text.includes('[CRITICAL FAILURE]') || text.includes('[WARNING]')) { color = 'text-red-500 font-black'; tag = <span className="inline-block bg-red-950 text-red-500 border border-red-500 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 animate-pulse tracking-widest">🚨 CRITICAL</span>; text = text.replace('[CRITICAL FAILURE]', '').replace('[WARNING]', '').trim(); }
                  else if (text.includes('[SYSTEM]')) { color = 'text-indigo-300 font-bold'; tag = <span className="inline-block bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest">⚙️ SYS</span>; text = text.replace('[SYSTEM]', '').trim(); }
                  else if (text.includes('[AUTO]')) { color = 'text-gray-500'; text = text.replace('[AUTO]', '').trim(); }
                  else if (text.includes('SYN...')) { color = 'text-cyan-400 border-l-2 border-cyan-500 pl-2 opacity-80'; }

                  return <div key={idx} className={`leading-relaxed mb-1.5 ${color} break-words border-b border-gray-800/20 pb-1`}>{tag}{text}</div>;
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
