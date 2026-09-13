import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import type {
  CurrentMotorStatus,
  MaintenanceSchedule,
  Alert,
} from '../types/database';

import { motorService } from '../services/motorService';
import { monitoringService } from '../services/monitoringService';
import { scheduleService } from '../services/scheduleService';
import { alertService } from '../services/alertService';

import {
  formatTemperature,
  formatVibration,
  formatTimeAgo,
  getSeverityColorClass,
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

  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthTrendData, setHealthTrendData] = useState<HealthTrendPoint[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [motorData, scheduleData, alertData] = await Promise.all([
          motorService.getCurrentMotorStatus(),
          scheduleService.getSchedules(),
          alertService.getActiveAlerts(),
        ]);

        if (!mounted) return;

        setMotors(motorData);
        setSchedules(scheduleData);
        setAlerts(alertData);

        // Load health history for the three motors
        const selectedMotors = motorData.slice(0, 3);

        if (selectedMotors.length === 0) {
          setHealthTrendData([]);
          return;
        }

        const histories = await Promise.all(
          selectedMotors.map(async (motor) => {
            try {
              const history = await monitoringService.getHealthHistory(
                motor.motor_id,
                30
              );

              return {
                motorNumber: motor.motor_number,
                history,
              };
            } catch (error) {
              console.error(
                `Health history failed for Motor ${motor.motor_number}:`,
                error
              );

              return {
                motorNumber: motor.motor_number,
                history: [],
              };
            }
          })
        );

        if (!mounted) return;

        // Group health readings by timestamp
        const grouped = new Map<number, HealthTrendPoint>();

        histories.forEach(({ motorNumber, history }) => {
          history.forEach((point) => {
            const timestampMs = new Date(point.timestamp).getTime();

            if (!Number.isFinite(timestampMs)) {
              return;
            }

            if (!grouped.has(timestampMs)) {
              grouped.set(timestampMs, {
                time: new Date(point.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              });
            }

            const row = grouped.get(timestampMs)!;
            const health = Number(point.health_index);

            if (!Number.isFinite(health)) {
              return;
            }

            if (motorNumber === 1) {
              row.M1 = health;
            } else if (motorNumber === 2) {
              row.M2 = health;
            } else if (motorNumber === 3) {
              row.M3 = health;
            }
          });
        });

        const chartData = Array.from(grouped.entries())
          .sort(([timestampA], [timestampB]) => timestampA - timestampB)
          .map(([, value]) => value)
          .slice(-30);

        setHealthTrendData(chartData);
      } catch (error) {
        console.error('Overview data fetch failed:', error);

        if (mounted) {
          setMotors([]);
          setSchedules([]);
          setAlerts([]);
          setHealthTrendData([]);
        }
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const totalCount = motors.length || 3;

  const healthyCount = motors.filter(
    (m) => m.motor_status === 'healthy'
  ).length;

  const warningCount = motors.filter(
    (m) => m.motor_status === 'warning'
  ).length;

  const faultCount = motors.filter(
    (m) => m.motor_status === 'fault'
  ).length;

  const criticalCount = motors.filter(
    (m) => m.severity === 'critical'
  ).length;

  return (
    <MainLayout pageTitle="System Overview">

      {/* 1. KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

        {/* Total Motors */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Motors
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {totalCount}
            </p>
          </div>

          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* Online */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Online
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {totalCount}
            </p>
          </div>

          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Healthy */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Healthy
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {healthyCount}
            </p>
          </div>

          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Warning */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Warning
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {warningCount}
            </p>
          </div>

          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Fault */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fault
            </p>
            <p className="text-2xl font-black text-red-600 mt-1">
              {faultCount}
            </p>
          </div>

          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Critical */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Critical
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {criticalCount}
            </p>
          </div>

          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. Three Physical Motor Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            Monitored Motor Fleet
          </h2>

          <button
            onClick={() => navigate('/motors')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {motors.map((m) => (
            <div
              key={m.motor_id}
              onClick={() => navigate(`/motors/${m.motor_number}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
            >

              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  m.motor_status === 'healthy'
                    ? 'bg-emerald-500'
                    : m.motor_status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-red-600'
                }`}
              />

              <div className="flex items-center justify-between mb-3">

                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-xs border border-slate-300">
                    M{m.motor_number}
                  </span>

                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {m.motor_name}
                  </h3>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getSeverityColorClass(
                    m.motor_status
                  )}`}
                >
                  {m.motor_status}
                </span>

              </div>

              {/* Primary Metric Grid */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 mb-3 text-xs">

                <div>
                  <p className="text-slate-500 font-medium">
                    Health Index
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    {m.health_index ?? 'N/A'} / 100
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">
                    AI Diagnosis
                  </p>
                  <p
                    className="font-bold text-slate-800 truncate"
                    title={m.class_name || 'Healthy'}
                  >
                    {m.class_name || 'Healthy'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">
                    Temperature
                  </p>
                  <p className="font-bold text-slate-800">
                    {formatTemperature(m.temperature)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">
                    Vibration
                  </p>
                  <p className="font-bold text-slate-800">
                    {formatVibration(m.vibration_rms)}
                  </p>
                </div>

              </div>

              {/* Confidence & Sync */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Confidence:{' '}
                  <strong className="text-slate-800">
                    {Math.round((m.confidence || 0) * 100)}%
                  </strong>
                </span>

                <span>
                  Sync:{' '}
                  <strong className="text-slate-800">
                    {formatTimeAgo(m.sensor_timestamp)}
                  </strong>
                </span>
              </div>

            </div>
          ))}

        </div>
      </div>

      {/* 3. Health Trend Chart & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Health Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">

          <div className="flex items-center justify-between mb-4">

            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Machine Health Index Trend
              </h3>

              <p className="text-xs text-slate-500">
                Live health history from Raspberry Pi / Supabase
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-semibold">

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Motor 1
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Motor 2
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                Motor 3
              </span>

            </div>
          </div>

          <div className="h-64">

            {healthTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No health-history data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">

                <AreaChart
                  data={healthTrendData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F1F5F9"
                  />

                  <XAxis
                    dataKey="time"
                    stroke="#94A3B8"
                    fontSize={11}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="#94A3B8"
                    fontSize={11}
                  />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="M1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    connectNulls
                  />

                  <Area
                    type="monotone"
                    dataKey="M2"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    connectNulls
                  />

                  <Area
                    type="monotone"
                    dataKey="M3"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    connectNulls
                  />

                </AreaChart>

              </ResponsiveContainer>
            )}

          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">

          <div className="flex items-center justify-between mb-4">

            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-red-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Active & Pending Alerts
              </h3>
            </div>

            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              View All
            </button>

          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-64">

            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                No active alerts recorded.
              </p>
            ) : (
              alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1"
                >

                  <div className="flex items-center justify-between text-xs">

                    <span className="font-bold text-slate-900">
                      {al.motor_name ||
                        `Motor ${al.motor_number || 1}`}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getSeverityColorClass(
                        al.severity
                      )}`}
                    >
                      {al.severity}
                    </span>

                  </div>

                  <p className="text-xs font-semibold text-slate-800">
                    {al.title}
                  </p>

                  <p className="text-[11px] text-slate-500">
                    {formatTimeAgo(al.timestamp)}
                  </p>

                </div>
              ))
            )}

          </div>
        </div>

      </div>

      {/* 4. Upcoming Maintenance Work Orders */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">

        <div className="flex items-center justify-between mb-4">

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />

            <h3 className="font-bold text-slate-900 text-sm">
              Upcoming Maintenance Schedules
            </h3>
          </div>

          <button
            onClick={() => navigate('/schedule')}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Manage Schedules
          </button>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs border-collapse">

            <thead>

              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">

                <th className="py-2.5 px-3">
                  Motor
                </th>

                <th className="py-2.5 px-3">
                  Work Order Title
                </th>

                <th className="py-2.5 px-3">
                  Category
                </th>

                <th className="py-2.5 px-3">
                  Priority
                </th>

                <th className="py-2.5 px-3">
                  Assigned To
                </th>

                <th className="py-2.5 px-3">
                  Scheduled Start
                </th>

                <th className="py-2.5 px-3">
                  Status
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {schedules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-slate-400 italic"
                  >
                    No maintenance schedules found for the selected period.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >

                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      Motor {s.motor_number || 1}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {s.title}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 capitalize">
                      {s.schedule_type.replace('_', ' ')}
                    </td>

                    <td className="py-2.5 px-3">
                      {s.priority}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {s.assigned_to || 'Unassigned'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(s.scheduled_start || s.start_time).toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {s.status}
                      </span>
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