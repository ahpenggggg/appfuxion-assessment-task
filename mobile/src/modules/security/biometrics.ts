import ReactNativeBiometrics from 'react-native-biometrics';
import { logger } from '@core/logger';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'error'; message?: string };

export async function unlockWithBiometrics(promptMessage: string): Promise<UnlockResult> {
  try {
    const sensor = await rnBiometrics.isSensorAvailable();
    if (!sensor.available) {
      // No biometrics enrolled: the prompt can still use the device passcode on most devices.
      logger.info('auth.biometrics_unavailable', { error: sensor.error ?? 'none' });
    }
    const { success, error } = await rnBiometrics.simplePrompt({ promptMessage, cancelButtonText: 'Cancel' });
    if (success) return { ok: true };
    return { ok: false, reason: error ? 'error' : 'cancelled', message: error };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Thrown when neither biometrics nor a device passcode is set up.
    return { ok: false, reason: 'unavailable', message };
  }
}
