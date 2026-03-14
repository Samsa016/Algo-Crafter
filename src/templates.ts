import { StrategyNode, Connection } from './store';

// ─── Template Factory ────────────────────────────────────────────────────────

export interface TemplateResult {
  nodes: StrategyNode[];
  connections: Connection[];
}

/**
 * DCA (Dollar Cost Averaging) template.
 * Condition: buy when price drops ≥5% from trailing high.
 * Action: buy $1000 worth of the current asset.
 * IDs use Date.now() + Math.random() to guarantee uniqueness even on rapid clicks.
 */
export function getDCATemplate(): TemplateResult {
  const condId = `COND-DCA-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const actId  = `ACT-DCA-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  const nodes: StrategyNode[] = [
    {
      id:   condId,
      type: 'CONDITION',
      x:    20,
      y:    80,
      data: {
        label:       'Market Drop',
        operator:    'drop',
        dropPercent: 5,
      },
    },
    {
      id:   actId,
      type: 'ACTION',
      x:    280,
      y:    80,
      data: {
        label:  'Buy Dip',
        side:   'BUY',
        amount: 1000,
      },
    },
  ];

  const connections: Connection[] = [
    { fromId: condId, toId: actId },
  ];

  return { nodes, connections };
}
