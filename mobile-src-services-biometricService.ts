// src/services/biometricService.ts
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics();

export interface BiometricCapability {
  available: boolean;
  biometryType: BiometryTypes | null;
  error?: string;
}

class BiometricService {
  /**
   * Check if biometric authentication is available on the device
   */
  async checkAvailability(): Promise<BiometricCapability> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      return {
        available,
        biometryType,
      };
    } catch (error: any) {
      console.error('Biometric availability check failed:', error);
      return {
        available: false,
        biometryType: null,
        error: error.message,
      };
    }
  }

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName(biometryType: BiometryTypes | null): string {
    switch (biometryType) {
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
      default:
        return 'Biometric';
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { available } = await this.checkAvailability();
      
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: promptMessage || 'Authenticate to continue',
        cancelButtonText: 'Cancel',
      });

      return { success };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  async enableBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if biometrics are available
      const { available, biometryType } = await this.checkAvailability();
      
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      // Prompt user to authenticate
      const typeName = this.getBiometricTypeName(biometryType);
      const { success, error } = await this.authenticate(
        `Enable ${typeName} for quick login`
      );

      if (!success) {
        return { success: false, error };
      }

      // Get current stored credentials
      const credentials = await Keychain.getGenericPassword();
      
      if (!credentials) {
        return {
          success: false,
          error: 'No credentials found',
        };
      }

      // Re-save credentials with biometric protection
      await Keychain.setGenericPassword(
        credentials.username,
        credentials.password,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        }
      );

      console.log('✅ Biometric authentication enabled');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to enable biometric:', error);
      return {
        success: false,
        error: error.message || 'Failed to enable biometric authentication',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current stored credentials
      const credentials = await Keychain.getGenericPassword();
      
      if (!credentials) {
        return { success: true }; // Already disabled
      }

      // Re-save credentials without biometric protection
      await Keychain.setGenericPassword(
        credentials.username,
        credentials.password,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );

      console.log('✅ Biometric authentication disabled');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to disable biometric:', error);
      return {
        success: false,
        error: error.message || 'Failed to disable biometric authentication',
      };
    }
  }

  /**
   * Authenticate and retrieve stored credentials
   */
  async authenticateAndGetCredentials(): Promise<{
    success: boolean;
    credentials?: { username: string; password: string };
    error?: string;
  }> {
    try {
      // Authenticate with biometrics
      const { success, error } = await this.authenticate('Login to FinPal');
      
      if (!success) {
        return { success: false, error };
      }

      // Retrieve stored credentials
      const credentials = await Keychain.getGenericPassword();
      
      if (!credentials) {
        return {
          success: false,
          error: 'No stored credentials found',
        };
      }

      return {
        success: true,
        credentials: {
          username: credentials.username,
          password: credentials.password,
        },
      };
    } catch (error: any) {
      console.error('Failed to authenticate and get credentials:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }
}

export default new BiometricService();
