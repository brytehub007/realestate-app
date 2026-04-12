import axios, { AxiosError } from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL:         BASE,
  withCredentials: true,
  timeout:         15_000,
});

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("sh_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status !== 401 || original?._retry) return Promise.reject(error);

    const refresh = localStorage.getItem("sh_refresh_token");
    if (!refresh) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then(token => {
        original!.headers!.Authorization = `Bearer ${token}`;
        return api(original!);
      });
    }

    original!._retry = true;
    refreshing = true;

    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: refresh });
      const newToken = data.data.accessToken;
      localStorage.setItem("sh_access_token",  newToken);
      localStorage.setItem("sh_refresh_token", data.data.refreshToken);
      queue.forEach(q => q.resolve(newToken));
      queue = [];
      original!.headers!.Authorization = `Bearer ${newToken}`;
      return api(original!);
    } catch (err) {
      queue.forEach(q => q.reject(err));
      queue = [];
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      refreshing = false;
    }
  }
);

export default api;
