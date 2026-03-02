import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../store';

export default function BacktestModal() {
  const { backtestResult, clearBacktest } = useSimulationStore();

  if (!backtestResult) return null;

  const { startEquity, endEquity, netProfit, totalTrades, ticks } = backtestResult;
  const isProfit = netProfit >= 0;
  const color = isProfit ? '#00ff88' : '#ff4d4d';
  const sign = isProfit ? '+' : '';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0d1117]/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#161b22] border border-white/10 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          style={{ boxShadow: `0 0 50px ${color}20` }}
        >
          <div className={`absolute top-0 left-0 right-0 h-1 bg-[${color}]`} style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }} />
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-widest text-white uppercase">
              Turbo <span className="text-white/50">Backtest</span>
            </h2>
            <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-mono text-white/40 border border-white/10">
              {ticks} TICKS
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-xs text-white/40 uppercase tracking-widest">Start Equity</span>
              <span className="font-mono text-sm">${startEquity.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-xs text-white/40 uppercase tracking-widest">End Equity</span>
              <span className="font-mono text-sm">${endEquity.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-xs text-white/40 uppercase tracking-widest">Total Trades</span>
              <span className="font-mono text-sm">{totalTrades}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-white/40 uppercase tracking-widest">Net Profit</span>
              <span className="font-mono text-xl font-bold" style={{ color, textShadow: `0 0 10px ${color}80` }}>
                {sign}{netProfit.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={clearBacktest}
            className="w-full py-3 rounded-xl border transition-all text-xs font-bold tracking-widest uppercase"
            style={{ 
              borderColor: `${color}40`, 
              color: color, 
              backgroundColor: `${color}10` 
            }}
          >
            Acknowledge
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}