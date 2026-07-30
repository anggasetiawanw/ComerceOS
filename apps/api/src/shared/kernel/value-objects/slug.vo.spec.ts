import { Slug } from './slug.vo';

describe('Slug', () => {
  describe('create', () => {
    it('rejects an empty string', () => {
      const result = Slug.create('');
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().reason).toBe('empty');
    });

    it('rejects a slug with spaces', () => {
      const result = Slug.create('kaos polos');
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().reason).toBe('format');
    });

    it('rejects a leading hyphen', () => {
      const result = Slug.create('-kaos-polos');
      expect(result.isErr()).toBe(true);
    });

    it('rejects a trailing hyphen', () => {
      const result = Slug.create('kaos-polos-');
      expect(result.isErr()).toBe(true);
    });

    it('rejects uppercase-only invalid characters', () => {
      const result = Slug.create('kaos_polos');
      expect(result.isErr()).toBe(true);
    });

    it('normalizes uppercase input instead of rejecting it', () => {
      const result = Slug.create('Kaos-Polos');
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().value).toBe('kaos-polos');
    });

    it('accepts internal hyphens', () => {
      const result = Slug.create('kaos-polos-premium');
      expect(result.isOk()).toBe(true);
    });

    it('rejects a slug longer than 120 characters', () => {
      const result = Slug.create('a'.repeat(121));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().reason).toBe('format');
    });

    it('accepts a slug at exactly 120 characters', () => {
      const result = Slug.create('a'.repeat(120));
      expect(result.isOk()).toBe(true);
    });
  });

  describe('fromName', () => {
    it('derives a slug from a plain name', () => {
      const result = Slug.fromName('Kaos Polos Premium');
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().value).toBe('kaos-polos-premium');
    });

    it('strips diacritics', () => {
      const result = Slug.fromName('Café Menú');
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().value).toBe('cafe-menu');
    });

    it('collapses repeated separators', () => {
      const result = Slug.fromName('Kaos   Polos!!  Premium');
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().value).toBe('kaos-polos-premium');
    });

    it('rejects a name with no alphanumeric characters', () => {
      const result = Slug.fromName('!!!');
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().reason).toBe('empty');
    });
  });

  describe('withSuffix', () => {
    it('appends a numeric suffix', () => {
      const slug = Slug.create('kaos-polos').unwrap();
      expect(slug.withSuffix(2).value).toBe('kaos-polos-2');
    });

    it('truncates the base to stay within the max length', () => {
      const slug = Slug.create('a'.repeat(120)).unwrap();
      const suffixed = slug.withSuffix(2);
      expect(suffixed.value).toHaveLength(120);
      expect(suffixed.value.endsWith('-2')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('exposes the value via toString and toJSON', () => {
      const slug = Slug.create('kaos-polos').unwrap();
      expect(slug.toString()).toBe('kaos-polos');
      expect(slug.toJSON()).toBe('kaos-polos');
    });
  });
});
