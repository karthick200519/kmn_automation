import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { MotorSensorData } from '../types/database';
import { monitoringService, type TimeRange } from '../services/monitoringService';
import { motorService } from '../services/motorService';
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
} from '../utils/formatters';
import { Activity, Clock, Zap, Thermometer, Radio, Cpu } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const LiveMonitoringPage: React.FC = () => {
  const [selectedMotorNum, setSelectedMotorNum] = useState<number>(1);
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');
  const [telemetry, setTelemetry] = useState<MotorSensorData[]>([]);
  const [latestData, setLatestData] = useState<MotorSensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 5000);
    return () => clearInterval(interval);
  }, [selectedMotorNum, timeRange]);

  const fetchLiveTelemetry = async () => {
    const allMotors = await motorService.getCurrentMotorStatus();
    const current = allMotors.find((m) => m.motor_number === selectedMotorNum) || allMotors[0];

    if (current) {
      const dataPoints = await monitoringService.getTimeSeriesData(current.motor_id, timeRange);
      setTelemetry(dataPoints);
      if (dataPoints.length > 0) {
        setLatestData(dataPoints[dataPoints.length - 1]);
      }
    }
    setLoading(false);
  };

  const formattedChartData = telemetry.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    Voltage: d.voltage,
    Current: d.current,
    Temperature: d.temperature,
    Vibration: d.vibration_rms,
    Power: d.power,
    Energy: d.energy,
    Frequency: d.frequency,
    PowerFactor: d.power_factor,
  }));

  return (
    <MainLayout pageTitle="Real-Time Telemetry & 8-Parameter Analytics">
      
      {/* Top Selector & Time Range Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Motor Selector */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Motor:</span>
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedMotorNum(num)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedMotorNum === num
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Motor {num}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Timeframe:</span>
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

      {/* Freshness & Data Quality Badge Bar */}
      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>Live Stream Active — Modbus RTU telemetry sampling at 1000ms</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Data Quality: <strong>Valid</strong></span>
          <span>Last Received: <strong>{formatTimeAgo(latestData?.timestamp)}</strong></span>
        </div>
      </div>

      {/* 8 Key Parameter Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Voltage</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatVoltage(latestData?.voltage)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Current</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatCurrent(latestData?.current)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Temp</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatTemperature(latestData?.temperature)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Vibration</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatVibration(latestData?.vibration_rms)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Power</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatPower(latestData?.power)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Energy</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatEnergy(latestData?.energy)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Frequency</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatFrequency(latestData?.frequency)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Power Factor</p>
          <p className="text-base font-black font-mono text-slate-900 mt-1">{formatPowerFactor(latestData?.power_factor)}</p>
        </div>

      </div>

      {/* Grid of 8 Parameter Time-Series Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Voltage vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">1. Voltage (V) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Voltage" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Current vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">2. Current (A) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Current" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Temperature vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">3. Temperature (°C) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Temperature" stroke="#DC2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Vibration vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">4. Vibration RMS (g) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Vibration" stroke="#D97706" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Power vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">5. Power (kW) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Power" stroke="#7C3AED" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Energy vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">6. Energy (kWh) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Energy" stroke="#0891B2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Frequency vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">7. Frequency (Hz) vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={[49, 51]} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="Frequency" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 8. Power Factor vs Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase">8. Power Factor vs Time</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={[0.5, 1.0]} stroke="#94A3B8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="PowerFactor" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </MainLayout>
  );
};
