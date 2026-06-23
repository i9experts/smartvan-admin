import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://72.61.119.165:3002';
const TOKEN_KEY = 'smartvan_token';

// ─── Safe localStorage (no SSR crash) ────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 ───────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('smartvan_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Typed API helpers ────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/Admin/login', { email, password }),
  getProfile: () => api.get('/Admin/getProfile'),
  forgotPassword: (email: string) => api.post('/Admin/forgot-password', { email }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post('/Admin/reset-password', { email, otp, newPassword }),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/Admin/changePassword', { oldPassword, newPassword }),
};

export const studentApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/Admin/Get-Students', { params }),
  getById: (id: string) => api.get(`/Admin/getStudentById/${id}`),
  add: (data: {
    fullname: string; grade: number; gender: string;
    age: number; dob: string; parentEmail: string;
  }) => api.post('/Admin/addStudent', data),
  edit: (kidId: string, data: Partial<{ fullname: string; grade: number; gender: string; age: number; dob: string }>) =>
    api.post('/Admin/editStudent', { KidId: kidId, ...data }),
  remove: (kidIds: string[]) => api.post('/Admin/removeStudents', { kidIds }),
  changeStatus: (kidIds: string[], status: 'active' | 'inActive') =>
    api.post('/kid/changeKidStatus', { kidIds, status }),
  assignVan: (kidIds: string[], vanId: string) =>
    api.post('/kid/assignVanToStudents', { kidIds, vanId }),
};

export const vanApi = {
  getByAdmin: (params?: { page?: number; limit?: number; search?: string; vanOwn?: boolean }) =>
    api.get('/van/GetVansByAdmin', { params }),
  getById: (id: string) => api.get(`/van/getVanById/${id}`),
  addByAdmin: (data: any) => api.post('/van/addVanByAdmin', data),
  editByAdmin: (data: any) => api.post('/van/editVanByAdmin', data),
  deleteByAdmin: (vanId: string) => api.post('/van/deleteVanByAdmin', { vanId }),
  changeStatus: (vanIds: string[], status: string) =>
    api.post('/van/changeVanStatus', { vanIds, status }),
  getDrivers: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/van/GetAllDriversByAdmin', { params }),
  getDriverById: (id: string) => api.get(`/van/getDriverById/${id}`),
  changeDriverStatus: (driverIds: string[], status: string) =>
    api.post('/van/changeDriverStatus', { driverIds, status }),
  removeDriverFromVan: (vanId: string) =>
    api.post('/van/removeDriverFromVan', { vanId }),
  assignVanToDriver: (driverId: string, vanId: string) =>
    api.post('/Admin/assignVanToDriver', { driverId, vanId }),
  removeDriversFromSchool: (driverIds: string[]) =>
    api.post('/van/removeDriversFromScool', { driverIds }),
};

export const tripApi = {
  getByAdmin: (params?: { page?: number; limit?: number; status?: string; driverId?: string; date?: string }) =>
    api.get('/trips/Get-Trips-By-Admin', { params }),
};

export const reportApi = {
  getByAdmin: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/report/getComplainsByAdmin', { params }),
  getById: (reportId: string) => api.get(`/report/getComplaintById/${reportId}`),
  changeStatus: (reportId: string, status: string, adminRemarks?: string) =>
    api.post('/report/changeComplaintStatus', { reportId, status, adminRemarks }),
};

export const alertApi = {
  getAll: () => api.get('/alert'),
};

export const invoiceApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/invoice', { params }),
};

export const routeApi = {
  getAll: () => api.get('/route'),
};

export const schoolApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/Admin/getAllSchoolsBySuperAdmin', { params }),
  getById: (id: string) => api.get(`/Admin/getSchoolById/${id}`),
};
