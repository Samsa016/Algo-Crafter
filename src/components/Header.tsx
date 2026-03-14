import { useState } from 'react';
import { useSimulationStore } from '../store';

const ASSETS = ['BTC/USD', 'ETH/USD', 'EUR/USD'] as const;

// ── Rank helper ────────────────────────────────────────────────────────────────
function getRank(profit: number): { label: string; gradient: string; glow: string } {
  if (profit < 0)       return { label: 'Rekt 💀',               gradient: 'from-[#ff4d4d] to-[#ff0000]',   glow: 'rgba(255,77,77,0.35)'   };
  if (profit <= 1000)   return { label: 'Paper Trader 📝',        gradient: 'from-[#a78bfa] to-[#7c3aed]',   glow: 'rgba(167,139,250,0.35)' };
  if (profit <= 10000)  return { label: 'Crypto Degen 🎰',        gradient: 'from-[#f59e0b] to-[#d97706]',   glow: 'rgba(245,158,11,0.35)'  };
  if (profit <= 50000)  return { label: 'Quant Intern 💻',        gradient: 'from-[#00ff88] to-[#00cc6a]',   glow: 'rgba(0,255,136,0.35)'   };
  return                       { label: 'Wall Street Whale 🐳',   gradient: 'from-[#00d4ff] to-[#0099cc]',   glow: 'rgba(0,212,255,0.45)'   };
}

export default function Header() {
  const {
    balance, assets, asset, currentPrice,
    isRunning, toggleSimulation, deposit, setAsset,
    totalAllTimeProfit, triggerShock,
  } = useSimulationStore();

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1000);
  const [rankTooltip, setRankTooltip] = useState(false);

  // Only reflect the active asset's units in equity
  const activeAssets = assets[asset] ?? 0;
  const equity       = parseFloat((balance + activeAssets * currentPrice).toFixed(2));

  const balanceColor = balance >= 10000 ? 'text-[#00ff88]' : 'text-[#ff4d4d]';
  const equityColor  = equity  >= 10000 ? 'text-[#00ff88]' : 'text-[#ff4d4d]';

  const rank = getRank(totalAllTimeProfit);
  const pnlColor = totalAllTimeProfit >= 0 ? '#00ff88' : '#ff4d4d';
  const pnlSign  = totalAllTimeProfit >= 0 ? '+' : '';

  function handleDeposit() {
    if (depositAmount > 0) {
      deposit(depositAmount);
      setShowDeposit(false);
      setDepositAmount(1000);
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[#161b22]/80 backdrop-blur-md border-b border-white/10 relative z-50">

      {/* ── Left: Logo + Rank Badge + Asset Switcher ── */}
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold tracking-widest text-white uppercase">
          Algo<span className="text-[#00ff88]">-Crafter</span>
        </span>

        {/* Rank Badge */}
        <div
          className="relative"
          onMouseEnter={() => setRankTooltip(true)}
          onMouseLeave={() => setRankTooltip(false)}
        >
          <div
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-full
              bg-gradient-to-r ${rank.gradient} bg-opacity-15
              border cursor-default select-none
              transition-all duration-300
            `}
            style={{
              background: `linear-gradient(135deg, ${rank.gradient.includes('ff4d4d') ? 'rgba(255,77,77,0.12)' : rank.gradient.includes('a78bfa') ? 'rgba(167,139,250,0.12)' : rank.gradient.includes('f59e0b') ? 'rgba(245,158,11,0.12)' : rank.gradient.includes('00ff88') ? 'rgba(0,255,136,0.12)' : 'rgba(0,212,255,0.12)'}, transparent)`,
              borderColor: rank.glow.replace('0.35', '0.4').replace('0.45', '0.5'),
              boxShadow: `0 0 12px ${rank.glow}, inset 0 0 8px ${rank.glow.replace('0.35', '0.06').replace('0.45', '0.08')}`,
            }}
          >
            {/* Gradient text */}
            <span
              className="text-[11px] font-bold tracking-wide"
              style={{
                background: `linear-gradient(90deg, ${rank.gradient.includes('ff4d4d') ? '#ff4d4d, #ff8080' : rank.gradient.includes('a78bfa') ? '#a78bfa, #c4b5fd' : rank.gradient.includes('f59e0b') ? '#f59e0b, #fcd34d' : rank.gradient.includes('00ff88') ? '#00ff88, #6effc8' : '#00d4ff, #67e8f9'})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {rank.label}
            </span>
          </div>

          {/* Tooltip */}
          {rankTooltip && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 whitespace-nowrap px-3 py-2 rounded-lg text-[11px] font-mono border"
              style={{
                background: '#0d1117',
                borderColor: 'rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              <p className="text-white/40 uppercase tracking-widest text-[9px] mb-0.5">All-Time P&L</p>
              <p className="font-bold" style={{ color: pnlColor }}>
                {pnlSign}{totalAllTimeProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
              {/* Arrow */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-l border-t"
                style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
          )}
        </div>

        {/* Asset dropdown */}
        <div className="relative">
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="
              appearance-none bg-white/5 border border-white/10 rounded-md
              pl-3 pr-7 py-1.5 outline-none cursor-pointer
              text-xs font-bold font-mono tracking-widest text-white/80
              hover:border-white/25 hover:bg-white/8 focus:border-[#00ff88]/40
              transition-all duration-200
            "
          >
            {ASSETS.map((a) => (
              <option key={a} value={a} className="bg-[#161b22] text-white">
                {a}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px]">
            ▾
          </span>
        </div>

        {/* Active asset pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-white/50 tracking-widest uppercase">
            {asset}
          </span>
        </div>
      </div>

      {/* ── Right: Portfolio + Controls ── */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-5">

          {/* Balance */}
          <div className="text-right">
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold">Balance</p>
            <p className={`font-mono text-base font-bold ${balanceColor}`}>
              {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Assets — shows active pair units */}
          <div className="text-right">
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold">
              {asset}
            </p>
            <p className="font-mono text-base font-bold text-violet-400">
              {activeAssets.toFixed(4)}{' '}
              <span className="text-[10px] text-white/30 font-normal">units</span>
            </p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Equity */}
          <div className="text-right">
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold">Equity</p>
            <p className={`font-mono text-base font-bold ${equityColor}`}>
              {equity.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Deposit button */}
          <button
            onClick={() => setShowDeposit((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#00ff88]/30 text-[#00ff88]/60 hover:border-[#00ff88]/70 hover:text-[#00ff88] transition-all"
          >
            + Deposit
          </button>
        </div>

        {/* ── God Mode ── */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-white/8 bg-white/[0.02]">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25 mr-1">
            God
          </span>
          <button
            onClick={() => triggerShock('MOON')}
            title="MOON +15%"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all duration-150 border border-transparent hover:border-[#fbbf24]/50 hover:bg-[#fbbf24]/10 active:scale-90"
            style={{ textShadow: '0 0 10px rgba(251,191,36,0)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.textShadow = '0 0 14px rgba(251,191,36,0.9)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textShadow = '0 0 10px rgba(251,191,36,0)'; }}
          >
            🚀
          </button>
          <button
            onClick={() => triggerShock('CRASH')}
            title="CRASH -20%"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all duration-150 border border-transparent hover:border-[#ff4d4d]/50 hover:bg-[#ff4d4d]/10 active:scale-90"
            style={{ textShadow: '0 0 10px rgba(255,77,77,0)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.textShadow = '0 0 14px rgba(255,77,77,0.9)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textShadow = '0 0 10px rgba(255,77,77,0)'; }}
          >
            📉
          </button>
        </div>

        <button
          onClick={toggleSimulation}
          className={`px-5 py-2 rounded-lg font-semibold text-sm tracking-wide transition-all duration-200 border ${
            isRunning
              ? 'bg-[#ff4d4d]/10 border-[#ff4d4d]/50 text-[#ff4d4d] hover:bg-[#ff4d4d]/20'
              : 'bg-[#00ff88]/10 border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/20'
          }`}
        >
          {isRunning ? '⏹ Stop' : '▶ Start'}
        </button>
      </div>

      {/* ── Deposit Modal ── */}
      {showDeposit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDeposit(false)} />
          <div
            className="absolute top-full right-6 mt-2 z-50 w-64 bg-[#161b22]/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(0,255,136,0.08), 0 20px 60px rgba(0,0,0,0.6)' }}
          >
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-3">
              Deposit Funds
            </p>
            <div className="flex gap-2 mb-3">
              {[500, 1000, 5000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDepositAmount(preset)}
                  className={`flex-1 text-[10px] py-1 rounded border transition-all font-mono ${
                    depositAmount === preset
                      ? 'border-[#00ff88]/60 text-[#00ff88] bg-[#00ff88]/10'
                      : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 outline-none font-mono mb-3 focus:border-[#00ff88]/40 transition-colors"
              placeholder="Amount"
            />
            <button
              onClick={handleDeposit}
              className="w-full py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/40 text-[#00ff88] text-xs font-bold uppercase tracking-widest hover:bg-[#00ff88]/20 transition-all"
            >
              Confirm Deposit
            </button>
          </div>
        </>
      )}
    </header>
  );
}
