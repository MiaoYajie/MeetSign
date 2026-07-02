import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface AuthState {
  token: string | null;
  email: string | null;
  userId: string | null;
  login: (token: string, email: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));

  const value = useMemo<AuthState>(
    () => ({
      token,
      email,
      userId,
      login: (newToken, newEmail, newUserId) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('email', newEmail);
        localStorage.setItem('userId', newUserId);
        setToken(newToken);
        setEmail(newEmail);
        setUserId(newUserId);
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('userId');
        setToken(null);
        setEmail(null);
        setUserId(null);
      },
    }),
    [token, email, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
