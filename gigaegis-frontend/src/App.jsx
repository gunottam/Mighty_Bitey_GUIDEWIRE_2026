import { useState, useEffect } from 'react';
import RegisterPage from './components/RegisterPage';
import WorkerApp from './components/WorkerApp';
import AdminConsole from './components/AdminConsole';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function App() {
  const [currentView, setCurrentView] = useState('REGISTER');

  // Core state shared across views
  const [reservePool, setReservePool] = useState(100000);
  const [actualPayout, setActualPayout] = useState(0);
  const [healthStatus, setHealthStatus] = useState("HEALTHY");
  const [workerWallet, setWorkerWallet] = useState(null);
  const [regName, setRegName] = useState('');
  const [regZone, setRegZone] = useState('Koramangala_1');
  const [payoutBannerActive, setPayoutBannerActive] = useState(false);
  const [claimStage, setClaimStage] = useState(0);

  // Fetch initial liquidity
  useEffect(() => {
    fetch('/api/liquidity')
      .then(res => res.json())
      .then(data => { if (data.liquidity !== undefined) setReservePool(data.liquidity); })
      .catch(() => {});
  }, []);

  const handleRegistered = (worker, premiumDetails, zoneRisk) => {
    setWorkerWallet(worker.wallet_address);
    setRegName(worker.name);
    setRegZone(worker.zone);
    setCurrentView('WORKER');
  };

  const navItems = [
    { key: 'REGISTER', label: 'Onboard', color: 'bg-red-600' },
    { key: 'ADMIN', label: 'Command Center', color: 'bg-rose-600' },
    { key: 'WORKER', label: 'Worker App', color: 'bg-emerald-500' },
    { key: 'ANALYTICS', label: 'Analytics', color: 'bg-indigo-600' },
  ];

  return (
    <div className="bg-gray-950 min-h-screen relative text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />

      {/* Navigation */}
      <div className="w-full bg-black/80 backdrop-blur-md border-b border-gray-800 py-4 px-6 flex justify-center mb-6 sticky top-0 z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-full p-1 flex shadow-xl gap-0.5">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setCurrentView(item.key)}
              className={`px-5 py-2.5 rounded-full text-[11px] uppercase font-black tracking-widest transition-all duration-300 ${currentView === item.key ? `${item.color} text-white shadow-lg` : 'text-gray-500 hover:text-white'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {currentView === 'REGISTER' && (
        <RegisterPage onRegistered={handleRegistered} setRegZone={setRegZone} />
      )}
      {currentView === 'ADMIN' && (
        <AdminConsole
          reservePool={reservePool} setReservePool={setReservePool}
          healthStatus={healthStatus} setHealthStatus={setHealthStatus}
          actualPayout={actualPayout} setActualPayout={setActualPayout}
          regZone={regZone} workerWallet={workerWallet}
          setPayoutBannerActive={setPayoutBannerActive}
          setClaimStage={setClaimStage} claimStage={claimStage}
        />
      )}
      {currentView === 'WORKER' && (
        <WorkerApp
          workerWallet={workerWallet} regName={regName} regZone={regZone}
          actualPayout={actualPayout} payoutBannerActive={payoutBannerActive}
          claimStage={claimStage}
        />
      )}
      {currentView === 'ANALYTICS' && (
        <AnalyticsDashboard />
      )}
    </div>
  );
}

export default App;
