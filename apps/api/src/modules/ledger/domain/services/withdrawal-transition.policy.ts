import { WithdrawalStatusValue } from '../value-objects/withdrawal-status.vo';

interface TransitionRule {
  from: WithdrawalStatusValue;
  to: WithdrawalStatusValue;
}

// requested -> paid is deliberately absent: .docs/09-payments-ledger.md §7's
// sequence diagram always puts a manual bank transfer between an admin
// picking up a request and marking it paid, so an admin must approve first.
const TRANSITION_TABLE: readonly TransitionRule[] = [
  { from: 'requested', to: 'approved' },
  { from: 'requested', to: 'rejected' },
  { from: 'approved', to: 'paid' },
  { from: 'approved', to: 'rejected' },
];

export class WithdrawalTransitionPolicy {
  isLegal(from: WithdrawalStatusValue, to: WithdrawalStatusValue): boolean {
    return TRANSITION_TABLE.some((rule) => rule.from === from && rule.to === to);
  }
}
