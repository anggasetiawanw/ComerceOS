type Outcome<T, E> = { success: true; value: T } | { success: false; error: E };

export class Result<T, E> {
  private constructor(private readonly outcome: Outcome<T, E>) {}

  static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>({ success: true, value });
  }

  static err<T = never, E = unknown>(error: E): Result<T, E> {
    return new Result<T, E>({ success: false, error });
  }

  isOk(): boolean {
    return this.outcome.success;
  }

  isErr(): boolean {
    return !this.outcome.success;
  }

  unwrap(): T {
    if (!this.outcome.success) {
      throw new Error('Called unwrap() on an Err result');
    }
    return this.outcome.value;
  }

  unwrapErr(): E {
    if (this.outcome.success) {
      throw new Error('Called unwrapErr() on an Ok result');
    }
    return this.outcome.error;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.outcome.success
      ? Result.ok(fn(this.outcome.value))
      : Result.err(this.outcome.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return this.outcome.success
      ? Result.ok(this.outcome.value)
      : Result.err(fn(this.outcome.error));
  }
}
