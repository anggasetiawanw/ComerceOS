import { OrderStatusValue } from '../value-objects/order-status.vo';
import { StatusActorTypeValue } from '../value-objects/status-change-actor.vo';
import { OrderTransitionPolicy } from './order-transition.policy';

describe('OrderTransitionPolicy', () => {
  const policy = new OrderTransitionPolicy();

  // Every legal transition from .docs/08-order-state-machine.md §3, with at
  // least one actor known to be allowed for it.
  const legalTransitions: [OrderStatusValue, OrderStatusValue, StatusActorTypeValue][] = [
    ['pending_payment', 'paid', 'system'],
    ['pending_payment', 'paid', 'seller'],
    ['pending_payment', 'cancelled', 'seller'],
    ['pending_payment', 'cancelled', 'buyer'],
    ['pending_payment', 'expired', 'system'],
    ['paid', 'holding', 'system'],
    ['holding', 'released', 'system'],
    ['holding', 'released', 'seller'],
    ['holding', 'disputed', 'buyer'],
    ['holding', 'disputed', 'seller'],
    ['holding', 'disputed', 'admin'],
    ['holding', 'refunded', 'seller'],
    ['holding', 'refunded', 'admin'],
    ['released', 'disputed', 'buyer'],
    ['released', 'disputed', 'admin'],
    ['disputed', 'released', 'admin'],
    ['disputed', 'released', 'seller'],
    ['disputed', 'refunded', 'admin'],
    ['disputed', 'refunded', 'seller'],
  ];

  it.each(legalTransitions)('allows %s -> %s for actor %s', (from, to, actor) => {
    expect(policy.isLegal(from, to, actor)).toBe(true);
  });

  // Explicitly forbidden, per .docs/08-order-state-machine.md §3.
  const forbiddenTransitions: [OrderStatusValue, OrderStatusValue][] = [
    ['expired', 'paid'],
    ['refunded', 'paid'],
    ['refunded', 'holding'],
    ['refunded', 'released'],
    ['refunded', 'disputed'],
    ['released', 'holding'],
    ['pending_payment', 'released'],
    ['cancelled', 'paid'],
  ];

  it.each(forbiddenTransitions)('forbids %s -> %s for every actor', (from, to) => {
    const actors: StatusActorTypeValue[] = ['system', 'seller', 'buyer', 'admin'];
    for (const actor of actors) {
      expect(policy.isLegal(from, to, actor)).toBe(false);
    }
  });

  it('forbids an actor not authorized for an otherwise-legal transition', () => {
    expect(policy.isLegal('pending_payment', 'cancelled', 'admin')).toBe(false);
    expect(policy.isLegal('holding', 'refunded', 'buyer')).toBe(false);
  });

  it('forbids every transition out of a terminal state', () => {
    const terminalStates: OrderStatusValue[] = ['refunded', 'cancelled', 'expired'];
    const allStates: OrderStatusValue[] = [
      'pending_payment',
      'paid',
      'holding',
      'released',
      'disputed',
      'refunded',
      'cancelled',
      'expired',
    ];

    for (const from of terminalStates) {
      for (const to of allStates) {
        expect(policy.isLegal(from, to, 'system')).toBe(false);
        expect(policy.isLegal(from, to, 'admin')).toBe(false);
      }
    }
  });
});
