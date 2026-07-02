import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
}

export interface EventListItem {
  id: string;
  name: string;
  checkInMode: 'PresetList' | 'FreeForm';
  createdAt: string;
  sessionCount: number;
}

export interface FieldDefinition {
  id?: string;
  key: string;
  label: string;
  fieldType: 'Text' | 'Number' | 'Select';
  isBuiltIn: boolean;
  required: boolean;
  sortOrder: number;
}

export interface EventDetail {
  id: string;
  name: string;
  description?: string;
  checkInMode: 'PresetList' | 'FreeForm';
  backgroundUrl?: string;
  logoUrl?: string;
  footerHtml?: string;
  successTemplate: string;
  failureTemplate: string;
  fields: FieldDefinition[];
  formLayout: { fieldKey: string; row: number; col: number; colSpan: number }[];
  conditions: { targetFieldKey: string; conditionJson: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionListItem {
  id: string;
  name: string;
  openStart: string;
  openEnd: string;
  publicToken: string;
  attendeeCount: number;
  recordCount: number;
}

export interface SessionDetail {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  openStart: string;
  openEnd: string;
  publicToken: string;
  publicUrl: string;
}

export interface CheckInRecord {
  id: string;
  checkedInAt: string;
  isSuccess: boolean;
  submitIndex: number;
  resultMessage: string;
  clientFingerprint: string;
  submittedValues: Record<string, string>;
}

export const authApi = {
  register: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
};

export const eventsApi = {
  list: () => api.get<EventListItem[]>('/admin/events'),
  get: (id: string) => api.get<EventDetail>(`/admin/events/${id}`),
  create: (name: string, description?: string) =>
    api.post<EventDetail>('/admin/events', { name, description }),
  update: (id: string, name: string, description?: string) =>
    api.put<EventDetail>(`/admin/events/${id}`, { name, description }),
  delete: (id: string) => api.delete(`/admin/events/${id}`),
  updateBranding: (id: string, form: FormData) =>
    api.put<EventDetail>(`/admin/events/${id}/branding`, form),
  updateFields: (id: string, fields: FieldDefinition[]) =>
    api.put<EventDetail>(`/admin/events/${id}/fields`, { fields }),
  updateFormLayout: (id: string, items: EventDetail['formLayout']) =>
    api.put<EventDetail>(`/admin/events/${id}/form-layout`, { items }),
  updateConditions: (id: string, conditions: EventDetail['conditions']) =>
    api.put<EventDetail>(`/admin/events/${id}/conditions`, { conditions }),
  updateTemplates: (id: string, successTemplate: string, failureTemplate: string) =>
    api.put<EventDetail>(`/admin/events/${id}/templates`, { successTemplate, failureTemplate }),
  updateMode: (id: string, checkInMode: 'PresetList' | 'FreeForm') =>
    api.put<EventDetail>(`/admin/events/${id}/mode`, { checkInMode }),
  listSessions: (eventId: string) => api.get<SessionListItem[]>(`/admin/events/${eventId}/sessions`),
  createSession: (eventId: string, data: { name: string; openStart: string; openEnd: string }) =>
    api.post<SessionDetail>(`/admin/events/${eventId}/sessions`, data),
};

export interface FieldColumn {
  key: string;
  label: string;
}

export interface AttendanceItem {
  rowKey: string;
  attendeeId?: string;
  inPresetList: boolean;
  status: 'success' | 'failed' | 'not_checked_in';
  latestCheckedInAt?: string;
  submitCount: number;
  resultMessage?: string;
  fieldValues: Record<string, string>;
}

export const sessionsApi = {
  get: (id: string) => api.get<SessionDetail>(`/admin/sessions/${id}`),
  update: (id: string, data: { name: string; openStart: string; openEnd: string }) =>
    api.put<SessionDetail>(`/admin/sessions/${id}`, data),
  delete: (id: string) => api.delete(`/admin/sessions/${id}`),
  getUrl: (id: string) => api.get<{ publicUrl: string }>(`/admin/sessions/${id}/url`),
  importAttendees: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ importedCount: number; skippedCount: number; errors: string[] }>(
      `/admin/sessions/${id}/attendees/import`,
      form
    );
  },
  importAttendeesText: (id: string, text: string) =>
    api.post<{ importedCount: number; skippedCount: number; errors: string[] }>(
      `/admin/sessions/${id}/attendees/import-text`,
      { text }
    ),
  deleteAttendee: (sessionId: string, attendeeId: string) =>
    api.delete(`/admin/sessions/${sessionId}/attendees/${attendeeId}`),
  getAttendeeCount: (id: string) => api.get<{ count: number }>(`/admin/sessions/${id}/attendees/count`),
  getAttendance: (id: string, page = 1, pageSize = 20, q?: string, status?: string) =>
    api.get<{
      columns: FieldColumn[];
      items: AttendanceItem[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/sessions/${id}/attendance`, { params: { page, pageSize, q, status } }),
  getRecords: (id: string, page = 1, pageSize = 20, isSuccess?: boolean) =>
    api.get<{ items: CheckInRecord[]; total: number; page: number; pageSize: number }>(
      `/admin/sessions/${id}/records`,
      { params: { page, pageSize, isSuccess } }
    ),
  exportRecords: (id: string) =>
    api.get(`/admin/sessions/${id}/records/export`, { responseType: 'blob' }),
  getQrCodeUrl: (id: string) => `/api/admin/sessions/${id}/qrcode`,
  getQrCodeBlob: (id: string) =>
    api.get(`/admin/sessions/${id}/qrcode`, { responseType: 'blob' }),
};

export default api;
