'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string },
          ) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const loadGsiScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Google Identity Services'));
    document.head.appendChild(script);
  });
};

export const useGoogleIdToken = (
  buttonRef: RefObject<HTMLDivElement | null>,
  onToken: (idToken: string) => void,
) => {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onTokenRef.current(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
        });
        setReady(true);
      })
      .catch(() => setLoadError(true));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return { ready, loadError, configured: Boolean(clientId) };
};
