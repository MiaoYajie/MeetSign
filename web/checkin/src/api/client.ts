import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export interface PublicSessionConfig {
  eventName: string;
  sessionName: string;
  checkInMode: 'PresetList' | 'FreeForm';
  backgroundUrl?: string;
  logoUrl?: string;
  footerHtml?: string;
  isOpen: boolean;
  closedMessage?: string;
  fields: { key: string; label: string; fieldType: string; required: boolean }[];
  formLayout: { fieldKey: string; row: number; col: number; colSpan: number }[];
  conditions: { targetFieldKey: string; conditionJson: string }[];
}

export const publicApi = {
  getConfig: (token: string) => api.get<PublicSessionConfig>(`/public/sessions/${token}`),
  evaluate: (token: string, partialValues: Record<string, string>) =>
    api.post<{ visibleFields: string[] }>(`/public/sessions/${token}/evaluate`, { partialValues }),
  submit: (token: string, values: Record<string, string>, clientFingerprint: string) =>
    api.post<{ isSuccess: boolean; resultMessage: string; submitIndex: number; mergedValues: Record<string, string> }>(
      `/public/sessions/${token}/submit`,
      { values, clientFingerprint }
    ),
  getLatest: (token: string, clientFingerprint: string) =>
    api.get<{ isSuccess: boolean; resultMessage: string; submitIndex: number; checkedInAt: string } | null>(
      `/public/sessions/${token}/latest`,
      { params: { clientFingerprint } }
    ),
};
