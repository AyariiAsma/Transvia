import { apiClient } from './api.client';
import { LoginResponse, AuthTokens, OtpVerifyInput } from '@logistic/shared';
import * as SecureStore from 'expo-secure-store';

export const authApi = {
  login: async (data: { phone?: string; email?: string; password: string }): Promise<LoginResponse> => {
    const res = await apiClient.post('/auth/login', data);
    await saveTokens(res.data.data.tokens);
    return res.data.data;
  },

  register: async (data: Record<string, unknown>): Promise<LoginResponse> => {
    const res = await apiClient.post('/auth/register', data);
    await saveTokens(res.data.data.tokens);
    return res.data.data;
  },

  sendOtp: async (phone: string) => {
    const res = await apiClient.post('/auth/otp/send', { phone });
    return res.data;
  },

  verifyOtp: async (data: OtpVerifyInput): Promise<LoginResponse> => {
    const res = await apiClient.post('/auth/otp/verify', data);
    await saveTokens(res.data.data.tokens);
    return res.data.data;
  },

  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken });
    await clearTokens();
  },

  refreshTokens: async (refreshToken: string): Promise<AuthTokens> => {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    await saveTokens(res.data.data);
    return res.data.data;
  },

  getProfile: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },
};

async function saveTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync('access_token', tokens.accessToken);
  await SecureStore.setItemAsync('refresh_token', tokens.refreshToken);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}
