import { useEffect } from 'react';
import { useSimulationStore } from './store';
import Header from './components/Header';
import MainArea from './components/MainArea';
import Sidebar from './components/Sidebar';
import WelcomeModal from './components/WelcomeModal';
import ExportModal from './components/ExportModal';

export default function App() {
  const { isRunning, tick, simulationSpeed } = useSimulationStore();

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 1000 / simulationSpeed);
    return () => clearInterval(interval);
  }, [isRunning, tick, simulationSpeed]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col text-white">
      <Header />
      <WelcomeModal />
      <ExportModal />
      <div className="flex flex-1 overflow-hidden">
        <MainArea />
        <Sidebar />
      </div>
    </div>
  );
}
