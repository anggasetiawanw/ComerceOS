import { OrderStatusValue } from '../value-objects/order-status.vo';
import { StatusActorTypeValue } from '../value-objects/status-change-actor.vo';

interface TransitionRule {
  from: OrderStatusValue;
  to: OrderStatusValue;
  actors: readonly StatusActorTypeValue[];
}

// The 14 legal transitions from .docs/08-order-state-machine.md §3, as data.
// Anything absent from this table is illegal — there is no fallback rule.
// Rows sharing the same (from, to) pair (e.g. holding -> released via the
// release job, a seller click, or auto-force-release) collapse into one
// entry with the union of allowed actors.
const TRANSITION_TABLE: readonly TransitionRule[] = [
  { from: 'pending_payment', to: 'paid', actors: ['system', 'seller'] },
  { from: 'pending_payment', to: 'cancelled', actors: ['seller', 'buyer'] },
  { from: 'pending_payment', to: 'expired', actors: ['system'] },
  { from: 'paid', to: 'holding', actors: ['system'] },
  { from: 'holding', to: 'released', actors: ['system', 'seller'] },
  { from: 'holding', to: 'disputed', actors: ['buyer', 'seller', 'admin'] },
  { from: 'holding', to: 'refunded', actors: ['seller', 'admin'] },
  { from: 'released', to: 'disputed', actors: ['buyer', 'admin'] },
  { from: 'disputed', to: 'released', actors: ['admin', 'seller'] },
  { from: 'disputed', to: 'refunded', actors: ['admin', 'seller'] },
];

export class OrderTransitionPolicy {
  isLegal(from: OrderStatusValue, to: OrderStatusValue, actorType: StatusActorTypeValue): boolean {
    const rule = TRANSITION_TABLE.find((candidate) => candidate.from === from && candidate.to === to);
    return rule !== undefined && rule.actors.includes(actorType);
  }
}
