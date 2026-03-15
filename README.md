# Algo-Crafter: Visual Algorithmic Trading Engine

> **Built for Quadcode / QC AI Intern Assignment**

A high-performance, browser-based algorithmic trading simulator with a visual node editor, real-time canvas charting, market simulation, and gamified progression — all running entirely client-side with zero backend.

---

## ✨ Features

### 🔗 Visual Node-Based Strategy Editor
- Drag-and-drop **CONDITION** and **ACTION** nodes onto an infinite canvas
- Wire nodes together to form autonomous trading strategies
- Supported conditions: `price < X`, `price > X`, `drop N%`, `rise N%`
- Supported actions: `BUY $amount`, `SELL N%`
- Real-time **wire pulse animation** on every trade execution
- Node **XP & Level system** — nodes level up as they execute successful trades
- State managed with **Zustand** for zero-boilerplate reactivity

### 📈 High-Performance Canvas Charting
- Custom **Canvas 2D** renderer — no chart library dependencies
- **Line** and **Candlestick** chart modes with smooth bezier curves
- **Timeframes**: `1s`, `1m`, `5m`, `1h` — all aggregated from raw tick data
- **Zoom** (mouse wheel) and **Pan** (drag) with correct index-based math
- Pan/zoom reset on timeframe switch
- **SMA 20** overlay toggle
- **Horizontal lines** (click to place, bulk clear)
- **Trend lines** (drag to draw, anchored to aggregated candle indices)
- **Measure tool** — drag a rectangle to see % change and bar count
- **Crosshair** with live price label on Y-axis
- **Trade markers** (B/S dots) pinned to exact candle positions
- **Drawdown heatmap** — chart border glows red when equity < deposits

### ⚡ Real-Time Market Simulation
- Tick-based price engine with per-asset volatility profiles (`BTC/USD`, `ETH/USD`, `EUR/USD`)
- Realistic OHLC candle generation with proportional wicks
- Adjustable simulation speed: `1x` → `100x`
- **God Mode** shocks: instant `+15% MOON` or `-20% CRASH` events
- Trailing high/low tracking for drop/rise condition evaluation
- **Profit Protection**: SELL nodes skip execution if price ≤ average buy price
- **Recovery mode**: nodes re-arm only after price crosses back through trigger

### 🐍 Auto-Generated Python CCXT Scripts
- One-click **Export** generates a production-ready Python script
- Uses the [CCXT](https://github.com/ccxt/ccxt) library for live exchange connectivity
- Mirrors the exact node graph logic: conditions → actions → cooldowns
- Ready to run against Binance, Kraken, Coinbase, and 100+ exchanges

### 🏆 Gamification & Ranks
- **All-time profit** tracked and persisted across sessions
- Rank ladder: `Novice Trader` → `Apprentice` → `Journeyman` → `Expert` → `Master` → `Grandmaster` → `Legend`
- **Ghost Mode equity**: compares your strategy vs. a simple buy-and-hold benchmark
- **Panic button**: close all positions instantly at market price
- **Deposit system**: add funds mid-session to keep strategies running

### 💾 LocalStorage Persistence
- `balance`, `totalDeposits`, and `totalAllTimeProfit` survive page reloads
- Keys: `algo_balance`, `algo_deposits`, `algo_profit`
- Written on every SELL execution, deposit, and panic close

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Charting | Custom Canvas 2D API |
| Audio | Web Audio API |
| Build | Vite |
| Export | CCXT (Python codegen) |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── MainArea.tsx      # Canvas chart + toolbar + pan/zoom
│   ├── Sidebar.tsx       # Node editor canvas + live analytics
│   ├── Header.tsx        # Asset selector + God Mode controls
│   ├── ExportModal.tsx   # Python CCXT script generator
│   └── WelcomeModal.tsx  # Onboarding modal
├── store.ts              # Zustand store — all simulation state + actions
├── templates.ts          # DCA / Grid / Guard strategy templates
└── main.tsx              # App entry point
```

---

## 📊 Strategy Templates

| Template | Logic | Use Case |
|---|---|---|
| **DCA** | Drop 5% → BUY $1000 / Rise 5% → SELL 100% | Trending markets |
| **Grid Scalper** | Drop 2% → BUY $500 / Rise 2% → SELL 25% | Range-bound markets |
| **Guard** | Drop 3% → BUY $500 / Drop 10% → SELL 100% | Capital protection |

---

## 🎮 Controls

| Action | Control |
|---|---|
| Zoom chart | Mouse wheel |
| Pan chart | Drag (cursor tool) |
| Place H-Line | Click (H-Line tool) |
| Draw trend line | Drag (Trend Line tool) |
| Measure range | Drag (Measure tool) |
| Toggle SMA 20 | `S` button in toolbar |
| Panic sell all | 🛑 Panic button in Live Analytics |

---

## 📝 License

MIT — free to use, modify, and distribute.

---

*Algo-Crafter — where strategy meets simulation.*
