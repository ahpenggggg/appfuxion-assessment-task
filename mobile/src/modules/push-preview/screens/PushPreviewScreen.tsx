import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Banner, Card, Segmented, SectionLabel } from '@ui/components';
import { colors, font, radius, space } from '@ui/theme';
import { NotificationPreview } from '../components/NotificationPreview';
import { ScaledToFit } from '../components/ScaledToFit';
import { WIDTH_PRESETS, truncationReport, type DisplayState, type Platform } from '../lib/layout';
import { parseTemplate, renderTemplate } from '../lib/template';

const SAMPLE_IMAGE = 'https://picsum.photos/seed/campaign/800/450';

export function PushPreviewScreen() {
  const { t } = useTranslation('pushPreview');
  const [appName, setAppName] = useState('Notify');
  const [title, setTitle] = useState('Flash sale ends tonight, {{firstName}}!');
  const [body, setBody] = useState('Hi {{firstName}}, take 50% off everything in the app until midnight. Use code FLASH50 at checkout — tap to start shopping before it ends.');
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGE);
  const [firstName, setFirstName] = useState('Aisyah');
  const [platform, setPlatform] = useState<Platform>('ios');
  const [state, setState] = useState<DisplayState>('collapsed');
  const [widthId, setWidthId] = useState('iphone');
  const [compareAll, setCompareAll] = useState(false);

  const data = useMemo(() => ({ firstName }), [firstName]);
  const titleSeg = useMemo(() => parseTemplate(title, data), [title, data]);
  const bodySeg = useMemo(() => parseTemplate(body, data), [body, data]);
  const rendered = useMemo(() => ({ title: renderTemplate(title, data), body: renderTemplate(body, data) }), [title, body, data]);
  const missing = [...new Set([...rendered.title.missing, ...rendered.body.missing])];
  const preset = WIDTH_PRESETS.find((w) => w.id === widthId) ?? WIDTH_PRESETS[2];
  const report = truncationReport(platform, state, preset.width, rendered.title.text, rendered.body.text, !!imageUrl);

  const previewFor = (width: number) => (
    <NotificationPreview platform={platform} state={state} width={width} appName={appName || 'App'} title={titleSeg} body={bodySeg} imageUrl={imageUrl || undefined} />
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={s.title}>{t('title')}</Text>
          <Text style={s.subtitle}>{t('subtitle')}</Text>
        </View>

        <Card style={{ gap: space(3) }}>
          <Segmented label={t('platform')} value={platform} onChange={setPlatform} options={[{ value: 'ios', label: 'iOS' }, { value: 'android', label: 'Android' }]} />
          <Segmented label={t('state')} value={state} onChange={setState} options={[{ value: 'collapsed', label: t('collapsed') }, { value: 'expanded', label: t('expanded') }]} />
          <View>
            <SectionLabel>{t('width')}</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
              {WIDTH_PRESETS.map((w) => (
                <Pressable key={w.id} accessibilityRole="button" accessibilityState={{ selected: w.id === widthId && !compareAll }}
                  onPress={() => { setWidthId(w.id); setCompareAll(false); }}
                  style={[s.chip, w.id === widthId && !compareAll && s.chipActive]}>
                  <Text style={[s.chipText, w.id === widthId && !compareAll && s.chipTextActive]}>{w.label} · {w.width}</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" onPress={() => setCompareAll((v) => !v)} style={[s.chip, compareAll && s.chipActive]}>
                <Text style={[s.chipText, compareAll && s.chipTextActive]}>{t('allWidths')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Card>

        <View style={{ gap: space(2) }}>
          {missing.length > 0 && <Banner tone="warning" text={t('missing', { names: missing.join(', ') })} />}
          {!compareAll && (report.titleCut || report.bodyCut
            ? <Banner tone="warning" text={[report.titleCut ? t('titleCut') : '', report.bodyCut ? t('bodyCut', { needed: report.bodyLinesNeeded, shown: report.bodyLinesShown }) : ''].filter(Boolean).join(' ')} />
            : <Banner tone="healthy" text={t('allGood')} />)}
        </View>

        {compareAll ? (
          <View style={{ gap: space(4) }}>
            {WIDTH_PRESETS.map((w) => (
              <View key={w.id}>
                <Text style={s.widthLabel}>{w.label} · {w.width} pt</Text>
                <ScaledToFit contentWidth={w.width}>{previewFor(w.width)}</ScaledToFit>
              </View>
            ))}
          </View>
        ) : (
          <ScaledToFit contentWidth={preset.width}>{previewFor(preset.width)}</ScaledToFit>
        )}

        <Card style={{ gap: space(3) }}>
          <Input label={t('fields.appName')} value={appName} onChange={setAppName} />
          <Input label={t('fields.title')} value={title} onChange={setTitle} counter={t('chars', { count: rendered.title.text.length })} />
          <Input label={t('fields.body')} value={body} onChange={setBody} multiline counter={t('chars', { count: rendered.body.text.length })} />
          <Input label={t('fields.image')} value={imageUrl} onChange={setImageUrl} keyboardType="url" />
          <Input label={t('fields.sample', { firstName: '{{firstName}}', interpolation: { escapeValue: false } })} value={firstName} onChange={setFirstName} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({ label, value, onChange, multiline, counter, keyboardType }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; counter?: string; keyboardType?: 'url' }) {
  return (
    <View>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} autoCapitalize="none" autoCorrect={false}
        keyboardType={keyboardType ?? 'default'} style={[s.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]} placeholderTextColor={colors.faint} />
      {counter ? <Text style={s.counter}>{counter}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(4), paddingBottom: space(12) },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  chip: { paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: 999, backgroundColor: colors.neutralSoft },
  chipActive: { backgroundColor: colors.brand },
  chipText: { fontSize: font.sm, color: colors.muted },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  widthLabel: { fontSize: font.xs, color: colors.muted, marginBottom: space(1) },
  inputLabel: { fontSize: font.sm, fontWeight: '500', color: colors.text, marginBottom: space(1) },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2), fontSize: font.md, color: colors.text, backgroundColor: '#fff' },
  counter: { fontSize: font.xs, color: colors.faint, textAlign: 'right', marginTop: 2 },
});
