const API_URL = import.meta.env.VITE_API_URL;

// El access token vive solo en memoria (ADR-04)
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

async function refreshToken() {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Sesión expirada');
  const data = await res.json();
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function apiClient(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
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

  return res.json();
}
