import {
  CheckInPanel,
  DynamicForm,
  clearCachedResult,
  getCachedResult,
  getClientFingerprint,
  getVisibleFieldKeys,
  setCachedResult,
  type FieldDefinition,
} from '@meetsign/form-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, type PublicSessionConfig } from '../api/client';
import './CheckInPage.css';

export default function CheckInPage() {
  const { token = '' } = useParams();
  const [config, setConfig] = useState<PublicSessionConfig | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [result, setResult] = useState<{
    isSuccess: boolean;
    resultMessage: string;
    submitIndex: number;
    checkedInAt: string;
  } | null>(null);

  const fingerprint = useMemo(() => getClientFingerprint(), []);

  const fields: FieldDefinition[] = useMemo(
    () =>
      (config?.fields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        fieldType: f.fieldType as FieldDefinition['fieldType'],
        required: f.required,
      })),
    [config]
  );

  const refreshVisibility = useCallback(
    async (nextValues: Record<string, string>) => {
      if (!token || !config) return;
      try {
        const { data } = await publicApi.evaluate(token, nextValues);
        setVisibleFields(data.visibleFields);
      } catch {
        setVisibleFields(
          getVisibleFieldKeys(config.formLayout, config.conditions, {
            partialValues: nextValues,
          })
        );
      }
    },
    [token, config]
  );

  useEffect(() => {
    if (!token) return;
    const cached = getCachedResult(token);
    if (cached) {
      setResult(cached);
      setShowForm(false);
    }

    publicApi
      .getConfig(token)
      .then(({ data }) => {
        setConfig(data);
        return refreshVisibility({});
      })
      .catch(() => setError('签到链接无效或已失效'))
      .finally(() => setLoading(false));
  }, [token, refreshVisibility]);

  const onChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const onFieldBlur = (key: string) => {
    refreshVisibility({ ...values, [key]: values[key] ?? '' });
  };

  const submit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data } = await publicApi.submit(token, values, fingerprint);
      const payload = {
        isSuccess: data.isSuccess,
        resultMessage: data.resultMessage,
        submitIndex: data.submitIndex,
        checkedInAt: new Date().toISOString(),
      };
      setCachedResult(token, payload);
      setResult(payload);
      setShowForm(false);
      setError(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '提交失败';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    clearCachedResult(token);
    setShowForm(true);
    setResult(null);
    setValues({});
    setError(null);
    refreshVisibility({});
  };

  if (loading) return <div className="checkin-page loading">加载中...</div>;
  if (error && !config) return <div className="checkin-page error">{error}</div>;
  if (!config) return null;

  const pageStyle = config.backgroundUrl
    ? { backgroundImage: `url(${config.backgroundUrl})` }
    : undefined;

  const visibleFieldKeys = visibleFields.length
    ? visibleFields
    : config.formLayout.map((x) => x.fieldKey);

  const showSubmit = config.isOpen && showForm;

  let formSlot;
  if (!config.isOpen) {
    formSlot = <div className="closed-message">{config.closedMessage}</div>;
  } else if (!showForm && result) {
    formSlot = (
      <div className={`result-panel ${result.isSuccess ? 'success' : 'failure'}`}>
        <h2>{result.isSuccess ? '签到成功' : '签到失败'}</h2>
        <p>{result.resultMessage}</p>
        <p className="meta">第 {result.submitIndex} 次提交</p>
        <button className="secondary-btn" type="button" onClick={restart}>
          重新签到
        </button>
      </div>
    );
  } else {
    formSlot = (
      <>
        <DynamicForm
          fields={fields}
          layout={config.formLayout}
          visibleFieldKeys={visibleFieldKeys}
          values={values}
          onChange={onChange}
          onFieldBlur={onFieldBlur}
        />
        {error && <div className="form-error">{error}</div>}
      </>
    );
  }

  return (
    <div className="checkin-page" style={pageStyle}>
      <CheckInPanel
        eventName={config.eventName}
        panelConfig={config.panelConfig}
        logoUrl={config.logoUrl}
        sessionName={config.sessionName}
        footerHtml={config.footerHtml}
        fields={fields}
        layout={config.formLayout}
        visibleFieldKeys={visibleFieldKeys}
        values={values}
        onChange={onChange}
        onFieldBlur={onFieldBlur}
        onSubmit={submit}
        submitting={submitting}
        showSubmitButton={showSubmit}
        formSlot={formSlot}
      />
    </div>
  );
}
