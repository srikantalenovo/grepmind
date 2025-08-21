// import axios from 'axios';
// const API_URL = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

// const api = axios.create({
//   baseURL: API_URL,
//   withCredentials: true
// });

// export default api;

// src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// --- 🔑 Token Helpers ---
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

// --- 🔒 Request Interceptor ---
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- ♻️ Response Interceptor ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not retrying yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken) throw new Error('No refresh token');

          // Call backend refresh endpoint
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

          const { accessToken, refreshToken: newRefresh } = res.data;
          setTokens(accessToken, newRefresh);

          isRefreshing = false;
          onRefreshed(accessToken);

          // Retry original request
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (err) {
          isRefreshing = false;
          // logout if refresh fails
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(err);
        }
      }

      // Queue failed requests until refresh completes
      return new Promise((resolve) => {
        addRefreshSubscriber((newAccessToken) => {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
