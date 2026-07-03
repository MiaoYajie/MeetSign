import type { CSSProperties } from 'react';

export interface ResultPanelConfig {
  title: string;
  titleColor: string;
  panelBackgroundColor: string;
  panelBackgroundOpacity: number;
  buttonText: string;
  buttonColor: string;
  buttonFontFamily: string;
  useCheckInBackground: boolean;
  customPageBackground: string;
}

export interface PanelConfig {
  title: string;
  welcomeMessage: string;
  showWelcomeMessage: boolean;
  submitButtonText: string;
  panelBackgroundColor: string;
  panelBackgroundOpacity: number;
  submitButtonColor: string;
  successResult: ResultPanelConfig;
  failureResult: ResultPanelConfig;
}

export const DEFAULT_PAGE_GRADIENT = 'linear-gradient(135deg, #eef2ff, #f8fafc)';

export const DEFAULT_SUCCESS_RESULT: ResultPanelConfig = {
  title: '签到成功',
  titleColor: '#15803d',
  panelBackgroundColor: '#ffffff',
  panelBackgroundOpacity: 0.94,
  buttonText: '重新签到',
  buttonColor: '#e2e8f0',
  buttonFontFamily: 'inherit',
  useCheckInBackground: true,
  customPageBackground: DEFAULT_PAGE_GRADIENT,
};

export const DEFAULT_FAILURE_RESULT: ResultPanelConfig = {
  title: '签到失败',
  titleColor: '#b91c1c',
  panelBackgroundColor: '#ffffff',
  panelBackgroundOpacity: 0.94,
  buttonText: '重新签到',
  buttonColor: '#e2e8f0',
  buttonFontFamily: 'inherit',
  useCheckInBackground: true,
  customPageBackground: DEFAULT_PAGE_GRADIENT,
};

export const DEFAULT_PANEL_CONFIG: PanelConfig = {
  title: '',
  welcomeMessage: '',
  showWelcomeMessage: false,
  submitButtonText: '提交签到',
  panelBackgroundColor: '#ffffff',
  panelBackgroundOpacity: 0.94,
  submitButtonColor: '#2563eb',
  successResult: DEFAULT_SUCCESS_RESULT,
  failureResult: DEFAULT_FAILURE_RESULT,
};

export function mergeResultPanelConfig(
  config?: Partial<ResultPanelConfig> | null,
  defaults: ResultPanelConfig = DEFAULT_SUCCESS_RESULT
): ResultPanelConfig {
  return { ...defaults, ...config };
}

export function mergePanelConfig(config?: Partial<PanelConfig> | null): PanelConfig {
  const base = { ...DEFAULT_PANEL_CONFIG, ...config };
  return {
    ...base,
    successResult: mergeResultPanelConfig(config?.successResult, DEFAULT_SUCCESS_RESULT),
    failureResult: mergeResultPanelConfig(config?.failureResult, DEFAULT_FAILURE_RESULT),
  };
}

export function resolvePanelTitle(config: PanelConfig, eventName: string): string {
  const title = config.title.trim();
  return title || eventName;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16) || 255,
    g: parseInt(normalized.slice(2, 4), 16) || 255,
    b: parseInt(normalized.slice(4, 6), 16) || 255,
  };
}

export function panelBackgroundStyleFromColor(
  color: string,
  opacity: number
): CSSProperties {
  const { r, g, b } = parseHexColor(color);
  return {
    background: `rgba(${r}, ${g}, ${b}, ${opacity})`,
  };
}

export function panelBackgroundStyle(config: Pick<PanelConfig, 'panelBackgroundColor' | 'panelBackgroundOpacity'>): CSSProperties {
  return panelBackgroundStyleFromColor(config.panelBackgroundColor, config.panelBackgroundOpacity);
}

export function resultPanelBackgroundStyle(config: ResultPanelConfig): CSSProperties {
  return panelBackgroundStyleFromColor(config.panelBackgroundColor, config.panelBackgroundOpacity);
}

export function resolveResultPageStyle(
  resultConfig: ResultPanelConfig,
  checkInBackgroundUrl?: string
): CSSProperties {
  if (resultConfig.useCheckInBackground) {
    if (checkInBackgroundUrl) {
      return {
        backgroundImage: `url(${checkInBackgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: DEFAULT_PAGE_GRADIENT };
  }
  return { background: resultConfig.customPageBackground || DEFAULT_PAGE_GRADIENT };
}

export const FONT_FAMILY_OPTIONS = [
  { value: 'inherit', label: '默认' },
  { value: 'system-ui, sans-serif', label: '系统无衬线' },
  { value: '"PingFang SC", "Microsoft YaHei", sans-serif', label: '苹方 / 微软雅黑' },
  { value: 'Georgia, serif', label: '衬线' },
  { value: 'Consolas, monospace', label: '等宽' },
];
