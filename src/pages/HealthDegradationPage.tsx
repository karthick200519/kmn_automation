import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useMotors } from '../hooks/useMotors';
import { getSeverityColorClass, formatTimeAgo, getDataFreshness } from '../utils/formatters';
import { Activity, ShieldCheck, TrendingDown, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export const HealthDegradationPage: React.FC = () => {
  const { motors, loading, error, refresh } = useMotors();

  const chartData = motors.map((m) => ({
    motorName: `Motor ${m.motor_number}`,
    healthIndex: Number(m.health_index ?? 100),
    degradationRate: Number(m.degradation_rate ?? 0),
    severity: m.severity || 'low',
    class_name: m.class_name || 'Healthy',
  }));

  return (
    <MainLayout pageTitle="Machine Health & Degradation Analytics">
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Realtime Machine Health Index & Degradation Tracking</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live values from Supabase tables machine_health, motor_severity, and motor_degradation
            </p>
          </div>

          <button
            onClick={() => refresh()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Health Data
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Health data error: {error}</span>
          </div>
        )}

        {/* 3 Motor Health Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                <div className="h-12 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {motors.map((m) => {
              const healthScore = Number(m.health_index ?? 100);
              const freshness = getDataFreshness(m.sensor_timestamp);

              return (
                <div key={m.motor_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Motor {m.motor_number}: {m.motor_name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">ID: {m.motor_id.substring(0, 8)}...</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${freshness.colorClass}`}>
                      {freshness.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Index</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">
                        {healthScore.toFixed(0)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${getSeverityColorClass(m.severity || m.motor_status)}`}>
                      {m.health_status || m.motor_status || 'Optimal'}
                    </span>
                  </div>

                  {/* Health Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        healthScore < 50 ? 'bg-red-500' : healthScore < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
                    />
                  </div>

                  <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> AI Fault Diagnosis:
                      </span>
                      <span className="font-bold text-slate-900 truncate max-w-[150px]" title={m.class_name || 'Healthy'}>
                        {m.class_name || 'Healthy'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5 text-amber-500" /> Degradation Status:
                      </span>
                      <span className="font-bold text-slate-800">{m.degradation_status || 'Stable'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Degradation Rate:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {m.degradation_rate != null ? `${Number(m.degradation_rate).toFixed(2)} %/hr` : '0.00 %/hr'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Last Evaluated:
                    </span>
                    <strong>{formatTimeAgo(m.sensor_timestamp)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Health Comparison Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Fleet Machine Health Comparison Score</h3>
              <p className="text-xs text-slate-500">Official health score dynamically stored in machine_health table</p>
            </div>
          </div>

          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No health index data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="motorName" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip formatter={(val: any) => [`${val} / 100`, 'Health Index']} />
                  <Bar dataKey="healthIndex" name="Health Index" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.healthIndex < 50 ? '#EF4444' : entry.healthIndex < 75 ? '#F59E0B' : '#10B981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HealthDegradationPage;
