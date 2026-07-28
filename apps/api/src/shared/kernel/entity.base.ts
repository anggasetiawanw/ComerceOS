import { generateId, UniqueId } from './uuid';

export abstract class Entity<Props> {
  protected readonly props: Props;
  private readonly _id: UniqueId;

  protected constructor(props: Props, id?: UniqueId) {
    this.props = props;
    this._id = id ?? generateId();
  }

  get id(): UniqueId {
    return this._id;
  }

  equals(other?: Entity<Props>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }
}
