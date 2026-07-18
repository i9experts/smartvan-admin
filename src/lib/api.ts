import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://72.61.119.165:3002';
const TOKEN_KEY = 'smartvan_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('smartvan_user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/Admin/login', { email, password }),
  getProfile: () => api.get('/Admin/getProfile'),
};

export const studentApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/Admin/Get-Students', { params }),
  getById: (id: string) => api.get(`/Admin/getStudentById/${id}`),
  add: (data: any) => api.post('/Admin/addStudent', data),
  edit: (kidId: string, data: any) => api.post('/Admin/editStudent', { KidId: kidId, ...data }),
  remove: (kidIds: string[]) => api.post('/Admin/removeStudents', { kidIds }),
  changeStatus: (kidIds: string[], status: string) => api.post('/kid/changeKidStatus', { kidIds, status }),
  assignVan: (kidIds: string[], vanId: string) => api.post('/kid/assignVanToStudents', { kidIds, vanId }),
};

export const vanApi = {
  getByAdmin: (params?: { page?: number; limit?: number; search?: string; vanOwn?: boolean }) =>
    api.get('/van/GetVansByAdmin', { params }),
  getById: (id: string) => api.get(`/van/getVanById/${id}`),
  addByAdmin: (data: any) => api.post('/van/addVanByAdmin', data),
  editByAdmin: (data: any) => api.post('/van/editVanByAdmin', data),
  deleteByAdmin: (vanId: string) => api.post('/van/deleteVanByAdmin', { vanId }),
  changeStatus: (vanIds: string[], status: string) => api.post('/van/changeVanStatus', { vanIds, status }),
  getDrivers: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/van/GetAllDriversByAdmin', { params }),
  getDriverById: (id: string) => api.get(`/van/getDriverById/${id}`),
  changeDriverStatus: (driverIds: string[], status: string) => api.post('/van/changeDriverStatus', { driverIds, status }),
  removeDriverFromVan: (vanId: string) => api.post('/van/removeDriverFromVan', { vanId }),
  assignVanToDriver: (driverId: string, vanId: string) => api.post('/Admin/assignVanToDriver', { driverId, vanId }),
  removeDriversFromSchool: (driverIds: string[]) => api.post('/van/removeDriversFromScool', { driverIds }),
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
  getAll: (params?: { page?: number; limit?: number }) => api.get('/alert/getAlert', { params }),
  getById: (alertId: string) => api.get(`/alert/getAlertById/${alertId}`),
  add: (data: any) => api.post('/alert/addAlert', data),
  edit: (alertId: string, data: any) => api.post('/alert/editAlert', { alertId, ...data }),
  delete: (alertId: string) => api.post('/alert/deleteAlert', { alertId }),
  getFromDrivers: (params?: { page?: number; limit?: number }) =>
    api.get('/alert/getDriverAlertsForAdmin', { params }),
};

export const invoiceApi = {
  getAll: (params?: { page?: number; limit?: number }) => api.get('/invoice', { params }),
};

export const routeApi = {
  getAll: () => api.get('/route'),
};

export const schoolApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/Admin/getAllSchoolsBySuperAdmin', { params }),
  getById: (id: string) => api.get(`/Admin/getSchoolById/${id}`),
  changeStatus: (schoolId: string, status: string) =>
    api.post('/school/changeSchoolStatus', { schoolId, status }),
};
export const employeeApi = {
  getPermissions: () => api.get('/employee/permissions'),
  getAll: () => api.get('/employee/all'),
  create: (data: { name: string; email: string; password: string; permissions: string[] }) =>
    api.post('/employee/create', data),
  update: (id: string, data: { name?: string; permissions?: string[]; status?: string }) =>
    api.patch(`/employee/${id}`, data),
  remove: (id: string) => api.delete(`/employee/${id}`),
  login: (email: string, password: string) => api.post('/employee/login', { email, password }),
  getMyTickets: () => api.get('/employee/my-tickets'),
  updateTicketStatus: (ticketId: string, status: string, adminRemarks?: string) =>
    api.patch(`/employee/my-tickets/${ticketId}/status`, { status, adminRemarks }),
  assignTicket: (reportId: string, employeeId: string) =>
    api.post('/employee/assign-ticket', { reportId, employeeId }),
};
export const uploadApi = {
  image: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
export const auditLogApi = {
  getRecent: () => api.get('/audit-log/recent'),
};
export const searchApi = {
  universal: (q: string) => api.get('/search/universal', { params: { q } }),
};
