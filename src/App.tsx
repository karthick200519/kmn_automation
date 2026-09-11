import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLoader } from './components/common/AppLoader';

import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { MotorsPage } from './pages/MotorsPage';
import { MotorDetailPage } from './pages/MotorDetailPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { FaultDiagnosisPage } from './pages/FaultDiagnosisPage';
import { HealthDegradationPage } from './pages/HealthDegradationPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { SchedulePage } from './pages/SchedulePage';
import { AlertsPage } from './pages/AlertsPage';
import { ControlPage } from './pages/ControlPage';
import { ReportsPage } from './pages/ReportsPage';
import { SystemLogsPage } from './pages/SystemLogsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setIsBooting(false);
    }, 950);
    return () => clearTimeout(bootTimer);
  }, []);

  if (isBooting) {
    return <AppLoader fullScreen />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated All Roles (Admin, Engineer, Operator) */}
          <Route
            path="/overview"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <OverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/motors"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <MotorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/motors/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <MotorDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-monitoring"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <LiveMonitoringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fault-diagnosis"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <FaultDiagnosisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-degradation"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <HealthDegradationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer', 'operator']}>
                <ControlPage />
              </ProtectedRoute>
            }
          />

          {/* Admin & Engineer Only */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-logs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <SystemLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Only */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Index & Fallback Redirection */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
