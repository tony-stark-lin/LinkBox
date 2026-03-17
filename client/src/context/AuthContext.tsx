import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface User { id: number; username: string; }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('linkbox_token');
    const saved = localStorage.getItem('linkbox_user');
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const { token, user } = await api.login(username, password);
    localStorage.setItem('linkbox_token', token);
    localStorage.setItem('linkbox_user', JSON.stringify(user));
    setUser(user);
  };

  const register = async (username: string, password: string) => {
    const { token, user } = await api.register(username, password);
    localStorage.setItem('linkbox_token', token);
    localStorage.setItem('linkbox_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('linkbox_token');
    localStorage.removeItem('linkbox_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
