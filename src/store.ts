import { create } from 'zustand';

// ─── Web Audio SFX ────────────────────────────────────────────────────────────

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playSound(type: 'BUY' | 'SELL' | 'FAILED') {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (type === 'FAILED') {
    // Low square-wave buzz
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

  // ── Cash-register "cha-ching" ──────────────────────────────────────────────
  // Two metallic bell tones fired in quick succession
  const now = audioCtx.currentTime;
  const tones = type === 'BUY'
    ? [{ freq: 2637, delay: 0 }, { freq: 3136, delay: 0.07 }]   // E7 → G7 (bright register)
    : [{ freq: 2093, delay: 0 }, { freq: 2637, delay: 0.07 }];  // C7 → E7 (slightly lower sell)

  for (const { freq, delay } of tones) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delay);
    // Fast metallic decay — coin-bell character
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
  data: {
    label: string;
    targetPrice?: number;
    operator?: 'lt' | 'gt';
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

export interface BacktestResult {
  startEquity: number;
  endEquity: number;
  netProfit: number;
  totalTrades: number;
  ticks: number;
}

const HISTORY_CAP = 100;

interface SimulationState {
  balance: number;
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

  toggleSimulation: () => void;
  tick: () => void;
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
  
  backtestResult: BacktestResult | null;
  runBacktest: (ticks: number) => void;
  clearBacktest: () => void;
}

const INITIAL_PRICE = 65000;

const ASSET_BASE_PRICES: Record<string, number> = {
  'BTC/USD': 65000,
  'ETH/USD': 3500,
  'EUR/USD': 1.12,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  balance: 10000,
  totalDeposits: 10000,
  assets: { 'BTC/USD': 0, 'ETH/USD': 0, 'EUR/USD': 0 },
  asset: 'BTC/USD',
  isRunning: false,
  currentPrice: INITIAL_PRICE,
  priceHistory: [{ open: INITIAL_PRICE, high: INITIAL_PRICE, low: INITIAL_PRICE, close: INITIAL_PRICE }],
  chartType: 'LINE',
  simulationSpeed: 20,
  timeframe: '1s',
  chartTrades: [],
  nodes: [],
  connections: [],
  logs: [],
  backtestResult: null,

  toggleSimulation: () =>
    set((state) => ({ isRunning: !state.isRunning })),

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
      };
    }),

  tick: () =>
    set((state) => {
      const lastCandle = state.priceHistory[state.priceHistory.length - 1];
      const open = lastCandle.close;

      // Volatility scaled by timeframe
      const timeframeMultiplierMap: Record<string, number> = {
        '1s': 1, '1m': 2, '5m': 4, '1h': 8,
      };
      const timeframeMultiplier = timeframeMultiplierMap[state.timeframe] ?? 1;

      // Per-asset absolute volatility (not percentage-based)
      let change: number;
      if (state.asset === 'EUR/USD') {
        change = (Math.random() - 0.5) * 0.001 * timeframeMultiplier;
      } else if (state.asset === 'ETH/USD') {
        // Эфир меняется на десятки долларов
        change = (Math.random() - 0.5) * 40 * timeframeMultiplier;
      } else {
        // BTC/USD меняется на сотни долларов
        change = (Math.random() - 0.5) * 300 * timeframeMultiplier;
      }
      const close = Math.max(0.0001, open + change);

      // Realistic wicks
      const wickUp = open * (Math.random() * 0.005);
      const wickDown = open * (Math.random() * 0.005);
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;

      const price = parseFloat(close.toFixed(2));

      // The new candle will land at index = priceHistory.length (before cap)
      // After appending + slicing to HISTORY_CAP, we need to know if history shifted
      const rawNewLength = state.priceHistory.length + 1;
      const willShift = rawNewLength > HISTORY_CAP;
      const shiftAmount = willShift ? rawNewLength - HISTORY_CAP : 0;

      // New candle index in the post-cap array
      const newCandleIndex = Math.min(rawNewLength, HISTORY_CAP) - 1;

      // Evaluate CONDITION -> ACTION connections
      let newBalance = state.balance;
      const newAssets: Record<string, number> = { ...state.assets };
      const firedConnections: string[] = [];
      const newLogs: TradeLog[] = [];
      const newChartTrades: ChartTrade[] = [];

      for (const conn of state.connections) {
        const condNode = state.nodes.find(
          (n) => n.id === conn.fromId && n.type === 'CONDITION'
        );
        const actNode = state.nodes.find(
          (n) => n.id === conn.toId && n.type === 'ACTION'
        );
        if (!condNode || !actNode) continue;

        const { operator, targetPrice } = condNode.data;
        const { side, amount } = actNode.data;
        if (targetPrice == null || !operator || !side || !amount) continue;

        const condMet = operator === 'lt' ? price < targetPrice : price > targetPrice;

        if (condMet) {
          const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
          const tradeId = `${Date.now()}-${Math.random()}`;
          firedConnections.push(`${conn.fromId}:${conn.toId}`);

          if (side === 'BUY') {
            // amount = USD to spend
            if (amount > newBalance) {
              playSound('FAILED');
              newLogs.push({
                id: tradeId,
                message: `FAILED: Insufficient funds (need $${amount}, have $${newBalance.toFixed(2)})`,
                time: timeStr,
                type: 'FAILED',
              });
              continue;
            }
            const currentAssetUnits = newAssets[state.asset] || 0;
            const units = amount / price;
            newBalance = parseFloat((newBalance - amount).toFixed(2));
            newAssets[state.asset] = parseFloat((currentAssetUnits + units).toFixed(8));
            playSound('BUY');
            newLogs.push({
              id: tradeId,
              message: `BUY $${amount} (${units.toFixed(4)} ${state.asset}) @ $${price.toFixed(2)}`,
              time: timeStr,
              type: 'BUY',
            });
          } else {
            // SELL: amount = percentage (1–100) of held assets for this asset
            const currentAssetUnits = newAssets[state.asset] || 0;
            const pct = Math.min(100, Math.max(1, amount));
            const sellUnits = currentAssetUnits * (pct / 100);
            if (sellUnits <= 0.000001) {
              playSound('FAILED');
              newLogs.push({
                id: tradeId,
                message: `FAILED: No ${state.asset} to sell (hold ${currentAssetUnits.toFixed(6)})`,
                time: timeStr,
                type: 'FAILED',
              });
              continue;
            }
            const revenue = parseFloat((sellUnits * price).toFixed(2));
            newAssets[state.asset] = parseFloat((currentAssetUnits - sellUnits).toFixed(8));
            newBalance = parseFloat((newBalance + revenue).toFixed(2));
            playSound('SELL');
            newLogs.push({
              id: tradeId,
              message: `SELL ${pct}% (${sellUnits.toFixed(6)} ${state.asset}, $${revenue}) @ $${price.toFixed(2)}`,
              time: timeStr,
              type: 'SELL',
            });
          }

          newChartTrades.push({
            id: tradeId,
            type: side,
            price,
            historyIndex: newCandleIndex,
          });
        }
      }

      const remainingConnections = state.connections.filter(
        (c) => !firedConnections.includes(`${c.fromId}:${c.toId}`)
      );

      const allLogs = [...newLogs, ...state.logs].slice(0, 50);

      const newCandle: OHLCCandle = {
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: price,
      };

      // Shift existing chartTrades indices when history scrolls
      const updatedChartTrades = [
        ...state.chartTrades
          .map((t) => ({ ...t, historyIndex: t.historyIndex - shiftAmount }))
          .filter((t) => t.historyIndex >= 0),
        ...newChartTrades,
      ];

      return {
        currentPrice: price,
        balance: newBalance,
        assets: newAssets,
        priceHistory: [...state.priceHistory, newCandle].slice(-HISTORY_CAP),
        connections: remainingConnections,
        logs: allLogs,
        chartTrades: updatedChartTrades,
      };
    }),
    
    
    clearBacktest: () => set({ backtestResult: null }),
    
      runBacktest: (ticks) => set((state) => {
        let vBalance = state.balance;
        let vAssets = state.assets[state.asset] || 0;
        let vPrice = state.currentPrice;
        let vConns = [...state.connections];
        let tradesCount = 0;
    
        const tfMult = { '1s': 1, '1m': 2, '5m': 4, '1h': 8 }[state.timeframe] ?? 1;
    
        for (let i = 0; i < ticks; i++) {
          let change = 0;
          if (state.asset === 'EUR/USD') change = (Math.random() - 0.5) * 0.001 * tfMult;
          else if (state.asset === 'ETH/USD') change = (Math.random() - 0.5) * 40 * tfMult;
          else change = (Math.random() - 0.5) * 300 * tfMult;
          vPrice = Math.max(0.0001, vPrice + change);
    
          const fired: string[] = [];
          for (const conn of vConns) {
            const condNode = state.nodes.find(n => n.id === conn.fromId);
            const actNode = state.nodes.find(n => n.id === conn.toId);
            if (!condNode || !actNode) continue;
    
            const { operator, targetPrice } = condNode.data;
            const { side, amount } = actNode.data;
            if (targetPrice == null || !amount) continue;
    
            const condMet = operator === 'lt' ? vPrice < targetPrice : vPrice > targetPrice;
            if (condMet) {
              fired.push(`${conn.fromId}:${conn.toId}`);
              if (side === 'BUY') {
                if (amount <= vBalance) {
                  vBalance -= amount;
                  vAssets += amount / vPrice;
                  tradesCount++;
                }
              } else {
                const pct = Math.min(100, Math.max(1, amount));
                const sellUnits = vAssets * (pct / 100);
                if (sellUnits > 0.000001) {
                  vAssets -= sellUnits;
                  vBalance += sellUnits * vPrice;
                  tradesCount++;
                }
              }
            }
          }
          vConns = vConns.filter(c => !fired.includes(`${c.fromId}:${c.toId}`));
        }
    
        const startEq = state.balance + ((state.assets[state.asset] || 0) * state.currentPrice);
        const endEq = vBalance + (vAssets * vPrice);
    
        return {
          backtestResult: {
            startEquity: parseFloat(startEq.toFixed(2)),
            endEquity: parseFloat(endEq.toFixed(2)),
            netProfit: parseFloat((endEq - startEq).toFixed(2)),
            totalTrades: tradesCount,
            ticks,
          }
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
    set((state) => ({
      balance: parseFloat((state.balance + amount).toFixed(2)),
      totalDeposits: state.totalDeposits + amount,
    })),
}));
