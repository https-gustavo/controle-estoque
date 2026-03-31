import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan, {
  minLength = 6,
  maxInterKeyDelayMs = 50
} = {}) {
  const bufRef = useRef('');
  const firstTsRef = useRef(0);
  const lastTsRef = useRef(0);

  useEffect(() => {
    const reset = () => {
      bufRef.current = '';
      firstTsRef.current = 0;
      lastTsRef.current = 0;
    };

    const isPrintableKey = (e) => {
      if (!e.key) return false;
      if (e.key.length !== 1) return false;
      if (e.ctrlKey || e.altKey || e.metaKey) return false;
      return true;
    };

    const onKeyDown = (e) => {
      const now = performance.now();

      if (e.key === 'Escape') {
        reset();
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        const code = String(bufRef.current || '').trim();
        const len = code.length;
        if (len >= minLength) {
          const first = firstTsRef.current;
          const last = lastTsRef.current || now;
          const avg = len <= 1 ? 0 : ((last - first) / (len - 1));
          if (avg <= maxInterKeyDelayMs) {
            try { onScan?.(code, e); } finally { reset(); }
            return;
          }
        }
        reset();
        return;
      }

      if (!isPrintableKey(e)) return;

      const prev = lastTsRef.current;
      if (prev && (now - prev) > (maxInterKeyDelayMs * 3)) {
        reset();
      }

      if (!firstTsRef.current) firstTsRef.current = now;
      lastTsRef.current = now;
      bufRef.current += e.key;
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onScan, minLength, maxInterKeyDelayMs]);
}

