import React, { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { colors, font } from '@ui/theme';

export function ScaledToFit({ contentWidth, children }: { contentWidth: number; children: ReactNode }) {
  const [available, setAvailable] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scale = available ? Math.min(1, available / contentWidth) : 1;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setAvailable(e.nativeEvent.layout.width)}>
      <View style={{ height: contentHeight ? contentHeight * scale : undefined, overflow: 'hidden' }}>
        <View
          onLayout={(e: LayoutChangeEvent) => setContentHeight(e.nativeEvent.layout.height)}
          style={[s.content, { width: contentWidth, transform: [{ scale }] }]}
        >
          {children}
        </View>
      </View>
      {scale < 1 && <Text style={s.note}>Shown at {Math.round(scale * 100)}% to fit this screen</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  content: { transformOrigin: 'top left' },
  note: { fontSize: font.xs, color: colors.faint, marginTop: 4 },
});
