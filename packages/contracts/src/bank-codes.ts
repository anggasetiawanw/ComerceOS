// Bank codes for payout destinations (.docs/06-database-roadmap.md §2.4,
// Sprint 7). Shared between the API's BankCode value object (validation)
// and the web /rekening form (the dropdown), so both sides of the network
// boundary agree on the same frozen list without duplicating it.
export interface BankCodeEntry {
  code: string;
  name: string;
}

export const BANK_CODES: readonly BankCodeEntry[] = [
  { code: 'bca', name: 'BCA' },
  { code: 'bni', name: 'BNI' },
  { code: 'bri', name: 'BRI' },
  { code: 'mandiri', name: 'Mandiri' },
  { code: 'btn', name: 'BTN' },
  { code: 'cimb', name: 'CIMB Niaga' },
  { code: 'permata', name: 'Permata Bank' },
  { code: 'danamon', name: 'Danamon' },
  { code: 'maybank', name: 'Maybank Indonesia' },
  { code: 'ocbc', name: 'OCBC NISP' },
  { code: 'panin', name: 'Panin Bank' },
  { code: 'bsi', name: 'Bank Syariah Indonesia' },
  { code: 'mega', name: 'Bank Mega' },
  { code: 'jago', name: 'Bank Jago' },
  { code: 'seabank', name: 'SeaBank' },
] as const;

export const BANK_CODE_VALUES: readonly string[] = BANK_CODES.map((entry) => entry.code);

export const isKnownBankCode = (code: string): boolean => BANK_CODE_VALUES.includes(code);

export const bankNameForCode = (code: string): string | undefined =>
  BANK_CODES.find((entry) => entry.code === code)?.name;
