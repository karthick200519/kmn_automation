import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAlerts } from '../hooks/useAlerts';
import { useMotors } from '../hooks/useMotors';
import { useAuth } from '../context/AuthContextDef';
import { formatTimeAgo, formatTimeHHMMSS, getSeverityColorClass } from '../utils/formatters';
import { Bell, Filter, RefreshCw, AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { profile } = useAuth();
  const { motors } = useMotors();
  const [selectedMotorId, setSelectedMotorId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { alerts, loading, refresh, acknowledgeAlert } = useAlerts(
    selectedMotorId === 'all' ? undefined : selectedMotorId
  );

  const newestTimestamp = alerts.reduce<string | null>((acc, a) => {
    if (!a.timestamp) return acc;
    if (!acc) return a.timestamp;
    return new Date(a.timestamp) > new Date(acc) ? a.timestamp : acc;
  }, null);

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && a.status === 'active');

  return (
    <MainLayout pageTitle="System Alarms & Alert Notification Center">
      <div className="space-y-6">
        {/* Prominent Banner for Critical Alarms */}
        {criticalAlerts.length > 0 && (
          <div className="p-4 bg-red-600 text-white rounded-xl shadow-md border border-red-700 flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-3">
              <AlertOctagon className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Critical Alarms Active ({criticalAlerts.length})</h3>
                <p className="text-xs text-red-100">
                  {criticalAlerts[0].title}: {criticalAlerts[0].message}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-white text-red-600 px-3 py-1 rounded-full">
              CRITICAL EMERGENCY
            </span>
          </div>
        )}

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-600" />
              <span>Realtime Supabase System Alarms (alerts)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Automated limit breaches and AI fault notifications</p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Updated:</span>
              <strong className="text-slate-800 font-mono">{formatTimeHHMMSS(newestTimestamp)}</strong>
            </span>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMotorId}
                onChange={(e) => setSelectedMotorId(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 cursor-pointer"
              >
                <option value="all">All Motors</option>
                {motors.map((m) => (
                  <option key={m.motor_id} value={m.motor_id}>
                    Motor {m.motor_number} ({m.motor_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="acknowledged">Acknowledged Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>

            <button
              onClick={() => refresh()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              title="Refresh Alarms"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Alarms Feed</h3>
            <span className="text-xs text-slate-500">Filtered Alarms: <strong>{filteredAlerts.length}</strong></span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading system alarms...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-60" />
              No alerts match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="py-3 px-4">Motor</th>
                    <th className="py-3 px-4">Alarm Title & Details</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAlerts.map((al) => (
                    <tr
                      key={al.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        al.severity === 'critical' && al.status === 'active' ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {al.motor_name || `Motor ${al.motor_number || 1}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{al.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{al.message}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityColorClass(al.severity)}`}>
                          {al.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 capitalize font-bold text-slate-800">{al.status}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{formatTimeAgo(al.timestamp)}</td>
                      <td className="py-3 px-4 text-center">
                        {al.status === 'active' ? (
                          <button
                            onClick={() => acknowledgeAlert(al.id, profile?.id)}
                            className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[11px] transition-colors"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">Acknowledged</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AlertsPage;
