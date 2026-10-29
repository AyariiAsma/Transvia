import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Driver, AuthTokens } from '@logistic/shared';
import { authApi } from '@/services/auth.service';

interface AuthState {
  user: (User & { driver?: Driver | null }) | null;
  tokens: AuthTokens | null;
  isLoading: boolean;

  // Actions
  login: (emailOrPhone: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateTokens: (tokens: AuthTokens) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isLoading: true,

      initialize: async () => {
        // L'état est rehydraté automatiquement par persist
        set({ isLoading: false });
      },

      login: async (emailOrPhone: string, password: string) => {
        const isPhone = emailOrPhone.startsWith('+');
        const response = await authApi.login({
          ...(isPhone ? { phone: emailOrPhone } : { email: emailOrPhone }),
          password,
        });
        set({ user: response.user, tokens: response.tokens, isLoading: false });
      },

      loginWithOtp: async (phone: string, idToken: string) => {
        const response = await authApi.verifyOtp({ phone, code: '', idToken });
        set({ user: response.user, tokens: response.tokens, isLoading: false });
      },

      logout: async () => {
        const { tokens } = get();
        if (tokens?.refreshToken) {
          try {
            await authApi.logout(tokens.refreshToken);
          } catch { /* ignorer les erreurs réseau */ }
        }
        set({ user: null, tokens: null });
      },

      setUser: (user: User) => set({ user: user as any }),
      updateTokens: (tokens: AuthTokens) => set({ tokens }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, tokens: state.tokens }),
    },
  ),
);
