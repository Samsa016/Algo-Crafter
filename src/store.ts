import { create } from 'zustand';
import { getDCATemplate, getGridTemplate, getGuardTemplate } from './templates';

// ─── Web Audio SFX ────────────────────────────────────────────────────────────

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playSound(type: 'BUY' | 'SELL' | 'FAILED') {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (type === 'FAILED') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
    return;
  }

  const now = audioCtx.currentTime;
  const tones = type === 'BUY'
    ? [{ freq: 2637, delay: 0 }, { freq: 3136, delay: 0.07 }]
    : [{ freq: 2093, delay: 0 }, { freq: 2637, delay: 0.07 }];

  for (const { freq, delay } of tones) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.25);
  }
}

export interface OHLCCandle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface StrategyNode {
  id: string;
  type: 'CONDITION' | 'ACTION';
  x: number;
  y: number;
  exp?: number;    // XP earned from successful trades
  level?: number;  // Derived from exp: every 3 exp = +1 level (min 1)
  data: {
    label: string;
    targetPrice?: number;
    operator?: 'lt' | 'gt' | 'drop' | 'rise';
    dropPercent?: number;
    risePercent?: number;
    side?: 'BUY' | 'SELL';
    amount?: number;
  };
}

export interface Connection {
  fromId: string;
  toId: string;
}

export interface TradeLog {
  id: string;
  message: string;
  time: string;
  type: 'BUY' | 'SELL' | 'FAILED';
}

export interface ChartTrade {
  id: string;
  type: 'BUY' | 'SELL';
  price: number;
  historyIndex: number;
}

// ─── Position tracking ────────────────────────────────────────────────────────
export interface ActivePosition {
  buyPrice: number;
  triggerPrice?: number;
  operator?: 'lt' | 'gt' | 'drop' | 'rise';
}

const HISTORY_CAP = 10000;

interface SimulationState {
  balance: number;
  totalDeposits: number;
  assets: Record<string, number>;
  asset: string;
  isRunning: boolean;
  currentPrice: number;
  priceHistory: OHLCCandle[];
  chartType: 'LINE' | 'CANDLE';
  simulationSpeed: number;
  timeframe: '1s' | '1m' | '5m' | '1h';
  chartTrades: ChartTrade[];
  nodes: StrategyNode[];
  connections: Connection[];
  logs: TradeLog[];
  trailingHigh: number;
  trailingLow: number;
  averageBuyPrice: number;

  activePositions: Record<string, ActivePosition>;
  recoveryModes: Record<string, ActivePosition>;
  totalAllTimeProfit: number;
  activePulseNode: string | null;
  firstTickPrice: number | null;

  toggleSimulation: () => void;
  closeAllPositions: () => void;
  tick: () => void;
  triggerPulse: (nodeId: string) => void;
  setChartType: (type: 'LINE' | 'CANDLE') => void;
  setSimulationSpeed: (speed: number) => void;
  setTimeframe: (tf: '1s' | '1m' | '5m' | '1h') => void;
  setAsset: (newAsset: string) => void;
  addNode: (node: StrategyNode) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeData: (id: string, data: Partial<StrategyNode['data']>) => void;
  connectNodes: (fromId: string, toId: string) => void;
  removeConnection: (fromId: string, toId: string) => void;
  removeNode: (id: string) => void;
  deposit: (amount: number) => void;
  loadTemplate: (type: 'DCA' | 'GRID' | 'GUARD') => void;

  triggerShock: (type: 'MOON' | 'CRASH') => void;

  isExportOpen: boolean;
  openExport: () => void;
  closeExport: () => void;
}

const INITIAL_PRICE = 65000;

const ASSET_BASE_PRICES: Record<string, number> = {
  'BTC/USD': 65000,
  'ETH/USD': 3500,
  'EUR/USD': 1.12,
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // ── Persisted stats: restored from localStorage on every page load ────────
  balance:            Number(localStorage.getItem('algo_balance'))  || 10000,
  totalDeposits:      Number(localStorage.getItem('algo_deposits')) || 10000,
  totalAllTimeProfit: Number(localStorage.getItem('algo_profit'))   || 0,
  assets: (() => {
    try {
      const stored = localStorage.getItem('algo_assets');
      return stored ? JSON.parse(stored) : { 'BTC/USD': 0, 'ETH/USD': 0, 'EUR/USD': 0 };
    } catch {
      return { 'BTC/USD': 0, 'ETH/USD': 0, 'EUR/USD': 0 };
    }
  })(),
  asset: 'BTC/USD',
  isRunning: false,
  currentPrice: INITIAL_PRICE,
  trailingHigh: INITIAL_PRICE,
  trailingLow: INITIAL_PRICE,
  averageBuyPrice: 0,
  priceHistory: [{ open: INITIAL_PRICE, high: INITIAL_PRICE, low: INITIAL_PRICE, close: INITIAL_PRICE }],
  chartType: 'LINE',
  simulationSpeed: 20,
  timeframe: '1s',
  chartTrades: [],
  nodes: [],
  connections: [],
  logs: [],
  activePositions: {},
  recoveryModes: {},
  activePulseNode: null,
  firstTickPrice: null,
  isExportOpen: false,

  toggleSimulation: () =>
    set((state) => ({ isRunning: !state.isRunning })),

  // ── Close All (Panic) — sell entire position at current price ─────────────
  closeAllPositions: () =>
    set((state) => {
      const units = state.assets[state.asset] ?? 0;
      if (units <= 0) return {};

      const price    = state.currentPrice;
      const decimals = state.asset === 'EUR/USD' ? 5 : 2;
      const revenue  = parseFloat((units * price).toFixed(2));
      const costBasis = units * (state.averageBuyPrice > 0 ? state.averageBuyPrice : price);
      const realizedProfit = parseFloat((revenue - costBasis).toFixed(2));

      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      const tradeId = `panic-${Date.now()}`;

      const panicLog: TradeLog = {
        id:      tradeId,
        message: `Panic Sold All (${units.toFixed(6)} ${state.asset}, $${revenue}) @ $${price.toFixed(decimals)}`,
        time:    timeStr,
        type:    'SELL',
      };

      playSound('SELL');

      const newBalance = parseFloat((state.balance + revenue).toFixed(2));
      const newProfit  = parseFloat((state.totalAllTimeProfit + realizedProfit).toFixed(2));
      const newAssets  = { ...state.assets, [state.asset]: 0 };
      localStorage.setItem('algo_balance', String(newBalance));
      localStorage.setItem('algo_profit',  String(newProfit));
      localStorage.setItem('algo_assets',  JSON.stringify(newAssets));

      return {
        balance:            newBalance,
        assets:             newAssets,
        averageBuyPrice:    0,
        activePositions:    {},
        recoveryModes:      {},
        logs:               [panicLog, ...state.logs].slice(0, 50),
        totalAllTimeProfit: newProfit,
      };
    }),

  // ── Visual pulse: lights up the wire for 800ms ────────────────────────────
  triggerPulse: (nodeId) => {
    set({ activePulseNode: nodeId });
    setTimeout(() => set({ activePulseNode: null }), 800);
  },

  setChartType: (type) => set({ chartType: type }),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  setTimeframe: (tf) => set({ timeframe: tf }),

  setAsset: (newAsset) =>
    set(() => {
      const newBasePrice = ASSET_BASE_PRICES[newAsset] ?? 100;
      const seedCandle: OHLCCandle = {
        open: newBasePrice,
        high: newBasePrice,
        low: newBasePrice,
        close: newBasePrice,
      };
      return {
        asset: newAsset,
        currentPrice: newBasePrice,
        priceHistory: [seedCandle],
        logs: [],
        chartTrades: [],
        connections: [],
        activePositions: {},
        recoveryModes: {},
        firstTickPrice: null,
      };
    }),

  tick: () =>
    set((state) => {
      const lastCandle = state.priceHistory[state.priceHistory.length - 1];
      const open = lastCandle.close;

      // Each tick is always a 1-second tick — timeframe only affects aggregation in the chart
      // Dynamic decimal precision: EUR/USD needs 5 decimals, others 2
      const decimals = state.asset === 'EUR/USD' ? 5 : 2;

      let change: number;
      if (state.asset === 'EUR/USD') {
        change = (Math.random() - 0.5) * 0.001;
      } else if (state.asset === 'ETH/USD') {
        change = (Math.random() - 0.5) * 40;
      } else {
        change = (Math.random() - 0.5) * 300;
      }
      const close = Math.max(0.0001, open + change);

      // Wicks proportional to per-tick volatility (not flat % of price)
      const wickUp   = Math.abs(change) * Math.random() * 1.5;
      const wickDown = Math.abs(change) * Math.random() * 1.5;
      const high = Math.max(open, close) + wickUp;
      const low  = Math.min(open, close) - wickDown;

      const price = parseFloat(close.toFixed(decimals));

      // ── Track trailing extremes ───────────────────────────────────────────
      let currentTrailingHigh = Math.max(state.trailingHigh, price);
      let currentTrailingLow  = Math.min(state.trailingLow,  price);

      const rawNewLength = state.priceHistory.length + 1;
      const willShift = rawNewLength > HISTORY_CAP;
      const shiftAmount = willShift ? rawNewLength - HISTORY_CAP : 0;
      const newCandleIndex = Math.min(rawNewLength, HISTORY_CAP) - 1;

      let newBalance = state.balance;
      const newAssets: Record<string, number> = { ...state.assets };
      let newAverageBuyPrice = state.averageBuyPrice;
      const newLogs: TradeLog[] = [];
      const newChartTrades: ChartTrade[] = [];
      let tickRealizedProfit = 0;

      const newActive   = { ...state.activePositions };
      const newRecovery = { ...state.recoveryModes };
      // Track node XP gains this tick (nodeId → xp delta)
      const nodeXpGains: Record<string, number> = {};

      // ── Recovery check ────────────────────────────────────────────────────
      for (const nodeId in newRecovery) {
        const pos = newRecovery[nodeId];
        const trigger = pos.triggerPrice ?? pos.buyPrice;
        // lt/drop nodes recover when price rises back above trigger; gt/rise when it falls back below
        const recovered = (pos.operator === 'lt' || pos.operator === 'drop')
          ? price > trigger
          : price < trigger;
        if (recovered) delete newRecovery[nodeId];
      }

      // ── Connection loop ───────────────────────────────────────────────────
      for (const conn of state.connections) {
        const condNode = state.nodes.find((n) => n.id === conn.fromId && n.type === 'CONDITION');
        const actNode  = state.nodes.find((n) => n.id === conn.toId   && n.type === 'ACTION');
        if (!condNode || !actNode) continue;

        const { operator, targetPrice, dropPercent, risePercent } = condNode.data;
        const { side, amount } = actNode.data;
        if (!operator || !side || !amount) continue;

        // ── Condition evaluation ──────────────────────────────────────────
        let condMet = false;
        if (operator === 'lt' && targetPrice != null) {
          condMet = price < targetPrice;
        } else if (operator === 'gt' && targetPrice != null) {
          condMet = price > targetPrice;
        } else if (operator === 'drop' && dropPercent != null) {
          condMet = price <= currentTrailingHigh * (1 - dropPercent / 100);
        } else if (operator === 'rise' && risePercent != null) {
          const baseRisePrice = newAverageBuyPrice > 0 ? newAverageBuyPrice : currentTrailingLow;
          condMet = price >= baseRisePrice * (1 + risePercent / 100);
        }

        if (!condMet) continue;
        if (newRecovery[conn.toId]) continue;

        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
        const tradeId = `${Date.now()}-${Math.random()}`;

        if (side === 'BUY') {
          if (newActive[conn.toId]) continue;

          if (amount > newBalance) {
            playSound('FAILED');
            newLogs.push({ id: tradeId, message: `FAILED: Insufficient funds (need $${amount})`, time: timeStr, type: 'FAILED' });
            newRecovery[conn.toId] = { buyPrice: price, triggerPrice: targetPrice, operator };
            continue;
          }

          const prevUnits  = newAssets[state.asset] || 0;
          const newUnits   = amount / price;
          const totalUnits = parseFloat((prevUnits + newUnits).toFixed(8));

          newBalance = parseFloat((newBalance - amount).toFixed(2));
          newAssets[state.asset] = totalUnits;

          // ── Update weighted average buy price ─────────────────────────
          if (prevUnits <= 0 || newAverageBuyPrice <= 0) {
            newAverageBuyPrice = price;
          } else {
            newAverageBuyPrice = parseFloat(
              ((newAverageBuyPrice * prevUnits + price * newUnits) / totalUnits).toFixed(decimals)
            );
          }

          newActive[conn.toId] = { buyPrice: price, triggerPrice: targetPrice, operator };
          // Atomic persist: balance reduced + assets increased must land together
          localStorage.setItem('algo_balance', String(newBalance));
          localStorage.setItem('algo_assets',  JSON.stringify(newAssets));

          // Award XP to both condition and action nodes
          nodeXpGains[conn.fromId] = (nodeXpGains[conn.fromId] ?? 0) + 1;
          nodeXpGains[conn.toId]   = (nodeXpGains[conn.toId]   ?? 0) + 1;

          playSound('BUY');
          newLogs.push({ id: tradeId, message: `BUY $${amount} (${newUnits.toFixed(4)} ${state.asset}) @ $${price.toFixed(2)}`, time: timeStr, type: 'BUY' });
          newChartTrades.push({ id: tradeId, type: side, price, historyIndex: newCandleIndex });
          // Trigger wire pulse animation
          setTimeout(() => get().triggerPulse(conn.toId), 0);

          // Reset trailing extremes after buy
          currentTrailingHigh = price;
          currentTrailingLow  = price;

        } else {
          // ── SELL ──────────────────────────────────────────────────────
          const currentAssetUnits = newAssets[state.asset] || 0;
          const pct       = Math.min(100, Math.max(1, amount));
          const sellUnits = currentAssetUnits * (pct / 100);

          // Nothing to sell — just skip, don't permanently block the node
          if (sellUnits <= 0.000001) continue;

          // ── Profit Protection: skip if price is at or below avg buy price
          if (newAverageBuyPrice > 0 && price <= newAverageBuyPrice) continue;

          const revenue = parseFloat((sellUnits * price).toFixed(2));
          newAssets[state.asset] = parseFloat((currentAssetUnits - sellUnits).toFixed(8));
          newBalance = parseFloat((newBalance + revenue).toFixed(2));

          // Accumulate realized profit for this sell
          const costBasis = sellUnits * (newAverageBuyPrice > 0 ? newAverageBuyPrice : price);
          tickRealizedProfit += parseFloat((revenue - costBasis).toFixed(2));

          // Reset averageBuyPrice on full exit
          if (pct === 100) newAverageBuyPrice = 0;
          // Atomic persist: balance increased + assets reduced + running profit — all together
          const sellProfit = parseFloat((state.totalAllTimeProfit + tickRealizedProfit).toFixed(2));
          localStorage.setItem('algo_balance', String(newBalance));
          localStorage.setItem('algo_assets',  JSON.stringify(newAssets));
          localStorage.setItem('algo_profit',  String(sellProfit));

          // Award XP to both condition and action nodes
          nodeXpGains[conn.fromId] = (nodeXpGains[conn.fromId] ?? 0) + 1;
          nodeXpGains[conn.toId]   = (nodeXpGains[conn.toId]   ?? 0) + 1;

          playSound('SELL');
          newLogs.push({ id: tradeId, message: `SELL ${pct}% (${sellUnits.toFixed(6)} ${state.asset}, $${revenue}) @ $${price.toFixed(2)}`, time: timeStr, type: 'SELL' });
          newChartTrades.push({ id: tradeId, type: side, price, historyIndex: newCandleIndex });
          // Trigger wire pulse animation
          setTimeout(() => get().triggerPulse(conn.toId), 0);

          // Block sell node until price recovers
          newRecovery[conn.toId] = { buyPrice: price, triggerPrice: targetPrice, operator };

          // Reset trailing extremes after sell
          currentTrailingHigh = price;
          currentTrailingLow  = price;

          for (const activeId in newActive) {
            const pos = newActive[activeId];
            if (price > pos.buyPrice) {
              delete newActive[activeId];
            } else {
              newRecovery[activeId] = pos;
              delete newActive[activeId];
            }
          }
        }
      }

      const allLogs = [...newLogs, ...state.logs].slice(0, 50);

      const newCandle: OHLCCandle = {
        open:  parseFloat(open.toFixed(decimals)),
        high:  parseFloat(high.toFixed(decimals)),
        low:   parseFloat(low.toFixed(decimals)),
        close: price,
      };

      const updatedChartTrades = [
        ...state.chartTrades
          .map((t) => ({ ...t, historyIndex: t.historyIndex - shiftAmount }))
          .filter((t) => t.historyIndex >= 0),
        ...newChartTrades,
      ];

      // Apply XP gains and compute new levels (every 3 exp = +1 level above base 1)
      const updatedNodes = Object.keys(nodeXpGains).length > 0
        ? state.nodes.map((n) => {
            const gain = nodeXpGains[n.id];
            if (!gain) return n;
            const newExp   = (n.exp ?? 0) + gain;
            const newLevel = Math.floor(newExp / 3) + 1;
            return { ...n, exp: newExp, level: newLevel };
          })
        : state.nodes;

      const tickProfit = parseFloat((state.totalAllTimeProfit + tickRealizedProfit).toFixed(2));

      return {
        currentPrice:       price,
        trailingHigh:       currentTrailingHigh,
        trailingLow:        currentTrailingLow,
        averageBuyPrice:    newAverageBuyPrice,
        balance:            newBalance,
        assets:             newAssets,
        priceHistory:       [...state.priceHistory, newCandle].slice(-HISTORY_CAP),
        logs:               allLogs,
        chartTrades:        updatedChartTrades,
        activePositions:    newActive,
        recoveryModes:      newRecovery,
        connections:        state.connections,
        nodes:              updatedNodes,
        totalAllTimeProfit: tickProfit,
        // Capture the very first price tick as the Ghost Mode benchmark
        firstTickPrice:     state.firstTickPrice ?? price,
      };
    }),

  // ── God Mode ──────────────────────────────────────────────────────────────
  triggerShock: (type) => set((state) => {
    const decimals   = state.asset === 'EUR/USD' ? 5 : 2;
    const multiplier = type === 'MOON' ? 1.15 : 0.80;
    const newPrice   = parseFloat((state.currentPrice * multiplier).toFixed(decimals));
    const shockCandle: OHLCCandle = {
      open:  state.currentPrice,
      high:  type === 'MOON' ? newPrice : state.currentPrice,
      low:   type === 'CRASH' ? newPrice : state.currentPrice,
      close: newPrice,
    };
    return {
      currentPrice: newPrice,
      trailingHigh: Math.max(state.trailingHigh, newPrice),
      trailingLow:  Math.min(state.trailingLow,  newPrice),
      priceHistory: [...state.priceHistory, shockCandle].slice(-HISTORY_CAP),
    };
  }),

  // ── Export Modal ──────────────────────────────────────────────────────────
  openExport:  () => set({ isExportOpen: true }),
  closeExport: () => set({ isExportOpen: false }),

  loadTemplate: (type) => set((state) => {
    const template =
      type === 'DCA'   ? getDCATemplate()   :
      type === 'GRID'  ? getGridTemplate()  :
      type === 'GUARD' ? getGuardTemplate() : null;
    if (!template) return {};
    // Offset each new node so it doesn't stack on top of existing ones
    const offset = state.nodes.length * 15;
    const adjustedNodes = template.nodes.map((n) => ({
      ...n,
      x: n.x + offset,
      y: n.y + offset,
    }));
    return {
      nodes:       [...state.nodes, ...adjustedNodes],
      connections: [...state.connections, ...template.connections],
    };
  }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),

  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  connectNodes: (fromId, toId) =>
    set((state) => {
      const exists = state.connections.some(
        (c) => c.fromId === fromId && c.toId === toId
      );
      if (exists) return {};
      return { connections: [...state.connections, { fromId, toId }] };
    }),

  removeConnection: (fromId, toId) =>
    set((state) => ({
      connections: state.connections.filter(
        (c) => !(c.fromId === fromId && c.toId === toId)
      ),
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      connections: state.connections.filter(
        (c) => c.fromId !== id && c.toId !== id
      ),
    })),

  deposit: (amount) =>
    set((state) => {
      const newBalance  = parseFloat((state.balance + amount).toFixed(2));
      const newDeposits = parseFloat((state.totalDeposits + amount).toFixed(2));
      localStorage.setItem('algo_balance',  String(newBalance));
      localStorage.setItem('algo_deposits', String(newDeposits));
      return { balance: newBalance, totalDeposits: newDeposits };
    }),
}));
