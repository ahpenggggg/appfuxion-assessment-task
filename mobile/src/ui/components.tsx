import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, font, radius, space } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type Tone = 'healthy' | 'critical' | 'neutral' | 'brand' | 'warning';
const toneColors: Record<Tone, { fg: string; bg: string }> = {
  healthy: { fg: colors.healthy, bg: colors.healthySoft },
  critical: { fg: colors.critical, bg: colors.criticalSoft },
  neutral: { fg: colors.muted, bg: colors.neutralSoft },
  brand: { fg: colors.brand, bg: colors.brandSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
};

export function Badge({ label, tone, testID }: { label: string; tone: Tone; testID?: string }) {
  const c = toneColors[tone];
  return (
    <View testID={testID} style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.brand }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Banner({ text, tone, testID }: { text: string; tone: Tone; testID?: string }) {
  const c = toneColors[tone];
  return (
    <View testID={testID} accessibilityRole="alert" style={[s.banner, { backgroundColor: c.bg }]}>
      <Text style={[s.bannerText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; loading?: boolean }) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.button, primary ? s.buttonPrimary : s.buttonSecondary, (pressed || disabled) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color={primary ? '#fff' : colors.brand} /> : <Text style={[s.buttonText, { color: primary ? '#fff' : colors.text }]}>{title}</Text>}
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => onChange(o.value)} style={[s.segment, active && s.segmentActive]}>
            <Text style={[s.segmentText, active && { color: colors.text, fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      {body ? <Text style={s.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space(3) }}>{action}</View> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={s.section}>{children.toUpperCase()}</Text>;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: space(4) },
  badge: { borderRadius: 999, paddingHorizontal: space(2), paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: font.xs, fontWeight: '700', letterSpacing: 0.3 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.neutralSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  banner: { borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2) },
  bannerText: { fontSize: font.sm, fontWeight: '500' },
  button: { borderRadius: radius.md, paddingVertical: space(3), paddingHorizontal: space(4), alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: font.md, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: colors.neutralSoft, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, paddingVertical: space(2), alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: font.sm, color: colors.muted },
  empty: { alignItems: 'center', padding: space(8) },
  emptyTitle: { fontSize: font.lg, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: font.sm, color: colors.muted, marginTop: space(1), textAlign: 'center' },
  section: { fontSize: font.xs, fontWeight: '600', color: colors.muted, letterSpacing: 0.6, marginBottom: space(2) },
});
