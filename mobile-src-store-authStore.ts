// src/store/authStore.ts
import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { authAPI } from '../api/endpoints/auth';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  isVerified: boolean;
  aiConsent: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const authStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  biometricEnabled: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: (token) => set({ token }),
  
  setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),

  login: async (email, password) => {
    try {
      set({ isLoading: true });
      
      const response = await authAPI.login({ email, password });
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log('✅ Login successful');
    } catch (error: any) {
      set({ isLoading: false });
      console.error('❌ Login failed:', error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true });
      
      const response = await authAPI.register(data);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log('✅ Registration successful');
    } catch (error: any) {
      set({ isLoading: false });
      console.error('❌ Registration failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
      
      // Clear stored tokens
      await Keychain.resetGenericPassword();
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        biometricEnabled: false,
      });
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear local state even if API call fails
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      // Check if tokens exist
      const credentials = await Keychain.getGenericPassword();
      
      if (!credentials) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const authData = JSON.parse(credentials.password);
      
      // Check if token is expired
      if (authData.expiresAt < Date.now()) {
        // Try to refresh token
        await get().refreshToken();
        return;
      }

      // Get current user data
      const user = await authAPI.getCurrentUser();
      
      set({
        user: user.user,
        token: authData.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log('✅ Auth check successful');
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      await get().logout();
    }
  },

  refreshToken: async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      
      if (!credentials) {
        throw new Error('No credentials found');
      }

      const authData = JSON.parse(credentials.password);
      
      const response = await authAPI.refreshToken(authData.refreshToken);
      
      set({
        token: response.accessToken,
        isLoading: false,
      });
      
      console.log('✅ Token refreshed');
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await get().logout();
    }
  },
}));
