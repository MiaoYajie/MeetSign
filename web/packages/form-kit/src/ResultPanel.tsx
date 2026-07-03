import type { CSSProperties } from 'react';
import {
  mergeResultPanelConfig,
  resultPanelBackgroundStyle,
  type ResultPanelConfig,
} from './panelConfig';

export interface ResultPanelProps {
  resultConfig?: Partial<ResultPanelConfig> | null;
  message: string;
  logoUrl?: string;
  footerHtml?: string;
  onButtonClick?: () => void;
  preview?: boolean;
  className?: string;
  style?: CSSProperties;
  defaults?: ResultPanelConfig;
}

export function ResultPanel({
  resultConfig,
  message,
  logoUrl,
  footerHtml,
  onButtonClick,
  preview = false,
  className = 'checkin-card',
  style,
  defaults,
}: ResultPanelProps) {
  const config = mergeResultPanelConfig(resultConfig, defaults);

  return (
    <div
      className={className}
      style={{
        ...resultPanelBackgroundStyle(config),
        ...style,
      }}
    >
      {logoUrl && <img className="logo" src={logoUrl} alt="logo" />}
      <h2 className="result-title" style={{ color: config.titleColor }}>
        {config.title}
      </h2>
      <p className="result-message">{message}</p>
      <button
        className="result-action-btn"
        type="button"
        disabled={preview}
        onClick={onButtonClick}
        style={{
          background: config.buttonColor,
          fontFamily: config.buttonFontFamily,
        }}
      >
        {config.buttonText}
      </button>
      {footerHtml && (
        <div className="footer" dangerouslySetInnerHTML={{ __html: footerHtml }} />
      )}
    </div>
  );
}
