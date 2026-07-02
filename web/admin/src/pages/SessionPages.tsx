import { Button, Card, Input, Space, Tabs, Typography, Upload, message } from 'antd';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventsApi, sessionsApi, type EventDetail, type SessionDetail } from '../api/client';

function showImportResult(data: { importedCount: number; skippedCount: number; errors: string[] }) {
  message.success(`导入成功 ${data.importedCount} 条，跳过 ${data.skippedCount} 条`);
  if (data.errors.length) message.warning(data.errors.slice(0, 3).join('；'));
}

export default function SessionSharePage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    sessionsApi.get(id).then(({ data }) => setSession(data));
    sessionsApi.getQrCodeBlob(id).then(({ data }) => {
      setQrUrl(URL.createObjectURL(data));
    });
  }, [id]);

  useEffect(() => () => {
    if (qrUrl) URL.revokeObjectURL(qrUrl);
  }, [qrUrl]);

  if (!session) return <Card loading>加载中...</Card>;

  return (
    <Card title="分享签到页" extra={<Link to={`/events/${session.eventId}/sessions`}>返回场次</Link>}>
      <Space direction="vertical" size="large">
        <div>
          <Typography.Text strong>签到链接</Typography.Text>
          <div>
            <a href={session.publicUrl} target="_blank" rel="noreferrer">{session.publicUrl}</a>
          </div>
        </div>
        <div>
          <Typography.Text strong>二维码</Typography.Text>
          <div>
            <img
              src={qrUrl ?? undefined}
              alt="QR Code"
              style={{ width: 220, height: 220, border: '1px solid #eee' }}
            />
          </div>
        </div>
      </Space>
    </Card>
  );
}

export function SessionAttendeesImportPanel({
  sessionId,
  onImported,
}: {
  sessionId: string;
  onImported?: () => void;
}) {
  const [count, setCount] = useState(0);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [manualText, setManualText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pendingCursorRef = useRef<{ el: HTMLTextAreaElement; pos: number } | null>(null);

  useLayoutEffect(() => {
    if (!pendingCursorRef.current) return;
    const { el, pos } = pendingCursorRef.current;
    el.focus();
    el.setSelectionRange(pos, pos);
    pendingCursorRef.current = null;
  }, [manualText]);

  const refreshCount = async () => {
    const { data } = await sessionsApi.getAttendeeCount(sessionId);
    setCount(data.count);
  };

  useEffect(() => {
    refreshCount();
    sessionsApi.get(sessionId).then(({ data }) => {
      eventsApi.get(data.eventId).then(({ data: eventData }) => setEvent(eventData));
    });
  }, [sessionId]);

  const fieldHeaderExample = useMemo(() => {
    if (!event) return '姓名\t单位\t座位号码';
    return event.fields.map((f) => f.label).join('\t');
  }, [event]);

  const placeholder = `${fieldHeaderExample}\n张三\t某某单位\tA01\n李四\t另一单位\tA02`;

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    pendingCursorRef.current = { el: textarea, pos: start + 1 };
    setManualText((prev) => prev.slice(0, start) + '\t' + prev.slice(end));
  };

  const afterImport = async (data: { importedCount: number; skippedCount: number; errors: string[] }) => {
    showImportResult(data);
    await refreshCount();
    onImported?.();
  };

  const importFile = async (file: File) => {
    try {
      const { data } = await sessionsApi.importAttendees(sessionId, file);
      await afterImport(data);
    } catch {
      message.error('导入失败');
    }
    return false;
  };

  const importManual = async () => {
    if (!manualText.trim()) {
      message.warning('请输入名单内容');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await sessionsApi.importAttendeesText(sessionId, manualText);
      setManualText('');
      await afterImport(data);
    } catch {
      message.error('导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div>当前名单数量：{count}</div>
      <Tabs
        items={[
          {
            key: 'file',
            label: '文件上传',
            children: (
              <Space direction="vertical">
                <Upload beforeUpload={importFile} accept=".xlsx,.xls,.csv" maxCount={1}>
                  <Button type="primary">上传 Excel / CSV</Button>
                </Upload>
                <Typography.Text type="secondary">
                  表头请使用字段显示名（姓名、单位、座位号码）或字段键（name、organization、seatNumber）。
                </Typography.Text>
              </Space>
            ),
          },
          {
            key: 'manual',
            label: '手动录入',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Text type="secondary">
                  使用 Tab 键分隔单元格，换行分隔每一行。第一行可为表头（{fieldHeaderExample}），也可直接按字段顺序录入数据。
                </Typography.Text>
                <Input.TextArea
                  rows={12}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={handleManualKeyDown}
                  placeholder={placeholder}
                  style={{ fontFamily: 'Consolas, monospace' }}
                />
                <Button type="primary" loading={submitting} onClick={importManual}>
                  导入名单
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
