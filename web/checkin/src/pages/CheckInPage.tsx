import {
  CheckInPanel,
  DynamicForm,
  ResultPanel,
  clearCachedResult,
  getCachedResult,
  getClientFingerprint,
  getVisibleFieldKeys,
  mergePanelConfig,
  resolveResultPageStyle,
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
  const panelConfig = useMemo(() => mergePanelConfig(config?.panelConfig), [config]);

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

    let cancelled = false;

    const cached = getCachedResult(token);
    if (cached) {
      setResult(cached);
      setShowForm(false);
    }

    publicApi
      .getConfig(token)
      .then(async ({ data }) => {
        if (cancelled) return;
        setConfig(data);
        try {
          const { data: evalData } = await publicApi.evaluate(token, {});
          if (!cancelled) setVisibleFields(evalData.visibleFields);
        } catch {
          if (!cancelled) {
            setVisibleFields(
              getVisibleFieldKeys(data.formLayout, data.conditions, { partialValues: {} })
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('签到链接无效或已失效');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '提交失败';
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

  const checkInPageStyle = config.backgroundUrl
    ? { backgroundImage: `url(${config.backgroundUrl})` }
    : undefined;

  const visibleFieldKeys = visibleFields.length
    ? visibleFields
    : config.formLayout.map((x) => x.fieldKey);

  if (!config.isOpen) {
    return (
      <div className="checkin-page" style={checkInPageStyle}>
        <CheckInPanel
          eventName={config.eventName}
          panelConfig={panelConfig}
          logoUrl={config.logoUrl}
          sessionName={config.sessionName}
          footerHtml={config.footerHtml}
          fields={fields}
          layout={config.formLayout}
          visibleFieldKeys={[]}
          values={{}}
          onChange={() => undefined}
          showSubmitButton={false}
          formSlot={<div className="closed-message">{config.closedMessage}</div>}
        />
      </div>
    );
  }

  if (!showForm && result) {
    const resultConfig = result.isSuccess
      ? panelConfig.successResult
      : panelConfig.failureResult;

    return (
      <div
        className="checkin-page"
        style={resolveResultPageStyle(resultConfig, config.backgroundUrl)}
      >
        <ResultPanel
          resultConfig={resultConfig}
          message={result.resultMessage}
          logoUrl={config.logoUrl}
          footerHtml={config.footerHtml}
          onButtonClick={restart}
        />
      </div>
    );
  }

  return (
    <div className="checkin-page" style={checkInPageStyle}>
      <CheckInPanel
        eventName={config.eventName}
        panelConfig={panelConfig}
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
        formSlot={
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
        }
      />
    </div>
  );
}
