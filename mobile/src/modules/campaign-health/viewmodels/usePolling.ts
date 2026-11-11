import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function useFocusedPolling(tick: () => Promise<void>, delayFor: () => number) {
  const tickRef = useRef(tick);
  const delayRef = useRef(delayFor);
  useEffect(() => { tickRef.current = tick; delayRef.current = delayFor; });

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let active = true;
      const loop = async () => {
        if (!active) return;
        await tickRef.current();
        if (active) timer = setTimeout(loop, delayRef.current());
      };
      const start = () => { clearTimeout(timer); active = true; loop(); };
      const stop = () => { active = false; clearTimeout(timer); };

      start();
      const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
      return () => { stop(); sub.remove(); };
    }, []),
  );
}
