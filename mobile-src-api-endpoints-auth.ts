// src/api/endpoints/auth.ts
import apiClient from '../client';
import * as Keychain from 'react-native-keychain';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  aiConsent: boolean;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    avatar?: string;
    isVerified: boolean;
    aiConsent: boolean;
  };
}

export const authAPI = {
  // Register new user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    
    // Store tokens securely
    await storeAuthTokens(response.data.token, response.data.refreshToken);
    
    return response.data;
  },

  // Login with email and password
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Store tokens securely
    await storeAuthTokens(response.data.token, response.data.refreshToken);
    
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    
    // Clear stored tokens
    await Keychain.resetGenericPassword();
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    
    // Update stored tokens
    await storeAuthTokens(response.data.accessToken, response.data.refreshToken);
    
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/reset-password', { token, password });
    return response.data;
  },

  // Verify email
  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get('/profile');
    return response.data;
  },
};

// Helper function to store auth tokens securely
const storeAuthTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  await Keychain.setGenericPassword(
    'auth',
    JSON.stringify({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    }),
    {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    }
  );
};

// Helper function to get stored tokens
export const getStoredTokens = async (): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      return JSON.parse(credentials.password);
    }
    return null;
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
};
