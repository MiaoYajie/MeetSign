import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CheckInPage from './pages/CheckInPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/c/:token" element={<CheckInPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
