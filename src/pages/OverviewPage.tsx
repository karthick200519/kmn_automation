import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useMotors } from '../hooks/useMotors';
import { useAlerts } from '../hooks/useAlerts';
import { useMaintenance } from '../hooks/useMaintenance';
import { monitoringService } from '../services/monitoringService';
import {
  formatVoltage,
  formatCurrent,
  formatTemperature,
  formatVibration,
  formatPower,
  formatEnergy,
  formatFrequency,
  formatPowerFactor,
  formatTimeAgo,
  formatTimeHHMMSS,
  getDataFreshness,
  getSeverityColorClass,
  formatConfidence,
} from '../utils/formatters';

import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Activity,
  Calendar,
  Bell,
  ChevronRight,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type HealthTrendPoint = {
  time: string;
  M1?: number;
  M2?: number;
  M3?: number;
};

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { motors, loading: motorsLoading, error: motorsError, refresh: refreshMotors } = useMotors();
  const { alerts, loading: alertsLoading } = useAlerts();
  const { schedules } = useMaintenance();

  const [healthTrendData, setHealthTrendData] = useState<HealthTrendPoint[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchHealthTrends = async () => {
      if (motors.length === 0) return;
      const selectedMotors = motors.slice(0, 3);
      try {
        const histories = await Promise.all(
          selectedMotors.map(async (motor) => {
            try {
              const history = await monitoringService.getHealthHistory(motor.motor_id, 30);
              return { motorNumber: motor.motor_number, history };
            } catch {
              return { motorNumber: motor.motor_number, history: [] };
            }
          })
        );

        if (!mounted) return;

        const grouped = new Map<number, HealthTrendPoint>();
        histories.forEach(({ motorNumber, history }) => {
          history.forEach((point, idx) => {
            const timestampMs = new Date(point.timestamp).getTime();
            const key = Number.isFinite(timestampMs) ? Math.floor(timestampMs / 10000) * 10000 : idx;

            if (!grouped.has(key)) {
              grouped.set(key, {
                time: Number.isFinite(timestampMs)
                  ? new Date(key).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : `Point ${idx + 1}`,
              });
            }

            const row = grouped.get(key)!;
            const health = Number(point.health_index);
            if (!Number.isFinite(health)) return;

            if (motorNumber === 1) row.M1 = health;
            else if (motorNumber === 2) row.M2 = health;
            else if (motorNumber === 3) row.M3 = health;
          });
        });

        const chartData = Array.from(grouped.entries())
          .sort(([tsA], [tsB]) => tsA - tsB)
          .map(([, val]) => val)
          .slice(-30);

        setHealthTrendData(chartData);
      } catch (err) {
        console.error('Failed health trend aggregation:', err);
      }
    };

    fetchHealthTrends();

    return () => {
      mounted = false;
    };
  }, [motors]);

  const totalCount = motors.length;
  const healthyCount = motors.filter(
    (m) =>
      m.motor_status === 'healthy' ||
      m.health_status === 'healthy' ||
      m.health_status === 'Optimal' ||
      m.health_status === 'Good'
  ).length;
  const warningCount = motors.filter(
    (m) =>
      m.motor_status === 'warning' ||
      m.health_status === 'warning' ||
      m.severity === 'medium' ||
      m.severity === 'warning' ||
      m.health_status === 'Degraded'
  ).length;
  const criticalCount = motors.filter(
    (m) =>
      m.motor_status === 'fault' ||
      m.severity === 'critical' ||
      m.severity === 'high' ||
      m.severity === 'fault' ||
      m.health_status === 'degraded' ||
      m.health_status === 'Critical'
  ).length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;

  const newestTelemetryTime = motors.reduce<string | null>((acc, m) => {
    if (!m.sensor_timestamp) return acc;
    if (!acc) return m.sensor_timestamp;
    return new Date(m.sensor_timestamp) > new Date(acc) ? m.sensor_timestamp : acc;
  }, null);

  const globalFreshness = getDataFreshness(newestTelemetryTime);
  const isGatewayOffline = globalFreshness.label === 'STALE' || globalFreshness.label === 'OFFLINE';

  return (
    <MainLayout pageTitle="System Overview & Live Motor Fleet">
      <div className="space-y-6">
        {/* Gateway & Data Freshness Indicator Bar */}
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center space-x-3">
            <span
              className={`w-3 h-3 rounded-full ${
                isGatewayOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Gateway Status</span>
              <strong className="text-sm font-bold text-white">
                {isGatewayOffline ? 'OFFLINE / STOPPED' : 'ONLINE / RUNNING'}
              </strong>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Data Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block mt-0.5 ${globalFreshness.colorClass}`}>
                {globalFreshness.label}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Last Database Update</span>
              <strong className="text-xs font-mono text-white">
                {formatTimeHHMMSS(newestTelemetryTime)} <span className="text-slate-400 text-[11px] font-normal">({formatTimeAgo(newestTelemetryTime)})</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Error / Warning Alert Banner if Supabase is offline */}
        {motorsError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Database Notice:</strong> {motorsError}. Showing available cached system data.
              </span>
            </div>
            <button
              onClick={() => refreshMotors()}
              className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg flex items-center gap-1.5 transition-colors text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* 1. Top-Level KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Motors</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{motorsLoading ? '...' : totalCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">3 × 415 V Induction Motors</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Cpu className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Healthy Motors</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{motorsLoading ? '...' : healthyCount}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Normal Operation</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warning Motors</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{motorsLoading ? '...' : warningCount}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Inspection Advised</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Degraded / Critical</p>
              <p className="text-2xl font-black text-red-600 mt-1">{motorsLoading ? '...' : criticalCount}</p>
              <p className="text-[11px] text-red-600 mt-0.5">Immediate Attention</p>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg border border-red-100">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{alertsLoading ? '...' : activeAlertsCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">System Notifications</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
              <Bell className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2. Individual Live Motor Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Realtime Motor Monitoring Fleet
            </h2>
            <button
              onClick={() => navigate('/live-monitoring')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Live Waveforms & Wave Charts</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {motorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-20 bg-slate-100 rounded"></div>
                  <div className="h-16 bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : motors.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-base">No Motor Data Available</p>
              <p className="text-sm text-slate-400 mt-1">Check Supabase database connections and table seed scripts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {motors.map((m) => {
                const freshness = getDataFreshness(m.sensor_timestamp);
                const isCritical = m.severity === 'critical' || m.motor_status === 'fault';
                const isWarning = m.severity === 'medium' || m.motor_status === 'warning';

                return (
                  <div
                    key={m.motor_id}
                    onClick={() => navigate(`/motors/${m.motor_number}`)}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
                  >
                    {/* Top Status Strip */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        isCritical ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />

                    <div>
                      {/* Motor Card Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-8 h-8 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-xs border border-slate-300 shadow-xs">
                            M{m.motor_number}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                              {m.motor_name}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono">ID: {m.motor_id.substring(0, 8)}...</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Freshness Badge */}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${freshness.colorClass}`}>
                            {freshness.label}
                          </span>
                          {/* Severity / Status Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityColorClass(m.severity || m.motor_status)}`}>
                            {m.severity || m.motor_status}
                          </span>
                        </div>
                      </div>

                      {/* AI Diagnosis & Health Section */}
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> AI Diagnosis:
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[170px]" title={m.class_name || 'Healthy'}>
                            {m.class_name || 'Healthy'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Confidence:</span>
                          <span className="font-bold text-slate-800">{formatConfidence(m.confidence)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Health Index:</span>
                          <span className={`font-black ${m.health_index && m.health_index < 50 ? 'text-red-600' : m.health_index && m.health_index < 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {m.health_index ?? 100} / 100
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 truncate" title={m.maintenance_recommendation || 'Normal operation'}>
                          <strong className="text-slate-700">Recommendation:</strong> {m.maintenance_recommendation || 'No maintenance required.'}
                        </div>
                      </div>

                      {/* Monitored Parameters Grid (8 Required Parameters) */}
                      <div className="grid grid-cols-4 gap-2 mb-4 text-[11px] bg-white rounded-lg border border-slate-100 p-2.5 shadow-xs">
                        <div>
                          <p className="text-slate-400 font-medium">Voltage</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatVoltage(m.voltage)}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 font-medium">Current</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatCurrent(m.current)}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 font-medium">Temp</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatTemperature(m.temperature)}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 font-medium">Vibration</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatVibration(m.vibration_rms)}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-slate-400 font-medium">Power</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatPower(m.power)}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-slate-400 font-medium">Energy</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatEnergy(m.energy)}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-slate-400 font-medium">Freq</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatFrequency(m.frequency)}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-slate-400 font-medium">P. Factor</p>
                          <p className="font-bold text-slate-800 mt-0.5">{formatPowerFactor(m.power_factor)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Timestamp & Sync */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-auto">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Last Updated: <strong className="text-slate-700">{formatTimeHHMMSS(m.sensor_timestamp)}</strong>
                      </span>
                      <span>{formatTimeAgo(m.sensor_timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Health Trend Chart & Active Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Machine Health Index History Trend</h3>
                <p className="text-xs text-slate-500">Continuous telemetry score (0–100%) from Supabase machine_health</p>
              </div>

              <div className="flex items-center space-x-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Motor 1
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Motor 2
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Motor 3
                </span>
              </div>
            </div>

            <div className="h-64">
              {healthTrendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No historical health points available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="M1" name="Motor 1" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="M2" name="Motor 2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="M3" name="Motor 3" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Active Alerts Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Active System Alerts ({alerts.filter((a) => a.status === 'active').length})
                </h3>
                <button onClick={() => navigate('/alerts')} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                  View All
                </button>
              </div>

              {alerts.filter((a) => a.status === 'active').length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-60" />
                  No active system alerts. All motors operating within baseline limits.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {alerts
                    .filter((a) => a.status === 'active')
                    .slice(0, 4)
                    .map((alert) => (
                      <div key={alert.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{alert.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{alert.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(alert.timestamp)}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => navigate('/schedule')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" /> View Maintenance Schedule ({schedules.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default OverviewPage;