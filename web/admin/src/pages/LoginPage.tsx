import { Button, Card, Form, Input, Tabs, message } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } =
        mode === 'login'
          ? await authApi.login(values.email, values.password)
          : await authApi.register(values.email, values.password);
      login(data.token, data.email, data.userId);
      message.success(mode === 'login' ? '登录成功' : '注册成功');
      navigate('/events');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fb' }}>
      <Card title="MeetSign 管理端" style={{ width: 420 }}>
        <Tabs
          activeKey={mode}
          onChange={(key) => setMode(key as 'login' | 'register')}
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {mode === 'login' ? '登录' : '注册'}
          </Button>
        </Form>
        <div style={{ marginTop: 16 }}>
          <Link to="/events">返回首页</Link>
        </div>
      </Card>
    </div>
  );
}
