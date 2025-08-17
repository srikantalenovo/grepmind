import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export default api;