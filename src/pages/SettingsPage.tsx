import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { DataSourceMode } from '../types/database';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Database, Check, AlertCircle, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const [mode, setMode] = useState<DataSourceMode>('demo');
  const [liveAvailable, setLiveAvailable] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMode();
  }, []);

  const fetchMode = async () => {
    const currentMode = await settingsService.getDataSourceMode();
    setMode(currentMode);
  };

  const handleToggleMode = async (newMode: DataSourceMode) => {
    setMessage(null);
    setIsSaving(true);

    const result = await settingsService.setDataSourceMode(newMode, profile?.id);
    setIsSaving(false);
    setMode(newMode);

    if (newMode === 'live' && !liveAvailable) {
      setMessage('Live sensor data is currently unavailable.');
    } else {
      setMessage(`Operational data source updated to ${newMode.toUpperCase()} mode.`);
    }
  };

  return (
    <MainLayout pageTitle="System Settings & Data Source Toggle">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <span>Global System Configuration & Operational Mode</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Admin controls for data ingestion sources and system parameters</p>
        </div>
      </div>

      {/* Message Feedback */}
      {message && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
          message.includes('unavailable') ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Demo vs Live Data Source Toggle Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Operational Telemetry Data Ingestion Mode</h3>
            <p className="text-xs text-slate-500">Switch between Synthetic Sample Demo data and Live Raspberry Pi Modbus RTU telemetry</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* DEMO Mode Option */}
          <div
            onClick={() => handleToggleMode('demo')}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'demo'
                ? 'border-blue-600 bg-blue-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-black text-xs uppercase rounded-full border border-amber-300">
                DEMO MODE
              </span>
              {mode === 'demo' && <Check className="w-5 h-5 text-blue-600" />}
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Synthetic Sample Data</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Uses pre-generated high-fidelity synthetic sensor data records (`source = sample`) for testing AI model visualization and maintenance schedules.
            </p>
          </div>

          {/* LIVE Mode Option */}
          <div
            onClick={() => handleToggleMode('live')}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'live'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs uppercase rounded-full border border-emerald-300">
                LIVE MODE
              </span>
              {mode === 'live' && <Check className="w-5 h-5 text-emerald-600" />}
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Live Modbus RTU / Raspberry Pi</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connects directly to physical telemetry acquired by the Raspberry Pi RS-485 Modbus interface (`source = modbus`).
            </p>
          </div>

        </div>

      </div>

      {/* Threshold Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
          Hardware & RS-485 Communication Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-bold text-slate-800">Modbus Baud Rate</p>
            <p className="text-slate-500 font-mono mt-1">9600 bps, 8N1</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-bold text-slate-800">Sampling Interval</p>
            <p className="text-slate-500 font-mono mt-1">1000 ms</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-bold text-slate-800">AI Model Framework</p>
            <p className="text-slate-500 font-mono mt-1">TensorFlow Lite / PyTorch ONNX v1.2</p>
          </div>
        </div>
      </div>

    </MainLayout>
  );
};
