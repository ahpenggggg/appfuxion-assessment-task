import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CampaignDetailScreen, CampaignHealthScreen } from '@modules/campaign-health';
import { PushPreviewScreen } from '@modules/push-preview';
import { colors } from '@ui/theme';
import { NavigationService, navigationRef } from './navigationService';
import type { RootStackParamList, TabParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand }}>
      <Tab.Screen name="Health" component={CampaignHealthScreen} options={{ title: 'Campaigns', tabBarIcon: icon('◉') }} />
      <Tab.Screen name="Preview" component={PushPreviewScreen} options={{ title: 'Push preview', tabBarIcon: icon('▤') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={theme} onReady={NavigationService.onReady}>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{ title: 'Campaign' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
