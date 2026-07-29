import { UserRole } from './user-role.vo';

describe('UserRole', () => {
  it('accepts the three valid roles', () => {
    expect(UserRole.create('buyer').isOk()).toBe(true);
    expect(UserRole.create('seller').isOk()).toBe(true);
    expect(UserRole.create('admin').isOk()).toBe(true);
  });

  it('rejects an unknown role', () => {
    expect(UserRole.create('superuser').isErr()).toBe(true);
  });

  it('defaults new registrations to buyer', () => {
    expect(UserRole.buyer().value).toBe('buyer');
  });

  it('reports admin and seller status', () => {
    expect(UserRole.create('admin').unwrap().isAdmin()).toBe(true);
    expect(UserRole.create('seller').unwrap().isSeller()).toBe(true);
    expect(UserRole.buyer().isAdmin()).toBe(false);
    expect(UserRole.buyer().isSeller()).toBe(false);
  });
});
