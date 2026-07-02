import { Button, Card, Input, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sessionsApi, type AttendanceItem, type FieldColumn } from '../api/client';
import { SessionAttendeesImportPanel } from './SessionPages';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  success: { label: '已签到', color: 'success' },
  failed: { label: '签到失败', color: 'error' },
  not_checked_in: { label: '未签到', color: 'default' },
};

export default function SessionAttendancePage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [columns, setColumns] = useState<FieldColumn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await sessionsApi.getAttendance(id, page, 20, keyword || undefined, status);
      setItems(data.items);
      setColumns(data.columns);
      setTotal(data.total);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [id, page, keyword, status]);

  useEffect(() => {
    load();
  }, [load]);

  const exportRecords = async () => {
    if (!id) return;
    try {
      const { data } = await sessionsApi.exportRecords(id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'checkin-records.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('导出失败');
    }
  };

  const deleteAttendee = async (attendeeId: string) => {
    if (!id) return;
    try {
      await sessionsApi.deleteAttendee(id, attendeeId);
      message.success('已删除');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '删除失败';
      message.error(msg);
    }
  };

  const fieldColumns = useMemo(
    () =>
      columns.map((col) => ({
        title: col.label,
        render: (_: unknown, row: AttendanceItem) => row.fieldValues[col.key] ?? '',
      })),
    [columns]
  );

  return (
    <Card
      title="名单与签到"
      extra={
        <Space>
          <Link to={`/sessions/${id}/share`}>返回分享</Link>
          <Button onClick={exportRecords}>导出 Excel</Button>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'overview',
            label: '数据概览',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Space wrap>
                  <Input.Search
                    allowClear
                    placeholder="搜索姓名、单位等字段"
                    style={{ width: 280 }}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onSearch={(value) => {
                      setPage(1);
                      setKeyword(value.trim());
                    }}
                  />
                  <Select
                    allowClear
                    placeholder="签到状态"
                    style={{ width: 140 }}
                    value={status}
                    onChange={(value) => {
                      setPage(1);
                      setStatus(value);
                    }}
                    options={[
                      { value: 'success', label: '已签到' },
                      { value: 'not_checked_in', label: '未签到' },
                      { value: 'failed', label: '签到失败' },
                    ]}
                  />
                  <Button onClick={load}>刷新</Button>
                </Space>
                <Table
                  rowKey="rowKey"
                  loading={loading}
                  dataSource={items}
                  pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
                  columns={[
                    ...fieldColumns,
                    {
                      title: '来源',
                      dataIndex: 'inPresetList',
                      render: (v: boolean) => (v ? '预设名单' : '提交记录'),
                    },
                    {
                      title: '签到状态',
                      dataIndex: 'status',
                      render: (v: string) => {
                        const meta = STATUS_MAP[v] ?? { label: v, color: 'default' };
                        return <Tag color={meta.color}>{meta.label}</Tag>;
                      },
                    },
                    {
                      title: '最近签到',
                      dataIndex: 'latestCheckedInAt',
                      render: (v?: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
                    },
                    { title: '提交次数', dataIndex: 'submitCount' },
                    {
                      title: '结果消息',
                      dataIndex: 'resultMessage',
                      render: (v?: string) => v ?? '-',
                    },
                    {
                      title: '操作',
                      render: (_: unknown, row: AttendanceItem) =>
                        row.status === 'not_checked_in' && row.attendeeId ? (
                          <Popconfirm
                            title="确定删除该未签到记录？"
                            onConfirm={() => deleteAttendee(row.attendeeId!)}
                          >
                            <Button type="link" size="small" danger>删除</Button>
                          </Popconfirm>
                        ) : null,
                    },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: 'import',
            label: '导入名单',
            children: <SessionAttendeesImportPanel sessionId={id!} onImported={load} />,
          },
        ]}
      />
    </Card>
  );
}
