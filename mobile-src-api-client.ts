// src/api/client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Config from 'react-native-config';
import * as Keychain from 'react-native-keychain';
import { authStore } from '../store/authStore';
import DeviceInfo from 'react-native-device-info';

const API_URL = Config.API_URL || 'http://localhost:5000/api';
const TIMEOUT = 30000;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and device info
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from secure storage
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        const { password } = credentials;
        const authData = JSON.parse(password);
        
        // Add auth header
        if (authData.accessToken) {
          config.headers.Authorization = `Bearer ${authData.accessToken}`;
        }
      }

      // Add device info headers
      config.headers['X-Device-ID'] = await DeviceInfo.getUniqueId();
      config.headers['X-App-Version'] = DeviceInfo.getVersion();
      config.headers['X-Platform'] = DeviceInfo.getSystemName();
      config.headers['X-OS-Version'] = DeviceInfo.getSystemVersion();

      // Add language preference
      const language = await DeviceInfo.getDeviceLocale();
      config.headers['Accept-Language'] = language;

      if (__DEV__) {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      throw {
        message: 'Network error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
      };
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          const authData = JSON.parse(credentials.password);
          
          if (authData.refreshToken) {
            // Call refresh token endpoint
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken: authData.refreshToken,
            });

            const { accessToken, refreshToken } = response.data;

            // Store new tokens
            await Keychain.setGenericPassword(
              'auth',
              JSON.stringify({
                accessToken,
                refreshToken,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
              }),
              {
                accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
              }
            );

            // Update auth store
            authStore.getState().setToken(accessToken);

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        console.error('Token refresh failed:', refreshError);
        authStore.getState().logout();
        throw {
          message: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED',
        };
      }
    }

    // Handle 403 Forbidden - Email not verified
    if (error.response.status === 403) {
      const errorData = error.response.data as any;
      if (errorData.code === 'EMAIL_NOT_VERIFIED') {
        throw {
          message: errorData.message || 'Please verify your email to continue.',
          code: 'EMAIL_NOT_VERIFIED',
        };
      }
    }

    // Handle 429 Too Many Requests
    if (error.response.status === 429) {
      throw {
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // Handle 500+ Server Errors
    if (error.response.status >= 500) {
      throw {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: error.response.status,
      };
    }

    // Parse and throw API error
    const apiError = error.response.data as any;
    throw {
      message: apiError.message || 'An error occurred',
      code: apiError.code || 'UNKNOWN_ERROR',
      status: error.response.status,
      errors: apiError.errors,
    };
  }
);

// Retry logic for network errors
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on network errors or 5xx errors
      if (error.code === 'NETWORK_ERROR' || (error.status && error.status >= 500)) {
        if (i < maxRetries - 1) {
          // Exponential backoff
          const waitTime = delay * Math.pow(2, i);
          console.log(`Retrying request in ${waitTime}ms (attempt ${i + 2}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Don't retry other errors
      throw error;
    }
  }

  throw lastError;
};

export default apiClient;
