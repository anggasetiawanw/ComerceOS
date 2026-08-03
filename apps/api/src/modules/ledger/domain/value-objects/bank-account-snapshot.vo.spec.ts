import { BankAccountSnapshot } from './bank-account-snapshot.vo';

describe('BankAccountSnapshot', () => {
  it('resolves the display bank name from a known code', () => {
    const result = BankAccountSnapshot.create({
      bankCode: 'bca',
      accountNumber: '1234567890',
      accountHolderName: 'Seller One',
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().bankName).toBe('BCA');
  });

  it('normalizes the bank code to lowercase and trims whitespace', () => {
    const result = BankAccountSnapshot.create({
      bankCode: ' BCA ',
      accountNumber: '1234567890',
      accountHolderName: 'Seller One',
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().bankCode).toBe('bca');
  });

  it('rejects an unknown bank code', () => {
    const result = BankAccountSnapshot.create({
      bankCode: 'not-a-real-bank',
      accountNumber: '1234567890',
      accountHolderName: 'Seller One',
    });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('unknown_bank_code');
  });

  it('rejects a non-numeric account number', () => {
    const result = BankAccountSnapshot.create({
      bankCode: 'bca',
      accountNumber: '12ab5678',
      accountHolderName: 'Seller One',
    });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('invalid_account_number');
  });

  it('rejects an account number shorter than 4 digits', () => {
    const result = BankAccountSnapshot.create({
      bankCode: 'bca',
      accountNumber: '123',
      accountHolderName: 'Seller One',
    });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('invalid_account_number');
  });

  it('rejects a holder name that is too short', () => {
    const result = BankAccountSnapshot.create({
      bankCode: 'bca',
      accountNumber: '1234567890',
      accountHolderName: 'A',
    });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('invalid_holder_name');
  });
});
