import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useMotors } from '../hooks/useMotors';
import { useTelemetry } from '../hooks/useTelemetry';
import type { TimeRange } from '../services/monitoringService';
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
  formatDateTime,
  getDataFreshness,
  getSeverityColorClass,
} from '../utils/formatters';
import { Radio, Cpu, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const LiveMonitoringPage: React.FC = () => {
  const { motors, loading: motorsLoading } = useMotors();
  const [selectedMotorId, setSelectedMotorId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');

  // Auto-select first motor when loaded
  const activeMotor = motors.find((m) => m.motor_id === selectedMotorId) || motors[0];
  const effectiveMotorId = activeMotor?.motor_id || '';

  const {
    telemetry,
    latestData,
    latestPrediction,
    latestHealth,
    loading: telemetryLoading,
    error,
    refresh,
  } = useTelemetry(effectiveMotorId, timeRange);

  const newestTimestamp =
    latestData?.timestamp ||
    latestPrediction?.timestamp ||
    latestHealth?.timestamp ||
    activeMotor?.sensor_timestamp;

  const freshness = getDataFreshness(newestTimestamp);

  const formattedChartData = telemetry.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    Voltage: d.voltage,
    Current: d.current,
    Temperature: d.temperature,
    Vibration: d.vibration_rms,
    Power: d.power ? (d.power > 100 ? d.power / 1000 : d.power) : null,
    Energy: d.energy,
    Frequency: d.frequency,
    PowerFactor: d.power_factor,
  }));

  const currentClassName = latestPrediction?.class_name || activeMotor?.class_name || 'Healthy';
  const currentClassId = latestPrediction?.class_id ?? activeMotor?.class_id ?? 0;
  const currentConfidence = latestPrediction?.confidence ?? activeMotor?.confidence ?? 0.985;
  const currentModelVersion = latestPrediction?.model_version || activeMotor?.model_version || '1D-CNN-v2.0';
  const currentHealthIndex = latestHealth?.health_index ?? activeMotor?.health_index ?? 100;
  const currentHealthStatus = latestHealth?.health_status || activeMotor?.health_status || 'Healthy';

  return (
    <MainLayout pageTitle="Real-Time Motor Telemetry Analytics">
      <div className="space-y-6">
        {/* Top Motor Selector & Time Range Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          {/* Motor Selector */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
              Select Motor:
            </span>

            <div className="flex items-center space-x-2">
              {motorsLoading ? (
                <span className="text-xs text-slate-400">Loading motors...</span>
              ) : (
                motors.map((m) => (
                  <button
                    key={m.motor_id}
                    onClick={() => setSelectedMotorId(m.motor_id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                      effectiveMotorId === m.motor_id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Motor {m.motor_number}: {m.motor_name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex-shrink-0">
              Timeframe:
            </span>

            {(['1m', '5m', '15m', '1h', '24h'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase transition-all ${
                  timeRange === r
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center space-x-2">
            <Radio className={`w-4 h-4 ${freshness.label === 'LIVE' ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-semibold text-slate-800">
              {freshness.label === 'LIVE'
                ? `Supabase Realtime Stream Active — Motor ${activeMotor?.motor_number || 1}`
                : `Gateway Offline / Stale Telemetry — Motor ${activeMotor?.motor_number || 1}`}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${freshness.colorClass}`}>
              {freshness.label}
            </span>

            <span className="text-slate-600">
              Data Quality: <strong className="text-slate-800 uppercase">{latestData?.data_quality || 'Stored DB Record'}</strong>
            </span>

            <span className="text-slate-600">
              Source: <strong className="text-slate-800 uppercase">{latestData?.source || 'Modbus / Sample'}</strong>
            </span>

            <span className="text-slate-600">
              Last Received: <strong className="text-slate-800">{formatTimeHHMMSS(newestTimestamp)} ({formatTimeAgo(newestTimestamp)})</strong>
            </span>

            <button
              onClick={() => refresh()}
              className="p-1 hover:bg-slate-100 text-slate-500 rounded transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live AI Diagnosis & Machine Health Snapshot Panel */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> AI Fault Diagnosis
            </span>
            <strong className="text-base font-bold text-white mt-1 block truncate" title={currentClassName}>
              {currentClassName}
            </strong>
            <span className="text-slate-400 text-[11px] font-mono">Class #{currentClassId}</span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Inference Confidence</span>
            <strong className="text-base font-bold text-emerald-400 mt-1 block">
              {Math.round(currentConfidence * 100)}%
            </strong>
            <span className="text-slate-400 text-[11px] font-mono">Model: {currentModelVersion}</span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Machine Health Index</span>
            <strong className={`text-base font-black mt-1 block ${currentHealthIndex < 50 ? 'text-red-400' : currentHealthIndex < 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {currentHealthIndex} / 100
            </strong>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-0.5 border ${getSeverityColorClass(currentHealthStatus)}`}>
              {currentHealthStatus}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Latest Supabase Timestamp</span>
            <strong className="text-xs font-mono text-white mt-1 block">
              {formatDateTime(newestTimestamp)}
            </strong>
            <span className="text-slate-400 text-[11px]">Updated ({formatTimeAgo(newestTimestamp)})</span>
          </div>
        </div>

        {/* 8 Key Parameter Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Voltage</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatVoltage(latestData?.voltage)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Current</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatCurrent(latestData?.current)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Temperature</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatTemperature(latestData?.temperature)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Vibration</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatVibration(latestData?.vibration_rms)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Power</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatPower(latestData?.power)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Energy</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatEnergy(latestData?.energy)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Frequency</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatFrequency(latestData?.frequency)}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Power Factor</p>
            <p className="text-base font-black font-mono text-slate-900 mt-1">
              {formatPowerFactor(latestData?.power_factor)}
            </p>
          </div>
        </div>

        {/* Parameter Charts Grid (8 Recharts Line Charts) */}
        {telemetryLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="font-semibold text-sm">Loading telemetry charts...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-600">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="font-semibold text-sm">Telemetry Query Error: {error}</p>
          </div>
        ) : formattedChartData.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <p className="font-semibold text-base">No telemetry records found for this timeframe.</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting a broader timeframe (e.g. 1h or 24h).</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voltage Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Voltage (V)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" V" domain={['auto', 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} V`, 'Voltage']} />
                    <Line type="monotone" dataKey="Voltage" stroke="#2563EB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Current (A)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" A" domain={['auto', 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} A`, 'Current']} />
                    <Line type="monotone" dataKey="Current" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Temperature Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Temperature (°C)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" °C" domain={['auto', 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} °C`, 'Temperature']} />
                    <Line type="monotone" dataKey="Temperature" stroke="#DC2626" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vibration Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Vibration RMS (mm/s)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" mm/s" domain={['auto', 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} mm/s`, 'Vibration']} />
                    <Line type="monotone" dataKey="Vibration" stroke="#D97706" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Power Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Active Power (kW)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" kW" domain={['auto', 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} kW`, 'Power']} />
                    <Line type="monotone" dataKey="Power" stroke="#7C3AED" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Energy Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Energy Consumption (kWh)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" kWh" domain={['auto', 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} kWh`, 'Energy']} />
                    <Line type="monotone" dataKey="Energy" stroke="#0891B2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Frequency Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Frequency (Hz)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} unit=" Hz" domain={[48, 52]} />
                    <Tooltip formatter={(val: any) => [`${val} Hz`, 'Frequency']} />
                    <Line type="monotone" dataKey="Frequency" stroke="#4F46E5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Power Factor Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Power Factor (PF)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} domain={[0, 1]} />
                    <Tooltip formatter={(val: any) => [`${val} PF`, 'Power Factor']} />
                    <Line type="monotone" dataKey="PowerFactor" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default LiveMonitoringPage;