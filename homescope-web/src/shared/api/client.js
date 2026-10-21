const API_URL = import.meta.env.VITE_API_URL;

// El access token vive solo en memoria (ADR-04)
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

// Para la conexión de Socket.io, que se autentica con el mismo access token
export const getAccessToken = () => accessToken;

// Renueva el access token con la cookie de refresh; lanza un error (con status) si la sesión ya expiró.
// El refresh token es de un solo uso: si varias partes piden renovar a la vez (consultas que reciben 401
// juntas, el socket, la restauración de sesión) comparten la misma petición en lugar de gastarlo dos veces
let renovacionEnCurso = null;

export function refreshToken() {
  renovacionEnCurso ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = new Error('Sesión expirada');
        error.status = res.status;
        throw error;
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } finally {
      renovacionEnCurso = null;
    }
  })();
  return renovacionEnCurso;
}

export async function apiClient(path, options = {}) {
  // Con FormData el navegador define el Content-Type multipart (con su boundary)
  const esFormData = options.body instanceof FormData;
  const headers = {
    ...(!esFormData && { 'Content-Type': 'application/json' }),
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  let res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && accessToken) {
    const newToken = await refreshToken();
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
      credentials: 'include',
    });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Backend returns { error: { code, message } } or { message }
    const err = body.error ?? body;
    const error = new Error(err.message ?? 'Error inesperado');
    error.code = err.code;
    error.details = err.details;
    error.status = res.status;
    throw error;
  }

  // 201/204 sin cuerpo (p. ej. favoritos) → null en lugar de fallar al parsear
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}
