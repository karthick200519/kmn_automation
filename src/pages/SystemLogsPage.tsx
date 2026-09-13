import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { SystemLog } from '../types/database';
import { logService } from '../services/logService';
import { formatTimeAgo, getSeverityColorClass } from '../utils/formatters';
import { Terminal, Filter, Search } from 'lucide-react';

export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let active = true;
    logService.getSystemLogs(50, eventTypeFilter).then((data) => {
      if (active) setLogs(data);
    });
    return () => {
      active = false;
    };
  }, [eventTypeFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    return (
      l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.user_name && l.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <MainLayout pageTitle="System Audit Logs">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-700" />
            <span>Structured Security & Operational Event Audit Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit trail of authentication, relay controls, and DL inferences</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Event Types</option>
              <option value="Login">Login / Auth</option>
              <option value="AI Inference">AI Inference</option>
              <option value="GPIO">GPIO Control</option>
              <option value="Emergency">Emergency Trip</option>
              <option value="Modbus Communication">Modbus RTU</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Initiated By</th>
                <th className="py-3 px-3">Motor</th>
                <th className="py-3 px-4">Message Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatTimeAgo(l.timestamp)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{l.event_type}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(l.severity)}`}>
                      {l.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-sans">{l.user_name || 'System'}</td>
                  <td className="py-2.5 px-3 font-sans font-bold">{l.motor_number ? `Motor ${l.motor_number}` : '-'}</td>
                  <td className="py-2.5 px-4 text-slate-800 font-sans">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </MainLayout>
  );
};
