import { createContext, useContext, useEffect, useState } from 'react';
import { setAccessToken, apiClient } from '../../shared/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Intentar restaurar sesión al montar usando el refresh token de la cookie
  useEffect(() => {
    apiClient('/api/v1/auth/perfil')
      .then((perfil) => {
        setUser({ id: perfil.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol });
      })
      .catch(() => {
        // Sin sesión válida — no hacer nada, user queda null
      })
      .finally(() => setLoading(false));
  }, []);

  function signIn(accessToken, usuario) {
    setAccessToken(accessToken);
    setUser(usuario);
  }

  function signOut() {
    setAccessToken(null);
    setUser(null);
  }

  function updateUser(parcial) {
    setUser((prev) => prev ? { ...prev, ...parcial } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
