import { StoreTheme } from './store-theme.vo';

describe('StoreTheme', () => {
  it('empty() has a null value', () => {
    expect(StoreTheme.empty().value).toBeNull();
  });

  it('null input round-trips to empty', () => {
    const result = StoreTheme.create(null);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBeNull();
  });

  it('strips unknown keys', () => {
    const result = StoreTheme.create({ primaryColor: '#000000', evil: 'script' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toEqual({ primaryColor: '#000000' });
  });

  it('produces null when only unknown keys are present', () => {
    const result = StoreTheme.create({ evil: 'script' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBeNull();
  });

  it('rejects a non-string value for an allowed key', () => {
    const result = StoreTheme.create({ primaryColor: 123 });
    expect(result.isErr()).toBe(true);
  });

  it('rejects an array input', () => {
    const result = StoreTheme.create(['not', 'an', 'object']);
    expect(result.isErr()).toBe(true);
  });

  it('produces JSON-safe output', () => {
    const theme = StoreTheme.create({ accentColor: '#fff' }).unwrap();
    expect(JSON.parse(JSON.stringify(theme))).toEqual({ accentColor: '#fff' });
  });
});
