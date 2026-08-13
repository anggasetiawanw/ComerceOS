'use client';

import { useEffect } from 'react';

const GlobalError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            minHeight: '100vh',
            padding: '4rem 2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Terjadi kesalahan</h1>
          <p style={{ color: '#71717a' }}>Sesuatu tidak berjalan sebagaimana mestinya.</p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #d4d4d8',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
