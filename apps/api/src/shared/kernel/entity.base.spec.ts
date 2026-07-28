import { Entity } from './entity.base';

interface DummyProps {
  name: string;
}

class Dummy extends Entity<DummyProps> {
  static create(name: string, id?: string): Dummy {
    return new Dummy({ name }, id);
  }

  get name(): string {
    return this.props.name;
  }
}

describe('Entity', () => {
  it('generates a UUIDv7 id when none is given', () => {
    const dummy = Dummy.create('a');
    expect(dummy.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('is equal to another entity with the same id, regardless of props', () => {
    const a = Dummy.create('a', 'same-id');
    const b = Dummy.create('different name', 'same-id');
    expect(a.equals(b)).toBe(true);
  });

  it('is not equal to an entity with a different id', () => {
    const a = Dummy.create('a', 'id-1');
    const b = Dummy.create('a', 'id-2');
    expect(a.equals(b)).toBe(false);
  });

  it('is not equal to undefined', () => {
    const a = Dummy.create('a');
    expect(a.equals(undefined)).toBe(false);
  });
});
