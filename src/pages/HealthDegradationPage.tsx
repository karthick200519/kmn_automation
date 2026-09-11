import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import { HeartPulse, TrendingDown, Activity, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const HealthDegradationPage: React.FC = () => {
  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);

  useEffect(() => {
    motorService.getCurrentMotorStatus().then(setMotors);
  }, []);

  const healthData = [
    { day: 'Mon', M1: 99, M2: 88, M3: 65 },
    { day: 'Tue', M1: 98, M2: 82, M3: 58 },
    { day: 'Wed', M1: 97, M2: 74, M3: 48 },
    { day: 'Thu', M1: 96, M2: 60, M3: 35 },
    { day: 'Fri', M1: 96, M2: 48, M3: 24 },
  ];

  return (
    <MainLayout pageTitle="Machine Health & Degradation Analytics">
      
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {motors.map((m) => (
          <div key={m.motor_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{m.motor_name}</h3>
              <span className="text-xs font-semibold text-slate-500">M{m.motor_number}</span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Machine Health Index</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{m.health_index ?? 95} <span className="text-xs text-slate-400 font-normal">/ 100</span></p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                  (m.health_index || 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : (m.health_index || 0) >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {m.health_status || 'Optimal'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Degradation Status:</span>
              <span className="font-bold text-slate-800">{m.degradation_status || 'Stable'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Degradation Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Degradation Rate & Health Index Curve</h3>
            <p className="text-xs text-slate-500">Multi-parameter cumulative degradation trajectory</p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="M1" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} name="Motor 1 Health" />
              <Area type="monotone" dataKey="M2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} name="Motor 2 Health" />
              <Area type="monotone" dataKey="M3" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} strokeWidth={2} name="Motor 3 Health" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </MainLayout>
  );
};
