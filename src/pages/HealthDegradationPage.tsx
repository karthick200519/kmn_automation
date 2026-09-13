import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const HealthDegradationPage: React.FC = () => {
  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await motorService.getCurrentMotorStatus();
      setMotors(data);
    } catch (err) {
      console.error('Failed to load health/degradation data:', err);
      setError('Unable to load live machine health data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = window.setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Use the latest live health values from Supabase.
   * No hardcoded historical values are used here.
   */
  const healthData = motors.map((m) => ({
    motor: `M${m.motor_number}`,
    health: Number(m.health_index ?? 0),
    degradationRate: Number(m.degradation_rate ?? 0),
  }));

  return (
    <MainLayout pageTitle="Machine Health & Degradation Analytics">

      {/* Loading */}
      {loading && motors.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-sm text-slate-500">
          Loading live machine health data...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {motors.map((m) => {
          const healthIndex = Number(m.health_index ?? 0);

          const healthColor =
            healthIndex >= 80
              ? 'bg-emerald-100 text-emerald-800'
              : healthIndex >= 50
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800';

          return (
            <div
              key={m.motor_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  {m.motor_name || `Motor ${m.motor_number}`}
                </h3>

                <span className="text-xs font-semibold text-slate-500">
                  M{m.motor_number}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">
                    Machine Health Index
                  </p>

                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {healthIndex.toFixed(1)}
                    <span className="text-xs text-slate-400 font-normal">
                      {' '}
                      / 100
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${healthColor}`}
                  >
                    {m.health_status || 'unknown'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Degradation Status:
                </span>

                <span className="font-bold text-slate-800">
                  {m.degradation_status || 'stable'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Degradation Rate:
                </span>

                <span className="font-mono font-bold text-slate-800">
                  {Number(m.degradation_rate ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Health Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Current Health & Degradation Status
            </h3>

            <p className="text-xs text-slate-500">
              Latest live values received from Raspberry Pi through Supabase
            </p>
          </div>
        </div>

        <div className="h-72">
          {healthData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                />

                <XAxis
                  dataKey="motor"
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
                  dataKey="health"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Health Index"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No live health data available.
            </div>
          )}
        </div>
      </div>

    </MainLayout>
  );
};