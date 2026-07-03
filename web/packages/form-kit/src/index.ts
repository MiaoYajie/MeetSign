export type FieldType = 'Text' | 'Number' | 'Select';

export interface FieldDefinition {
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
}

export interface FormLayoutItem {
  fieldKey: string;
  row: number;
  col: number;
  colSpan: number;
}

export interface FieldCondition {
  targetFieldKey: string;
  conditionJson: string;
}

export interface ConditionContext {
  partialValues: Record<string, string>;
  isFieldDuplicate?: (fieldKey: string, value: string) => boolean;
}

function parseCondition(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function evaluateCondition(
  conditionJson: string,
  context: ConditionContext
): boolean {
  const condition = parseCondition(conditionJson);
  const type = condition.type as string | undefined;

  switch (type) {
    case 'fieldDuplicate': {
      const sourceFieldKey = condition.sourceFieldKey as string;
      const value = context.partialValues[sourceFieldKey]?.trim();
      if (!value || !context.isFieldDuplicate) return false;
      return context.isFieldDuplicate(sourceFieldKey, value);
    }
    case 'always':
      return true;
    case 'never':
      return false;
    default:
      return true;
  }
}

export function getVisibleFieldKeys(
  layout: FormLayoutItem[],
  conditions: FieldCondition[],
  context: ConditionContext
): string[] {
  const allKeys = layout.map((item) => item.fieldKey);
  const conditionMap = new Map(
    conditions.map((c) => [c.targetFieldKey, c.conditionJson])
  );

  return allKeys.filter((key) => {
    const conditionJson = conditionMap.get(key);
    if (!conditionJson) return true;
    return evaluateCondition(conditionJson, context);
  });
}

export function renderTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}

export const FINGERPRINT_KEY = 'meetsign:fingerprint';

export function getClientFingerprint(): string {
  const existing = localStorage.getItem(FINGERPRINT_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(FINGERPRINT_KEY, id);
  return id;
}

export function getCachedResult(token: string) {
  const raw = localStorage.getItem(`meetsign:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      isSuccess: boolean;
      resultMessage: string;
      submitIndex: number;
      checkedInAt: string;
    };
  } catch {
    return null;
  }
}

export function setCachedResult(
  token: string,
  result: {
    isSuccess: boolean;
    resultMessage: string;
    submitIndex: number;
    checkedInAt: string;
  }
) {
  localStorage.setItem(`meetsign:${token}`, JSON.stringify(result));
}

export function clearCachedResult(token: string) {
  localStorage.removeItem(`meetsign:${token}`);
}

export { DynamicForm } from './DynamicForm';
export { CheckInPanel } from './CheckInPanel';
export { ResultPanel } from './ResultPanel';
export type { CheckInPanelProps } from './CheckInPanel';
export type { ResultPanelProps } from './ResultPanel';
export {
  DEFAULT_PANEL_CONFIG,
  DEFAULT_SUCCESS_RESULT,
  DEFAULT_FAILURE_RESULT,
  DEFAULT_PAGE_GRADIENT,
  FONT_FAMILY_OPTIONS,
  mergePanelConfig,
  mergeResultPanelConfig,
  panelBackgroundStyle,
  panelBackgroundStyleFromColor,
  resolvePanelTitle,
  resolveResultPageStyle,
  resultPanelBackgroundStyle,
} from './panelConfig';
export type { PanelConfig, ResultPanelConfig } from './panelConfig';
