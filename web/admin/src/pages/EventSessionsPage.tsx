import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventsApi, sessionsApi, type SessionListItem } from '../api/client';

export default function EventSessionsPage() {
  const { id } = useParams<{ id: string }>();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionListItem | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await eventsApi.listSessions(id);
      setSessions(data);
    } catch {
      message.error('加载场次失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openCreate = () => {
    setEditingSession(null);
    form.resetFields();
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
    if (!id) return;
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      openStart: values.range[0].toISOString(),
      openEnd: values.range[1].toISOString(),
    };

    if (editingSession) {
      await sessionsApi.update(editingSession.id, payload);
      message.success('场次已更新');
    } else {
      await eventsApi.createSession(id, payload);
      message.success('场次已创建');
    }

    closeModal();
    load();
  };

  const deleteSession = async (sessionId: string) => {
    await sessionsApi.delete(sessionId);
    message.success('场次已删除');
    load();
  };

  return (
    <Card
      title="签到场次"
      extra={
        <Space>
          <Link to={`/events/${id}/edit`}>返回活动</Link>
          <Button type="primary" onClick={openCreate}>新建场次</Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={sessions}
        columns={[
          { title: '名称', dataIndex: 'name' },
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
        <Form form={form} layout="vertical">
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
