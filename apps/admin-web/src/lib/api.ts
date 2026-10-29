import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token automatiquement
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token auto
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/admin/dashboard').then((r) => r.data.data),
  getMap: () => api.get('/admin/dashboard/map').then((r) => r.data.data),
};

// ─── Rides ────────────────────────────────────────────────────────────────────
export const ridesApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/rides', { params }).then((r) => r.data),
  getOne: (id: string) => api.get(`/admin/rides/${id}`).then((r) => r.data.data),
  cancel: (id: string, reason: string) =>
    api.post(`/admin/rides/${id}/cancel`, { reason }).then((r) => r.data),
  refund: (id: string) => api.post(`/admin/rides/${id}/refund`).then((r) => r.data),
  assign: (id: string, driverId: string) =>
    api.post(`/admin/rides/${id}/assign`, { driverId }).then((r) => r.data),
};

// ─── Drivers ──────────────────────────────────────────────────────────────────
export const driversApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/drivers', { params }).then((r) => r.data),
  getOne: (id: string) => api.get(`/admin/drivers/${id}`).then((r) => r.data.data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/admin/drivers/${id}/status`, { status, reason }).then((r) => r.data),
  getDocuments: (id: string) =>
    api.get(`/admin/drivers/${id}/documents`).then((r) => r.data.data),
  verifyDocument: (id: string, docId: string, status: string, reason?: string) =>
    api.patch(`/admin/drivers/${id}/documents/${docId}`, { status, reason }).then((r) => r.data),
};

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clientsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/users', { params }).then((r) => r.data),
  getOne: (id: string) => api.get(`/admin/users/${id}`).then((r) => r.data.data),
  updateStatus: (id: string, isActive: boolean) =>
    api.patch(`/admin/users/${id}/status`, { isActive }).then((r) => r.data),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  getTransactions: (params?: Record<string, unknown>) =>
    api.get('/admin/finance/transactions', { params }).then((r) => r.data),
  getPayouts: (params?: Record<string, unknown>) =>
    api.get('/admin/finance/payouts', { params }).then((r) => r.data),
  processPayout: (id: string, status: 'COMPLETED' | 'FAILED') =>
    api.patch(`/admin/finance/payouts/${id}`, { status }).then((r) => r.data),
  exportReport: (format: 'csv' | 'pdf') =>
    api.get('/admin/finance/report', { params: { format }, responseType: 'blob' }),
};

// ─── Pricing ──────────────────────────────────────────────────────────────────
export const pricingApi = {
  getRules: () => api.get('/admin/pricing').then((r) => r.data.data),
  createRule: (data: unknown) => api.post('/admin/pricing', data).then((r) => r.data),
  updateRule: (id: string, data: unknown) =>
    api.patch(`/admin/pricing/${id}`, data).then((r) => r.data),
  getVehicleTypes: () => api.get('/admin/vehicle-types').then((r) => r.data.data),
  createVehicleType: (data: unknown) =>
    api.post('/admin/vehicle-types', data).then((r) => r.data),
  getPromos: () => api.get('/admin/promo-codes').then((r) => r.data.data),
  createPromo: (data: unknown) =>
    api.post('/admin/promo-codes', data).then((r) => r.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  send: (data: unknown) =>
    api.post('/admin/notifications/send', data).then((r) => r.data),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
};
