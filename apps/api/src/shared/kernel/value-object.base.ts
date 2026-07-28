const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val));

export abstract class ValueObject<Props> {
  protected readonly props: Props;

  protected constructor(props: Props) {
    this.props = Object.freeze(props);
  }

  equals(other?: ValueObject<Props>): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof ValueObject)) return false;
    return stableStringify(this.props) === stableStringify(other.props);
  }
}
