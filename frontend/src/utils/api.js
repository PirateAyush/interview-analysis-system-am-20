import axios from 'axios';

// Base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  (error) => Promise.reject(error)
);

// ── Organization APIs ─────────────────────────────────────────────────────────
export const organizationAPI = {
  create: (data) => apiClient.post('/organization/create', data),
  verify: (orgId) => apiClient.get(`/organization/verify/${orgId}`),
  list:   ()      => apiClient.get('/organization/list'),
};

// ── Auth APIs ─────────────────────────────────────────────────────────────────
export const authAPI = {
  signup:         (data) => apiClient.post('/auth/signup', data),
  login:          (data) => apiClient.post('/auth/login', data),
  verifyOTP:      (data) => apiClient.post('/auth/verify-otp', data),
  resendOTP:      (data) => apiClient.post('/auth/resend-otp', data),
  getCurrentUser: ()     => apiClient.get('/auth/me'),
};

// ── Assessment APIs ───────────────────────────────────────────────────────────
export const assessmentAPI = {
  /**
   * Upload a transcript and trigger AI analysis.
   * @param {File}   file             - .txt transcript file
   * @param {string} interviewerName  - must match speaker label in transcript
   * @param {string} candidateName    - must match speaker label in transcript
   * @param {string} appliedRole      - e.g. "iOS Software Engineer"
   * @param {string} candidateLevel   - "Junior" | "Mid" | "Senior"
   */
  analyze: (file, interviewerName, candidateName, appliedRole, candidateLevel) => {
    const formData = new FormData();
    formData.append('file',             file);
    formData.append('interviewer_name', interviewerName);
    formData.append('candidate_name',   candidateName);
    formData.append('applied_role',     appliedRole);
    formData.append('candidate_level',  candidateLevel);

    return apiClient.post('/assessment/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 1200000,  // 20 min — covers LLaMA3 processing time on local hardware
    });
  },

  /**
   * Fetch paginated assessment history for the current org.
   * @param {number} page     - page number (default 1)
   * @param {number} perPage  - results per page (default 10)
   * @param {string} status   - optional filter: "pending" | "completed" | "failed"
   */
  history: (page = 1, perPage = 10, status = '') => {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    return apiClient.get('/assessment/history', { params });
  },

  /**
   * Fetch a single assessment with full question breakdown.
   * @param {number} id - assessment ID
   */
  get: (id) => apiClient.get(`/assessment/${id}`),

  /**
   * Delete an assessment (creator or admin only).
   * @param {number} id - assessment ID
   */
  delete: (id) => apiClient.delete(`/assessment/${id}`),
};

export default apiClient;