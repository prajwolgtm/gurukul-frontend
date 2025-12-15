import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { me, setToken, getToken } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (!getToken()) {
          setUser(null);
          return;
        }
        const resp = await me();
        if (resp?.success) setUser(resp.user || resp.data?.user || null);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loginSuccess = (token, userData) => {
    setToken(token);
    setUser(userData || null);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, setUser, loading, loginSuccess, logout }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
