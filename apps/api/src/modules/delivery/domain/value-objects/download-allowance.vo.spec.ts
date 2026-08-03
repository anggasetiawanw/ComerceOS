import { DownloadAllowance } from './download-allowance.vo';

describe('DownloadAllowance', () => {
  it('creates a valid allowance', () => {
    const result = DownloadAllowance.create(0, 3);
    expect(result.isOk()).toBe(true);
  });

  it('rejects a non-positive max', () => {
    expect(DownloadAllowance.create(0, 0).isErr()).toBe(true);
  });

  it('rejects a count greater than max', () => {
    expect(DownloadAllowance.create(4, 3).isErr()).toBe(true);
  });

  it('hasRemaining is true below the cap and false at the cap', () => {
    const belowCap = DownloadAllowance.create(2, 3).unwrap();
    const atCap = DownloadAllowance.create(3, 3).unwrap();
    expect(belowCap.hasRemaining()).toBe(true);
    expect(atCap.hasRemaining()).toBe(false);
  });

  it('increment returns a new allowance one higher', () => {
    const allowance = DownloadAllowance.create(0, 3).unwrap();
    const result = allowance.increment();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().count).toBe(1);
    expect(allowance.count).toBe(0);
  });

  it('increment fails once the cap is reached', () => {
    const allowance = DownloadAllowance.create(3, 3).unwrap();
    expect(allowance.increment().isErr()).toBe(true);
  });
});
