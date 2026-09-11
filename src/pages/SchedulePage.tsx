import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { MaintenanceSchedule } from '../types/database';
import { scheduleService } from '../services/scheduleService';
import { useAuth } from '../context/AuthContext';
import { getSeverityColorClass } from '../utils/formatters';
import { Calendar as CalendarIcon, List, Plus, Trash2, X, Clock } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  const { role, profile } = useAuth();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Add Schedule Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [motorNumber, setMotorNumber] = useState<number>(1);
  const [motorId, setMotorId] = useState<string>('a1111111-1111-1111-1111-111111111111');
  const [title, setTitle] = useState('');
  const [scheduleType, setScheduleType] = useState<any>('bearing_inspection');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<any>('medium');
  const [assignedToName, setAssignedToName] = useState('Sarah Chen (Engineer)');
  const [startTime, setStartTime] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 93600000).toISOString().slice(0, 16));
  const [status, setStatus] = useState<any>('scheduled');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const data = await scheduleService.getSchedules();
    setSchedules(data);
  };

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setNotes('');
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
      motor_id: motorId,
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

  const motorIdMap: Record<number, string> = {
    1: 'a1111111-1111-1111-1111-111111111111',
    2: 'b2222222-2222-2222-2222-222222222222',
    3: 'c3333333-3333-3333-3333-333333333333',
  };

  return (
    <MainLayout pageTitle="Maintenance Work Order Scheduling">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">Preventive & Corrective Maintenance Schedule</h2>
          <p className="text-xs text-slate-500">Plan and track motor maintenance tasks across all 3 units</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Add Schedule Button */}
          {(role === 'admin' || role === 'engineer') && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                  <th className="py-3 px-4">Motor</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Assigned To</th>
                  <th className="py-3 px-3">Start Time</th>
                  <th className="py-3 px-3">End Time</th>
                  <th className="py-3 px-3">Status</th>
                  {(role === 'admin' || role === 'engineer') && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">Motor {s.motor_number || 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{s.title}</p>
                      {s.description && <p className="text-[11px] text-slate-500 line-clamp-1">{s.description}</p>}
                    </td>
                    <td className="py-3 px-3 text-slate-600 capitalize">{s.schedule_type.replace('_', ' ')}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(s.priority)}`}>
                        {s.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{s.assigned_to_name || 'Sarah Chen (Engineer)'}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{new Date(s.start_time).toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {s.end_time ? new Date(s.end_time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      {(role === 'admin' || role === 'engineer') ? (
                        <select
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-800 cursor-pointer"
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
                ))}
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
            Showing upcoming maintenance schedules for Motor 1, Motor 2, and Motor 3.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {schedules.map((s) => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-600">Motor {s.motor_number || 1}</span>
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
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold">Assigned To:</span>
                    <span className="font-bold text-slate-800">{s.assigned_to_name || 'Sarah Chen (Engineer)'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold">Status:</span>
                    <span className="font-bold capitalize text-slate-800">{s.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                    value={motorNumber}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setMotorNumber(num);
                      setMotorId(motorIdMap[num]);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={1}>Motor 1</option>
                    <option value={2}>Motor 2</option>
                    <option value={3}>Motor 3</option>
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

              {/* Priority & Assigned To */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Assigned To</label>
                  <select
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Sarah Chen (Engineer)">Sarah Chen (Engineer)</option>
                    <option value="Karthick (Admin)">Karthick (Admin)</option>
                    <option value="Rajesh Kumar (Operator)">Rajesh Kumar (Operator)</option>
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>
              </div>

              {/* Start Time, End Time & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Add Schedule'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </MainLayout>
  );
};
