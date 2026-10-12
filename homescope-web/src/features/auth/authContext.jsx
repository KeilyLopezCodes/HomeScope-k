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
  const [loading, setLoading] = useState(() => {
    // Si no hay user en sessionStorage, necesitamos verificar con el backend
    try { return !sessionStorage.getItem(SESSION_KEY); }
    catch { return true; }
  });
  const refreshed = useRef(false);
  // Evita que una restauración en curso vuelva a iniciar sesión tras un signOut
  const sesionCerrada = useRef(false);

  useEffect(() => {
    // StrictMode monta dos veces en dev — el ref evita doble refresh
    if (refreshed.current) return;
    refreshed.current = true;

    async function restaurarSesion() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          // Cookie inválida — forzar logout aunque sessionStorage tenga datos
          sessionStorage.removeItem(SESSION_KEY);
          setUser(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (sesionCerrada.current) return;
        if (!data?.accessToken) { setLoading(false); return; }
        setAccessToken(data.accessToken);
        // Actualizar datos del perfil desde el backend
        const perfil = await apiClient('/api/v1/auth/perfil');
        if (sesionCerrada.current) return;
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
    sesionCerrada.current = false;
    setAccessToken(accessToken);
    const u = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  async function signOut() {
    // Limpiar estado local primero para que la UI refleje el cierre de inmediato
    sesionCerrada.current = true;
    setAccessToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setLoading(false);
    // Revocar el refresh token y borrar la cookie; si no, al recargar se restaura la sesión
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* sin red: el estado local ya quedó limpio */ }
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
