import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import { formatTimeAgo, getSeverityColorClass } from '../utils/formatters';
import { Wrench } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);

  useEffect(() => {
    motorService.getCurrentMotorStatus().then(setMotors);
  }, []);

  return (
    <MainLayout pageTitle="Predictive Maintenance Decisions">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Automated Maintenance Decision Matrix</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescriptive recommendations synthesized from multi-parameter telemetry and 24-class AI diagnosis
          </p>
        </div>
      </div>

      {/* Decision Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {motors.map((m) => (
          <div key={m.motor_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-900 text-sm">{m.motor_name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(m.motor_status)}`}>
                  {m.motor_status}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Maintenance Decision</p>
                <p className="text-base font-black text-slate-900 mt-1">{m.maintenance_decision || 'Normal operation'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Detected Condition:</span>
                  <strong className="text-slate-900">{m.class_name || 'Healthy'}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>AI Confidence:</span>
                  <strong className="text-blue-600 font-mono">{Math.round((m.confidence || 0.95) * 100)}%</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Health Index:</span>
                  <strong className="text-slate-900 font-mono">{m.health_index ?? 95} / 100</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <p className="font-bold mb-1">Prescriptive Recommendation:</p>
                <p>{m.maintenance_recommendation || 'Continuous routine telemetry monitoring.'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right text-[11px] text-slate-400">
              Evaluated {formatTimeAgo(m.sensor_timestamp)}
            </div>

          </div>
        ))}
      </div>

    </MainLayout>
  );
};
