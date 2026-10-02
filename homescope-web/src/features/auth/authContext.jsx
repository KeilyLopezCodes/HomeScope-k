import { createContext, useContext, useState } from 'react';
import { setAccessToken } from '../../shared/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  function signIn(accessToken, usuario) {
    setAccessToken(accessToken);
    setUser(usuario);
  }

  function signOut() {
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
