import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store';

export default function MainArea() {
  const {
    currentPrice, isRunning, priceHistory, chartType, setChartType,
    simulationSpeed, setSimulationSpeed, chartTrades,
    timeframe, setTimeframe,
  } = useSimulationStore();

  const TIMEFRAMES = ['1s', '1m', '5m', '1h'] as const;

  // Fewer visible candles = zoomed in (1s), more = zoomed out (1h)
  const visibleCandlesMap: Record<string, number> = {
    '1s': 30,
    '1m': 60,
    '5m': 80,
    '1h': 100,
  };
  const visibleCandles = visibleCandlesMap[timeframe] ?? 60;
  const visibleHistory = priceHistory.slice(-visibleCandles);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastClose = visibleHistory[visibleHistory.length - 1]?.close ?? currentPrice;
  const firstClose = visibleHistory[0]?.close ?? currentPrice;
  const isUp = lastClose >= firstClose;
  const accentColor = isUp ? '#00ff88' : '#ff4d4d';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = width;
    const H = height;
    const PAD = { top: 24, right: 24, bottom: 32, left: 56 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // ── Background grid ──
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const cols = 8;
    const rows = 5;
    for (let i = 0; i <= cols; i++) {
      const x = PAD.left + (i / cols) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, H - PAD.bottom);
      ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      const y = PAD.top + (i / rows) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }

    if (visibleHistory.length < 2) return;

    const allHighs = visibleHistory.map((c) => c.high);
    const allLows = visibleHistory.map((c) => c.low);
    const minPrice = Math.min(...allLows);
    const maxPrice = Math.max(...allHighs);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.05;

    // These mapping functions are shared by chart drawing AND trade markers
    const toX = (i: number) =>
      PAD.left + (i / (visibleHistory.length - 1)) * chartW;
    const toY = (p: number) =>
      PAD.top + chartH - ((p - (minPrice - padding)) / (priceRange + padding * 2)) * chartH;

    // ── Y-axis price labels ──
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= rows; i++) {
      const p = minPrice - padding + ((priceRange + padding * 2) * (rows - i)) / rows;
      ctx.fillText(`$${p.toFixed(1)}`, PAD.left - 6, PAD.top + (i / rows) * chartH + 4);
    }
    ctx.textAlign = 'left';

    if (chartType === 'LINE') {
      // ── LINE chart ──
      const closes = visibleHistory.map((c) => c.close);

      const gradFill = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
      gradFill.addColorStop(0, accentColor + '33');
      gradFill.addColorStop(1, accentColor + '00');

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(closes[0]));
      for (let i = 1; i < closes.length; i++) {
        const x0 = toX(i - 1);
        const y0 = toY(closes[i - 1]);
        const x1 = toX(i);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0, x1, toY(closes[i]));
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
        const x0 = toX(i - 1);
        const y0 = toY(closes[i - 1]);
        const x1 = toX(i);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0, x1, toY(closes[i]));
      }
      ctx.strokeStyle = accentColor + '44';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 20;
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(closes[0]));
      for (let i = 1; i < closes.length; i++) {
        const x0 = toX(i - 1);
        const y0 = toY(closes[i - 1]);
        const x1 = toX(i);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0, x1, toY(closes[i]));
      }
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Tip dot
      const tipX = toX(closes.length - 1);
      const tipY = toY(closes[closes.length - 1]);
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      // ── CANDLESTICK chart ──
      const n = visibleHistory.length;
      const candleW = Math.max(2, (chartW / n) * 0.6);
      const halfW = candleW / 2;

      for (let i = 0; i < n; i++) {
        const candle = visibleHistory[i];
        const x = toX(i);
        const bullish = candle.close >= candle.open;
        const color = bullish ? '#00ff88' : '#ff4d4d';

        const yHigh = toY(candle.high);
        const yLow = toY(candle.low);
        const yOpen = toY(candle.open);
        const yClose = toY(candle.close);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        ctx.globalAlpha = bullish ? 0.85 : 0.75;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = bullish ? 6 : 4;
        ctx.fillRect(x - halfW, bodyTop, candleW, bodyH);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // ── Trade markers ──
    // historyIndex is relative to full priceHistory; convert to visibleHistory index
    const historyOffset = priceHistory.length - visibleHistory.length;
    const MARKER_SIZE = 8; // half-base of triangle
    for (const trade of chartTrades) {
      const { historyIndex, price: tradePrice, type } = trade;
      const visibleIndex = historyIndex - historyOffset;
      if (visibleIndex < 0 || visibleIndex >= visibleHistory.length) continue;

      const mx = toX(visibleIndex);
      const my = toY(tradePrice);
      const isBuy = type === 'BUY';
      const color = isBuy ? '#00ff88' : '#ff4d4d';

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();

      if (isBuy) {
        // Up-pointing triangle — sits below the price point
        const tip = my + 4;
        ctx.moveTo(mx, tip - MARKER_SIZE * 1.6);       // apex (up)
        ctx.lineTo(mx - MARKER_SIZE, tip + MARKER_SIZE * 0.4); // bottom-left
        ctx.lineTo(mx + MARKER_SIZE, tip + MARKER_SIZE * 0.4); // bottom-right
      } else {
        // Down-pointing triangle — sits above the price point
        const tip = my - 4;
        ctx.moveTo(mx, tip + MARKER_SIZE * 1.6);       // apex (down)
        ctx.lineTo(mx - MARKER_SIZE, tip - MARKER_SIZE * 0.4); // top-left
        ctx.lineTo(mx + MARKER_SIZE, tip - MARKER_SIZE * 0.4); // top-right
      }

      ctx.closePath();
      ctx.fill();

      // Second glow pass (wider, more diffuse)
      ctx.shadowBlur = 32;
      ctx.globalAlpha = 0.35;
      ctx.fill();

      ctx.restore();
    }
  }, [visibleHistory, priceHistory, chartType, accentColor, chartTrades]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

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
              <div className="relative flex items-center">
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

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative min-h-0">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
        </div>

      </div>
    </main>
  );
}
