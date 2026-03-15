import { StrategyNode, Connection } from './store';

// ─── Template Factory ────────────────────────────────────────────────────────

export interface TemplateResult {
  nodes: StrategyNode[];
  connections: Connection[];
}

// ─── ID helper ───────────────────────────────────────────────────────────────
// Uses Date.now() + Math.random() to guarantee uniqueness even on rapid clicks.
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * DCA (Dollar Cost Averaging) — full autonomous buy/sell loop.
 *
 * Node 1 (COND): Drop 5%  → Node 2 (ACT): BUY  $1000
 * Node 3 (COND): Rise 5%  → Node 4 (ACT): SELL 100%
 *
 * Rise is evaluated against averageBuyPrice (take-profit from avg entry).
 */
export function getDCATemplate(): TemplateResult {
  const cond1 = uid('COND-DCA-BUY');
  const act1  = uid('ACT-DCA-BUY');
  const cond2 = uid('COND-DCA-SELL');
  const act2  = uid('ACT-DCA-SELL');

  const nodes: StrategyNode[] = [
    {
      id:   cond1,
      type: 'CONDITION',
      x:    20,
      y:    20,
      data: { label: 'DCA Drop', operator: 'drop', dropPercent: 5 },
    },
    {
      id:   act1,
      type: 'ACTION',
      x:    240,
      y:    20,
      data: { label: 'DCA Buy', side: 'BUY', amount: 1000 },
    },
    {
      id:   cond2,
      type: 'CONDITION',
      x:    20,
      y:    120,
      data: { label: 'DCA Take Profit', operator: 'rise', risePercent: 5 },
    },
    {
      id:   act2,
      type: 'ACTION',
      x:    240,
      y:    120,
      data: { label: 'DCA Sell All', side: 'SELL', amount: 100 },
    },
  ];

  const connections: Connection[] = [
    { fromId: cond1, toId: act1 },
    { fromId: cond2, toId: act2 },
  ];

  return { nodes, connections };
}

/**
 * Grid Scalper — tight buy/sell loop for range-bound markets.
 *
 * Node 1 (COND): Drop 2%  → Node 2 (ACT): BUY  $500
 * Node 3 (COND): Rise 2%  → Node 4 (ACT): SELL 25%
 *
 * Harvests small gains repeatedly; partial sells keep position open.
 */
export function getGridTemplate(): TemplateResult {
  const cond1 = uid('COND-GRID-BUY');
  const act1  = uid('ACT-GRID-BUY');
  const cond2 = uid('COND-GRID-SELL');
  const act2  = uid('ACT-GRID-SELL');

  const nodes: StrategyNode[] = [
    {
      id:   cond1,
      type: 'CONDITION',
      x:    20,
      y:    20,
      data: { label: 'Grid Drop', operator: 'drop', dropPercent: 2 },
    },
    {
      id:   act1,
      type: 'ACTION',
      x:    240,
      y:    20,
      data: { label: 'Grid Buy', side: 'BUY', amount: 500 },
    },
    {
      id:   cond2,
      type: 'CONDITION',
      x:    20,
      y:    120,
      data: { label: 'Grid Take Profit', operator: 'rise', risePercent: 2 },
    },
    {
      id:   act2,
      type: 'ACTION',
      x:    240,
      y:    120,
      data: { label: 'Grid Sell 25%', side: 'SELL', amount: 25 },
    },
  ];

  const connections: Connection[] = [
    { fromId: cond1, toId: act1 },
    { fromId: cond2, toId: act2 },
  ];

  return { nodes, connections };
}

/**
 * Guard — capital protection with a small accumulation layer.
 *
 * Node 1 (COND): Drop 3%   → Node 2 (ACT): BUY  $500   (accumulate on dip)
 * Node 3 (COND): Drop 10%  → Node 4 (ACT): SELL 100%   (emergency exit)
 *
 * Buys small dips but hard-exits on a severe crash to protect capital.
 */
export function getGuardTemplate(): TemplateResult {
  const cond1 = uid('COND-GUARD-BUY');
  const act1  = uid('ACT-GUARD-BUY');
  const cond2 = uid('COND-GUARD-EXIT');
  const act2  = uid('ACT-GUARD-EXIT');

  const nodes: StrategyNode[] = [
    {
      id:   cond1,
      type: 'CONDITION',
      x:    20,
      y:    20,
      data: { label: 'Guard Dip', operator: 'drop', dropPercent: 3 },
    },
    {
      id:   act1,
      type: 'ACTION',
      x:    240,
      y:    20,
      data: { label: 'Guard Buy', side: 'BUY', amount: 500 },
    },
    {
      id:   cond2,
      type: 'CONDITION',
      x:    20,
      y:    120,
      data: { label: 'Guard Crash', operator: 'drop', dropPercent: 10 },
    },
    {
      id:   act2,
      type: 'ACTION',
      x:    240,
      y:    120,
      data: { label: 'Emergency Exit', side: 'SELL', amount: 100 },
    },
  ];

  const connections: Connection[] = [
    { fromId: cond1, toId: act1 },
    { fromId: cond2, toId: act2 },
  ];

  return { nodes, connections };
}
