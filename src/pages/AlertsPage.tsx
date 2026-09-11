import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { Alert } from '../types/database';
import { alertService } from '../services/alertService';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo, getSeverityColorClass } from '../utils/formatters';
import { Bell, CheckCircle, ShieldAlert, Filter } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchAlerts = async () => {
    const data = await alertService.getActiveAlerts();
    setAlerts(data);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    if (!profile?.id) return;
    await alertService.acknowledgeAlert(alertId, profile.id);
    await fetchAlerts();
  };

  const handleResolve = async (alertId: string) => {
    await alertService.resolveAlert(alertId);
    await fetchAlerts();
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  return (
    <MainLayout pageTitle="System Alerts & Alarm Management">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            <span>Active & Historical System Alerts</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated telemetry limit breaches and DL fault alarms</p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent focus:outline-none text-slate-700 cursor-pointer"
          >
            <option value="all">All Alerts</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                <th className="py-3 px-4">Motor</th>
                <th className="py-3 px-4">Alarm Title</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Acknowledged By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {al.motor_name || `Motor ${al.motor_number || 1}`}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{al.title}</p>
                      <p className="text-[11px] text-slate-500">{al.message}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(al.severity)}`}>
                        {al.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 capitalize font-bold text-slate-800">{al.status}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{formatTimeAgo(al.timestamp)}</td>
                    <td className="py-3 px-3 text-slate-600">{al.acknowledged_by_name || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {al.status === 'active' && (
                          <button
                            onClick={() => handleAcknowledge(al.id)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[11px]"
                          >
                            Acknowledge
                          </button>
                        )}
                        {al.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolve(al.id)}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold text-[11px]"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </MainLayout>
  );
};
