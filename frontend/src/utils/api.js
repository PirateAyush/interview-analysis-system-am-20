import axios from 'axios';

// Base API URL
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Organization APIs
export const organizationAPI = {
  create: (data) => apiClient.post('/organization/create', data),
  verify: (orgId) => apiClient.get(`/organization/verify/${orgId}`),
  list: () => apiClient.get('/organization/list'),
};

// Auth APIs
export const authAPI = {
  signup: (data) => apiClient.post('/auth/signup', data),
  login: (data) => apiClient.post('/auth/login', data),
  verifyOTP: (data) => apiClient.post('/auth/verify-otp', data),
  resendOTP: (data) => apiClient.post('/auth/resend-otp', data),
  getCurrentUser: () => apiClient.get('/auth/me'),
};

export default apiClient;
