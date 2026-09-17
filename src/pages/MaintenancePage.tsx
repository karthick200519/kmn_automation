import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useMotors } from '../hooks/useMotors';
import { useMaintenance } from '../hooks/useMaintenance';
import { formatDateTime, formatTimeAgo, formatTimeHHMMSS, getSeverityColorClass, mapDecisionText, formatConfidence } from '../utils/formatters';
import { Wrench, RefreshCw, ShieldCheck, Clock, Calendar } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const { motors, loading: motorsLoading, refresh: refreshMotors } = useMotors();
  const { decisions, schedules, loading: maintLoading, refresh: refreshMaint } = useMaintenance();

  const newestTimestamp = decisions.reduce<string | null>((acc, d) => {
    if (!d.timestamp) return acc;
    if (!acc) return d.timestamp;
    return new Date(d.timestamp) > new Date(acc) ? d.timestamp : acc;
  }, null);

  const handleRefresh = () => {
    refreshMotors();
    refreshMaint();
  };

  return (
    <MainLayout pageTitle="Predictive Maintenance Decisions & Action Logs">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span>Supabase Predictive Maintenance Decision Engine</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live automated recommendations calculated from machine_health and ai_predictions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Updated:</span>
              <strong className="text-slate-800 font-mono">{formatTimeHHMMSS(newestTimestamp)}</strong>
            </span>

            <button
              onClick={() => navigate('/schedule')}
              className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-lg border border-blue-200 flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-4 h-4" /> Manage Schedules ({schedules.length})
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${motorsLoading || maintLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Current Decision Cards per Motor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {motors.map((m) => {
            const decInfo = mapDecisionText(m.maintenance_decision);

            return (
              <div key={m.motor_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-bold text-slate-900 text-sm">Motor {m.motor_number}: {m.motor_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityColorClass(m.severity || m.motor_status)}`}>
                      {m.severity || m.motor_status}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maintenance Status</p>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${decInfo.color}`}>
                        {decInfo.title}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Detected AI Condition:</span>
                      <strong className="text-slate-900 text-right ml-2 truncate max-w-[150px]" title={m.class_name || 'Healthy'}>
                        {m.class_name || 'Healthy'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>AI Confidence:</span>
                      <strong className="text-blue-600 font-mono">
                        {formatConfidence(m.confidence)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Health Index:</span>
                      <strong className="text-slate-900 font-mono">
                        {m.health_index ?? 100} / 100
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <p className="font-bold mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> Prescriptive Action Plan:
                    </p>
                    <p>{m.maintenance_recommendation || 'No immediate corrective action required.'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Decision Time:
                  </span>
                  <strong>{formatTimeAgo(m.sensor_timestamp)}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Maintenance Decisions Database Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Historical Maintenance Decisions Log (maintenance_decisions)</h3>
            <span className="text-xs text-slate-500">Total Records: <strong>{decisions.length}</strong></span>
          </div>

          {maintLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading maintenance decisions...</div>
          ) : decisions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No decision records logged yet in maintenance_decisions.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="py-2.5 px-4">Motor ID</th>
                    <th className="py-2.5 px-4">Decision</th>
                    <th className="py-2.5 px-6">Action Recommendation</th>
                    <th className="py-2.5 px-4">Decision Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {decisions.slice(0, 20).map((d) => {
                    const dec = mapDecisionText(d.decision);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.motor_id.substring(0, 8)}...</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${dec.color}`}>
                            {dec.title}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-slate-700">{d.recommendation}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{formatDateTime(d.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default MaintenancePage;
