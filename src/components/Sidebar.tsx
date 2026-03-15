import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { useSimulationStore, StrategyNode } from '../store';

// ─── Social Feed Data ──────────────────────────────────────────────────────────
const MOCK_FEED = [
  '@whale_99 copied your strategy',
  '@noob123 started following you',
  'System: Strategy ranked up!',
  '@quant_guy deployed to IQ Option',
  '@alpha_bot mirrored your DCA',
  'System: +12 new followers today',
];

// ─── Node Card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: StrategyNode;
  isPendingFrom: boolean;
  isPendingTarget: boolean;
  onStartConnect: (id: string) => void;
  onCompleteConnect: (id: string) => void;
  onDragUpdate: (x: number, y: number) => void;
  onDragDone: () => void;
}

function NodeCard({
  node,
  isPendingFrom,
  isPendingTarget,
  onStartConnect,
  onCompleteConnect,
  onDragUpdate,
  onDragDone,
}: NodeCardProps) {
  const { updateNodePosition, updateNodeData, removeNode } = useSimulationStore();

  // Motion values drive position — avoids teleport when store updates during drag
  const motionX = useMotionValue(node.x);
  const motionY = useMotionValue(node.y);
  const isDragging = useRef(false);

  // Sync store position → motion values only when NOT dragging
  useEffect(() => {
    if (!isDragging.current) {
      motionX.set(node.x);
      motionY.set(node.y);
    }
  }, [node.x, node.y, motionX, motionY]);

  const isCondition = node.type === 'CONDITION';
  const isLeveled   = (node.level ?? 1) > 1;

  const borderColor = isPendingFrom
    ? '#facc15'
    : isPendingTarget
    ? '#00ff88'
    : isLeveled
    ? '#fbbf24'
    : isCondition
    ? '#a78bfa'
    : '#00ff88';
  const glowColor = isPendingFrom
    ? 'rgba(250,204,21,0.3)'
    : isLeveled
    ? 'rgba(251,191,36,0.4)'
    : isCondition
    ? 'rgba(167,139,250,0.25)'
    : 'rgba(0,255,136,0.2)';
  const labelColor = isCondition ? 'text-violet-400' : 'text-[#00ff88]';

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{
        position: 'absolute',
        x: motionX,
        y: motionY,
        top: 0,
        left: 0,
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 18px ${glowColor}, inset 0 0 12px rgba(0,0,0,0.4)`,
        width: 200,
        zIndex: 10,
        cursor: 'grab',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      onDragStart={() => { isDragging.current = true; }}
      onDrag={() => {
        onDragUpdate(motionX.get(), motionY.get());
      }}
      onDragEnd={() => {
        isDragging.current = false;
        updateNodePosition(node.id, motionX.get(), motionY.get());
        onDragDone();
      }}
      className="rounded-xl bg-[#0d1117]/90 backdrop-blur-md p-3 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>
            {node.type}
          </span>
          {/* Level badge — only shown when leveled up */}
          {isLeveled && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none"
              style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))',
                border: '1px solid rgba(251,191,36,0.5)',
                color: '#fbbf24',
                textShadow: '0 0 8px rgba(251,191,36,0.8)',
              }}
            >
              LVL {node.level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/20 font-mono">{node.id.slice(-4)}</span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
            className="w-4 h-4 flex items-center justify-center rounded text-white/20 hover:text-[#ff4d4d] hover:bg-[#ff4d4d]/10 transition-all text-[11px] leading-none"
            title="Delete node"
          >
            ×
          </button>
        </div>
      </div>

      {/* Inputs */}
      {isCondition ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1">
            {/* Operator selector — all 4 modes */}
            <select
              value={node.data.operator ?? 'lt'}
              onChange={(e) => {
                const newOp = e.target.value as 'lt' | 'gt' | 'drop' | 'rise';
                updateNodeData(node.id, {
                  operator: newOp,
                  // Seed defaults so the engine never sees undefined on first tick
                  ...(newOp === 'drop' && node.data.dropPercent == null ? { dropPercent: 5 } : {}),
                  ...(newOp === 'rise' && node.data.risePercent == null ? { risePercent: 5 } : {}),
                });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 bg-white/5 border border-white/10 rounded text-white text-xs px-1 py-1 outline-none cursor-pointer"
            >
              <option value="lt"   className="bg-[#161b22] text-white">Price &lt;</option>
              <option value="gt"   className="bg-[#161b22] text-white">Price &gt;</option>
              <option value="drop" className="bg-[#161b22] text-white">Drop %</option>
              <option value="rise" className="bg-[#161b22] text-white">Rise %</option>
            </select>

            {/* Dynamic value input — % for drop/rise, $ for lt/gt */}
            {(node.data.operator === 'drop' || node.data.operator === 'rise') ? (
              <div
                className="flex items-center gap-0.5 w-16 bg-white/5 border border-white/10 rounded px-1"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input
                  type="number"
                  value={
                    node.data.operator === 'drop'
                      ? (Number.isNaN(node.data.dropPercent) ? '' : (node.data.dropPercent ?? 5))
                      : (Number.isNaN(node.data.risePercent) ? '' : (node.data.risePercent ?? 5))
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (node.data.operator === 'drop') {
                      updateNodeData(node.id, { dropPercent: val });
                    } else {
                      updateNodeData(node.id, { risePercent: val });
                    }
                  }}
                  className="w-full bg-transparent text-white text-xs py-1 outline-none font-mono text-right"
                  placeholder="5"
                />
                <span className="text-[10px] text-white/40 shrink-0">%</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-0.5 w-16 bg-white/5 border border-white/10 rounded px-1"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-white/40 shrink-0">$</span>
                <input
                  type="number"
                  value={Number.isNaN(node.data.targetPrice) ? '' : (node.data.targetPrice ?? 150)}
                  onChange={(e) =>
                    updateNodeData(node.id, { targetPrice: parseFloat(e.target.value) })
                  }
                  className="w-full bg-transparent text-white text-xs py-1 outline-none font-mono"
                />
              </div>
            )}
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(node.id);
            }}
            className={`mt-1 w-full text-[10px] py-1 rounded border transition-all ${
              isPendingFrom
                ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10 animate-pulse'
                : 'border-violet-500/50 text-violet-400 hover:bg-violet-500/10'
            }`}
          >
            {isPendingFrom ? '⚡ Click an ACTION node…' : '→ Connect to Action'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
        
          {/* Side selector */}
          <select
            value={node.data.side ?? 'BUY'}
            onChange={(e) => {
              const newSide = e.target.value as 'BUY' | 'SELL';
              updateNodeData(node.id, { side: newSide, amount: newSide === 'SELL' ? 50 : 500 });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full bg-white/5 border border-white/10 rounded text-white text-xs px-1 py-1 outline-none cursor-pointer"
          >
            <option value="BUY" className="bg-[#161b22] text-white">BUY</option>
            <option value="SELL" className="bg-[#161b22] text-white">SELL</option>
          </select>

          {/* BUY → USD amount */}
          {(node.data.side ?? 'BUY') === 'BUY' ? (
            <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-white/30 font-mono shrink-0">$</span>
              <input
                  type="number"
                  value={Number.isNaN(node.data.amount) ? '' : (node.data.amount ?? 500)}
                onChange={(e) =>
                  updateNodeData(node.id, { amount: parseFloat(e.target.value) })
                }
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 bg-white/5 border border-white/10 rounded text-white text-xs px-1 py-1 outline-none font-mono"
                placeholder="USD"
              />
            </div>
          ) : (
            /* SELL → percentage slider */
            <div className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">Sell</span>
                <span className="text-[10px] font-mono font-bold text-[#ff4d4d]">
                  {node.data.amount ?? 50}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={node.data.amount ?? 50}
                onChange={(e) =>
                  updateNodeData(node.id, { amount: parseInt(e.target.value) })
                }
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full h-1 appearance-none rounded-full outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ff4d4d ${node.data.amount ?? 50}%, rgba(255,255,255,0.1) ${node.data.amount ?? 50}%)`,
                }}
              />
            </div>
          )}

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCompleteConnect(node.id);
            }}
            className={`mt-1 w-full text-[10px] py-1 rounded border transition-all ${
              isPendingTarget
                ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/10 animate-pulse'
                : 'border-[#00ff88]/20 text-[#00ff88]/40 hover:border-[#00ff88]/60 hover:text-[#00ff88]'
            }`}
          >
            ◎ Set as Target
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── SVG Connection Lines ─────────────────────────────────────────────────────

interface DragState { id: string; x: number; y: number; }

function ConnectionLines({
  dragState,
  activePulseNode,
}: {
  dragState: DragState | null;
  activePulseNode: string | null;
}) {
  const { nodes, connections } = useSimulationStore();

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <defs>
        <filter id="conn-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pulse-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {connections.map((conn) => {
        const from = nodes.find((n) => n.id === conn.fromId);
        const to = nodes.find((n) => n.id === conn.toId);
        if (!from || !to) return null;

        const NODE_W = 200;
        const NODE_H = 96;
        const fromX = dragState?.id === conn.fromId ? dragState.x : from.x;
        const fromY = dragState?.id === conn.fromId ? dragState.y : from.y;
        const toX = dragState?.id === conn.toId ? dragState.x : to.x;
        const toY = dragState?.id === conn.toId ? dragState.y : to.y;
        const x1 = fromX + NODE_W;
        const y1 = fromY + NODE_H / 2;
        const x2 = toX;
        const y2 = toY + NODE_H / 2;
        const cx = (x1 + x2) / 2;

        const isPulsing =
          activePulseNode === conn.fromId || activePulseNode === conn.toId;

        return (
          <g key={`${conn.fromId}-${conn.toId}`}>
            {/* Glow layer */}
            <path
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={isPulsing ? 'rgba(0,255,136,0.5)' : 'rgba(167,139,250,0.35)'}
              strokeWidth={isPulsing ? 8 : 5}
              filter={isPulsing ? 'url(#pulse-glow)' : 'url(#conn-glow)'}
            />
            {/* Main wire */}
            <path
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={isPulsing ? '#00ff88' : '#a78bfa'}
              strokeWidth={isPulsing ? 4 : 1.5}
              strokeDasharray={isPulsing ? undefined : '6 3'}
              filter={isPulsing ? 'drop-shadow(0 0 8px #00ff88)' : undefined}
            />
            {/* End dot */}
            <circle
              cx={x2} cy={y2} r={isPulsing ? 5 : 3.5}
              fill={isPulsing ? '#00ff88' : '#a78bfa'}
              filter={isPulsing ? 'drop-shadow(0 0 6px #00ff88)' : undefined}
            />
            {/* Start dot */}
            <circle
              cx={x1} cy={y1} r={isPulsing ? 4 : 3}
              fill={isPulsing ? '#00ff88' : '#a78bfa'}
              opacity={isPulsing ? 1 : 0.6}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const {
    nodes, logs, addNode, connectNodes,
    balance, assets, asset, currentPrice, totalDeposits,
    loadTemplate, openExport, activePulseNode,
    firstTickPrice, closeAllPositions,
  } = useSimulationStore();
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // ── Social Feed state ──────────────────────────────────────────────────────
  const [feedMsg, setFeedMsg] = useState(MOCK_FEED[0]);
  const [feedKey, setFeedKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = MOCK_FEED[Math.floor(Math.random() * MOCK_FEED.length)];
      setFeedMsg(next);
      setFeedKey((k) => k + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function spawnNode(type: 'CONDITION' | 'ACTION') {
    const id = `${type}-${Date.now()}`;
    const condCount = nodes.filter((n) => n.type === type).length;
    const node: StrategyNode = {
      id,
      type,
      x: type === 'CONDITION' ? 12 + condCount * 16 : 220 + condCount * 16,
      y: 20 + condCount * 24,
      data:
        type === 'CONDITION'
          ? { label: 'Condition', operator: 'lt', targetPrice: 148 }
          : { label: 'Action', side: 'BUY', amount: 500 },
    };
    addNode(node);
  }

  function handleStartConnect(fromId: string) {
    setPendingFrom((prev) => (prev === fromId ? null : fromId));
  }

  function handleCompleteConnect(toId: string) {
    if (!pendingFrom) return;
    connectNodes(pendingFrom, toId);
    setPendingFrom(null);
  }

  return (
    <aside className="w-96 flex flex-col p-4 gap-3 shrink-0">

      {/* ── Node Editor ── */}
      <div className="flex-1 bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-xl flex flex-col overflow-hidden min-h-0">

        {/* Header + spawn buttons */}
        <div className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Node Strategy Builder
            </p>
            <button
              onClick={() => loadTemplate('DCA')}
              className="text-[9px] px-2 py-1 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/35 hover:border-violet-400/60 hover:text-violet-200 transition-all uppercase tracking-widest font-bold shadow-[0_0_12px_rgba(167,139,250,0.25)] active:scale-95"
            >
              ⚡ DCA Template
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => spawnNode('CONDITION')}
              className="flex-1 text-xs py-1.5 rounded-lg border border-violet-500/50 text-violet-400 hover:bg-violet-500/10 transition-all font-semibold tracking-wide"
            >
              + Condition
            </button>
            <button
              onClick={() => spawnNode('ACTION')}
              className="flex-1 text-xs py-1.5 rounded-lg border border-[#00ff88]/40 text-[#00ff88] hover:bg-[#00ff88]/10 transition-all font-semibold tracking-wide"
            >
              + Action
            </button>
          </div>
        </div>

        {/* Node canvas */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onClick={() => {
            // Click on empty canvas cancels pending connection
            if (pendingFrom) setPendingFrom(null);
          }}
        >
          <ConnectionLines dragState={dragState} activePulseNode={activePulseNode} />

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 pointer-events-none">
              <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-semibold mb-1">
                ⚡ Quick Start
              </p>

              {/* DCA card */}
              <motion.button
                className="pointer-events-auto w-full rounded-xl p-3 text-left border transition-colors"
                style={{
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(139,92,246,0.04))',
                  borderColor: 'rgba(167,139,250,0.25)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(167,139,250,0.25)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => loadTemplate('DCA')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📉</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-violet-300">DCA Bot</span>
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  Buy every 5% dip. Dollar-cost average into strength.
                </p>
              </motion.button>

              {/* Grid card */}
              <motion.button
                className="pointer-events-auto w-full rounded-xl p-3 text-left border transition-colors"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,200,100,0.03))',
                  borderColor: 'rgba(0,255,136,0.2)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(0,255,136,0.18)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => loadTemplate('GRID')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📈</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#00ff88]">Grid Scalper</span>
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  Sell 25% on every 2% rise. Harvest gains systematically.
                </p>
              </motion.button>

              {/* Guard card */}
              <motion.button
                className="pointer-events-auto w-full rounded-xl p-3 text-left border transition-colors"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,77,77,0.07), rgba(200,50,50,0.03))',
                  borderColor: 'rgba(255,77,77,0.22)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(255,77,77,0.2)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => loadTemplate('GUARD')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🛡️</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#ff4d4d]">Guard</span>
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  Exit 100% on a 10% crash. Protect capital automatically.
                </p>
              </motion.button>
            </div>
          )}

          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isPendingFrom={pendingFrom === node.id}
              isPendingTarget={!!pendingFrom && node.type === 'ACTION'}
              onStartConnect={handleStartConnect}
              onCompleteConnect={handleCompleteConnect}
              onDragUpdate={(x, y) => setDragState({ id: node.id, x, y })}
              onDragDone={() => setDragState(null)}
            />
          ))}
        </div>
      </div>

      {/* ── Analytics Dashboard ── */}
      {(() => {
        const activeAssets = assets[asset] ?? 0;
        const netProfit = parseFloat((balance + activeAssets * currentPrice - totalDeposits).toFixed(2));
        const totalTrades = logs.filter((l) => l.type === 'BUY' || l.type === 'SELL').length;
        const isProfit = netProfit >= 0;
        const profitColor = isProfit ? '#00ff88' : '#ff4d4d';
        const profitGlow = isProfit
          ? '0 0 12px rgba(0,255,136,0.6)'
          : '0 0 12px rgba(255,77,77,0.6)';
        const profitSign = isProfit ? '+' : '';
        // Ghost Mode: what would a simple buy-and-hold be worth right now?
        const ghostEquity = firstTickPrice
          ? (totalDeposits / firstTickPrice) * currentPrice
          : totalDeposits;
        return (
          <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                Live Analytics
              </p>
              <button
                onClick={closeAllPositions}
                title="Panic sell all positions"
                className="text-[9px] px-2 py-0.5 rounded border border-[#ff4d4d]/40 text-[#ff4d4d] hover:bg-[#ff4d4d]/20 transition-all tracking-widest uppercase"
              >
                🛑 Panic
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Net Profit */}
              <div
                className="rounded-lg p-3 flex flex-col gap-1"
                style={{ background: `${profitColor}08`, border: `1px solid ${profitColor}22` }}
              >
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">
                  Net P&amp;L
                </span>
                <span
                  className="font-mono text-sm font-bold leading-tight"
                  style={{ color: profitColor, textShadow: profitGlow }}
                >
                  {profitSign}{netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
                <div className="text-[9px] text-white/40 mt-1 font-mono">
                  Hold (Ghost): <span style={{ color: ghostEquity >= totalDeposits ? 'rgba(0,255,136,0.7)' : 'rgba(255,77,77,0.7)' }}>
                    ${ghostEquity.toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Total Trades */}
              <div className="rounded-lg p-3 flex flex-col gap-1 bg-white/[0.03] border border-white/10">
                <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">
                  Total Trades
                </span>
                <span className="font-mono text-sm font-bold text-white/80 leading-tight">
                  {totalTrades}
                  <span className="text-[9px] text-white/25 font-normal ml-1">executed</span>
                </span>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* ── Social Feed ── */}
      <div
        className="rounded-xl p-3 shrink-0 flex flex-col gap-2"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(0,255,136,0.03))',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 20px rgba(0,212,255,0.08)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Live pulse dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
            </span>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Social Feed
            </p>
          </div>
          <button
            onClick={openExport}
            className="text-[9px] px-2 py-1 rounded bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/30 hover:bg-[#3b82f6]/20 transition-all uppercase tracking-widest font-bold"
          >
            🐍 Export
          </button>
        </div>

        {/* Ticker */}
        <div
          className="relative overflow-hidden rounded-lg px-3 py-2"
          style={{ background: 'rgba(0,0,0,0.3)', minHeight: 36 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={feedKey}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px]">
                {feedMsg.startsWith('@') ? '👤' : feedMsg.startsWith('System') ? '⚡' : '📡'}
              </span>
              <span
                className="text-[11px] font-mono font-semibold truncate"
                style={{
                  color: feedMsg.startsWith('System') ? '#00ff88' : '#00d4ff',
                  textShadow: feedMsg.startsWith('System')
                    ? '0 0 8px rgba(0,255,136,0.5)'
                    : '0 0 8px rgba(0,212,255,0.5)',
                }}
              >
                {feedMsg}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── IQ Option CTA ── */}
      <a
        href="https://iqoption.com/en"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 block w-full py-4 rounded-xl text-center font-black uppercase tracking-widest text-sm transition-all active:scale-95 select-none"
        style={{
          background: 'linear-gradient(135deg, #f97316, #dc2626)',
          boxShadow: '0 0 30px rgba(249,115,22,0.5), 0 0 60px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow =
            '0 0 45px rgba(249,115,22,0.7), 0 0 80px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow =
            '0 0 30px rgba(249,115,22,0.5), 0 0 60px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
        }}
      >
        🚀 TRADE LIVE ON IQ OPTION
      </a>

      {/* ── Strategy Log ── */}
      <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col h-[28vh] min-h-[140px]">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold border-b border-white/10 pb-2 mb-2 shrink-0">
          Strategy Log
        </p>
        <div className="overflow-y-auto space-y-1 flex-1">
          {logs.length === 0 ? (
            <p className="text-white/20 text-xs font-mono tracking-widest">
              No trades yet…
            </p>
          ) : (
            logs.map((log) => {
              const isFailed = log.type === 'FAILED';
              const isBuy = log.type === 'BUY';
              const labelColor = isFailed
                ? 'text-yellow-400'
                : isBuy
                ? 'text-[#00ff88]'
                : 'text-[#ff4d4d]';
              const glow = isFailed
                ? '0 0 8px rgba(250,204,21,0.6)'
                : isBuy
                ? '0 0 8px rgba(0,255,136,0.7)'
                : '0 0 8px rgba(255,77,77,0.7)';
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 ${isFailed ? 'opacity-80' : ''}`}
                >
                  <span
                    className={`font-mono text-xs font-bold shrink-0 ${labelColor}`}
                    style={{ textShadow: glow }}
                  >
                    {isFailed ? '⚠' : log.type}
                  </span>
                  <span className={`font-mono text-xs flex-1 ${isFailed ? 'text-yellow-400/70' : 'text-white/60'}`}>
                    {log.message}
                  </span>
                  <span className="font-mono text-[10px] text-white/25 shrink-0">{log.time}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
