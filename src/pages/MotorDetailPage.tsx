import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus, MotorSensorData } from '../types/database';
import { motorService } from '../services/motorService';
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
  getDataFreshness,
  getSeverityColorClass,
} from '../utils/formatters';
import { ArrowLeft, Zap, Activity, Wrench, ShieldCheck, Clock } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const MotorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [motor, setMotor] = useState<CurrentMotorStatus | null>(null);
  const [history, setHistory] = useState<MotorSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadMotor = async () => {
      setLoading(true);
      const parsedId = id ? (isNaN(Number(id)) ? id : parseInt(id, 10)) : 1;
      const data = await motorService.getMotorById(parsedId);
      if (!mounted) return;
      setMotor(data);

      if (data) {
        const timeSeries = await monitoringService.getTimeSeriesData(data.motor_id, '15m');
        if (mounted) setHistory(timeSeries);
      }
      if (mounted) setLoading(false);
    };

    loadMotor();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading || !motor) {
    return (
      <MainLayout pageTitle="Motor Technical Inspection">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MainLayout>
    );
  }

  const freshness = getDataFreshness(motor.sensor_timestamp);

  return (
    <MainLayout pageTitle={`Motor ${motor.motor_number}: ${motor.motor_name} Inspection`}>
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/motors')}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Motor Fleet</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${freshness.colorClass}`}>
              {freshness.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getSeverityColorClass(motor.severity || motor.motor_status)}`}>
              Status: {motor.severity || motor.motor_status}
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTimeAgo(motor.sensor_timestamp)}
            </span>
          </div>
        </div>

        {/* 1. Motor Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Index</p>
            <p className="text-3xl font-black text-slate-900">{motor.health_index ?? 100} <span className="text-sm font-normal text-slate-500">/ 100</span></p>
            <p className="text-xs font-semibold text-emerald-600">{motor.health_status || 'Optimal'}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current AI Diagnosis</p>
            <p className="text-base font-bold text-slate-900 truncate" title={motor.class_name || 'Healthy'}>
              {motor.class_name || 'Healthy'}
            </p>
            <p className="text-xs text-slate-500">Class ID: #{motor.class_id ?? 0}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Confidence</p>
            <p className="text-3xl font-black text-blue-600">{Math.round((motor.confidence || 0.99) * 100)}%</p>
            <p className="text-xs text-slate-500">Model Version: {motor.model_version || 'v1.0'}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Severity & Degradation</p>
            <div className="mt-1">
              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase border ${getSeverityColorClass(motor.severity)}`}>
                {motor.severity || 'Low'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Degradation: {motor.degradation_status || 'Stable'}</p>
          </div>
        </div>

        {/* 2. Parameters Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Electrical Parameters */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Electrical Telemetry</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 font-medium">Voltage</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatVoltage(motor.voltage)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 font-medium">Current</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatCurrent(motor.current)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 font-medium">Active Power</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatPower(motor.power)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 font-medium">Energy</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatEnergy(motor.energy)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 font-medium">Frequency</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatFrequency(motor.frequency)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 font-medium">Power Factor</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{formatPowerFactor(motor.power_factor)}</p>
              </div>
            </div>
          </div>

          {/* Mechanical & Thermal Condition */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-900 text-sm">Mechanical & Thermal Condition</h3>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Vibration RMS</span>
                  <span className="font-bold text-slate-900 font-mono">{formatVibration(motor.vibration_rms)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      (motor.vibration_rms || 0) > 4 ? 'bg-red-500' : (motor.vibration_rms || 0) > 2 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, ((motor.vibration_rms || 1) / 10) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Bearing / Frame Temp</span>
                  <span className="font-bold text-slate-900 font-mono">{formatTemperature(motor.temperature)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      (motor.temperature || 0) > 75 ? 'bg-red-500' : (motor.temperature || 0) > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, ((motor.temperature || 40) / 120) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Recommendation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Wrench className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Predictive Maintenance Recommendation</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Recommended Decision</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{motor.maintenance_decision || 'Normal operation'}</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> AI Action Plan:
                </p>
                <p>{motor.maintenance_recommendation || 'No immediate corrective action required.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Parameter Telemetry Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Vibration & Temperature Telemetry Trend (15m)</h3>
          <div className="h-64">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No time series records available for this motor.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis yAxisId="left" stroke="#3B82F6" fontSize={11} label={{ value: 'Vibration (mm/s)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#EF4444" fontSize={11} label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="vibration_rms" stroke="#3B82F6" strokeWidth={2} dot={false} name="Vibration (mm/s)" />
                  <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2} dot={false} name="Temp (°C)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MotorDetailPage;
