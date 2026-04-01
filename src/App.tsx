import React from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeView from './components/EmployeeView';
import AdminView from './components/AdminView';
import { Shield } from 'lucide-react';

function AdminAccess() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 opacity-30 hover:opacity-100 transition-opacity z-40">
      <button onClick={() => navigate('/admin')} className="bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700">
        <Shield className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-stone-50">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<EmployeeView />} />
          <Route path="/admin" element={<AdminView />} />
        </Routes>
        <AdminAccess />
      </div>
    </Router>
  );
}
