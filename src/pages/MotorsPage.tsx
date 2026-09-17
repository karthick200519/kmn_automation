import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { useMotors } from '../hooks/useMotors';
import { motorService } from '../services/motorService';
import { useAuth } from '../context/AuthContextDef';
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
  formatTimeHHMMSS,
  getDataFreshness,
  getSeverityColorClass,
} from '../utils/formatters';
import { Clock, Edit, Eye, Filter, LayoutGrid, List, RefreshCw, X, Zap } from 'lucide-react';

const DEFAULT_RATED_SPEC = {
  rated_voltage: 415,
  rated_current: 15,
  rated_power: 11,
  rated_speed: 1475,
  rated_frequency: 50,
  phase: '3-Phase',
} as const;

export const MotorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { motors, loading, refresh } = useMotors();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tiles' | 'table'>('tiles');

  // Admin Modal State
  const [editingMotor, setEditingMotor] = useState<CurrentMotorStatus | null>(null);
  const [editName, setEditName] = useState('');
  const [editVoltage, setEditVoltage] = useState<number>(415);
  const [editCurrent, setEditCurrent] = useState<number>(15);
  const [editPower, setEditPower] = useState<number>(11);
  const [editSpeed, setEditSpeed] = useState<number>(1475);
  const [editFrequency, setEditFrequency] = useState<number>(50);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredMotors = motors.filter((m) => {
    const matchesStatus = filterStatus === 'all' || m.motor_status === filterStatus || m.severity === filterStatus;
    const matchesSearch =
      m.motor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `motor ${m.motor_number}`.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenEdit = (m: CurrentMotorStatus) => {
    setEditingMotor(m);
    setEditName(m.motor_name);
    setEditVoltage(m.rated_voltage ?? DEFAULT_RATED_SPEC.rated_voltage);
    setEditCurrent(m.rated_current ?? DEFAULT_RATED_SPEC.rated_current);
    setEditPower(m.rated_power ?? DEFAULT_RATED_SPEC.rated_power);
    setEditSpeed(m.rated_speed ?? DEFAULT_RATED_SPEC.rated_speed);
    setEditFrequency(m.rated_frequency ?? DEFAULT_RATED_SPEC.rated_frequency);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMotor) return;

    setEditError(null);
    setIsSaving(true);
    const success = await motorService.updateMotorMetadata(editingMotor.motor_id, {
      motor_name: editName,
      rated_voltage: Number(editVoltage),
      rated_current: Number(editCurrent),
      rated_power: Number(editPower),
      rated_speed: Number(editSpeed),
      rated_frequency: Number(editFrequency),
    });
    setIsSaving(false);

    if (success) {
      setEditingMotor(null);
      refresh();
    } else {
      setEditError('Unable to update motor metadata. Please try again.');
    }
  };

  return (
    <MainLayout pageTitle="Monitored Motor Fleet">
      <div className="space-y-6">
        {/* Page Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">3-Phase 415-V Induction Motor Fleet</h2>
            <p className="text-xs text-slate-500">Live telemetry, AI diagnostic classification & rated specifications from Supabase</p>
          </div>

          {/* View Mode & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Updated:</span>
              <strong className="text-slate-800 font-mono">
                {formatTimeHHMMSS(
                  motors.reduce<string | null>((acc, m) => {
                    if (!m.sensor_timestamp) return acc;
                    if (!acc) return m.sensor_timestamp;
                    return new Date(m.sensor_timestamp) > new Date(acc) ? m.sensor_timestamp : acc;
                  }, null)
                )}
              </strong>
            </span>

            <button
              onClick={() => refresh()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              title="Refresh Motor Fleet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Toggle View Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('tiles')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'tiles' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tiles View</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 font-semibold cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="fault">Fault</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search motor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
            />
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && motors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading motor fleet data...</div>
        ) : filteredMotors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No motors match your search filter.</div>
        ) : viewMode === 'tiles' ? (
          /* Tiles Format View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMotors.map((m) => {
              const freshness = getDataFreshness(m.sensor_timestamp);

              return (
                <div
                  key={m.motor_id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Accent Status Strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      m.severity === 'critical' || m.motor_status === 'fault'
                        ? 'bg-red-600'
                        : m.severity === 'medium' || m.motor_status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />

                  <div>
                    {/* Tile Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="w-9 h-9 bg-slate-100 text-slate-900 rounded-lg flex items-center justify-center font-bold text-sm border border-slate-300">
                          M{m.motor_number}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            {m.motor_name || `Motor ${m.motor_number}`}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            ID: {m.motor_id.substring(0, 8)}... • 415-V Induction Motor
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${freshness.colorClass}`}>
                          {freshness.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getSeverityColorClass(m.severity || m.motor_status)}`}>
                          {m.severity || m.motor_status}
                        </span>
                      </div>
                    </div>

                    {/* Health & AI Diagnosis Section */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Health Index:</span>
                        <span
                          className={`font-black px-2 py-0.5 rounded text-xs ${
                            (m.health_index || 0) >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : (m.health_index || 0) >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {m.health_index ?? 100} / 100
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">AI Diagnosis:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]" title={m.class_name || 'Healthy'}>
                          {m.class_name || 'Healthy'}
                        </span>
                      </div>
                    </div>

                    {/* Real-time 8-Parameter Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-100">
                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Voltage</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatVoltage(m.voltage)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Current</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatCurrent(m.current)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Temperature</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatTemperature(m.temperature)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Vibration RMS</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatVibration(m.vibration_rms)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Active Power</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatPower(m.power)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Energy</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatEnergy(m.energy)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Frequency</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatFrequency(m.frequency)}</p>
                      </div>

                      <div className="p-2 bg-slate-50/50 rounded">
                        <p className="text-[11px] text-slate-500">Power Factor</p>
                        <p className="font-bold text-slate-900 font-mono text-sm">{formatPowerFactor(m.power_factor)}</p>
                      </div>
                    </div>

                    {/* Rated Specification Parameters */}
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> Rated Data Specifications
                        </span>
                        {role === 'admin' && (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" /> Edit Rated Data
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-amber-50/50 p-2.5 rounded border border-amber-100">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rated Volt:</span>
                          <strong className="text-slate-900 font-mono">{m.rated_voltage ?? DEFAULT_RATED_SPEC.rated_voltage} V</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rated Curr:</span>
                          <strong className="text-slate-900 font-mono">{m.rated_current ?? DEFAULT_RATED_SPEC.rated_current} A</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rated Power:</span>
                          <strong className="text-slate-900 font-mono">{m.rated_power ?? DEFAULT_RATED_SPEC.rated_power} kW</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rated Speed:</span>
                          <strong className="text-slate-900 font-mono">{m.rated_speed ?? DEFAULT_RATED_SPEC.rated_speed} RPM</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rated Freq:</span>
                          <strong className="text-slate-900 font-mono">{m.rated_frequency ?? DEFAULT_RATED_SPEC.rated_frequency} Hz</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Phase:</span>
                          <strong className="text-slate-900 font-mono">{DEFAULT_RATED_SPEC.phase}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tile Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Sync: <strong className="text-slate-800">{formatTimeAgo(m.sensor_timestamp)}</strong>
                    </span>

                    <button
                      onClick={() => navigate(`/motors/${m.motor_number}`)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Motor</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="py-3 px-4">Motor</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Health Index</th>
                    <th className="py-3 px-4">AI Diagnosis</th>
                    <th className="py-3 px-3">Voltage</th>
                    <th className="py-3 px-3">Current</th>
                    <th className="py-3 px-3">Temp</th>
                    <th className="py-3 px-3">Vibration</th>
                    <th className="py-3 px-3">Sync Time</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMotors.map((m) => (
                    <tr key={m.motor_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Motor {m.motor_number}: {m.motor_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityColorClass(m.severity || m.motor_status)}`}>
                          {m.severity || m.motor_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold">{m.health_index ?? 100} / 100</td>
                      <td className="py-3 px-4 text-slate-800">{m.class_name || 'Healthy'}</td>
                      <td className="py-3 px-3 font-mono">{formatVoltage(m.voltage)}</td>
                      <td className="py-3 px-3 font-mono">{formatCurrent(m.current)}</td>
                      <td className="py-3 px-3 font-mono">{formatTemperature(m.temperature)}</td>
                      <td className="py-3 px-3 font-mono">{formatVibration(m.vibration_rms)}</td>
                      <td className="py-3 px-3 text-slate-500">{formatTimeAgo(m.sensor_timestamp)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => navigate(`/motors/${m.motor_number}`)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded text-xs"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin Metadata Edit Modal */}
        {editingMotor && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit Motor {editingMotor.motor_number} Specifications
                </h3>
                <button onClick={() => setEditingMotor(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && <p className="text-xs text-red-600 font-semibold">{editError}</p>}

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motor Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rated Voltage (V)</label>
                    <input
                      type="number"
                      value={editVoltage}
                      onChange={(e) => setEditVoltage(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rated Current (A)</label>
                    <input
                      type="number"
                      value={editCurrent}
                      onChange={(e) => setEditCurrent(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingMotor(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    {isSaving ? 'Saving...' : 'Save Specifications'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MotorsPage;
