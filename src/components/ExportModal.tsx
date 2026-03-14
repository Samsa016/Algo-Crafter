import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore, StrategyNode, Connection } from '../store';

// ── Python code generator ─────────────────────────────────────────────────

function generatePython(
  nodes: StrategyNode[],
  connections: Connection[],
  asset: string,
): string {
  const conditions = nodes.filter((n) => n.type === 'CONDITION');
  const actions    = nodes.filter((n) => n.type === 'ACTION');

  const pairs = connections
    .map((c) => ({
      cond: conditions.find((n) => n.id === c.fromId),
      act:  actions.find((n)    => n.id === c.toId),
    }))
    .filter((p) => p.cond && p.act) as { cond: StrategyNode; act: StrategyNode }[];

  const pairLines = pairs.map(({ cond, act }, i) => {
    const op   = cond.data.operator ?? 'lt';
    const side = act.data.side ?? 'BUY';

    let condExpr = '';
    if (op === 'lt')   condExpr = `price < ${cond.data.targetPrice ?? 0}`;
    if (op === 'gt')   condExpr = `price > ${cond.data.targetPrice ?? 0}`;
    if (op === 'drop') condExpr = `price <= trailing_high * (1 - ${(cond.data.dropPercent ?? 5) / 100})`;
    if (op === 'rise') condExpr = `price >= trailing_low  * (1 + ${(cond.data.risePercent ?? 5) / 100})`;

    let actionLines = '';
    if (side === 'BUY') {
      const amt = act.data.amount ?? 500;
      actionLines = [
        `        # BUY $${amt} worth`,
        `        units = ${amt} / price`,
        `        balance -= ${amt}`,
        `        holdings += units`,
        `        print(f"BUY  {'{units:.6f}'} @ {'{price:.2f}'}")`,
      ].join('\n');
    } else {
      const pct = (act.data.amount ?? 50) / 100;
      actionLines = [
        `        # SELL ${act.data.amount ?? 50}% of holdings`,
        `        sell_units = holdings * ${pct}`,
        `        revenue    = sell_units * price`,
        `        holdings  -= sell_units`,
        `        balance   += revenue`,
        `        print(f"SELL {'{sell_units:.6f}'} @ {'{price:.2f}'}  revenue={'{revenue:.2f}'}")`,
      ].join('\n');
    }

    return `    # ── Rule ${i + 1}: ${op.toUpperCase()} → ${side}\n    if ${condExpr}:\n${actionLines}`;
  });

  const basePrice = asset === 'BTC/USD' ? 65000 : asset === 'ETH/USD' ? 3500 : 1.12;
  const changeExpr = asset === 'EUR/USD'
    ? 'change = (random.random() - 0.5) * 0.001'
    : asset === 'ETH/USD'
    ? 'change = (random.random() - 0.5) * 40'
    : 'change = (random.random() - 0.5) * 300';

  const rulesBlock = pairLines.length > 0
    ? pairLines.join('\n\n')
    : '    pass  # No rules — add Condition→Action nodes in Algo-Crafter';

  return [
    '"""',
    'Algo-Crafter — Auto-Generated Strategy',
    `Asset  : ${asset}`,
    `Nodes  : ${nodes.length}  |  Rules: ${pairs.length}`,
    '"""',
    '',
    'import random',
    '',
    '# ── Config ──────────────────────────────────────────────────────────────',
    `ASSET         = "${asset}"`,
    `INITIAL_PRICE = ${basePrice}`,
    'TICKS         = 1000',
    '',
    '# ── State ───────────────────────────────────────────────────────────────',
    'balance       = 10_000.0',
    'holdings      = 0.0',
    'price         = INITIAL_PRICE',
    'trailing_high = price',
    'trailing_low  = price',
    '',
    '# ── Simulation loop ─────────────────────────────────────────────────────',
    'for tick in range(TICKS):',
    `    ${changeExpr}`,
    '    price         = max(0.0001, price + change)',
    '    trailing_high = max(trailing_high, price)',
    '    trailing_low  = min(trailing_low,  price)',
    '',
    rulesBlock,
    '',
    '# ── Final report ─────────────────────────────────────────────────────────',
    'equity     = balance + holdings * price',
    'net_profit = equity - 10_000',
    `print(f"\\n{'='*40}")`,
    `print(f"Final Equity : {'{equity:.2f}'}")`,
    `print(f"Net Profit   : {'{net_profit:+.2f}'}")`,
    `print(f"Holdings     : {'{holdings:.6f}'} ${asset.split('/')[0]}")`,
  ].join('\n');
}

// ── Modal ─────────────────────────────────────────────────────────────────

export default function ExportModal() {
  const { isExportOpen, closeExport, nodes, connections, asset } = useSimulationStore();
  const [copied, setCopied] = useState(false);

  const code = generatePython(nodes, connections, asset);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <AnimatePresence>
      {isExportOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0d1117]/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeExport}
        >
          <motion.div
            className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-2xl relative overflow-hidden mx-4"
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: 'spring' as const, damping: 24, stiffness: 300 }}
            style={{ boxShadow: '0 0 60px rgba(59,130,246,0.15), 0 24px 80px rgba(0,0,0,0.7)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, transparent)',
                boxShadow: '0 0 18px #3b82f6',
              }}
            />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-0.5">
                    Algo-Crafter
                  </p>
                  <h2 className="text-lg font-bold tracking-widest text-white uppercase leading-none">
                    Export <span className="text-[#60a5fa]">Python</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold border border-[#3b82f6]/30 text-[#60a5fa]/80 bg-[#3b82f6]/[0.08]">
                    {nodes.length} nodes
                  </span>
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold border border-[#3b82f6]/30 text-[#60a5fa]/80 bg-[#3b82f6]/[0.08]">
                    {connections.length} rules
                  </span>
                  <button
                    onClick={closeExport}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Code block */}
              <div
                className="relative rounded-xl overflow-hidden border border-white/[0.07]"
                style={{ background: '#0d1117' }}
              >
                {/* Fake terminal bar */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-[10px] text-white/25 font-mono">strategy.py</span>
                </div>

                <pre
                  className="text-[11px] font-mono text-white/70 leading-relaxed overflow-auto p-4"
                  style={{ maxHeight: '52vh', tabSize: 4 }}
                >
                  <code>{code}</code>
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: copied ? 'rgba(0,255,136,0.1)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid ${copied ? 'rgba(0,255,136,0.4)' : 'rgba(59,130,246,0.4)'}`,
                    color: copied ? '#00ff88' : '#60a5fa',
                    boxShadow: copied ? '0 0 20px rgba(0,255,136,0.2)' : '0 0 20px rgba(59,130,246,0.1)',
                  }}
                >
                  {copied ? '✓ Copied!' : '⎘ Copy Code'}
                </button>
                <button
                  onClick={closeExport}
                  className="px-6 py-2.5 rounded-xl text-[11px] font-bold tracking-widest uppercase border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>

              {/* Hint */}
              <p className="text-[10px] text-white/20 text-center mt-3 font-mono">
                Run with{' '}
                <span className="text-[#60a5fa]/60">python strategy.py</span>
                {' '}— requires Python 3.8+
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
