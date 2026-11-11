import { useEffect, useRef } from 'react';

export function usePolling(fn: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      timer = setInterval(() => saved.current(), intervalMs);
    };
    const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { saved.current(); start(); }
    };
    saved.current();
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [intervalMs, enabled]);
}
