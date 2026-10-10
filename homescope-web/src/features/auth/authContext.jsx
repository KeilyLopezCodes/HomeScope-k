import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setAccessToken, apiClient } from '../../shared/api/client';

const AuthContext = createContext(null);
const SESSION_KEY = 'homescope_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const refreshed = useRef(false);

  useEffect(() => {
    // StrictMode monta dos veces en dev — el ref evita doble refresh
    if (refreshed.current) { setLoading(false); return; }
    refreshed.current = true;

    // Si ya hay user en sessionStorage el accessToken se perdió (nueva pestaña/recarga)
    // pero podemos recuperarlo con el refresh token de la cookie
    async function restaurarSesion() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          // Cookie expirada o inexistente — limpiar sesión
          sessionStorage.removeItem(SESSION_KEY);
          setUser(null);
          return;
        }
        const data = await res.json();
        if (!data?.accessToken) return;
        setAccessToken(data.accessToken);
        const perfil = await apiClient('/api/v1/auth/perfil');
        const u = { id: perfil.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restaurarSesion();
  }, []);

  function signIn(accessToken, usuario) {
    setAccessToken(accessToken);
    const u = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  function signOut() {
    setAccessToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function updateUser(parcial) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...parcial };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
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
