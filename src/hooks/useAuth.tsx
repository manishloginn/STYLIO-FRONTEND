import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, saveSession } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  register: (input: { name: string; phone: string; password: string; role: 'CUSTOMER' | 'SALON_OWNER' }) => Promise<User>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  requestOtp: (phone: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const me = await api<User>('/users/me');
    setUser(me);
  }

  useEffect(() => {
    const access = localStorage.getItem('stylio.access');
    if (!access) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refreshUser,
      async login(phone, password) {
        const session = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
        saveSession(session);
        setUser(session.user);
        return session.user;
      },
      async register(input) {
        const session = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        saveSession(session);
        setUser(session.user);
        return session.user;
      },
      async requestOtp(phone) {
        const result = await api<{ sent: boolean; devCode?: string }>('/auth/otp/request', {
          method: 'POST',
          body: JSON.stringify({ phone }),
        });
        return result.devCode;
      },
      async verifyOtp(phone, code) {
        const session = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/otp/verify', {
          method: 'POST',
          body: JSON.stringify({ phone, code }),
        });
        saveSession(session);
        setUser(session.user);
        return session.user;
      },
      async logout() {
        try {
          await api('/auth/logout', { method: 'POST' });
        } catch {
          /* the local session is cleared either way */
        }
        clearSession();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider is missing');
  return ctx;
}
