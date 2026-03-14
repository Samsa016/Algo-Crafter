import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Step content ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    eyebrow: 'Welcome',
    title: <>Welcome to Algo<span style={{ color: '#00ff88' }}>-Crafter</span></>,
    accent: '#00ff88',
    icon: '⚡',
    body: (
      <div className="space-y-4">
        <p className="text-white/60 text-sm leading-relaxed">
          A <span className="text-white font-semibold">visual algorithmic trading engine</span>. No code required.
          Build autonomous bots by connecting logical nodes — then watch them trade in real-time.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: '🧩', label: 'Visual Nodes',   sub: 'Drag & drop logic' },
            { icon: '📈', label: 'Live Simulation', sub: 'Real-time price feed' },
            { icon: '🏆', label: 'Gamified Ranks',  sub: 'Climb the leaderboard' },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.03] text-center"
            >
              <span className="text-2xl">{f.icon}</span>
              <p className="text-white text-xs font-bold">{f.label}</p>
              <p className="text-white/40 text-[10px]">{f.sub}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 2,
    eyebrow: 'Step 1',
    title: 'Choose a Strategy',
    accent: '#a78bfa',
    icon: '🧩',
    body: (
      <div className="space-y-3">
        <p className="text-white/60 text-sm leading-relaxed">
          Use <span className="text-[#a78bfa] font-semibold">1-click templates</span> to instantly load a proven strategy — or build your own from scratch.
        </p>
        {[
          {
            name: 'DCA — Dollar Cost Average',
            color: '#00ff88',
            desc: 'Buys on every dip. Sells when profit target is hit. Steady accumulation.',
          },
          {
            name: 'Grid Trading',
            color: '#a78bfa',
            desc: 'Places layered buy orders at intervals. Profits from volatility in both directions.',
          },
          {
            name: 'Guard (Stop-Loss)',
            color: '#f59e0b',
            desc: 'Monitors your position and exits automatically if price drops below a threshold.',
          },
        ].map((t) => (
          <div
            key={t.name}
            className="flex items-start gap-3 p-3 rounded-xl border bg-white/[0.03]"
            style={{ borderColor: t.color + '30' }}
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }}
            />
            <div>
              <p className="text-white text-xs font-bold mb-0.5" style={{ color: t.color }}>{t.name}</p>
              <p className="text-white/50 text-[11px] leading-relaxed">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 3,
    eyebrow: 'Step 2',
    title: 'Control Time',
    accent: '#f59e0b',
    icon: '⏱',
    body: (
      <div className="space-y-4">
        <p className="text-white/60 text-sm leading-relaxed">
          You control the pace. Crank the <span className="text-[#f59e0b] font-semibold">Speed Slider</span> up to <span className="text-white font-bold">100×</span> to compress hours of market action into seconds.
        </p>
        <div className="space-y-3">
          <div className="p-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5">
            <p className="text-[#f59e0b] text-xs font-bold mb-1">⚡ Speed Slider (1× – 100×)</p>
            <p className="text-white/50 text-[11px] leading-relaxed">
              Drag right to accelerate the simulation. Watch your bot react to hundreds of price ticks per second.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <p className="text-white text-xs font-bold mb-1">🕐 Timeframes: 1s · 1m · 5m · 1h</p>
            <p className="text-white/50 text-[11px] leading-relaxed">
              Switch the chart aggregation to zoom out and see the bigger picture — without changing simulation speed.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <p className="text-white text-xs font-bold mb-1">📊 Chart Types: Line & Candlestick</p>
            <p className="text-white/50 text-[11px] leading-relaxed">
              Toggle between a clean line chart and full OHLC candlesticks with wicks.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    eyebrow: 'Step 3',
    title: 'Stress-Test & Rank Up',
    accent: '#00d4ff',
    icon: '🏆',
    body: (
      <div className="space-y-4">
        <p className="text-white/60 text-sm leading-relaxed">
          Hit <span className="text-[#00d4ff] font-semibold">Fast-Forward Backtest</span> to simulate thousands of ticks instantly and see your strategy's P&L — no waiting required.
        </p>
        <div className="p-3 rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/5 mb-1">
          <p className="text-[#00d4ff] text-xs font-bold mb-1">🚀 Backtest Panel</p>
          <p className="text-white/50 text-[11px] leading-relaxed">
            Choose 1K, 5K, or 10K ticks. Results show Net Profit, Total Trades, and vs. Buy-and-Hold return.
          </p>
        </div>
        <p className="text-white/50 text-[11px] mb-1">Your <span className="text-white font-semibold">All-Time P&L</span> across all trades and backtests earns you a rank:</p>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { rank: 'Rekt 💀',               range: '< $0',          color: '#ff4d4d' },
            { rank: 'Paper Trader 📝',        range: '$0 – $1,000',   color: '#a78bfa' },
            { rank: 'Crypto Degen 🎰',        range: '$1K – $10K',    color: '#f59e0b' },
            { rank: 'Quant Intern 💻',        range: '$10K – $50K',   color: '#00ff88' },
            { rank: 'Wall Street Whale 🐳',   range: '$50K+',         color: '#00d4ff' },
          ].map((r) => (
            <div
              key={r.rank}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg border bg-white/[0.02]"
              style={{ borderColor: r.color + '25' }}
            >
              <span className="text-xs font-bold" style={{ color: r.color }}>{r.rank}</span>
              <span className="text-[10px] font-mono text-white/35">{r.range}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ── Slide variants ─────────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 32 },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.18 },
  }),
};

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep]     = useState(1);
  const [dir, setDir]       = useState(1);   // +1 = forward, -1 = backward

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('algo-welcome');
    if (!hasSeen) setIsOpen(true);
  }, []);

  function handleClose() {
    setIsOpen(false);
    sessionStorage.setItem('algo-welcome', 'true');
  }

  function goNext() {
    if (step < STEPS.length) { setDir(1); setStep((s) => s + 1); }
    else handleClose();
  }

  function goPrev() {
    if (step > 1) { setDir(-1); setStep((s) => s - 1); }
  }

  const current = STEPS[step - 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1117]/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            className="relative w-full max-w-lg mx-4 bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: `0 0 60px ${current.accent}18, 0 30px 80px rgba(0,0,0,0.7)` }}
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            {/* Top accent bar — color shifts per step */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${current.accent}, transparent)` }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border"
                  style={{
                    background: current.accent + '15',
                    borderColor: current.accent + '35',
                    boxShadow: `0 0 14px ${current.accent}25`,
                  }}
                >
                  {current.icon}
                </div>
                <div>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
                    style={{ color: current.accent }}
                  >
                    {current.eyebrow}
                  </p>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {current.title}
                  </h2>
                </div>
              </div>

              {/* Close × */}
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-all text-sm"
              >
                ✕
              </button>
            </div>

            {/* Step content — animated */}
            <div className="px-7 pb-2 overflow-hidden" style={{ minHeight: 260 }}>
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {current.body}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-7 pb-7 pt-4">
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mb-5">
                {STEPS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setDir(s.id > step ? 1 : -1); setStep(s.id); }}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width:      s.id === step ? 20 : 6,
                      height:     6,
                      background: s.id === step ? current.accent : 'rgba(255,255,255,0.15)',
                      boxShadow:  s.id === step ? `0 0 8px ${current.accent}` : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                {step > 1 && (
                  <button
                    onClick={goPrev}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-xs font-bold uppercase tracking-widest hover:border-white/20 hover:text-white/70 transition-all"
                  >
                    ← Previous
                  </button>
                )}

                <button
                  onClick={goNext}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200"
                  style={{
                    background: current.accent + '18',
                    border: `1px solid ${current.accent}50`,
                    color: current.accent,
                    boxShadow: `0 0 18px ${current.accent}20`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = current.accent + '30';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow  = `0 0 28px ${current.accent}40`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = current.accent + '18';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow  = `0 0 18px ${current.accent}20`;
                  }}
                >
                  {step < STEPS.length ? 'Next →' : '⚡ Initialize Engine'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
