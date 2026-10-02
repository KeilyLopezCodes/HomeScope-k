import { apiClient, setAccessToken } from '../../shared/api/client';

export async function registro(data) {
  return apiClient('/api/v1/auth/registro', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data) {
  const res = await apiClient('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setAccessToken(res.accessToken);
  return res;
}

export async function logout() {
  await apiClient('/api/v1/auth/logout', { method: 'POST' });
  setAccessToken(null);
}
