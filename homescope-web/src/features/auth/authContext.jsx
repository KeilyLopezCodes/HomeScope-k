import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setAccessToken, apiClient, refreshToken } from '../../shared/api/client';

const AuthContext = createContext(null);
const SESSION_KEY = 'homescope_user';

// ── Permisos por rol (espejo de la matriz de roles y permisos) ────────────────
const PERMISOS_POR_ROL = {
  visitante: [],
  comprador: [
    'propiedad.ver', 'propiedad.buscar', 'favorito.gestionar',
    'mensaje.enviar', 'visita.solicitar', 'resena.crear',
    'perfil.ver', 'perfil.editar',
  ],
  vendedor: [
    'propiedad.ver', 'propiedad.buscar', 'propiedad.crear',
    'propiedad.editar', 'propiedad.eliminar', 'propiedad.listar_propias',
    'favorito.gestionar', 'mensaje.enviar', 'visita.gestionar',
    'resena.ver', 'perfil.ver', 'perfil.editar',
  ],
  administrador: [
    'propiedad.ver', 'propiedad.buscar', 'propiedad.crear',
    'propiedad.editar', 'propiedad.eliminar', 'propiedad.listar_propias',
    'propiedad.moderar', 'favorito.gestionar', 'mensaje.enviar',
    'visita.gestionar', 'resena.ver', 'resena.moderar',
    'perfil.ver', 'perfil.editar', 'usuario.gestionar',
    'admin.acceso', 'reporte.gestionar',
  ],
};
// alias para compatibilidad con el backend
PERMISOS_POR_ROL.admin = PERMISOS_POR_ROL.administrador;

// ── Sesiones simuladas para desarrollo ───────────────────────────────────────
const MOCK_USERS = {
  visitante:     null,
  comprador:     { id: 1, nombre: 'Ana Comprador',   email: 'comprador@dev.local',   rol: 'comprador' },
  vendedor:      { id: 2, nombre: 'Luis Vendedor',   email: 'vendedor@dev.local',    rol: 'vendedor' },
  administrador: { id: 3, nombre: 'Admin HomeScope', email: 'admin@dev.local',       rol: 'administrador' },
};

const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true';

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    if (DEV_MODE) return false;
    try { return !sessionStorage.getItem(SESSION_KEY); }
    catch { return true; }
  });
  // El usuario se restaura de sessionStorage al instante, pero el token (en memoria) llega con el refresh.
  // Las consultas cuya respuesta depende de la sesión esperan a este flag.
  const [sesionVerificada, setSesionVerificada] = useState(DEV_MODE);
  const refreshed = useRef(false);
  const sesionCerrada = useRef(false);

  useEffect(() => {
    if (DEV_MODE) return; // en modo mock no llamar al backend
    if (refreshed.current) return;
    refreshed.current = true;

    async function restaurarSesion() {
      try {
        await refreshToken();
        if (sesionCerrada.current) return;
        const perfil = await apiClient('/api/v1/auth/perfil');
        if (sesionCerrada.current) return;
        // Sin el rol, al recargar el usuario quedaba con sesión pero sin permisos (menú de visitante, /403)
        const u = { id: perfil.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol ?? perfil.roles?.[0] };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
      } catch (err) {
        // Solo un rechazo de la API (401/403) significa que la sesión terminó. Si la API no respondió
        // (caída o sin red) se conserva el usuario guardado para que la próxima recarga lo vuelva a intentar
        if ([401, 403].includes(err?.status)) sessionStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        setLoading(false);
        setSesionVerificada(true);
      }
    }
    restaurarSesion();
  }, []);

  // ── Helpers de permisos ──────────────────────────────────────────────────
  const roles = user ? [user.rol].filter(Boolean) : [];
  const permisos = roles.flatMap((r) => PERMISOS_POR_ROL[r] ?? []);

  function tienePermiso(codigo) {
    if (!codigo) return true;
    return permisos.includes(codigo);
  }

  // ── Acciones de sesión ───────────────────────────────────────────────────
  function signIn(accessToken, usuario) {
    sesionCerrada.current = false;
    setAccessToken(accessToken);
    const u = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }

  function signOut() {
    sesionCerrada.current = true;
    setAccessToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setLoading(false);
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }

  function updateUser(parcial) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...parcial };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }

  // ── Sesión simulada (solo en dev con VITE_MOCK_AUTH=true) ────────────────
  function mockSignIn(rol) {
    if (!DEV_MODE) return;
    const u = MOCK_USERS[rol] ?? null;
    if (u) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
      setUser(u);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, sesionVerificada, roles, permisos,
      tienePermiso, signIn, signOut, updateUser,
      // solo disponible en dev
      ...(DEV_MODE && { mockSignIn, MOCK_USERS }),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
