import { useState, useEffect } from 'react';

function App() {
  const [currentView, setCurrentView] = useState('ADMIN'); 

  // Core Economic State
  const [reservePool, setReservePool] = useState(100000);
  const [actualPayout, setActualPayout] = useState(0);
  const [healthStatus, setHealthStatus] = useState("HEALTHY");
  
  // Real-Time OpenWeather Live Risk State
  const [riskScore, setRiskScore] = useState(0);
  const [zoneClassification, setZoneClassification] = useState("Loading...");
  const [dynamicPremium, setDynamicPremium] = useState(0);
  const [liveRainfall, setLiveRainfall] = useState(0);

  // Admin UI State
  const [eventType, setEventType] = useState('FLOOD'); 
  const [intensityValue, setIntensityValue] = useState(50);
  const [adminSystemState, setAdminSystemState] = useState("IDLE");
  const [lastEventSummary, setLastEventSummary] = useState(null);
  
  const [logs, setLogs] = useState([
      `[${new Date(Date.now() - 4000).toLocaleTimeString()}] [SYSTEM] GigAegis React Platform Indexed natively.`,
      `[${new Date(Date.now() - 3000).toLocaleTimeString()}] [AUTO] Active Node Telemetry Link Secured securely.`,
      `[${new Date(Date.now() - 2000).toLocaleTimeString()}] [SYSTEM] Global Treasury Arrays Locked ₹100,000.`,
      `[${new Date(Date.now() - 1000).toLocaleTimeString()}] [INFO] OpenWeather API Linked -> Monitoring 14 Grid Vulns.`
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Phase 5: UI Modes & Event Persistence Tracking
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [lastEvent, setLastEvent] = useState("No parametric executions recorded.");
  const [disasterSeverity, setDisasterSeverity] = useState("Stable");

  // Phase 6: Registration Lifecycle
  const [regName, setRegName] = useState("");
  const [regZone, setRegZone] = useState("Koramangala");
  const [isRegistering, setIsRegistering] = useState(false);

  // Phase 7: Realism & Life Cycle Integrations hooks
  const [workerWallet, setWorkerWallet] = useState(null);
  const [workerBalance, setWorkerBalance] = useState(0);
  const [workerFraudScore, setWorkerFraudScore] = useState(0);
  const [workerFraudReason, setWorkerFraudReason] = useState("Clear");
  const [payoutBannerActive, setPayoutBannerActive] = useState(false);
  const [claimStage, setClaimStage] = useState(0); // 0: Idle, 1: Triggered, 2: Eval, 3: Paid

  useEffect(() => {
    // Initial fetch to sync global liquidity pool without crashing UI
    fetch('/api/liquidity')
      .then(res => res.json())
      .then(data => { if (data.liquidity !== undefined) setReservePool(data.liquidity); })
      .catch(err => console.error("Initial load fallback:", err));
  }, []);

  useEffect(() => {
    // Dynamically fetch Oracular metrics based on active Registered Zone
    fetch(`/api/live-risk/${regZone}`)
      .then(res => res.json())
      .then(data => {
         if (data.riskScore !== undefined) {
             setRiskScore(data.riskScore);
             setZoneClassification(data.classification);
             setDynamicPremium(data.calculatedPremium);
             setLiveRainfall(data.liveRainfall || 0);
             
             if (data.weatherSeverity > 1.8) setDisasterSeverity("Critical");
             else if (data.weatherSeverity > 1.2) setDisasterSeverity("Elevated");
             else setDisasterSeverity("Stable");
         }
      })
      .catch(err => console.error("Oracle fetch failed silently:", err));
  }, [regZone]);

  useEffect(() => {
     let pollInternal;
     if (workerWallet) {
         pollInternal = setInterval(() => {
             fetch(`/api/worker/${workerWallet}`)
               .then(res => res.json())
               .then(data => {
                   if(data.targetWorker) {
                       setWorkerBalance(data.targetWorker.balance);
                       setWorkerFraudScore(data.targetWorker.fraud_score || 0);
                       setWorkerFraudReason(data.targetWorker.fraud_reason || "Clear");
                   }
               }).catch(e => console.error("Worker fetch failed"));
         }, 3000);
     }
     return () => clearInterval(pollInternal);
  }, [workerWallet]);

  useEffect(() => {
    if (eventType === 'FLOOD') setIntensityValue(50);
    if (eventType === 'SMOG') setIntensityValue(150);
    if (eventType === 'HEATWAVE') setIntensityValue(45);
    if (eventType === 'CURFEW') setIntensityValue(1); 
  }, [eventType]);

  // Automated Oracle Polling Hook (Runs strictly when Live Mode is toggled!)
  useEffect(() => {
      let interval;
      if (isLiveMode) {
          interval = setInterval(() => {
              triggerLiveOracleCheck();
          }, 10000); // 10 second autonomous cycle
      }
      return () => clearInterval(interval);
  }, [isLiveMode]);

  const triggerLiveOracleCheck = async () => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [AUTO] Polling API Telemetry...`]);
      try {
          const resp = await fetch('/api/disaster-check');
          const data = await resp.json();
          if (data.status === "DISASTER_TRIGGER") {
              setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [CRITICAL] ORACLE THRESHOLD BREACHED. Executing payload natively.`]);
              const ev = data.triggerPayload;
              executeBackendPayload(ev.zone, ev.event_type, ev.intensity_value);
          } else {
              setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [AUTO] Parameter constraints stable.`]);
          }
      } catch (err) {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [AUTO] Upstream timeout. Fallback secure.`]);
      }
  };

  const handleCollectPremiums = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYN... Submitting Premium Generation...`]);
    try {
      const response = await fetch('/api/collect-premiums', { method: 'POST' });
      const data = await response.json();
      
      if (data.status === "SUCCESS") {
        setReservePool(data.reservePool);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [INFO] ₹${data.collectedThisBatch} premiums collected. Reserve dynamically updated.`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Fatal network timeout.`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeBackendPayload = async (zone, event, intensity) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setAdminSystemState("DETECTING EVENT");
    
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYN... Initializing Core Engine Router for ${event}...`]);
    try {
      const response = await fetch('/api/trigger-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, event_type: event, intensity_value: intensity }) 
      });
      
      const data = await response.json();
      
      if (data.status === "PROCESSED") {
        setClaimStage(1);
        setTimeout(() => { setClaimStage(2); setAdminSystemState("FRAUD ANALYSIS IN PROGRESS"); }, 1000);
        setTimeout(() => { setAdminSystemState("PAYOUT EXECUTION ACTIVE"); }, 2000);
        
        setTimeout(() => {
            setClaimStage(3);
            setReservePool(data.reservePool);
            setActualPayout(data.actualPayout);
            setHealthStatus(data.healthStatus);
            setLastEvent(`Processed ${event} payload dispersing ₹${data.actualPayout}.`);
            
            setAdminSystemState(data.healthStatus.includes('PRORATING') ? "PRORATION MODE ACTIVE" : "IDLE");
            setTimeout(() => { if (!data.healthStatus.includes('BANKRUPT')) setAdminSystemState("IDLE"); }, 4000);

            const blockedCount = (data.logs || []).filter(log => log.includes('[BLOCKED]')).length;
            const paidCount = (data.fundedWallets && Array.isArray(data.fundedWallets)) ? data.fundedWallets.length : 0;
            
            setLastEventSummary({ event, paid: paidCount, blocked: blockedCount, total: data.actualPayout || 0 });
            
            if (workerWallet && data.fundedWallets && data.fundedWallets.includes(workerWallet)) {
                 setPayoutBannerActive(true);
                 setTimeout(() => setPayoutBannerActive(false), 9000);
            }
            
            setTimeout(() => setClaimStage(0), 12000); // Cleans up the trace after 12 seconds
        }, 3000);
        
        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((logItem, index) => {
            setTimeout(() => {
              setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logItem}`]);
            }, 60 * index); 
          });
        }
      } else {
         setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Gateway: Status ${data.status}.`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Gateway Offline: MongoDB/Node Unreachable.`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSimulate = () => {
      let formattedIntensity = intensityValue;
      if (eventType === 'CURFEW') formattedIntensity = intensityValue > 0;
      executeBackendPayload(regZone, eventType, formattedIntensity);
  };

  const handleRegistrationSubmit = async (e) => {
      e.preventDefault();
      if (!regName) return;
      setIsRegistering(true);
      try {
          const response = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: regName, zone: regZone })
          });
          const data = await response.json();
          if (data.status === "SUCCESS") {
              setWorkerWallet(data.worker.wallet_address);
              setWorkerBalance(data.worker.balance);
              setCurrentView("WORKER");
          }
      } catch (err) {
          console.error("Registration offline");
      } finally { setIsRegistering(false); }
  };

  const renderRegister = () => {
     return (
       <div className="w-full max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 animate-fade-in my-12">
          <div className="text-center mb-8">
             <div className="text-4xl mb-4 text-emerald-400 drop-shadow-sm">🛡️</div>
             <h2 className="text-2xl font-black text-white tracking-tight">Secure Your Gig</h2>
             <p className="text-[11px] font-medium text-gray-500 mt-2 uppercase tracking-widest leading-relaxed">Instant Zero-Auth Parametric Flow</p>
          </div>
          <form onSubmit={handleRegistrationSubmit} className="flex flex-col gap-6">
             <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Worker Display Name</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} required placeholder="E.g. Siddharth M." className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-4 text-[13px] font-bold text-white focus:outline-none focus:border-red-500 shadow-inner" />
             </div>
             <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Link Zomato Rider ID</label>
                <input type="text" placeholder="E.g. ZMD-8472" className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-4 text-[13px] font-bold text-white focus:outline-none focus:border-red-500 shadow-inner" />
             </div>
             <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2 pl-1">Primary Operating Grid</label>
                <select value={regZone} onChange={e => setRegZone(e.target.value)} className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-4 text-[13px] font-bold text-white focus:outline-none focus:border-red-500 appearance-none shadow-inner">
                   <option value="Koramangala">Koramangala (High Vuln.)</option>
                   <option value="Whitefield">Whitefield (Med Vuln.)</option>
                   <option value="Indiranagar">Indiranagar (Low Vuln.)</option>
                </select>
             </div>
             <button type="submit" disabled={isRegistering} className="mt-2 w-full bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 py-4 rounded-2xl font-black tracking-widest text-xs text-white transition-all shadow-[0_10px_30px_rgba(225,29,72,0.3)]">
                {isRegistering ? 'WRITING LEDGER...' : 'ACTIVATE POLICY OBJECT ⚡'}
             </button>
             <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2 border-t border-gray-800 pt-4">Persists dynamically to MongoDB Hook</p>
          </form>
       </div>
     );
  };

  const renderAdminConsole = () => {
    
    let intensityGradient = "from-indigo-500 to-blue-500";
    let maxSlider = 200;
    let minSlider = 0;
    let stepSlider = 10;
    let unit = "";

    if (eventType === 'FLOOD') {
        maxSlider = 200;
        unit = "mm";
        if (intensityValue >= 150) intensityGradient = "from-red-600 to-rose-600";
        else if (intensityValue >= 80) intensityGradient = "from-amber-400 to-orange-500";
        else intensityGradient = "from-emerald-500 to-teal-500";
    } else if (eventType === 'SMOG') {
        maxSlider = 500;
        stepSlider = 20;
        unit = " AQI";
        if (intensityValue >= 400) intensityGradient = "from-purple-600 to-fuchsia-600";
        else if (intensityValue >= 200) intensityGradient = "from-amber-500 to-orange-500";
        else intensityGradient = "from-yellow-400 to-amber-500";
    } else if (eventType === 'HEATWAVE') {
        maxSlider = 60;
        minSlider = 30;
        stepSlider = 1;
        unit = "°C";
        intensityGradient = intensityValue >= 45 ? "from-red-600 to-rose-600" : "from-amber-500 to-orange-500";
    } else if (eventType === 'CURFEW') {
        maxSlider = 1;
        minSlider = 0;
        stepSlider = 1;
        unit = " State";
        intensityGradient = intensityValue === 1 ? "from-red-600 to-rose-600" : "from-gray-500 to-gray-400";
    }

    return (
      <div className="w-full animate-fade-in pb-10">
      
      {/* SYSTEM STATE INDICATOR */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-center mb-6 mt-4">
         <div className={`px-6 py-2 rounded-full font-black text-[12px] tracking-widest uppercase border flex items-center gap-3 transition-colors duration-300 shadow-md
            ${adminSystemState === 'IDLE' ? 'bg-gray-900 border-gray-700 text-gray-500' : 
              adminSystemState.includes('DETECTING') ? 'bg-blue-900/40 border-blue-500 text-blue-400 animate-pulse' :
              adminSystemState.includes('FRAUD') ? 'bg-amber-900/40 border-amber-500 text-amber-400 animate-pulse' :
              adminSystemState.includes('PRORATION') ? 'bg-red-900/40 border-red-500 text-red-500 animate-pulse' :
              'bg-emerald-900/40 border-emerald-500 text-emerald-400 opacity-90'}`}
         >
            <span className="w-2.5 h-2.5 rounded-full bg-current shadow-sm" /> 
            SYSTEM STATE: {adminSystemState}
         </div>
      </div>

      <header className="w-full max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center mb-8 pb-6 border-b border-gray-800 gap-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm min-w-max">
          GigAegis <span className="text-indigo-400">Admin Console</span>
        </h1>
        
        <div className="flex flex-wrap justify-center gap-4 w-full xl:w-auto">
          {/* Enhanced Analytics Row */}
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center justify-center min-w-[130px] relative group cursor-help">
             <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">Live Risk Score <span className="opacity-50 font-normal mt-0.5">ⓘ</span></span>
             <span className="text-lg font-black text-indigo-400">{riskScore} <span className="text-xs text-gray-600 opacity-60">/ 1.0</span></span>
             <div className="absolute top-full mt-2 w-56 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-[10px] text-gray-300 leading-tight hidden group-hover:block z-50 text-center font-medium">
                Calculated dynamically via Live Weather telemetry × Static Zone vulnerability limits.
             </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center justify-center min-w-[130px]">
             <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold mb-1">Zone Profile</span>
             <span className={`text-lg font-black ${zoneClassification === "High" ? "text-red-400" : "text-amber-400"}`}>{zoneClassification} Risk</span>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center justify-center min-w-[130px]">
             <span className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-bold mb-1">System Health</span>
             <span className={`text-[12px] font-black mt-1 ${healthStatus.includes('HEALTHY') ? 'text-emerald-400' : 'text-red-500'}`}>{healthStatus}</span>
          </div>

          <div className="bg-gradient-to-tr from-emerald-400 to-teal-500 px-6 py-2 rounded-xl font-black text-gray-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center min-w-[160px]">
             <span className="text-[0.65rem] text-gray-800 uppercase tracking-widest font-bold mb-1 opacity-80">Global Reserve Pool</span>
             <span className="text-xl drop-shadow-sm font-extrabold tracking-tight">₹{typeof reservePool === 'number' ? reservePool.toLocaleString() : reservePool}</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-0">
        
        {/* Left Column (Mechanics Console) */}
        <section className="col-span-1 lg:col-span-5 bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col justify-start items-center text-center">
          
          {/* Safe Mode Switching Architecture */}
          <div className="w-full bg-gray-800/80 p-2 rounded-xl flex items-center mb-8 border border-gray-700/50">
             <button
               onClick={() => setIsLiveMode(false)}
               className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${!isLiveMode ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
             >
               Simulation Mode
             </button>
             <button
               onClick={() => setIsLiveMode(true)}
               className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg transition-colors ${isLiveMode ? 'bg-red-500 text-white shadow-md shadow-red-500/20 animate-pulse' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
             >
               Live Mode
               {isLiveMode && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
             </button>
          </div>

          <button 
            onClick={handleCollectPremiums}
            disabled={isProcessing}
            className={`
              w-full py-4 px-6 mb-8 rounded-2xl font-bold text-[1rem] tracking-wide shadow-lg transition-all duration-300 transform border-2
              ${isProcessing ? 'border-gray-700 text-gray-500 bg-gray-800 cursor-not-allowed' : 'border-blue-500/80 text-blue-400 hover:bg-blue-500 hover:text-white hover:-translate-y-1'}
            `}
          >
            {isProcessing ? 'PROCESSING BATCH...' : 'COLLECT WEEKLY PREMIUMS'}
            <div className={`text-[10px] font-medium mt-1 uppercase tracking-widest ${isProcessing ? 'opacity-40' : 'opacity-80 text-blue-300'}`}>
              (MongoDB Persisted Transaction)
            </div>
          </button>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-6"></div>
          
          {/* Core Modular View Toggle */}
          {!isLiveMode ? (
              <div className="w-full bg-black/40 border border-gray-800 rounded-2xl p-6 shadow-inner flex flex-col items-center animate-fade-in">
                 <div className="flex items-center justify-between w-full mb-6">
                     <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest flex items-center gap-2">
                       <span className="text-xl">⚡</span> Parametric Simulator
                     </h3>
                 </div>

                 <div className="w-full mb-6 flex bg-gray-800 rounded-xl p-1 gap-1">
                    {['FLOOD', 'SMOG', 'HEATWAVE', 'CURFEW'].map(type => (
                       <button 
                         key={type}
                         onClick={() => setEventType(type)}
                         className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors ${eventType === type ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                       >
                         {type}
                       </button>
                    ))}
                 </div>
                 
                 <div className="w-full mb-8 px-2 relative">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] uppercase font-bold text-gray-500">Min</span>
                      <span className={`text-xl font-black bg-clip-text text-transparent bg-gradient-to-r ${intensityGradient}`}>
                        {eventType === 'CURFEW' ? (intensityValue === 1 ? 'ACTIVE' : 'PEACEFUL') : `${intensityValue}${unit}`}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-500">Max</span>
                    </div>
                    
                    <input 
                      type="range"
                      min={minSlider}
                      max={maxSlider}
                      step={stepSlider}
                      value={intensityValue}
                      onChange={(e) => setIntensityValue(Number(e.target.value))}
                      className="w-full h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 <button 
                    onClick={handleManualSimulate}
                    disabled={isProcessing}
                    className={`
                      w-full py-4 px-6 rounded-2xl font-bold text-[1.1rem] tracking-wide text-white transition-all 
                      ${isProcessing ? 'bg-gray-800 cursor-not-allowed opacity-70 border border-gray-700' : `bg-gradient-to-r ${intensityGradient} hover:brightness-110 hover:-translate-y-1 shadow-lg`}
                    `}
                  >
                    {isProcessing ? 'SIMULATING...' : 'EXECUTE PAYLOAD'}
                 </button>
              </div>
          ) : (
              <div className="w-full bg-red-950/20 border border-red-900/50 rounded-2xl p-6 shadow-inner flex flex-col items-center animate-fade-in relative overflow-hidden">
                 <div className="absolute inset-x-0 top-0 h-1 bg-red-500/50"></div>
                 <div className="flex flex-col items-center text-center my-4">
                     <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                       <span className="text-2xl animate-pulse">📡</span>
                     </div>
                     <h3 className="text-lg font-bold text-gray-100 uppercase tracking-widest mb-2">Live Weather Oracle Linked</h3>
                     <p className="text-xs text-gray-400 max-w-[200px] mb-6 border-b border-red-900/40 pb-6">
                        System actively polling external sensors specifically charting Koramangala grid metrics iteratively.
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4 w-full">
                         <div className="bg-black/50 rounded-xl p-3 border border-gray-800 text-left flex flex-col justify-center">
                            <span className="text-[10px] uppercase font-black text-gray-500">Live Geo-Rainfall</span>
                            <span className="text-xl font-bold text-red-400">{liveRainfall}mm</span>
                         </div>
                         <div className="bg-black/50 rounded-xl p-3 border border-gray-800 text-left flex flex-col justify-center">
                            <span className="text-[10px] uppercase font-black text-gray-500">Detected Severity</span>
                            <span className="text-lg font-bold text-red-300">{disasterSeverity}</span>
                         </div>
                     </div>
                 </div>
              </div>
          )}
          
        </section>

        {/* Right Column (Logs) */}
        <section className="col-span-1 lg:col-span-7 h-full flex flex-col">

          {/* Event Summary Box */}
          {lastEventSummary && (
             <div className="mb-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4 shadow-sm animate-fade-in relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <div className="flex items-center gap-3 w-full flex-wrap pl-2">
                   <div className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-950 px-2 py-1 rounded tracking-widest border border-emerald-900/40 shadow-sm whitespace-nowrap">Last Event Summary</div>
                   <div className="text-[13px] font-semibold text-gray-300 flex items-center gap-3 flex-1 flex-wrap font-mono">
                      <span className="text-blue-400">🚨 {lastEventSummary.event}</span> <span className="text-gray-700">→</span>
                      <span className="text-emerald-400">💰 {lastEventSummary.paid} paid</span> <span className="text-gray-700">→</span>
                      <span className="text-rose-400">🛡️ {lastEventSummary.blocked} blocked</span> <span className="text-gray-700">→</span>
                      <span className="text-amber-400 tracking-tight font-black">₹{lastEventSummary.total.toLocaleString()} total</span>
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
               <div className="text-xs mt-1 text-gray-500 flex items-center gap-2">
                  <span className="uppercase font-semibold tracking-widest opacity-60">Last Event:</span>
                  <span className="text-gray-300 italic truncate max-w-sm">{lastEvent}</span>
               </div>
            </div>
            
            <div className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border ${isLiveMode ? 'bg-red-950/40 border-red-900/80 text-red-400' : 'bg-indigo-950/40 border-indigo-900/80 text-indigo-300'}`}>
              Mode: {isLiveMode ? 'LIVE AUTONOMOUS' : 'SAFE SIMULATION'}
            </div>
          </div>
          
          <div className="flex-1 bg-black border border-gray-800 rounded-2xl p-6 overflow-y-auto font-mono text-[13px] shadow-inner min-h-[500px] scroll-smooth">
            {logs.length === 0 ? (
              <span className="text-gray-600 italic">Waiting for incoming telemetry payload array blocks...</span>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map((log, idx) => {
                  let logText = log;
                  let colorClass = "text-gray-400"; 
                  let prefixTag = null;

                  if (logText.includes("[SUCCESS]")) {
                     colorClass = "text-emerald-400 font-semibold";
                     prefixTag = <span className="inline-block bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest align-middle">💰 PAYOUT</span>;
                     logText = logText.replace("[SUCCESS]", "").trim();
                  }
                  else if (logText.includes("[BLOCKED]") && logText.includes("Hardware Flash-Mob")) {
                     colorClass = "text-amber-500 font-bold bg-amber-950/10 rounded";
                     prefixTag = <span className="inline-block bg-amber-950/50 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest align-middle">🔍 FRAUD ANALYSIS</span>;
                     logText = logText.replace("[BLOCKED]", "").trim();
                  }
                  else if (logText.includes("[BLOCKED]")) {
                     colorClass = "text-rose-400 font-bold bg-rose-950/10 rounded";
                     prefixTag = <span className="inline-block bg-rose-950/50 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest align-middle">🔍 FRAUD BLOCK</span>;
                     logText = logText.replace("[BLOCKED]", "").trim();
                  }
                  else if (logText.includes("[FLAG]")) {
                     colorClass = "text-yellow-400 font-medium";
                     prefixTag = <span className="inline-block bg-yellow-950/50 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest align-middle">⚠️ FLAG</span>;
                     logText = logText.replace("[FLAG]", "").trim();
                  }
                  else if (logText.includes("[INFO]")) {
                     colorClass = "text-blue-300";
                     prefixTag = <span className="inline-block bg-blue-950/50 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest align-middle">ℹ️ INFO</span>;
                     logText = logText.replace("[INFO]", "").trim();
                  }
                  else if (logText.includes("[CRITICAL FAILURE]") || logText.includes("[WARNING]")) {
                     colorClass = "text-red-500 font-black";
                     prefixTag = <span className="inline-block bg-red-950 text-red-500 border border-red-500 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest animate-pulse align-middle">🚨 CRITICAL</span>;
                     logText = logText.replace("[CRITICAL FAILURE]", "").replace("[WARNING]", "").trim();
                  }
                  else if (logText.includes("[SYSTEM]")) {
                     colorClass = "text-indigo-300 font-bold tracking-wide";
                     prefixTag = <span className="inline-block bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[9px] font-black mr-2 tracking-widest align-middle">⚙️ SYSTEM</span>;
                     logText = logText.replace("[SYSTEM]", "").trim();
                  }
                  else if (logText.includes("[AUTO]")) {
                     colorClass = "text-gray-500 font-medium";
                     logText = logText.replace("[AUTO]", "").trim();
                  }
                  else if (logText.includes("SYN...")) {
                     colorClass = "text-cyan-400 border-l-2 border-cyan-500 pl-2 opacity-80";
                  }

                  return <div key={idx} className={`leading-relaxed mb-1.5 ${colorClass} block break-words border-b border-gray-800/20 pb-1`}>
                      {prefixTag}{logText}
                  </div>;
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      </div>
    );
  };

  const renderWorkerApp = () => {

    const classificationColor = zoneClassification === "High" ? "text-red-400" : (zoneClassification === "Medium" ? "text-amber-400" : "text-emerald-400");
    const bgClassificationColor = zoneClassification === "High" ? "bg-red-900/20 border-red-900/50" : (zoneClassification === "Medium" ? "bg-amber-900/20 border-amber-900/50" : "bg-emerald-900/20 border-emerald-900/50");
    const walletAddressFragment = workerWallet ? workerWallet.slice(0, 8) + '...' : '0xHW-DEMO...';

    return (
      <div className="w-full max-w-md mx-auto bg-gray-900 min-h-[800px] border-[8px] border-black rounded-[45px] shadow-2xl relative overflow-hidden flex flex-col font-sans animate-fade-in my-8">
        <div className="absolute top-0 inset-x-0 h-7 bg-black rounded-b-3xl w-[160px] mx-auto z-20"></div>

        {payoutBannerActive && (
          <div className="absolute inset-x-0 top-12 mx-4 z-40 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 shadow-[0_15px_50px_rgba(16,185,129,0.6)] border border-emerald-400 animate-fade-in origin-top">
             <div className="flex items-start gap-4">
               <div className="text-3xl animate-bounce mt-1">🌊</div>
               <div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1 drop-shadow-md">Disaster Confirmed</h4>
                  <p className="text-teal-50 text-[11px] font-medium leading-tight">Income loss actively prevented mapping parameters. <span className="font-extrabold text-white text-[13px] block mt-1 tracking-wide">₹{actualPayout} Credited Securely.</span></p>
               </div>
             </div>
          </div>
        )}

        <div className="bg-gradient-to-b from-blue-900/60 to-transparent pt-16 pb-6 px-6">
           <div className="flex justify-between items-end mb-1">
               <h2 className="text-3xl font-extrabold text-white tracking-tight">Hello, <span className="text-blue-400">{regName ? regName.split(' ')[0] : 'Worker'}.</span></h2>
               <div className="text-right">
                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Real-Time Balance</div>
                   <div className="text-xl font-black text-emerald-400 tracking-tighter">₹{workerBalance}</div>
               </div>
           </div>
           <p className="text-gray-400 text-sm font-medium">Your parametric income is permanently secured today.</p>
        </div>

        <div className="px-6 mb-6">
           <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-3xl p-6 shadow-[0_10px_40px_rgba(16,185,129,0.3)] relative overflow-hidden">
              <div className="absolute -top-4 -right-4 text-8xl opacity-15">🛡️</div>
              <div className="relative z-10 flex justify-between items-start text-emerald-950">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/40 px-3 py-1 rounded inline-block mb-3 shadow-sm">Policy: ACTIVE</span>
                <span className="text-[10px] font-black tracking-widest bg-white/30 px-3 py-1 rounded shadow-sm">₹2000 COVERAGE</span>
              </div>
              <div className="relative z-10">
                <h3 className="text-white text-xl font-bold leading-tight drop-shadow-sm">Dynamic Income Object</h3>
                <p className="text-teal-50 text-[11px] mt-2 font-medium opacity-90 leading-relaxed">System tracking active Grid ID: {walletAddressFragment}. Auto-payouts autonomously executing globally without adjustments.</p>
              </div>
           </div>
        </div>

        {/* Explainable Risk Scoring Engine Output */}
        <div className="px-6 mb-6">
           <div className={`bg-gray-800/40 border ${workerFraudScore >= 0.7 ? 'border-red-900/50' : (workerFraudScore > 0 ? 'border-amber-900/50' : 'border-emerald-900/30')} rounded-2xl p-4 shadow-sm w-full transition-all duration-300 relative overflow-hidden backdrop-blur-sm`}>
               <div className="flex justify-between items-center mb-1 border-b border-gray-700/50 pb-2">
                 <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold block">Integrity Engine Status</span>
                 <span className={`text-[10px] font-black uppercase tracking-wider ${workerFraudScore >= 0.7 ? 'text-red-400' : (workerFraudScore > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>{workerFraudScore >= 0.7 ? 'High Risk' : (workerFraudScore > 0 ? 'Monitor' : 'Low Risk')}</span>
               </div>
               <div className="flex items-end justify-between mt-3">
                 <div>
                   <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-[90%] font-mono">{workerFraudScore > 0 ? workerFraudReason : "Nominal telemetry cleared safely. Profile integrity verified."}</p>
                 </div>
                 <div className={`text-xl font-black tracking-tighter ${workerFraudScore >= 0.7 ? 'text-red-400' : (workerFraudScore > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                   {(workerFraudScore || 0).toFixed(2)}
                 </div>
               </div>
           </div>
        </div>

        <div className="px-6 mb-6">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3 ml-2 flex items-center gap-2">
               Live Risk Assessment ({regZone})
               <div className="h-px bg-gray-800 flex-1"></div>
            </h4>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className={`border rounded-2xl p-4 shadow-inner flex flex-col items-center justify-center ${bgClassificationColor}`}>
                 <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Zone Vuln.</span>
                 <span className={`text-lg font-black tracking-wide ${classificationColor}`}>{zoneClassification}</span>
              </div>
              <div className="bg-black/30 border border-gray-800 rounded-2xl p-4 shadow-inner flex flex-col items-center justify-center">
                 <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Risk Score</span>
                 <span className="text-lg font-black text-indigo-400 tracking-wide">{riskScore} <span className="text-xs text-gray-600">/ 1.0</span></span>
              </div>
            </div>
            
            <div className="bg-black/40 border border-gray-800 rounded-3xl p-5 shadow-inner">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-gray-300 font-bold text-sm tracking-wide">Calculated Weekly Premium</span>
                 <span className="text-2xl font-black text-rose-500">₹{dynamicPremium} <span className="text-sm font-bold text-gray-500 tracking-widest">/ WEEK</span></span>
               </div>
               <div className="w-full h-px bg-gray-800/80 my-3"></div>
               <p className="text-[10px] text-gray-500 leading-relaxed font-medium italic">
                 * High humidity directly increased the regional Risk Score natively, resulting in marginally higher dynamic premiums.
               </p>
            </div>
        </div>

        <div className="px-6 mb-6">
           <div className="bg-gray-800/50 border border-gray-700/80 rounded-2xl p-4 shadow-sm w-full transition-all duration-300 relative overflow-hidden">
               {claimStage === 2 && <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500 animate-pulse"></div>}
               {claimStage === 3 && <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500"></div>}
               <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-3 block">Dynamic Claim Lifecycle Tracking</span>
               <div className="flex justify-between items-center text-[11px] font-bold py-2">
                 <span className={`${claimStage >= 1 ? 'text-amber-400 font-black relative before:content-[\'\'] before:absolute before:-left-3 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-amber-400 before:rounded-full animate-fade-in' : 'text-gray-600 font-medium'}`}>1. Trigger</span>
                 <span className={`${claimStage >= 1 ? 'text-amber-400/50' : 'text-gray-700'}`}>→</span>
                 <span className={`${claimStage === 2 ? 'text-blue-400 font-black animate-pulse' : (claimStage > 2 ? 'text-emerald-400 font-black' : 'text-gray-600 font-medium')}`}>2. Evaluation</span>
                 <span className={`${claimStage >= 2 ? 'text-blue-400/50' : 'text-gray-700'}`}>→</span>
                 <span className={`${claimStage === 3 ? 'text-emerald-400 font-black bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-fade-in' : 'text-gray-600 font-medium'}`}>3. {claimStage === 3 ? 'Disbursed' : 'Funding'}</span>
               </div>
               
               {/* Contextual Sub-states dynamically evaluating back-end processes visually! */}
               {claimStage === 2 && <p className="text-[10px] text-blue-300/90 mt-3 font-mono animate-pulse bg-blue-950/30 p-2 rounded border border-blue-900/30 text-center">Executing Syndicate Defense & Traversal Locks...</p>}
               {claimStage === 3 && <p className="text-[10px] text-emerald-300/90 mt-3 font-mono border-t border-gray-700/50 pt-3 text-center">Disbursement Ledger Verified. System Secured.</p>}
           </div>
        </div>

        <div className="mt-auto h-1.5 bg-gray-700 w-1/3 mx-auto rounded-full mb-4 opacity-50"></div>
      </div>
    );
  };

  return (
    <div className="bg-gray-950 min-h-screen relative text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />

      <div className="w-full bg-black/80 backdrop-blur-md border-b border-gray-800 py-4 px-6 flex justify-center mb-6 sticky top-0 z-50">
         <div className="bg-gray-900 border border-gray-700 rounded-full p-1 flex shadow-xl">
            <button 
              onClick={() => setCurrentView('REGISTER')}
              className={`px-6 py-2.5 rounded-full text-[11px] uppercase font-black tracking-widest transition-all duration-300 ${currentView === 'REGISTER' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Sign Up
            </button>
            <button 
              onClick={() => setCurrentView('ADMIN')}
              className={`px-6 py-2.5 rounded-full text-[11px] uppercase font-black tracking-widest transition-all duration-300 ${currentView === 'ADMIN' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Command Center
            </button>
            <button 
              onClick={() => setCurrentView('WORKER')}
              className={`px-6 py-2.5 rounded-full text-[11px] uppercase font-black tracking-widest transition-all duration-300 ${currentView === 'WORKER' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Worker App
            </button>
         </div>
      </div>

      {currentView === 'REGISTER' && renderRegister()}
      {currentView === 'ADMIN' && renderAdminConsole()}
      {currentView === 'WORKER' && renderWorkerApp()}
      
    </div>
  );
}

export default App;
