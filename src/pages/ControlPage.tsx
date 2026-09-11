import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { GpioStatus } from '../types/database';
import { controlService } from '../services/controlService';
import { useAuth } from '../context/AuthContext';
import { Sliders, Power, Volume2, AlertOctagon, X, RotateCcw, Activity } from 'lucide-react';

export const ControlPage: React.FC = () => {
  const { profile } = useAuth();
  const [gpio, setGpio] = useState<GpioStatus | null>(null);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGpio();
    const interval = setInterval(fetchGpio, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchGpio = async () => {
    const data = await controlService.getGpioStatus();
    setGpio(data);
  };

  const handleToggleOutput = async (outputName: 'relay_1' | 'relay_2' | 'relay_3' | 'buzzer', currentState: boolean) => {
    setStatusMessage(null);
    setIsSubmitting(true);

    // Optimistic state update for instant UI feedback
    setGpio((prev) => prev ? { ...prev, [outputName]: !currentState } : prev);

    const payload = {
      [outputName]: !currentState,
    };

    const result = await controlService.sendControlCommand(payload, profile?.id);
    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage(`Control command submitted successfully for ${outputName.replace('_', ' ').toUpperCase()}.`);
      await fetchGpio();
    } else {
      setStatusMessage(result.error || 'Control command could not be completed.');
      await fetchGpio(); // Revert on failure
    }
  };

  const handleConfirmEmergency = async () => {
    if (!emergencyConfirmed) return;
    setStatusMessage(null);
    setIsSubmitting(true);

    const result = await controlService.issueEmergencyCommand(profile?.id, true);
    setIsSubmitting(false);
    setIsEmergencyOpen(false);

    if (result.success) {
      setStatusMessage('EMERGENCY TRIP COMMAND DISPATCHED! All relays cut off.');
      await fetchGpio();
    } else {
      setStatusMessage(result.error || 'Unable to issue emergency command.');
    }
  };

  const handleResetEmergency = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);

    const result = await controlService.resetEmergencyCommand(profile?.id);
    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage('Emergency status reset to normal safe operation.');
      await fetchGpio();
    } else {
      setStatusMessage(result.error || 'Unable to reset emergency status.');
    }
  };

  return (
    <MainLayout pageTitle="Hardware Control & Actuation">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>KMN Automation Hardware Command Interface</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full actuation controls for Relay 1, Relay 2, Relay 3, Audible Siren, and Emergency Cutoff
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Edge Gateway Online</span>
          </span>
        </div>
      </div>

      {/* Status Feedback Notification */}
      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs font-semibold flex items-center justify-between shadow-sm">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-blue-600 hover:text-blue-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hardware Relay Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Relay 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Relay Output 1</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${gpio?.relay_1 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
              {gpio?.relay_1 ? '● Energized' : '○ De-energized'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Motor 1 Primary Main Contactor Control</p>
          <button
            disabled={isSubmitting}
            onClick={() => handleToggleOutput('relay_1', !!gpio?.relay_1)}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              gpio?.relay_1 ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{gpio?.relay_1 ? 'Turn OFF Relay 1' : 'Turn ON Relay 1'}</span>
          </button>
        </div>

        {/* Relay 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Relay Output 2</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${gpio?.relay_2 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
              {gpio?.relay_2 ? '● Energized' : '○ De-energized'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Motor 2 Secondary Contactor Control</p>
          <button
            disabled={isSubmitting}
            onClick={() => handleToggleOutput('relay_2', !!gpio?.relay_2)}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              gpio?.relay_2 ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{gpio?.relay_2 ? 'Turn OFF Relay 2' : 'Turn ON Relay 2'}</span>
          </button>
        </div>

        {/* Relay 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Relay Output 3</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${gpio?.relay_3 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
              {gpio?.relay_3 ? '● Energized' : '○ De-energized'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Motor 3 Auxiliary Trip Control</p>
          <button
            disabled={isSubmitting}
            onClick={() => handleToggleOutput('relay_3', !!gpio?.relay_3)}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              gpio?.relay_3 ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{gpio?.relay_3 ? 'Turn OFF Relay 3' : 'Turn ON Relay 3'}</span>
          </button>
        </div>

        {/* Buzzer */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Audible Alarm Siren</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${gpio?.buzzer ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              {gpio?.buzzer ? '🔊 Active Sounding' : '🔇 Silent'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Panel Audible Siren & Horn</p>
          <button
            disabled={isSubmitting}
            onClick={() => handleToggleOutput('buzzer', !!gpio?.buzzer)}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              gpio?.buzzer ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{gpio?.buzzer ? 'Mute Alarm Siren' : 'Test Alarm Siren'}</span>
          </button>
        </div>

      </div>

      {/* Individual Motor Control Center */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Power className="w-4 h-4 text-blue-600" />
          <span>Motor Direct Start & Stop Controllers</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Motor 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Motor 1 (Cooling Pump)</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${gpio?.relay_1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {gpio?.relay_1 ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isSubmitting || gpio?.relay_1}
                onClick={() => handleToggleOutput('relay_1', false)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
              >
                START
              </button>
              <button
                disabled={isSubmitting || !gpio?.relay_1}
                onClick={() => handleToggleOutput('relay_1', true)}
                className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
              >
                STOP
              </button>
            </div>
          </div>

          {/* Motor 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Motor 2 (Conveyor Drive)</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${gpio?.relay_2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {gpio?.relay_2 ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isSubmitting || gpio?.relay_2}
                onClick={() => handleToggleOutput('relay_2', false)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
              >
                START
              </button>
              <button
                disabled={isSubmitting || !gpio?.relay_2}
                onClick={() => handleToggleOutput('relay_2', true)}
                className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
              >
                STOP
              </button>
            </div>
          </div>

          {/* Motor 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Motor 3 (Exhaust Blower)</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${gpio?.relay_3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {gpio?.relay_3 ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isSubmitting || gpio?.relay_3}
                onClick={() => handleToggleOutput('relay_3', false)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
              >
                START
              </button>
              <button
                disabled={isSubmitting || !gpio?.relay_3}
                onClick={() => handleToggleOutput('relay_3', true)}
                className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
              >
                STOP
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Visually Isolated Emergency Trip Command Section */}
      <div className={`border-2 rounded-xl p-6 shadow-xl text-white space-y-4 transition-all ${
        gpio?.emergency ? 'bg-red-900 border-red-500 animate-pulse' : 'bg-slate-900 border-red-600'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-600 text-white rounded-lg animate-bounce">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide">ISOLATED EMERGENCY COMMAND ACTUATOR</h3>
              <p className="text-xs text-red-200">
                Immediate software trip command for all 3 induction motor drives
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {gpio?.emergency && (
              <button
                disabled={isSubmitting}
                onClick={handleResetEmergency}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Emergency Stop</span>
              </button>
            )}

            <button
              onClick={() => {
                setEmergencyConfirmed(false);
                setIsEmergencyOpen(true);
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
            >
              <AlertOctagon className="w-5 h-5" />
              <span>Execute Emergency Command</span>
            </button>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="bg-red-950/80 border border-red-500/60 rounded-lg p-3 text-xs text-red-100 font-semibold">
          IMPORTANT SAFETY DISCLAIMER: "This software command does not replace a certified physical emergency-stop or safety system."
        </div>

        <div className="pt-1 text-xs text-red-300">
          Emergency Relay State: <strong className="uppercase text-white font-mono">{gpio?.emergency ? 'TRIPPED (EMERGENCY ACTUATED)' : 'NORMAL SAFE'}</strong>
        </div>
      </div>

      {/* Emergency Confirmation Modal */}
      {isEmergencyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border-2 border-red-600 shadow-2xl max-w-md w-full p-6 space-y-5">
            
            <div className="flex items-center space-x-3 text-red-600 border-b border-slate-100 pb-3">
              <AlertOctagon className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Confirm Emergency Command</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Are you sure you want to issue the emergency command?
              </p>
              <p>
                This action will trigger an immediate emergency trip command to the Raspberry Pi edge controller for all connected motors.
              </p>

              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-900 text-xs italic">
                "This software command does not replace a certified physical emergency-stop or safety system."
              </div>

              <label className="flex items-start space-x-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emergencyConfirmed}
                  onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="font-bold text-slate-900">
                  I explicitly confirm execution of this emergency action under authorized safety protocols.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEmergencyOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!emergencyConfirmed || isSubmitting}
                onClick={handleConfirmEmergency}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 uppercase tracking-wider"
              >
                {isSubmitting ? 'Dispatching...' : 'Confirm Emergency'}
              </button>
            </div>

          </div>
        </div>
      )}

    </MainLayout>
  );
};
