const RUPIAH_FORMATTER = new Intl.NumberFormat('id-ID');

export const formatRupiah = (value: string): string => {
  if (!/^\d+$/.test(value)) return value;
  return `Rp${RUPIAH_FORMATTER.format(BigInt(value))}`;
};

export const parseRupiahInput = (raw: string): string => raw.replace(/\D/g, '');
