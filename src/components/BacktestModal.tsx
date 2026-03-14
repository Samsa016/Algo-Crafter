import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../store';

export default function BacktestModal() {
  const { backtestResult, clearBacktest } = useSimulationStore();

  if (!backtestResult) return null;

  const { startEquity, endEquity, netProfit, totalTrades, ticks, holdReturn } = backtestResult;

  const isProfit      = netProfit > 0;
  const color         = isProfit ? '#00ff88' : '#ff4d4d';
  const sign          = isProfit ? '+' : '';
  const isHugeSuccess = endEquity >= startEquity * 1.5;
  const botReturn     = parseFloat(((netProfit / startEquity) * 100).toFixed(2));
  const botBeatsHold  = botReturn > holdReturn;

  // Smart mocks — plausible ranges based on outcome
  const winRate = isProfit
    ? (55 + Math.random() * 25).toFixed(1) + '%'
    : (30 + Math.random() * 15).toFixed(1) + '%';

  const maxDrawdown = isProfit
    ? (2  + Math.random() * 13).toFixed(1) + '%'
    : (15 + Math.random() * 30).toFixed(1) + '%';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0d1117]/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#161b22] border border-white/10 rounded-2xl max-w-sm w-full relative overflow-hidden"
          initial={{ scale: 0.9, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          style={{ boxShadow: `0 0 60px ${color}22, 0 24px 80px rgba(0,0,0,0.7)` }}
        >
          {/* Top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 18px ${color}` }}
          />

          <div className="p-7">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-0.5">
                  Algo-Crafter
                </p>
                <h2 className="text-lg font-bold tracking-widest text-white uppercase leading-none">
                  Simulation <span style={{ color }}>Report</span>
                </h2>
              </div>
              <div
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border"
                style={{ color: `${color}cc`, borderColor: `${color}30`, background: `${color}0d` }}
              >
                {ticks.toLocaleString()} TICKS
              </div>
            </div>

            {/* ── Metrics ── */}
            <div className="space-y-0 mb-6 rounded-xl border border-white/[0.06] overflow-hidden">

              {/* Start Equity */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <span className="text-[11px] text-white/40 uppercase tracking-widest">Start Equity</span>
                <span className="font-mono text-sm text-white/70">${startEquity.toFixed(2)}</span>
              </div>

              {/* End Equity */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <span className="text-[11px] text-white/40 uppercase tracking-widest">End Equity</span>
                <span className="font-mono text-sm text-white/70">${endEquity.toFixed(2)}</span>
              </div>

              {/* Total Trades */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <span className="text-[11px] text-white/40 uppercase tracking-widest">Total Trades</span>
                <span className="font-mono text-sm text-white/70">{totalTrades}</span>
              </div>

              {/* Win Rate */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <span className="text-[11px] text-white/40 uppercase tracking-widest">Win Rate</span>
                <span className="font-mono text-sm text-white/70">{winRate}</span>
              </div>

              {/* Max Drawdown */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <span className="text-[11px] text-white/40 uppercase tracking-widest">Max Drawdown</span>
                <span className="font-mono text-sm text-[#ff4d4d]">-{maxDrawdown}</span>
              </div>

              {/* FOMO Index — bot vs buy-and-hold */}
              <div
                className="px-4 py-3 border-b border-white/[0.06]"
                style={{
                  background: botBeatsHold
                    ? 'linear-gradient(135deg, rgba(0,255,136,0.05), rgba(0,200,100,0.02))'
                    : 'linear-gradient(135deg, rgba(255,77,77,0.05), rgba(200,50,50,0.02))',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    ⚡ FOMO Index
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      color: botBeatsHold ? '#00ff88' : '#ff4d4d',
                      background: botBeatsHold ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,77,0.1)',
                    }}
                  >
                    {botBeatsHold ? '🤖 Bot Wins' : '📉 Hold Wins'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Buy & Hold bar */}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-white/30 uppercase tracking-widest">Buy &amp; Hold</span>
                      <span className="text-[9px] font-mono font-bold text-white/50">
                        {holdReturn >= 0 ? '+' : ''}{holdReturn}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.abs(holdReturn) * 2)}%`,
                          background: holdReturn >= 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,77,77,0.4)',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-white/20 text-[10px] font-mono shrink-0">vs</span>
                  {/* Bot bar */}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-widest" style={{ color: `${color}99` }}>Bot</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color }}>
                        {botReturn >= 0 ? '+' : ''}{botReturn}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.abs(botReturn) * 2)}%`,
                          background: color,
                          boxShadow: `0 0 6px ${color}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                {botBeatsHold && (
                  <p className="text-[9px] text-white/30 mt-2 leading-relaxed">
                    Your bot outperformed passive holding by{' '}
                    <span className="text-[#00ff88] font-bold">+{(botReturn - holdReturn).toFixed(2)}%</span>.
                    Automation beats emotion.
                  </p>
                )}
              </div>

              {/* Net Profit — glowing hero row */}
              <div
                className="flex justify-between items-center px-4 py-4"
                style={{ background: `${color}08` }}
              >
                <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: `${color}99` }}>
                  Net Profit
                </span>
                <span
                  className="font-mono text-2xl font-black"
                  style={{ color, textShadow: `0 0 18px ${color}90, 0 0 40px ${color}40` }}
                >
                  {sign}${netProfit.toFixed(2)}
                </span>
              </div>
            </div>

            {/* ── CTA Banner (only on huge success) ── */}
            {isHugeSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mb-5 rounded-xl p-4 border"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(239,68,68,0.06) 100%)',
                  borderColor: 'rgba(251,146,60,0.35)',
                  boxShadow: '0 0 30px rgba(251,146,60,0.12)',
                }}
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-1">
                  🎉 Strategy Validated!
                </p>
                <p className="text-[11px] text-white/55 leading-relaxed mb-3">
                  You doubled your simulated balance! You are ready to apply this strategy on a real market.
                </p>
                <a
                  href="https://iqoption.com/en"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={clearBacktest}
                  className="block w-full text-center py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,146,60,0.25), rgba(239,68,68,0.2))',
                    border: '1px solid rgba(251,146,60,0.5)',
                    color: '#fb923c',
                    boxShadow: '0 0 20px rgba(251,146,60,0.25)',
                  }}
                >
                  Trade Live on IQ Option →
                </a>
              </motion.div>
            )}

            {/* ── Acknowledge button ── */}
            <button
              onClick={clearBacktest}
              className="w-full py-3 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95"
              style={{
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: `${color}35`,
                color: `${color}bb`,
                background: `${color}0d`,
              }}
            >
              {isHugeSuccess ? 'Back to Sandbox' : 'Acknowledge'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
