import { Button, Card, Layout, Menu, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { eventsApi, type EventListItem } from '../api/client';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Sider } = Layout;

function menuSelectedKey(pathname: string) {
  if (pathname.startsWith('/sessions')) {
    return '/sessions';
  }
  if (pathname.startsWith('/events')) {
    return '/events';
  }
  return pathname;
}

export function AdminLayout() {
  const { email, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token && !location.pathname.startsWith('/login')) {
      navigate('/login');
    }
  }, [token, location.pathname, navigate]);

  if (!token) return <Outlet />;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
        <strong>MeetSign 管理端</strong>
        <Space>
          <span>{email}</span>
          <Button size="small" onClick={() => { logout(); navigate('/login'); }}>退出</Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={220}>
          <Menu
            mode="inline"
            selectedKeys={[menuSelectedKey(location.pathname)]}
            items={[
              { key: '/events', label: <Link to="/events">活动列表</Link> },
              { key: '/sessions', label: <Link to="/sessions">签到场次</Link> },
            ]}
          />
        </Sider>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await eventsApi.list();
      setEvents(data);
    } catch {
      message.error('加载活动失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createEvent = async () => {
    try {
      const { data } = await eventsApi.create('新活动');
      message.success('已创建活动');
      navigate(`/events/${data.id}/edit`);
    } catch {
      message.error('创建失败');
    }
  };

  return (
    <Card
      title="活动列表"
      extra={<Button type="primary" onClick={createEvent}>新建活动</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={events}
        columns={[
          { title: '名称', dataIndex: 'name' },
          {
            title: '签到模式',
            dataIndex: 'checkInMode',
            render: (v: string) => (
              <Tag color={v === 'PresetList' ? 'blue' : 'green'}>
                {v === 'PresetList' ? '预设名单' : '自由签到'}
              </Tag>
            ),
          },
          { title: '场次数', dataIndex: 'sessionCount' },
          {
            title: '操作',
            render: (_, row) => (
              <Space>
                <Link to={`/events/${row.id}/edit`}>编辑</Link>
                <Link to={`/sessions?eventId=${row.id}`}>场次</Link>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
