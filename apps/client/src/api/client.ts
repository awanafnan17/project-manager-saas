import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false, // Use Bearer tokens, not cookies (avoids CORS credential issues)
});

// ─── Request interceptor: attach JWT ──────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 & refresh ───
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Send refresh token in body (not cookie) for cross-origin compatibility
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
          withCredentials: false,
        });

        const newAccessToken = data.data?.accessToken || data.accessToken;
        localStorage.setItem('access_token', newAccessToken);
        if (data.data?.refreshToken || data.refreshToken) {
          localStorage.setItem('refresh_token', data.data?.refreshToken || data.refreshToken);
        }

        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_tenant');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
