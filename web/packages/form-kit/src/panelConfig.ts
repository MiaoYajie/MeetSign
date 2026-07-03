import type { CSSProperties } from 'react';

export interface PanelConfig {
  title: string;
  welcomeMessage: string;
  showWelcomeMessage: boolean;
  submitButtonText: string;
  panelBackgroundColor: string;
  panelBackgroundOpacity: number;
  submitButtonColor: string;
}

export const DEFAULT_PANEL_CONFIG: PanelConfig = {
  title: '',
  welcomeMessage: '',
  showWelcomeMessage: false,
  submitButtonText: '提交签到',
  panelBackgroundColor: '#ffffff',
  panelBackgroundOpacity: 0.94,
  submitButtonColor: '#2563eb',
};

export function mergePanelConfig(config?: Partial<PanelConfig> | null): PanelConfig {
  return { ...DEFAULT_PANEL_CONFIG, ...config };
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

export function panelBackgroundStyle(config: PanelConfig): CSSProperties {
  const merged = mergePanelConfig(config);
  const { r, g, b } = parseHexColor(merged.panelBackgroundColor);
  return {
    background: `rgba(${r}, ${g}, ${b}, ${merged.panelBackgroundOpacity})`,
  };
}
