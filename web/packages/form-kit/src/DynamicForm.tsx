import type { FieldDefinition, FormLayoutItem } from '@meetsign/form-kit';

export interface DynamicFormProps {
  fields: FieldDefinition[];
  layout: FormLayoutItem[];
  visibleFieldKeys: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onFieldBlur?: (key: string) => void;
}

export function DynamicForm({
  fields,
  layout,
  visibleFieldKeys,
  values,
  onChange,
  onFieldBlur,
}: DynamicFormProps) {
  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  const sortedLayout = [...layout].sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div className="dynamic-form">
      {sortedLayout.map((item) => {
        if (!visibleFieldKeys.includes(item.fieldKey)) return null;
        const field = fieldMap.get(item.fieldKey);
        if (!field) return null;

        return (
          <div key={item.fieldKey} className="form-field" style={{ gridColumn: `span ${item.colSpan}` }}>
            <label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              id={field.key}
              type={field.fieldType === 'Number' ? 'number' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              onBlur={() => onFieldBlur?.(field.key)}
              required={field.required}
            />
          </div>
        );
      })}
    </div>
  );
}
