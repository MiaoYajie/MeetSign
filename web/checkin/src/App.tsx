import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CheckInPage from './pages/CheckInPage';
import './index.css';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <Routes>
        <Route path="/c/:token" element={<CheckInPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
