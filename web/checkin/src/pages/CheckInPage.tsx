import {
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
    const next = { ...values, [key]: value };
    setValues(next);
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
    refreshVisibility({});
  };

  if (loading) return <div className="checkin-page loading">加载中...</div>;
  if (error && !config) return <div className="checkin-page error">{error}</div>;
  if (!config) return null;

  const pageStyle = config.backgroundUrl
    ? { backgroundImage: `url(${config.backgroundUrl})` }
    : undefined;

  return (
    <div className="checkin-page" style={pageStyle}>
      <div className="checkin-card">
        {config.logoUrl && <img className="logo" src={config.logoUrl} alt="logo" />}
        <h1>{config.eventName}</h1>
        <p className="session-name">{config.sessionName}</p>

        {!config.isOpen && (
          <div className="closed-message">{config.closedMessage}</div>
        )}

        {config.isOpen && showForm && (
          <>
            <DynamicForm
              fields={fields}
              layout={config.formLayout}
              visibleFieldKeys={visibleFields.length ? visibleFields : config.formLayout.map((x) => x.fieldKey)}
              values={values}
              onChange={onChange}
              onFieldBlur={onFieldBlur}
            />
            {error && <div className="form-error">{error}</div>}
            <button className="primary-btn" disabled={submitting} onClick={submit}>
              {submitting ? '提交中...' : '提交签到'}
            </button>
          </>
        )}

        {config.isOpen && !showForm && result && (
          <div className={`result-panel ${result.isSuccess ? 'success' : 'failure'}`}>
            <h2>{result.isSuccess ? '签到成功' : '签到失败'}</h2>
            <p>{result.resultMessage}</p>
            <p className="meta">第 {result.submitIndex} 次提交</p>
            <button className="secondary-btn" onClick={restart}>重新签到</button>
          </div>
        )}

        {config.footerHtml && (
          <div className="footer" dangerouslySetInnerHTML={{ __html: config.footerHtml }} />
        )}
      </div>
    </div>
  );
}
