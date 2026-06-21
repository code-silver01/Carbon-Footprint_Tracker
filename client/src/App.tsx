import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import { Navbar } from './components/common/Navbar';

// Lazy load pages for performance
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Calculator = React.lazy(() => import('./pages/Calculator').then(m => ({ default: m.CarbonCalculator })));
const Advisor = React.lazy(() => import('./pages/Advisor'));
const Roadmaps = React.lazy(() => import('./pages/Roadmaps'));

const ProtectedLayout: React.FC = () => (
  <>
    <Navbar />
    <ProtectedRoute />
  </>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="animated-bg"></div>
      <Router>
        <React.Suspense fallback={<div className="global-loader" />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/advisor" element={<Advisor />} />
              <Route path="/roadmaps" element={<Roadmaps />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </React.Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;
