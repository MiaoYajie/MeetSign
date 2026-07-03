import type { CSSProperties, ReactNode } from 'react';
import { DynamicForm } from './DynamicForm';
import type { FieldDefinition, FormLayoutItem } from './index';
import {
  mergePanelConfig,
  panelBackgroundStyle,
  resolvePanelTitle,
  type PanelConfig,
} from './panelConfig';

export interface CheckInPanelProps {
  eventName: string;
  panelConfig?: Partial<PanelConfig> | null;
  logoUrl?: string;
  sessionName?: string;
  footerHtml?: string;
  fields: FieldDefinition[];
  layout: FormLayoutItem[];
  visibleFieldKeys: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onFieldBlur?: (key: string) => void;
  submitButtonText?: string;
  onSubmit?: () => void;
  submitting?: boolean;
  preview?: boolean;
  showSubmitButton?: boolean;
  formSlot?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function CheckInPanel({
  eventName,
  panelConfig,
  logoUrl,
  sessionName,
  footerHtml,
  fields,
  layout,
  visibleFieldKeys,
  values,
  onChange,
  onFieldBlur,
  submitButtonText,
  onSubmit,
  submitting = false,
  preview = false,
  showSubmitButton = true,
  formSlot,
  className = 'checkin-card',
  style,
}: CheckInPanelProps) {
  const config = mergePanelConfig(panelConfig);
  const title = resolvePanelTitle(config, eventName);
  const buttonText = submitButtonText ?? config.submitButtonText;

  return (
    <div
      className={className}
      style={{
        ...panelBackgroundStyle(config),
        ...style,
      }}
    >
      {logoUrl && <img className="logo" src={logoUrl} alt="logo" />}
      <h1>{title}</h1>
      {sessionName && <p className="session-name">{sessionName}</p>}
      {config.showWelcomeMessage && config.welcomeMessage && (
        <p className="welcome-message">{config.welcomeMessage}</p>
      )}

      {formSlot ?? (
        <DynamicForm
          fields={fields}
          layout={layout}
          visibleFieldKeys={visibleFieldKeys}
          values={values}
          onChange={onChange}
          onFieldBlur={onFieldBlur}
        />
      )}

      {showSubmitButton && (
        <button
          className="primary-btn"
          type="button"
          disabled={submitting || preview}
          onClick={onSubmit}
          style={{ background: config.submitButtonColor }}
        >
          {submitting ? '提交中...' : buttonText}
        </button>
      )}

      {footerHtml && (
        <div className="footer" dangerouslySetInnerHTML={{ __html: footerHtml }} />
      )}
    </div>
  );
}
