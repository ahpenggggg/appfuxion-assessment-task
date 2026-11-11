import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './navigationTypes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Pending = { name: keyof RootStackParamList; params?: object };
let pending: Pending[] = [];
let ready = false;

export const NavigationService = {
  navigate<K extends keyof RootStackParamList>(name: K, params?: RootStackParamList[K]) {
    if (ready && navigationRef.isReady()) {
      // @ts-expect-error — params type depends on the route name
      navigationRef.navigate(name, params);
    } else {
      pending.push({ name, params: params as object | undefined });
    }
  },
  onReady() {
    ready = true;
    const queue = pending;
    pending = [];
    queue.forEach((p) => NavigationService.navigate(p.name, p.params as never));
  },
  setBlocked(blocked: boolean) {
    ready = !blocked && navigationRef.isReady();
    if (ready) NavigationService.onReady();
  },
};
