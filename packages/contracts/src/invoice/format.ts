import { format } from 'date-fns';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export const formatRupiah = (amount: string | bigint): string => {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}Rp${grouped}`;
};

export const formatWibDate = (isoDate: string, pattern = 'd MMMM yyyy, HH:mm'): string => {
  const wibDate = new Date(new Date(isoDate).getTime() + WIB_OFFSET_MS);
  return `${format(wibDate, pattern)} WIB`;
};
