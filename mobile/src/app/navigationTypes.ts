import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Health: undefined;
  Preview: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CampaignDetail: { id: string };
};
