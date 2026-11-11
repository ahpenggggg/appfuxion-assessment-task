import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/components';
import { colors, font, space } from '@ui/theme';
import { NavigationService } from '@app/navigationService';
import { useLockStore } from '../store/lockStore';
import { unlockWithBiometrics } from '../biometrics';

export function SecurityGate({ children }: { children: ReactNode }) {
  const locked = useLockStore((s) => s.locked);
  const [covered, setCovered] = useState(AppState.currentState !== 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const now = Date.now();
      setCovered(state !== 'active');
      if (state === 'background') useLockStore.getState().onBackground(now);
      if (state === 'active') useLockStore.getState().onForeground(now);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => { NavigationService.setBlocked(locked); }, [locked]);

  return (
    <View style={{ flex: 1 }}>
      {/* Children stay mounted under a re-lock, so navigation state isn't lost; on cold start they mount only after unlock. */}
      <UnlockedOnce locked={locked}>{children}</UnlockedOnce>
      {locked && <LockScreen />}
      {covered && !locked && <View testID="privacy-cover" style={[StyleSheet.absoluteFill, s.cover]}><Text style={s.coverText}>Campaign Monitor</Text></View>}
    </View>
  );
}

function UnlockedOnce({ locked, children }: { locked: boolean; children: ReactNode }) {
  const everUnlocked = useRef(false);
  if (!locked) everUnlocked.current = true;
  return everUnlocked.current ? <>{children}</> : null;
}

function LockScreen() {
  const { t } = useTranslation('security');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    const r = await unlockWithBiometrics(t('prompt'));
    setBusy(false);
    if (r.ok) useLockStore.getState().unlock();
    else setMessage(r.reason === 'error' ? t('error', { message: r.message }) : t(r.reason));
  }, [t]);

  useEffect(() => { tryUnlock(); }, [tryUnlock]);

  return (
    <View testID="lock-screen" style={[StyleSheet.absoluteFill, s.lock]}>
      <View style={s.icon}><Text style={{ fontSize: 28 }}>🔒</Text></View>
      <Text style={s.title}>{t('title')}</Text>
      <Text style={s.body}>{t('body')}</Text>
      {message && <Text accessibilityRole="alert" style={s.message}>{message}</Text>}
      <View style={{ alignSelf: 'stretch', gap: space(2), marginTop: space(4) }}>
        <Button title={t('unlock')} onPress={tryUnlock} loading={busy} />
        {__DEV__ && <Button variant="secondary" title={t('devSkip')} onPress={() => useLockStore.getState().unlock()} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  lock: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space(8) },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space(4) },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { fontSize: font.md, color: colors.muted, textAlign: 'center', marginTop: space(2) },
  message: { fontSize: font.sm, color: colors.critical, textAlign: 'center', marginTop: space(3) },
  cover: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  coverText: { color: '#fff', fontSize: font.lg, fontWeight: '700' },
});
