import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { lineRules, type DisplayState, type Platform } from '../lib/layout';
import type { Segment } from '../lib/template';

export interface NotificationPreviewProps {
  platform: Platform;
  state: DisplayState;
  width: number;
  appName: string;
  title: Segment[];
  body: Segment[];
  imageUrl?: string;
  timeLabel?: string;
}

function Rich({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) => (
        <Text key={i} style={s.missing ? st.missing : undefined}>{s.text}</Text>
      ))}
    </>
  );
}

export function NotificationPreview({ platform, state, width, appName, title, body, imageUrl, timeLabel = 'now' }: NotificationPreviewProps) {
  const hasImage = !!imageUrl;
  const rules = lineRules(platform, state, hasImage);
  const image = hasImage ? { uri: imageUrl } : undefined;

  if (platform === 'ios') {
    return (
      <View testID="preview-ios" style={[st.screen, { width }, st.iosScreen]}>
        <View style={st.iosCard}>
          {rules.showLargeImage && image && <Image source={image} style={st.iosHero} resizeMode="cover" accessibilityLabel="Notification image" />}
          <View style={st.iosRow}>
            <View style={st.iosIcon}><Text style={st.iconText}>{appName.slice(0, 1)}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={st.iosHeader}>
                <Text style={st.iosTitle} numberOfLines={rules.titleLines}><Rich segments={title} /></Text>
                <Text style={st.iosTime}>{timeLabel}</Text>
              </View>
              <Text style={st.iosBody} numberOfLines={rules.bodyLines}><Rich segments={body} /></Text>
            </View>
            {rules.showThumbnail && image && <Image source={image} style={st.thumb} accessibilityLabel="Notification image" />}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View testID="preview-android" style={[st.screen, { width }, st.androidScreen]}>
      <View style={st.androidCard}>
        <View style={st.androidHeader}>
          <View style={st.androidIcon}><Text style={[st.iconText, { fontSize: 9 }]}>{appName.slice(0, 1)}</Text></View>
          <Text style={st.androidApp}>{appName} · {timeLabel}</Text>
          <Text style={st.chevron}>{state === 'collapsed' ? '⌄' : '⌃'}</Text>
        </View>
        <View style={st.androidRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.androidTitle} numberOfLines={rules.titleLines}><Rich segments={title} /></Text>
            <Text style={st.androidBody} numberOfLines={rules.bodyLines}><Rich segments={body} /></Text>
          </View>
          {rules.showThumbnail && image && <Image source={image} style={st.thumb} accessibilityLabel="Notification image" />}
        </View>
        {rules.showLargeImage && image && <Image source={image} style={st.androidHero} resizeMode="cover" accessibilityLabel="Notification image" />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { paddingVertical: 14, borderRadius: 18 },
  iosScreen: { paddingHorizontal: 16, backgroundColor: '#4B5E8C' },
  androidScreen: { paddingHorizontal: 12, backgroundColor: '#1F2937' },
  iconText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  missing: { backgroundColor: '#FDE68A', color: '#92400E' },
  thumb: { width: 48, height: 48, borderRadius: 8, marginLeft: 10, backgroundColor: '#CBD5E1' },

  iosCard: { backgroundColor: 'rgba(245,245,247,0.95)', borderRadius: 20, overflow: 'hidden' },
  iosHero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#CBD5E1' },
  iosRow: { flexDirection: 'row', padding: 14, gap: 10, alignItems: 'flex-start' },
  iosIcon: { width: 38, height: 38, borderRadius: 9, backgroundColor: '#2C57D6', alignItems: 'center', justifyContent: 'center' },
  iosHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  iosTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#000' },
  iosTime: { fontSize: 13, color: '#6B7280' },
  iosBody: { fontSize: 14, color: '#111827', marginTop: 1, lineHeight: 19 },

  androidCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  androidHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  androidIcon: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2C57D6', alignItems: 'center', justifyContent: 'center' },
  androidApp: { flex: 1, fontSize: 12, color: '#4B5563' },
  chevron: { fontSize: 14, color: '#6B7280' },
  androidRow: { flexDirection: 'row', alignItems: 'flex-start' },
  androidTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  androidBody: { fontSize: 14, color: '#4B5563', marginTop: 2, lineHeight: 19 },
  androidHero: { width: '100%', aspectRatio: 2, borderRadius: 12, marginTop: 10, backgroundColor: '#CBD5E1' },
});
