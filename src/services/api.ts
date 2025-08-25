import axios from 'axios';

// Ensure base URL always includes `/api`
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get a cookie value by name
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : undefined;
}

// Attach CSRF token for mutating requests
api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    let csrf = getCookie('csrf_token');
    if (!csrf) {
      try {
        // Use a plain axios call to avoid interceptor recursion
        await axios.get(`${baseURL}/auth/csrf-token`, { withCredentials: true });
        csrf = getCookie('csrf_token');
      } catch (e) {
        // Ignore; backend may have CSRF exclusions for some routes
      }
    }
    if (csrf) {
      if (!config.headers) config.headers = {} as any;
      (config.headers as any)['X-CSRF-Token'] = csrf;
    }
  }
  return config;
});

export default api;
