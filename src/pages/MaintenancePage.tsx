import React, { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import { formatTimeAgo, getSeverityColorClass } from '../utils/formatters';
import { Wrench, RefreshCw } from 'lucide-react';

const normalizeFault = (motor: CurrentMotorStatus): string => {
  return (motor.class_name || '').trim().toLowerCase();
};

const getMaintenanceDecision = (motor: CurrentMotorStatus): string => {
  const fault = normalizeFault(motor);
  const health = motor.health_index ?? 100;

  if (!fault || fault === 'healthy' || fault.includes('healthy')) {
    return health >= 80
      ? 'Normal Operation'
      : 'Continue Monitoring and Inspect Abnormal Parameters';
  }

  if (fault.includes('phase-to-phase')) return 'Isolate Motor and Inspect Phase-to-Phase Fault';
  if (fault.includes('phase-to-ground')) return 'Isolate Motor and Inspect Insulation / Ground Fault';
  if (fault.includes('single phasing')) return 'Stop Motor and Restore Three-Phase Supply';
  if (fault.includes('stator inter-turn')) return 'Immediate Stator Winding Inspection';
  if (fault.includes('over-temperature') || fault.includes('thermal')) {
    return 'Controlled Shutdown and Immediate Thermal Inspection';
  }
  if (fault.includes('overload')) return 'Reduce Load and Inspect Motor Loading';
  if (fault.includes('severe insufficient lubrication')) {
    return 'Immediate Lubrication and Bearing Inspection';
  }
  if (fault.includes('insufficient lubrication')) {
    return 'Schedule Bearing Lubrication Service';
  }
  if (fault.includes('cracked outer ring')) return 'Immediate Bearing Inspection / Replacement Assessment';
  if (fault.includes('bearing inner')) return 'Schedule Immediate Inner-Race Bearing Inspection';
  if (fault.includes('bearing outer')) return 'Schedule Immediate Outer-Race Bearing Inspection';
  if (fault.includes('rolling element')) return 'Schedule Rolling-Element Bearing Inspection';
  if (fault.includes('cage') || fault.includes('train')) {
    return 'Schedule Bearing Cage / Train Inspection';
  }
  if (fault.includes('broken rotor bar')) return 'Schedule Rotor-Cage Electrical Inspection';
  if (fault.includes('rotor unbalance')) return 'Inspect Rotor Balance and Coupling';
  if (fault.includes('dynamic eccentricity')) return 'Inspect Dynamic Air-Gap and Rotor Alignment';
  if (fault.includes('static eccentricity')) return 'Inspect Air-Gap Alignment and Rotor Position';
  if (fault.includes('misalignment')) return 'Inspect Shaft and Coupling Alignment';
  if (fault.includes('voltage') || fault.includes('phase unbalance')) {
    return 'Correct Three-Phase Voltage / Phase Imbalance';
  }

  return health < 50
    ? 'Immediate Fault Inspection Required'
    : 'Inspect Detected Fault and Continue Close Monitoring';
};

const getPrescriptiveRecommendation = (motor: CurrentMotorStatus): string => {
  const fault = normalizeFault(motor);

  if (!fault || fault === 'healthy' || fault.includes('healthy')) {
    return (motor.health_index ?? 100) < 80
      ? 'Inspect abnormal parameters and continue condition monitoring.'
      : 'Continue routine telemetry monitoring.';
  }

  if (fault.includes('stator inter-turn')) {
    return 'Inspect stator winding insulation, phase-current balance and winding temperature before continued operation.';
  }
  if (fault.includes('phase-to-phase')) {
    return 'Isolate the motor as appropriate and inspect phase insulation, terminals and inter-phase shorting.';
  }
  if (fault.includes('phase-to-ground')) {
    return 'Isolate the motor and perform insulation-resistance and grounding checks before restart.';
  }
  if (fault.includes('single phasing')) {
    return 'Inspect all three-phase supply connections, fuses, contactor terminals and phase continuity.';
  }
  if (fault.includes('voltage') || fault.includes('phase unbalance')) {
    return 'Check three-phase supply voltage balance, upstream connections and phase loading.';
  }
  if (fault.includes('overload')) {
    return 'Check motor load, current draw, cooling, driven equipment and mechanical loading.';
  }
  if (fault.includes('broken rotor bar')) {
    return 'Inspect rotor cage / rotor bars and perform electrical motor diagnostics for rotor-bar damage.';
  }
  if (fault.includes('static eccentricity')) {
    return 'Inspect air-gap alignment, rotor position, stator/rotor centering and mechanical condition.';
  }
  if (fault.includes('dynamic eccentricity')) {
    return 'Inspect rotor alignment, air-gap variation, shaft condition and vibration signature.';
  }
  if (fault.includes('rotor unbalance')) {
    return 'Inspect rotor balance, coupling condition and vibration source; rebalance when required.';
  }
  if (fault.includes('misalignment')) {
    return 'Inspect shaft/coupling alignment, soft-foot condition, mounting and foundation.';
  }
  if (fault.includes('bearing inner')) {
    return 'Inspect the bearing inner race and verify bearing vibration, temperature and lubrication condition.';
  }
  if (fault.includes('bearing outer')) {
    return 'Inspect the bearing outer race and verify bearing vibration, temperature and lubrication condition.';
  }
  if (fault.includes('rolling element')) {
    return 'Inspect rolling elements and verify bearing lubrication, temperature and vibration condition.';
  }
  if (fault.includes('cage') || fault.includes('train')) {
    return 'Inspect bearing cage/train condition and lubrication; plan bearing service if degradation persists.';
  }
  if (fault.includes('severe insufficient lubrication')) {
    return 'Perform immediate lubrication inspection and bearing-condition assessment before extended operation.';
  }
  if (fault.includes('insufficient lubrication')) {
    return 'Check lubrication level/condition and schedule bearing re-lubrication using the correct grease or oil.';
  }
  if (fault.includes('cracked outer ring')) {
    return 'Inspect the bearing outer ring immediately and plan bearing replacement/repair as required.';
  }
  if (fault.includes('thermal') || fault.includes('over-temperature')) {
    return 'Inspect cooling, ventilation, ambient conditions, load and thermal rise; prevent further overheating.';
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
    fetchMotors();
    const interval = window.setInterval(fetchMotors, 5000);
    return () => window.clearInterval(interval);
  }, [fetchMotors]);

  return (
    <MainLayout pageTitle="Predictive Maintenance Decisions">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Automated Maintenance Decision Matrix</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescriptive recommendations synthesized from current telemetry and the latest AI diagnosis
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMotors}
          disabled={refreshing}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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
                <p className="text-base font-black text-slate-900 mt-1">
                  {getMaintenanceDecision(m)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Detected Condition:</span>
                  <strong className="text-slate-900 text-right ml-3">{m.class_name || (m.health_index != null && m.health_index >= 80 ? 'Healthy' : 'Unknown Condition')}</strong>
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
                <p>{getPrescriptiveRecommendation(m)}</p>
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
