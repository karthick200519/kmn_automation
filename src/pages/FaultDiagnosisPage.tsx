import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import type { AiPrediction } from '../types/database';
import { diagnosisService } from '../services/diagnosisService';
import { FAULT_CLASSES, getFaultClass } from '../config/faultClasses';
import { formatTimeAgo, getSeverityColorClass } from '../utils/formatters';
import { Stethoscope, Cpu, ShieldAlert, Filter } from 'lucide-react';

export const FaultDiagnosisPage: React.FC = () => {
  const [predictions, setPredictions] = useState<AiPrediction[]>([]);
  const [selectedMotorFilter, setSelectedMotorFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchPredictions();
  }, [selectedMotorFilter]);

  const fetchPredictions = async () => {
    const data = await diagnosisService.getDiagnosisHistory(selectedMotorFilter);
    setPredictions(data);
  };

  const filteredPredictions = predictions.filter((p) => {
    if (selectedCategoryFilter === 'all') return true;
    const def = getFaultClass(p.class_id);
    return def.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
  });

  return (
    <MainLayout pageTitle="24-Class Edge AI Fault Diagnosis">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            <span>Raspberry Pi Edge AI Deep Learning Classification</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            24 discrete electrical, mechanical, bearing, and lubrication fault signature inference feed
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMotorFilter}
              onChange={(e) => setSelectedMotorFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Motors</option>
              <option value="1">Motor 1</option>
              <option value="2">Motor 2</option>
              <option value="3">Motor 3</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Fault Categories</option>
              <option value="stator">Stator Faults</option>
              <option value="phase">Phase Faults</option>
              <option value="rotor">Rotor Faults</option>
              <option value="bearing">Bearing Faults</option>
              <option value="lubrication">Lubrication Faults</option>
              <option value="thermal">Thermal Faults</option>
            </select>
          </div>
        </div>
      </div>

      {/* 24-Class Matrix Accordion / Overview Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Exact 24 AI Fault Class Mapping System
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {Object.values(FAULT_CLASSES).map((fc) => (
            <div
              key={fc.class_id}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                fc.class_id === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Class #{fc.class_id}</span>
                <span className="uppercase">{fc.category}</span>
              </div>
              <p className="font-bold text-xs leading-tight line-clamp-2">{fc.class_name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Prediction History Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent AI Inference Predictions Feed</h3>
          <span className="text-xs text-slate-500">Model Version: <strong>v1.2.0 DL</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                <th className="py-2.5 px-4">Class ID</th>
                <th className="py-2.5 px-4">Fault Classification</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">AI Confidence</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Model Tag</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPredictions.map((pred) => {
                const fc = getFaultClass(pred.class_id);
                return (
                  <tr key={pred.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">#{pred.class_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{pred.class_name}</td>
                    <td className="py-3 px-3 text-slate-600 uppercase font-semibold">{fc.category}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-blue-600">
                          {Math.round((pred.confidence || 0.9) * 100)}%
                        </span>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full"
                            style={{ width: `${(pred.confidence || 0.9) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(fc.severity_default)}`}>
                        {fc.severity_default}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{pred.model_version || 'v1.2.0'}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{formatTimeAgo(pred.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </MainLayout>
  );
};
