import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Banner, EmptyState } from '@ui/components';
import { colors, font, space } from '@ui/theme';
import { CampaignRow } from '../components/CampaignRow';
import { useCampaignHealthViewModel, type CampaignRowModel } from '../viewmodels/useCampaignHealthViewModel';

export function CampaignHealthScreen() {
  const { t } = useTranslation('campaignHealth');
  const vm = useCampaignHealthViewModel();
  const renderItem = useCallback(({ item }: { item: CampaignRowModel }) => <CampaignRow row={item} onPress={vm.onOpen} />, [vm.onOpen]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{t('title')}</Text>
        <Text style={s.subtitle}>
          {t('subtitle', { total: vm.counts.total, failing: vm.counts.failing })} · {vm.lastSynced ? t('lastSynced', { ago: vm.lastSynced }) : t('neverSynced')}
        </Text>
        {vm.banner && <View style={{ marginTop: space(3) }}><Banner testID="health-banner" tone={vm.banner.tone} text={vm.banner.text} /></View>}
      </View>

      {vm.loading ? (
        <View style={s.center}><ActivityIndicator color={colors.brand} /><Text style={s.loading}>{t('loading')}</Text></View>
      ) : (
        <FlatList
          data={vm.rows}
          keyExtractor={(r) => r.campaign.id}
          renderItem={renderItem}
          contentContainerStyle={vm.hasData ? s.list : s.emptyList}
          ItemSeparatorComponent={Separator}
          refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={vm.onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={<EmptyState title={t('emptyTitle')} body={t('emptyBody')} />}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}

const Separator = () => <View style={{ height: space(3) }} />;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space(4), paddingTop: space(3), paddingBottom: space(3) },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  list: { paddingHorizontal: space(4), paddingBottom: space(8) },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(2) },
  loading: { color: colors.muted, fontSize: font.sm },
});
