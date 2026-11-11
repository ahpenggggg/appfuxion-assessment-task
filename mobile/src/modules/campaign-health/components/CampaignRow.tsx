import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, ProgressBar } from '@ui/components';
import { colors, font, radius, space } from '@ui/theme';
import { num, pct } from '@core/time';
import type { CampaignRowModel } from '../viewmodels/useCampaignHealthViewModel';

function CampaignRowView({ row, onPress }: { row: CampaignRowModel; onPress: (id: string) => void }) {
  const { t } = useTranslation('campaignHealth');
  const { campaign: c, health } = row;
  const failing = health.state === 'HIGH_FAILURE';
  const scheduled = c.status === 'SCHEDULED';

  return (
    <Pressable
      testID={`campaign-row-${c.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${failing ? t('highFailure') : t('healthy')}, ${pct(health.failureRate)} failure rate`}
      onPress={() => onPress(c.id)}
      style={({ pressed }) => [s.row, failing && s.rowFailing, pressed && { opacity: 0.8 }]}
    >
      <View style={[s.stripe, { backgroundColor: failing ? colors.critical : scheduled ? colors.border : colors.healthy }]} />
      <View style={s.body}>
        <View style={s.top}>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{c.name}</Text>
            <Text style={s.meta} numberOfLines={1}>{c.channel} · {c.tenantId} · {c.id}</Text>
          </View>
          {scheduled
            ? <Badge label={t('scheduled').toUpperCase()} tone="neutral" />
            : <Badge testID={`health-${c.id}`} label={failing ? t('highFailure') : t('healthy')} tone={failing ? 'critical' : 'healthy'} />}
        </View>

        <View style={s.stats}>
          <Stat label={t('sent')} value={num(c.sentCount)} />
          <Stat label={t('failed')} value={num(c.failedCount)} color={failing ? colors.critical : undefined} />
          <Stat label={t('pending')} value={num(c.pendingCount)} />
          <Stat label={t('failureRate')} value={health.warmingUp ? '—' : pct(health.failureRate)} color={failing ? colors.critical : undefined} />
        </View>
        <ProgressBar value={row.progress} color={failing ? colors.critical : colors.brand} />
        {health.warmingUp && !scheduled && <Text style={s.hint}>{t('warmingUp')}</Text>}
      </View>
    </Pressable>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export const CampaignRow = memo(CampaignRowView, (a, b) => a.row.campaign.updatedAt === b.row.campaign.updatedAt && a.row.campaign.id === b.row.campaign.id);

const s = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rowFailing: { borderColor: colors.critical },
  stripe: { width: 4 },
  body: { flex: 1, padding: space(4), gap: space(3) },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space(2) },
  name: { fontSize: font.md, fontWeight: '600', color: colors.text },
  meta: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'flex-start' },
  statValue: { fontSize: font.md, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: font.xs, color: colors.muted },
  hint: { fontSize: font.xs, color: colors.faint },
});
