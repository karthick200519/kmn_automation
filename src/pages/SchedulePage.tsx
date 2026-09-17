import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { MaintenanceSchedule } from '../types/database';
import { scheduleService } from '../services/scheduleService';
import { useMotors } from '../hooks/useMotors';
import { useAuth } from '../context/AuthContextDef';
import { getSeverityColorClass, formatTimeHHMMSS } from '../utils/formatters';
import { Calendar as CalendarIcon, List, Plus, Trash2, X, Clock, RefreshCw } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  const { role, profile } = useAuth();
  const { motors } = useMotors();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const newestTimestamp = schedules.reduce<string | null>((acc, s) => {
    const ts = s.created_at || s.start_time;
    if (!ts) return acc;
    if (!acc) return ts;
    return new Date(ts) > new Date(acc) ? ts : acc;
  }, null);

  // Add Schedule Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMotorId, setSelectedMotorId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [scheduleType, setScheduleType] = useState<any>('bearing_inspection');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<any>('medium');
  const [assignedToName, setAssignedToName] = useState('Sarah Chen (Engineer)');
  const [startTime, setStartTime] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(() => new Date(Date.now() + 93600000).toISOString().slice(0, 16));
  const [status, setStatus] = useState<any>('scheduled');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeMotorId = selectedMotorId || motors[0]?.motor_id || '';

  const fetchSchedules = async () => {
    const data = await scheduleService.getSchedules();
    setSchedules(data);
  };

  useEffect(() => {
    let active = true;
    scheduleService.getSchedules().then((data) => {
      if (active) setSchedules(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setNotes('');
    setSelectedMotorId(motors[0]?.motor_id || '');
    setAssignedToName('Sarah Chen (Engineer)');
    setStatus('scheduled');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isoStart = new Date(startTime).toISOString();
    const isoEnd = endTime ? new Date(endTime).toISOString() : null;

    const payload = {
      motor_id: activeMotorId,
      title,
      schedule_type: scheduleType,
      description,
      priority,
      start_time: isoStart,
      end_time: isoEnd,
      status: status as any,
      assigned_to_name: assignedToName,
      notes,
      created_by: profile?.id || null,
      assigned_to: profile?.id || null,
    };

    setIsSubmitting(true);
    const result = await scheduleService.createSchedule(payload as any);
    setIsSubmitting(false);

    if (result.success) {
      setIsCreateOpen(false);
      await fetchSchedules();
    } else {
      setFormError(result.error || 'Unable to save maintenance schedule.');
    }
  };

  const handleStatusChange = async (scheduleId: string, statusValue: string) => {
    await scheduleService.updateScheduleStatus(scheduleId, statusValue);
    await fetchSchedules();
  };

  const handleDelete = async (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this maintenance schedule?')) {
      await scheduleService.deleteSchedule(scheduleId);
      await fetchSchedules();
    }
  };

  return (
    <MainLayout pageTitle="Preventive Maintenance Scheduling">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span>Fleet Maintenance Planner (maintenance_schedules)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled inspections, greasing tasks, and electrical overhauls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Updated:</span>
              <strong className="text-slate-800 font-mono">{formatTimeHHMMSS(newestTimestamp)}</strong>
            </span>
            <button
              onClick={() => fetchSchedules()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              title="Refresh Schedules"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle View Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>

              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>

            {(role === 'admin' || role === 'engineer') && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Maintenance</span>
              </button>
            )}
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Scheduled Work Orders</h3>
              <span className="text-xs text-slate-500">Total Work Orders: <strong>{schedules.length}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="py-3 px-4">Motor Target</th>
                    <th className="py-3 px-4">Work Order Title</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Start Time</th>
                    <th className="py-3 px-3">Assigned Technician</th>
                    <th className="py-3 px-3">Status</th>
                    {(role === 'admin' || role === 'engineer') && (
                      <th className="py-3 px-4 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No maintenance schedules logged yet.
                      </td>
                    </tr>
                  ) : (
                    schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {s.motor_name || `Motor ${s.motor_number || 1}`}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{s.title}</p>
                          {s.description && <p className="text-[11px] text-slate-500 mt-0.5">{s.description}</p>}
                        </td>
                        <td className="py-3 px-3 text-slate-700 capitalize">
                          {s.schedule_type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityColorClass(s.priority)}`}>
                            {s.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {new Date(s.start_time).toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-slate-700">{s.assigned_to_name || 'Unassigned'}</td>
                        <td className="py-3 px-3">
                          {role === 'admin' || role === 'engineer' ? (
                            <select
                              value={s.status}
                              onChange={(e) => handleStatusChange(s.id, e.target.value)}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 text-[11px] focus:outline-none"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          ) : (
                            <span className="capitalize font-bold text-slate-800">{s.status.replace('_', ' ')}</span>
                          )}
                        </td>
                        {(role === 'admin' || role === 'engineer') && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete Schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Calendar Overview View */
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center">
            <CalendarIcon className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-sm mb-1">Calendar Schedule Grid</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
              Showing upcoming maintenance schedules for 3-phase induction motors.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {schedules.map((s) => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600">{s.motor_name || `Motor ${s.motor_number || 1}`}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(s.priority)}`}>
                      {s.priority}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
                  <p className="text-xs text-slate-500">{s.description}</p>
                  <div className="space-y-1 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold"><Clock className="w-3 h-3 text-slate-400" /> Start:</span>
                      <span>{new Date(s.start_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold"><Clock className="w-3 h-3 text-slate-400" /> End:</span>
                      <span>{s.end_time ? new Date(s.end_time).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Schedule Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add Maintenance Schedule</span>
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                    {formError}
                  </div>
                )}

                {/* Motor & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Motor</label>
                    <select
                      value={activeMotorId}
                      onChange={(e) => setSelectedMotorId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {motors.map((m) => (
                        <option key={m.motor_id} value={m.motor_id}>
                          Motor {m.motor_number}: {m.motor_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Schedule Type</label>
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="inspection">Inspection</option>
                      <option value="preventive_maintenance">Preventive Maintenance</option>
                      <option value="bearing_inspection">Bearing Inspection</option>
                      <option value="lubrication">Lubrication</option>
                      <option value="electrical_inspection">Electrical Inspection</option>
                      <option value="vibration_inspection">Vibration Inspection</option>
                      <option value="general_maintenance">General Maintenance</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Schedule Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Bearing Greasing & Vibration Analysis"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed work instructions..."
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Technician / Engineer</label>
                  <input
                    type="text"
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Create Work Order'}
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

export default SchedulePage;
