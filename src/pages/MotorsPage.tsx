import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import { useAuth } from '../context/AuthContext';
import {
  formatVoltage,
  formatCurrent,
  formatTemperature,
  formatVibration,
  formatPower,
  formatFrequency,
  formatPowerFactor,
  formatTimeAgo,
  getSeverityColorClass,
} from '../utils/formatters';
import { Cpu, Edit, Eye, Filter, LayoutGrid, List, X, ShieldCheck, Zap, Activity } from 'lucide-react';

export const MotorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);
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

  const fetchMotors = async () => {
    const data = await motorService.getCurrentMotorStatus();
    setMotors(data);
  };

  useEffect(() => {
    fetchMotors();
  }, []);

  const filteredMotors = motors.filter((m) => {
    const matchesStatus = filterStatus === 'all' || m.motor_status === filterStatus;
    const matchesSearch =
      m.motor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `motor ${m.motor_number}`.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenEdit = (m: CurrentMotorStatus) => {
    setEditingMotor(m);
    setEditName(m.motor_name);
    setEditVoltage(m.rated_voltage || 415);
    setEditCurrent(m.rated_current || 15);
    setEditPower(m.rated_power || 11);
    setEditSpeed(m.rated_speed || 1475);
    setEditFrequency(m.rated_frequency || 50);
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
      await fetchMotors();
    } else {
      setEditError('Unable to update motor metadata. Please try again.');
    }
  };

  return (
    <MainLayout pageTitle="Monitored Motor Fleet">
      
      {/* Page Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">3-Phase 415-V Induction Motor Fleet</h2>
          <p className="text-xs text-slate-500">Live telemetry, AI diagnostic classification & rated specifications</p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex items-center space-x-3 text-xs">
          
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

      {/* Tiles Format View (Default) */}
      {viewMode === 'tiles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMotors.map((m) => (
            <div
              key={m.motor_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Accent Status Strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  m.motor_status === 'healthy'
                    ? 'bg-emerald-500'
                    : m.motor_status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-red-600'
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
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{m.motor_name}</h3>
                      <p className="text-[11px] text-slate-500">415-V Industrial Induction Motor</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getSeverityColorClass(
                      m.motor_status
                    )}`}
                  >
                    {m.motor_status}
                  </span>
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
                      {m.health_index ?? 'N/A'} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">AI Diagnosis:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[170px]" title={m.class_name || 'Healthy'}>
                      {m.class_name || 'Healthy'}
                    </span>
                  </div>
                </div>

                {/* Real-time Parameters Grid */}
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
                    <p className="text-[11px] text-slate-500">Frequency</p>
                    <p className="font-bold text-slate-900 font-mono text-sm">{formatFrequency(m.frequency)}</p>
                  </div>
                </div>

                {/* Rated Specification Parameters (Admin Edit Target) */}
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
                      <strong className="text-slate-900 font-mono">{m.rated_voltage || 415} V</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rated Curr:</span>
                      <strong className="text-slate-900 font-mono">{m.rated_current || 15.0} A</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rated Power:</span>
                      <strong className="text-slate-900 font-mono">{m.rated_power || 11.0} kW</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rated Speed:</span>
                      <strong className="text-slate-900 font-mono">{m.rated_speed || 1475} RPM</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rated Freq:</span>
                      <strong className="text-slate-900 font-mono">{m.rated_frequency || 50} Hz</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Phase:</span>
                      <strong className="text-slate-900 font-mono">3-Phase</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Sync: {formatTimeAgo(m.sensor_timestamp)}</span>
                <button
                  onClick={() => navigate(`/motors/${m.motor_number}`)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Table Format View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Motor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Voltage</th>
                  <th className="py-3 px-3 text-right">Current</th>
                  <th className="py-3 px-3 text-right">Temp</th>
                  <th className="py-3 px-3 text-right">Vibration</th>
                  <th className="py-3 px-3 text-right">Power</th>
                  <th className="py-3 px-3 text-right">Rated V / I</th>
                  <th className="py-3 px-3 text-center">Health</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMotors.map((m) => (
                  <tr key={m.motor_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded flex items-center justify-center text-[10px] font-bold border border-slate-300">
                          M{m.motor_number}
                        </span>
                        <span>{m.motor_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(m.motor_status)}`}>
                        {m.motor_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{formatVoltage(m.voltage)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrent(m.current)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatTemperature(m.temperature)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatVibration(m.vibration_rms)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatPower(m.power)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{m.rated_voltage || 415}V / {m.rated_current || 15}A</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        (m.health_index || 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : (m.health_index || 0) >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {m.health_index ?? 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(m.severity)}`}>
                        {m.severity || 'low'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => navigate(`/motors/${m.motor_number}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="View Detailed Analytics"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit Rated Specifications"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Metadata & Rated Data Edit Modal */}
      {editingMotor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Edit Rated Specifications: Motor {editingMotor.motor_number}</span>
              </h3>
              <button onClick={() => setEditingMotor(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  {editError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motor Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated Voltage (V)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={editVoltage}
                    onChange={(e) => setEditVoltage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated Current (A)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={editCurrent}
                    onChange={(e) => setEditCurrent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated Power (kW)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={editPower}
                    onChange={(e) => setEditPower(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated Speed (RPM)</label>
                  <input
                    type="number"
                    required
                    step="1"
                    value={editSpeed}
                    onChange={(e) => setEditSpeed(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated Freq (Hz)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMotor(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Rated Data'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </MainLayout>
  );
};

