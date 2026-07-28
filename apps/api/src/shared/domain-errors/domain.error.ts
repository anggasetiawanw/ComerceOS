export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly status: number = 422;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
