import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '../store';

// ─── Particle type ────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;           // 1.0 → 0.0
  color: string;
}

// ─── Toolbar tool type ────────────────────────────────────────────────────────
type Tool = 'cursor' | 'crosshair' | 'hline';

const TOOLBAR_TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'cursor',    label: 'Cursor',    icon: '↖' },
  { id: 'crosshair', label: 'Crosshair', icon: '⊕' },
  { id: 'hline',     label: 'H-Line',    icon: '—' },
];

export default function MainArea() {
  const {
    currentPrice, isRunning, priceHistory, chartType, setChartType,
    simulationSpeed, setSimulationSpeed, chartTrades,
    timeframe, setTimeframe,
  } = useSimulationStore();

  const TIMEFRAMES = ['1s', '1m', '5m', '1h'] as const;

  const visibleCandlesMap: Record<string, number> = {
    '1s': 30, '1m': 60, '5m': 80, '1h': 100,
  };
  const visibleCandles = visibleCandlesMap[timeframe] ?? 60;
  const visibleHistory = priceHistory.slice(-visibleCandles);

  const lastClose  = visibleHistory[visibleHistory.length - 1]?.close ?? currentPrice;
  const firstClose = visibleHistory[0]?.close ?? currentPrice;
  const isUp       = lastClose >= firstClose;
  const accentColor = isUp ? '#00ff88' : '#ff4d4d';

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Particles
  const particlesRef          = useRef<Particle[]>([]);
  const previousTradesCount   = useRef(chartTrades.length);
  const rafRef                = useRef<number | null>(null);

  // Mouse position stored in a ref — avoids re-renders on every mousemove
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Stable refs for toX/toY so click handler & spawner can use them
  const toXRef = useRef<((i: number) => number) | null>(null);
  const toYRef = useRef<((p: number) => number) | null>(null);
  // Inverse of toY: canvas-y → price
  const fromYRef = useRef<((canvasY: number) => number) | null>(null);

  // ─── React state (only what drives UI re-renders) ─────────────────────────
  const [activeTool, setActiveTool] = useState<Tool>('cursor');
  const [hLines, setHLines]         = useState<number[]>([]);
  const [showSMA, _setShowSMA]      = useState(false);

  // Keep stable refs for use inside draw (avoids stale closures)
  const activeToolRef = useRef<Tool>('cursor');
  const hLinesRef     = useRef<number[]>([]);
  const showSMARef    = useRef(false);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { hLinesRef.current = hLines; }, [hLines]);
  useEffect(() => { showSMARef.current = showSMA; }, [showSMA]);

  // Stable snapshot refs for draw (updated each render)
  const visibleHistoryRef = useRef(visibleHistory);
  const priceHistoryRef   = useRef(priceHistory);
  const chartTypeRef      = useRef(chartType);
  const accentColorRef    = useRef(accentColor);
  const chartTradesRef    = useRef(chartTrades);
  visibleHistoryRef.current = visibleHistory;
  priceHistoryRef.current   = priceHistory;
  chartTypeRef.current      = chartType;
  accentColorRef.current    = accentColor;
  chartTradesRef.current    = chartTrades;

  // ─── Core draw function (stable — never recreated) ────────────────────────
  const draw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    if (
      canvas.width  !== Math.round(width  * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width        = Math.round(width  * dpr);
      canvas.height       = Math.round(height * dpr);
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = width;
    const H = height;
    const PAD = { top: 24, right: 64, bottom: 32, left: 56 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // ── Background grid ──────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    const cols = 8, rows = 5;
    for (let i = 0; i <= cols; i++) {
      const x = PAD.left + (i / cols) * chartW;
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H - PAD.bottom); ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      const y = PAD.top + (i / rows) * chartH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
    }

    const vh = visibleHistoryRef.current;
    if (vh.length < 2) return;

    const allHighs   = vh.map((c) => c.high);
    const allLows    = vh.map((c) => c.low);
    const minPrice   = Math.min(...allLows);
    const maxPrice   = Math.max(...allHighs);
    const priceRange = maxPrice - minPrice || 1;
    const padding    = priceRange * 0.05;
    const pMin       = minPrice - padding;
    const pSpan      = priceRange + padding * 2;

    // Mapping helpers — also stored in refs for external use
    const toX = (i: number) => PAD.left + (i / (vh.length - 1)) * chartW;
    const toY = (p: number) => PAD.top + chartH - ((p - pMin) / pSpan) * chartH;
    const fromY = (cy: number) => pMin + ((PAD.top + chartH - cy) / chartH) * pSpan;
    toXRef.current   = toX;
    toYRef.current   = toY;
    fromYRef.current = fromY;

    // ── Y-axis price labels ──────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= rows; i++) {
      const p = pMin + (pSpan * (rows - i)) / rows;
      ctx.fillText(`$${p.toFixed(1)}`, PAD.left - 6, PAD.top + (i / rows) * chartH + 4);
    }
    ctx.textAlign = 'left';

    const ac = accentColorRef.current;

    if (chartTypeRef.current === 'LINE') {
      // ── LINE chart ─────────────────────────────────────────────────────────
      const closes = vh.map((c) => c.close);

      const gradFill = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
      gradFill.addColorStop(0, ac + '33');
      gradFill.addColorStop(1, ac + '00');

      // Fill area
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(closes[0]));
      for (let i = 1; i < closes.length; i++) {
        const x0 = toX(i - 1), x1 = toX(i);
        ctx.quadraticCurveTo((x0 + x1) / 2, toY(closes[i - 1]), x1, toY(closes[i]));
      }
      ctx.lineTo(toX(closes.length - 1), H - PAD.bottom);
      ctx.lineTo(toX(0), H - PAD.bottom);
      ctx.closePath();
      ctx.fillStyle = gradFill;
      ctx.fill();

      // Glow pass
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(closes[0]));
      for (let i = 1; i < closes.length; i++) {
        const x0 = toX(i - 1), x1 = toX(i);
        ctx.quadraticCurveTo((x0 + x1) / 2, toY(closes[i - 1]), x1, toY(closes[i]));
      }
      ctx.strokeStyle = ac + '44';
      ctx.lineWidth   = 8;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowColor = ac;
      ctx.shadowBlur  = 20;
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(closes[0]));
      for (let i = 1; i < closes.length; i++) {
        const x0 = toX(i - 1), x1 = toX(i);
        ctx.quadraticCurveTo((x0 + x1) / 2, toY(closes[i - 1]), x1, toY(closes[i]));
      }
      ctx.strokeStyle = ac;
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 12;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Tip dot
      const tipX = toX(closes.length - 1);
      const tipY = toY(closes[closes.length - 1]);
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fillStyle   = ac;
      ctx.shadowColor = ac;
      ctx.shadowBlur  = 16;
      ctx.fill();
      ctx.shadowBlur  = 0;

    } else {
      // ── CANDLESTICK chart ──────────────────────────────────────────────────
      const n      = vh.length;
      const candleW = Math.max(2, (chartW / n) * 0.6);
      const halfW   = candleW / 2;

      for (let i = 0; i < n; i++) {
        const candle  = vh[i];
        const x       = toX(i);
        const bullish = candle.close >= candle.open;
        const color   = bullish ? '#00ff88' : '#ff4d4d';

        const yHigh  = toY(candle.high);
        const yLow   = toY(candle.low);
        const yOpen  = toY(candle.open);
        const yClose = toY(candle.close);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH   = Math.max(1, Math.abs(yClose - yOpen));

        ctx.strokeStyle  = color;
        ctx.lineWidth    = 1;
        ctx.globalAlpha  = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, yHigh); ctx.lineTo(x, yLow);
        ctx.stroke();

        ctx.globalAlpha  = bullish ? 0.85 : 0.75;
        ctx.fillStyle    = color;
        ctx.shadowColor  = color;
        ctx.shadowBlur   = bullish ? 6 : 4;
        ctx.fillRect(x - halfW, bodyTop, candleW, bodyH);
        ctx.shadowBlur   = 0;
        ctx.globalAlpha  = 1;
      }
    }

 // ── Trade markers ────────────────────────────────────────────────────────
    const historyOffset = priceHistoryRef.current.length - vh.length;
    const MARKER_RADIUS = 8; // Размер кружочка
    
    for (const trade of chartTradesRef.current) {
      const { historyIndex, price: tradePrice, type } = trade;
      const vi = historyIndex - historyOffset;
      if (vi < 0 || vi >= vh.length) continue;

      const mx    = toX(vi);
      const my    = toY(tradePrice);
      const isBuy = type === 'BUY';
      const color = isBuy ? '#00ff88' : '#ff4d4d';

      // BUY снизу свечи, SELL сверху свечи
      const cy = isBuy ? my + 16 : my - 16;

      ctx.save();
      
      // Неоновое свечение и сам кружок
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(mx, cy, MARKER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Отключаем тень для четкого текста
      ctx.shadowBlur = 0;
      
      // Настройка шрифта
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Тонкая черная обводка текста (stroke)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(isBuy ? 'B' : 'S', mx, cy + 0.5);
      
      // Белый текст внутри
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isBuy ? 'B' : 'S', mx, cy + 0.5);
      
      ctx.restore();
    }

    // ── H-Lines ──────────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth   = 1;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur  = 6;
    for (const price of hLinesRef.current) {
      const y = toY(price);
      if (y < PAD.top || y > H - PAD.bottom) continue;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      // Price label on right axis
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#0d1117';
      ctx.fillRect(W - PAD.right + 2, y - 9, PAD.right - 4, 18);
      ctx.fillStyle   = '#a78bfa';
      ctx.font        = '10px monospace';
      ctx.textAlign   = 'left';
      ctx.fillText(`$${price.toFixed(2)}`, W - PAD.right + 5, y + 4);
      ctx.shadowBlur  = 6;
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── Crosshair ────────────────────────────────────────────────────────────
    const mp = mousePosRef.current;
    if (mp && activeToolRef.current === 'crosshair') {
      const { x: mx, y: my } = mp;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mx, PAD.top);
      ctx.lineTo(mx, H - PAD.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(PAD.left, my);
      ctx.lineTo(W - PAD.right, my);
      ctx.stroke();

      ctx.setLineDash([]);

      // Price label on right Y-axis
      const hoverPrice = fromY(my);
      if (my >= PAD.top && my <= H - PAD.bottom) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(W - PAD.right + 2, my - 9, PAD.right - 4, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font      = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${hoverPrice.toFixed(2)}`, W - PAD.right + 5, my + 4);
      }

      // Crosshair dot
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(255,255,255,0.7)';
      ctx.shadowColor = 'white';
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;

      ctx.restore();
    }

    // ── Particles ────────────────────────────────────────────────────────────
    const alive: Particle[] = [];
    for (const p of particlesRef.current) {
      p.vy   += 0.2;   // gravity
      p.x    += p.vx;
      p.y    += p.vy;
      p.life -= 0.025;
      if (p.life <= 0) continue;

      ctx.save();
      ctx.globalAlpha  = p.life;
      ctx.fillStyle    = p.color;
      ctx.shadowColor  = p.color;
      ctx.shadowBlur   = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      alive.push(p);
    }
    particlesRef.current = alive;

    // Keep RAF running while particles are alive
    if (alive.length > 0) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      rafRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — reads everything via refs

  // ─── Trigger draw on data changes ─────────────────────────────────────────
  useEffect(() => {
    // Cancel any in-flight RAF so we don't double-draw
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    draw();
  // visibleHistory, chartType, accentColor, chartTrades all change together
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleHistory, priceHistory, chartType, accentColor, chartTrades, hLines]);

  // ─── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // ─── Particle spawner — fires when new trades arrive ──────────────────────
  useEffect(() => {
    const prev = previousTradesCount.current;
    const curr = chartTrades.length;
    if (curr <= prev) { previousTradesCount.current = curr; return; }

    const newTrades = chartTrades.slice(prev);
    previousTradesCount.current = curr;

    // We need toX/toY — they're set during draw; if not yet set, skip
    const toX = toXRef.current;
    const toY = toYRef.current;
    if (!toX || !toY) return;

    const vh            = visibleHistoryRef.current;
    const historyOffset = priceHistoryRef.current.length - vh.length;

    for (const trade of newTrades) {
      const vi = trade.historyIndex - historyOffset;
      if (vi < 0 || vi >= vh.length) continue;

      const cx    = toX(vi);
      const cy    = toY(trade.price);
      const color = trade.type === 'BUY' ? '#00ff88' : '#ff4d4d';

      for (let k = 0; k < 20; k++) {
        particlesRef.current.push({
          x:     cx,
          y:     cy,
          vx:    (Math.random() - 0.5) * 6,
          vy:    -(Math.random() * 6),
          life:  1.0,
          color,
        });
      }
    }

    // Kick off RAF loop if not already running
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(draw);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartTrades]);

  // ─── Mouse handlers ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Redraw for crosshair (only when crosshair tool active)
    if (activeToolRef.current === 'crosshair') {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => { rafRef.current = null; draw(); });
      }
    }
  }, [draw]);

  const handleMouseLeave = useCallback(() => {
    mousePosRef.current = null;
    if (activeToolRef.current === 'crosshair') draw();
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeToolRef.current !== 'hline') return;
    const fromY = fromYRef.current;
    if (!fromY) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasY     = e.clientY - rect.top;
    const clickedPrice = fromY(canvasY);
    setHLines((prev) => [...prev, parseFloat(clickedPrice.toFixed(2))]);
  }, []);

  // ─── Cursor style per tool ─────────────────────────────────────────────────
  const cursorStyle: Record<Tool, string> = {
    cursor:    'default',
    crosshair: 'crosshair',
    hline:     'row-resize',
  };

  return (
    <main className="flex-1 flex flex-col p-6 min-h-0">
      <div className="w-full h-full bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-xl flex flex-col min-h-[400px] overflow-hidden">

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-0.5">Current Price</p>
            <p className={`font-mono text-3xl font-bold ${isUp ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
              ${currentPrice.toFixed(2)}
            </p>
          </div>

          <div className="flex items-center gap-4">

            {/* Speed slider */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 whitespace-nowrap">
                Speed: <span className="text-white/60">{simulationSpeed}x</span>
              </span>
              <input
                type="range"
                min={1}
                max={100}
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                className="w-24 h-1 appearance-none rounded-full outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00ff88 ${simulationSpeed}%, rgba(255,255,255,0.1) ${simulationSpeed}%)`,
                }}
              />
            </div>

            {/* Timeframe selector */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {TIMEFRAMES.map((tf, i) => (
                <div key={tf} className="flex">
                  {i > 0 && <div className="w-px bg-white/10" />}
                  <button
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                      timeframe === tf
                        ? 'bg-[#00ff88]/15 text-[#00ff88]'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {tf}
                  </button>
                </div>
              ))}
            </div>

            {/* Chart type toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setChartType('LINE')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  chartType === 'LINE'
                    ? 'bg-[#00ff88]/15 text-[#00ff88]'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                Line
              </button>
              <div className="w-px bg-white/10" />
              <button
                onClick={() => setChartType('CANDLE')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  chartType === 'CANDLE'
                    ? 'bg-[#00ff88]/15 text-[#00ff88]'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                Candle
              </button>
            </div>

            {/* Live indicator */}
            <div className={`flex items-center gap-2 text-xs font-mono ${isRunning ? 'text-[#00ff88]' : 'text-white/30'}`}>
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00ff88] animate-pulse' : 'bg-white/20'}`} />
              {isRunning ? 'LIVE' : 'IDLE'}
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 relative min-h-0"
          style={{ cursor: cursorStyle[activeTool] }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* ── TradingView-style Toolbar ── */}
          <div className="absolute left-3 top-4 z-20 flex flex-col gap-1.5 p-1.5 rounded-xl bg-[#0d1117]/80 backdrop-blur-md border border-white/10 shadow-2xl">
            {TOOLBAR_TOOLS.map((tool) => {
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={(e) => { e.stopPropagation(); setActiveTool(tool.id); }}
                  title={tool.label}
                  className={`w-8 h-8 flex flex-col items-center justify-center rounded-lg transition-all gap-0.5 group ${
                    isActive
                      ? 'bg-[#00ff88]/15 border border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                      : 'border border-transparent text-white/30 hover:text-white/70 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <span className="text-sm leading-none">{tool.icon}</span>
                </button>
              );
            })}

            {/* Divider + clear H-lines button (only when lines exist) */}
            {hLines.length > 0 && (
              <>
                <div className="w-full h-px bg-white/10 my-0.5" />
                <button
                  onClick={(e) => { e.stopPropagation(); setHLines([]); }}
                  title="Clear all H-Lines"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-white/20 hover:text-[#ff4d4d] hover:bg-[#ff4d4d]/10 hover:border-[#ff4d4d]/20 transition-all text-xs"
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {/* H-line count badge */}
          {hLines.length > 0 && (
            <div className="absolute left-14 top-4 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0d1117]/70 border border-[#a78bfa]/20 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
              <span className="text-[9px] font-mono text-[#a78bfa]/70 uppercase tracking-widest">
                {hLines.length} line{hLines.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
