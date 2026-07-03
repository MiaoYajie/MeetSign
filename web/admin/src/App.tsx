import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './context/AuthContext';
import { AdminLayout } from './pages/EventsPage';
import EventsPage from './pages/EventsPage';
import EventEditPage from './pages/EventEditPage';
import EventSessionsPage from './pages/EventSessionsPage';
import LoginPage from './pages/LoginPage';
import SessionAttendancePage from './pages/SessionAttendancePage';
import SessionSharePage from './pages/SessionPages';
import './App.css';

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id/edit" element={<EventEditPage />} />
              <Route path="/sessions" element={<EventSessionsPage />} />
              <Route path="/sessions/:id/share" element={<SessionSharePage />} />
              <Route path="/sessions/:id/attendance" element={<SessionAttendancePage />} />
              <Route path="/sessions/:id/attendees" element={<Navigate to="../attendance" replace />} />
              <Route path="/sessions/:id/records" element={<Navigate to="../attendance" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
