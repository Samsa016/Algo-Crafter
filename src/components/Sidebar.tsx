import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useSimulationStore, StrategyNode } from '../store';

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
  const borderColor = isPendingFrom
    ? '#facc15'
    : isPendingTarget
    ? '#00ff88'
    : isCondition
    ? '#a78bfa'
    : '#00ff88';
  const glowColor = isPendingFrom
    ? 'rgba(250,204,21,0.3)'
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
        <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>
          {node.type}
        </span>
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
            <select
              value={node.data.operator ?? 'lt'}
              onChange={(e) =>
                updateNodeData(node.id, { operator: e.target.value as 'lt' | 'gt' })
              }
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 bg-white/5 border border-white/10 rounded text-white text-xs px-1 py-1 outline-none cursor-pointer"
            >
              <option value="lt" className="bg-[#161b22] text-white">Price &lt;</option>
              <option value="gt" className="bg-[#161b22] text-white">Price &gt;</option>
            </select>
            <input
              type="number"
              value={node.data.targetPrice ?? 150}
              onChange={(e) =>
                updateNodeData(node.id, { targetPrice: parseFloat(e.target.value) })
              }
              onPointerDown={(e) => e.stopPropagation()}
              className="w-16 bg-white/5 border border-white/10 rounded text-white text-xs px-1 py-1 outline-none font-mono"
            />
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
            onChange={(e) =>
              updateNodeData(node.id, { side: e.target.value as 'BUY' | 'SELL' })
            }
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
                value={node.data.amount ?? 500}
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

function ConnectionLines({ dragState }: { dragState: DragState | null }) {
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
      </defs>
      {connections.map((conn) => {
        const from = nodes.find((n) => n.id === conn.fromId);
        const to = nodes.find((n) => n.id === conn.toId);
        if (!from || !to) return null;

        const NODE_W = 200;
        const NODE_H = 96;
        // Use live drag position if this node is being dragged
        const fromX = dragState?.id === conn.fromId ? dragState.x : from.x;
        const fromY = dragState?.id === conn.fromId ? dragState.y : from.y;
        const toX = dragState?.id === conn.toId ? dragState.x : to.x;
        const toY = dragState?.id === conn.toId ? dragState.y : to.y;
        const x1 = fromX + NODE_W;
        const y1 = fromY + NODE_H / 2;
        const x2 = toX;
        const y2 = toY + NODE_H / 2;
        const cx = (x1 + x2) / 2;

        return (
          <g key={`${conn.fromId}-${conn.toId}`}>
            <path
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(167,139,250,0.35)"
              strokeWidth="5"
              filter="url(#conn-glow)"
            />
            <path
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="1.5"
              strokeDasharray="6 3"
            />
            <circle cx={x2} cy={y2} r="3.5" fill="#a78bfa" />
            <circle cx={x1} cy={y1} r="3" fill="#a78bfa" opacity="0.6" />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { nodes, logs, addNode, connectNodes, balance, assets, currentPrice } = useSimulationStore();
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

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
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-3">
            Node Strategy Builder
          </p>
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
          <ConnectionLines dragState={dragState} />

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-white/15 text-xs tracking-widest uppercase text-center leading-relaxed">
                Spawn nodes above<br />drag to arrange<br />connect condition → action
              </p>
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
        const netProfit = parseFloat((balance + assets * currentPrice - 10000).toFixed(2));
        const totalTrades = logs.filter((l) => l.type === 'BUY' || l.type === 'SELL').length;
        const isProfit = netProfit >= 0;
        const profitColor = isProfit ? '#00ff88' : '#ff4d4d';
        const profitGlow = isProfit
          ? '0 0 12px rgba(0,255,136,0.6)'
          : '0 0 12px rgba(255,77,77,0.6)';
        const profitSign = isProfit ? '+' : '';
        return (
          <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shrink-0">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-3">
              Live Analytics
            </p>
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
