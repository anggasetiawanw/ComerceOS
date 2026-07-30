import { useState } from 'react';

export const useClipboard = (resetAfterMs = 2000) => {
  const [copied, setCopied] = useState(false);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), resetAfterMs);
  };

  return { copied, copy };
};
