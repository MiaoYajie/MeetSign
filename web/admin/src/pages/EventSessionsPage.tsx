import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { eventsApi, sessionsApi, type EventListItem, type SessionListItem } from '../api/client';

function normalizeSession(raw: Record<string, unknown>): SessionListItem {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    eventId: String(raw.eventId ?? raw.EventId ?? ''),
    eventName: String(raw.eventName ?? raw.EventName ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    openStart: String(raw.openStart ?? raw.OpenStart ?? ''),
    openEnd: String(raw.openEnd ?? raw.OpenEnd ?? ''),
    publicToken: String(raw.publicToken ?? raw.PublicToken ?? ''),
    attendeeCount: Number(raw.attendeeCount ?? raw.AttendeeCount ?? 0),
    recordCount: Number(raw.recordCount ?? raw.RecordCount ?? 0),
  };
}

export default function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterEventId = searchParams.get('eventId') ?? undefined;
  const isAllSessions = !filterEventId;

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionListItem | null>(null);
  const [form] = Form.useForm();

  const eventName = useMemo(
    () => events.find((e) => e.id === filterEventId)?.name,
    [events, filterEventId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (filterEventId) {
        const { data } = await eventsApi.listSessions(filterEventId);
        setSessions(data.map((item) => normalizeSession(item as unknown as Record<string, unknown>)));
      } else {
        const { data } = await sessionsApi.list();
        setSessions(data.map((item) => normalizeSession(item as unknown as Record<string, unknown>)));
      }
    } catch {
      message.error('加载场次失败，请确认后端已重启');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [filterEventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    eventsApi.list().then(({ data }) => setEvents(data)).catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditingSession(null);
    form.resetFields();
    if (filterEventId) {
      form.setFieldValue('eventId', filterEventId);
    }
    setOpen(true);
  };

  const openEdit = (session: SessionListItem) => {
    setEditingSession(session);
    form.setFieldsValue({
      name: session.name,
      range: [dayjs(session.openStart), dayjs(session.openEnd)],
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingSession(null);
    form.resetFields();
  };

  const saveSession = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      openStart: values.range[0].toISOString(),
      openEnd: values.range[1].toISOString(),
    };

    try {
      if (editingSession) {
        await sessionsApi.update(editingSession.id, payload);
        message.success('场次已更新');
      } else {
        const targetEventId = filterEventId ?? values.eventId;
        if (!targetEventId) {
          message.warning('请选择所属活动');
          return;
        }
        await eventsApi.createSession(targetEventId, payload);
        message.success('场次已创建');
      }
      closeModal();
      load();
    } catch {
      message.error('保存失败');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await sessionsApi.delete(sessionId);
      message.success('场次已删除');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <Card
      title={filterEventId && eventName ? `签到场次：${eventName}` : '签到场次'}
      extra={
        <Space>
          {filterEventId ? (
            <Button type="link" onClick={() => setSearchParams({})}>查看全部场次</Button>
          ) : (
            <Link to="/events">活动列表</Link>
          )}
          {filterEventId && <Link to={`/events/${filterEventId}/edit`}>编辑活动</Link>}
          <Button type="primary" onClick={openCreate}>新建场次</Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={sessions}
        columns={[
          ...(isAllSessions
            ? [{
                title: '所属活动',
                dataIndex: 'eventName' as const,
                render: (value: string, row: SessionListItem) => value || row.eventName || '-',
              }]
            : []),
          { title: '场次名称', dataIndex: 'name' },
          {
            title: '开放时间',
            render: (_, row) =>
              `${dayjs(row.openStart).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(row.openEnd).format('YYYY-MM-DD HH:mm')}`,
          },
          { title: '名单数', dataIndex: 'attendeeCount' },
          { title: '签到记录', dataIndex: 'recordCount' },
          {
            title: '操作',
            render: (_, row) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(row)}>编辑</Button>
                <Link to={`/sessions/${row.id}/share`}>分享</Link>
                <Link to={`/sessions/${row.id}/attendance`}>名单签到</Link>
                <Popconfirm title="确定删除该场次？" onConfirm={() => deleteSession(row.id)}>
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editingSession ? '编辑签到场次' : '新建签到场次'}
        open={open}
        onCancel={closeModal}
        onOk={saveSession}
      >
        <Form form={form} layout="vertical" initialValues={{ eventId: filterEventId }}>
          {isAllSessions && !editingSession && (
            <Form.Item name="eventId" label="所属活动" rules={[{ required: true, message: '请选择活动' }]}>
              <Select
                placeholder="选择活动"
                options={events.map((e) => ({ value: e.id, label: e.name }))}
              />
            </Form.Item>
          )}
          <Form.Item name="name" label="场次名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="range" label="开放时段" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
