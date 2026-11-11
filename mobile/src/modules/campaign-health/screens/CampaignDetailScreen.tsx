import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '@app/navigationTypes';
import { Badge, Banner, Card, EmptyState, ProgressBar, SectionLabel } from '@ui/components';
import { colors, font, space } from '@ui/theme';
import { num, pct } from '@core/time';
import { config } from '@core/config';
import { useCampaignDetailViewModel } from '../viewmodels/useCampaignDetailViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'CampaignDetail'>;

export function CampaignDetailScreen({ route }: Props) {
  const { t } = useTranslation('campaignHealth');
  const vm = useCampaignDetailViewModel(route.params.id);

  if (vm.notFound) return <EmptyState title={t('detail.notFound')} />;
  if (!vm.campaign || !vm.health) {
    return vm.error ? <EmptyState title={vm.error} /> : <View style={s.center}><ActivityIndicator color={colors.brand} /></View>;
  }
  const c = vm.campaign;
  const failing = vm.health.state === 'HIGH_FAILURE';
  const attempted = c.sentCount + c.failedCount;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {vm.isOffline && <Banner tone="warning" text={t('detail.offline')} />}
      {vm.error && !vm.isOffline && <Banner tone="critical" text={vm.error} />}

      <View>
        <Text style={s.title}>{c.name}</Text>
        <Text style={s.meta}>{c.id} · {c.tenantId} · {c.channel} · {c.status}</Text>
        <View style={{ marginTop: space(2) }}>
          <Badge label={failing ? t('highFailure') : t('healthy')} tone={failing ? 'critical' : 'healthy'} />
        </View>
      </View>

      <Card>
        <Text style={[s.big, failing && { color: colors.critical }]}>{vm.health.warmingUp ? '—' : pct(vm.health.failureRate)}</Text>
        <Text style={s.label}>{t('failureRate')}</Text>
        {vm.health.warmingUp && <Text style={s.hint}>{t('detail.minSample', { n: config.health.minSample })}</Text>}
      </Card>

      <View style={s.grid}>
        <Tile label={t('detail.recipients')} value={num(c.totalRecipients)} />
        <Tile label={t('sent')} value={num(c.sentCount)} color={colors.healthy} />
        <Tile label={t('failed')} value={num(c.failedCount)} color={failing ? colors.critical : undefined} />
        <Tile label={t('pending')} value={num(c.pendingCount)} />
        <Tile label={t('detail.retryQueue')} value={num(c.retryQueueSize)} />
      </View>

      <Card>
        <SectionLabel>{t('detail.progress')}</SectionLabel>
        <ProgressBar value={c.totalRecipients ? attempted / c.totalRecipients : 0} color={failing ? colors.critical : colors.brand} />
        <Text style={[s.hint, { marginTop: space(2) }]}>{num(attempted)} / {num(c.totalRecipients)}</Text>
      </Card>

      <Card>
        <SectionLabel>{t('detail.template')}</SectionLabel>
        <Text style={s.template}>{c.messageTemplate}</Text>
      </Card>
    </ScrollView>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={s.tile}>
      <Text style={[s.tileValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(3), paddingBottom: space(10) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  big: { fontSize: 36, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  label: { fontSize: font.xs, color: colors.muted },
  hint: { fontSize: font.xs, color: colors.faint, marginTop: space(1) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: { flexBasis: '47%', flexGrow: 1, padding: space(3) },
  tileValue: { fontSize: font.lg, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  template: { fontFamily: 'Courier', fontSize: font.sm, color: colors.text },
});
