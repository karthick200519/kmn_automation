import React, { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import { formatTimeAgo, getSeverityColorClass } from '../utils/formatters';
import { RefreshCw, Wrench } from 'lucide-react';

const getPrescriptiveRecommendation = (motor: CurrentMotorStatus): string => {
  const fault = (motor.class_name || '').toLowerCase();

  if (!fault || fault === 'healthy') {
    return (motor.health_index ?? 100) < 80
      ? 'Inspect abnormal parameters and continue close telemetry monitoring.'
      : 'Continue routine telemetry monitoring.';
  }

  if (fault.includes('overload')) {
    return 'Check motor load, current draw, cooling and mechanical loading.';
  }

  if (fault.includes('broken rotor bar')) {
    return 'Inspect rotor cage/rotor bars and perform electrical motor diagnostics.';
  }

  if (fault.includes('static eccentricity')) {
    return 'Inspect air-gap alignment, rotor position and mechanical condition.';
  }

  if (fault.includes('dynamic eccentricity')) {
    return 'Inspect rotor alignment, air-gap condition and vibration signature.';
  }

  if (fault.includes('stator inter-turn')) {
    return 'Inspect stator winding insulation and phase-current imbalance.';
  }

  if (fault.includes('phase-to-phase')) {
    return 'Isolate the motor as applicable and inspect phase insulation and connections.';
  }

  if (fault.includes('phase-to-ground')) {
    return 'Inspect insulation and grounding and perform an electrical safety check before operation.';
  }

  if (fault.includes('single phasing')) {
    return 'Inspect all three-phase supply connections, fuses and contactor/terminal integrity.';
  }

  if (fault.includes('voltage') || fault.includes('phase unbalance')) {
    return 'Inspect three-phase supply voltage balance and upstream connections.';
  }

  if (fault.includes('rotor unbalance')) {
    return 'Inspect rotor balance, coupling and vibration source.';
  }

  if (fault.includes('misalignment')) {
    return 'Inspect shaft/coupling alignment and mounting condition.';
  }

  if (fault.includes('bearing inner')) {
    return 'Inspect the bearing inner race and verify bearing vibration condition.';
  }

  if (fault.includes('bearing outer')) {
    return 'Inspect the bearing outer race and verify bearing vibration condition.';
  }

  if (fault.includes('rolling element')) {
    return 'Inspect rolling elements and bearing lubrication condition.';
  }

  if (fault.includes('cage') || fault.includes('train')) {
    return 'Inspect bearing cage/train condition and lubrication.';
  }

  if (fault.includes('severe lubrication')) {
    return 'Schedule immediate lubrication inspection and bearing condition assessment.';
  }

  if (fault.includes('insufficient lubrication')) {
    return 'Check lubrication level and schedule bearing re-lubrication.';
  }

  if (fault.includes('cracked outer ring')) {
    return 'Inspect the bearing outer ring and plan replacement or repair as required.';
  }

  if (fault.includes('thermal') || fault.includes('over-temperature')) {
    return 'Inspect cooling, ventilation, ambient conditions and motor thermal loading.';
  }

  return 'Inspect the detected abnormal condition and continue close telemetry monitoring.';
};

export const MaintenancePage: React.FC = () => {
  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMotors = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await motorService.getCurrentMotorStatus();
      setMotors(data);
    } catch (error) {
      console.error('Maintenance live data fetch failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMotors();

    const interval = window.setInterval(() => {
      void fetchMotors();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [fetchMotors]);

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

        <button
          type="button"
          onClick={() => void fetchMotors()}
          disabled={refreshing}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Decision Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {motors.map((m) => {
          const recommendation = getPrescriptiveRecommendation(m);

          return (
            <div
              key={m.motor_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-bold text-slate-900 text-sm">{m.motor_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(
                      m.motor_status
                    )}`}
                  >
                    {m.motor_status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Maintenance Decision</p>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {m.maintenance_decision || 'Normal operation'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Detected Condition:</span>
                    <strong className="text-slate-900 text-right ml-3">
                      {m.class_name || 'Healthy'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>AI Confidence:</span>
                    <strong className="text-blue-600 font-mono">
                      {m.confidence == null ? '—' : `${Math.round(m.confidence * 100)}%`}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Health Index:</span>
                    <strong className="text-slate-900 font-mono">
                      {m.health_index == null ? '—' : `${m.health_index} / 100`}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  <p className="font-bold mb-1">Prescriptive Recommendation:</p>
                  <p>{recommendation}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-right text-[11px] text-slate-400">
                Evaluated {formatTimeAgo(m.sensor_timestamp)}
              </div>
            </div>
          );
        })}
      </div>

    </MainLayout>
  );
};
