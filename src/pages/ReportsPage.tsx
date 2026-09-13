import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { exportToCSV } from '../utils/export';
import { FileText, Download, Printer, Calendar, FileCode } from 'lucide-react'; 
import { MOCK_MOTORS, MOCK_ALERTS, MOCK_LOGS } from '../services/mockData';     

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('sensor_monitoring');    
  const [selectedMotor, setSelectedMotor] = useState<string>('all');
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('all');      
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const timeframeLabels: Record<string, string> = {
    daily: 'Daily (Last 24 Hours)',
    weekly: 'Weekly (Last 7 Days)',
    monthly: 'Monthly (Last 30 Days)',
    yearly: 'Yearly (Last 365 Days)',
  };

  const getFilteredMotors = () => {
    if (selectedMotor === 'all') return MOCK_MOTORS;
    return MOCK_MOTORS.filter((m) => m.motor_number === Number(selectedMotor)); 
  };

  const handleExportCSV = () => {
    const timeTag = timeframe.toUpperCase();
    const filteredMotors = getFilteredMotors();

    if (reportType === 'sensor_monitoring' || reportType === 'motor_condition') {
      const headers = ['Timeframe', 'Motor Number', 'Motor Name', 'Status', 'Voltage (V)', 'Current (A)', 'Temp (Â°C)', 'Vibration (g)', 'Power (kW)', 'Health Index', 'Source'];
      const rows = filteredMotors.map((m) => [
        timeframeLabels[timeframe],
        m.motor_number,
        m.motor_name,
        m.motor_status,
        m.voltage || 415,
        m.current || 14.8,
        m.temperature || 42,
        m.vibration_rms || 1.1,
        m.power || 10.2,
        m.health_index || 95,
        m.sensor_source || 'sample',
      ]);
      exportToCSV(`KMN_Report_${reportType}_${timeTag}`, headers, rows);        
    } else if (reportType === 'alerts') {
      const headers = ['Timeframe', 'Motor Number', 'Title', 'Message', 'Severity', 'Status', 'Timestamp'];
      const rows = MOCK_ALERTS.map((a) => [timeframeLabels[timeframe], a.motor_number || 1, a.title, a.message, a.severity, a.status, a.timestamp]);
      exportToCSV(`KMN_Alerts_Report_${timeTag}`, headers, rows);
    } else {
      const headers = ['Timeframe', 'Timestamp', 'Event Type', 'Severity', 'Message'];
      const rows = MOCK_LOGS.map((l) => [timeframeLabels[timeframe], l.timestamp, l.event_type, l.severity, l.message]);
      exportToCSV(`KMN_Log_Report_${reportType}_${timeTag}`, headers, rows);    
    }
  };

  const handleExportJSON = () => {
    const filteredMotors = getFilteredMotors();
    const dataObj = {
      report_title: `KMN Industrial Automation - ${timeframeLabels[timeframe]} Report`,
      generated_at: new Date().toISOString(),
      timeframe: timeframe,
      report_type: reportType,
      target_motor: selectedMotor,
      data_source: dataSourceFilter,
      motors: filteredMotors,
      alerts: MOCK_ALERTS,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataObj, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `KMN_Report_${timeframe}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <MainLayout pageTitle="Engineering Reports & Export Center">

      {/* Top Controls Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>KMN Industrial Monitoring Report Generator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select Daily, Weekly, Monthly, or Yearly timeframes to generate compliance reports
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">       
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Report Criteria & Timeframe Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">

          {/* Timeframe selector: Daily, Weekly, Monthly, Yearly */}
          <div>
            <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Timeframe Period</span>
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-blue-700 bg-blue-50/50 cursor-pointer focus:ring-1 focus:ring-blue-500"
            >
              <option value="daily">Daily Report (Last 24 Hours)</option>       
              <option value="weekly">Weekly Report (Last 7 Days)</option>       
              <option value="monthly">Monthly Report (Last 30 Days)</option>
              <option value="yearly">Yearly Report (Last 365 Days)</option>     
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Report Category</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800 cursor-pointer"
            >
              <option value="sensor_monitoring">Sensor Telemetry Monitoring</option>
              <option value="motor_condition">Motor Condition Summary</option>  
              <option value="fault_diagnosis">Fault Diagnosis History</option>  
              <option value="health">Machine Health Analytics</option>
              <option value="alerts">Alerts & Alarm History</option>
              <option value="control">Control Command Audit</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Motor</label>
            <select
              value={selectedMotor}
              onChange={(e) => setSelectedMotor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800 cursor-pointer"
            >
              <option value="all">All Motors (1, 2, 3)</option>
              <option value="1">Motor 1</option>
              <option value="2">Motor 2</option>
              <option value="3">Motor 3</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Data Source Filter</label>
            <select
              value={dataSourceFilter}
              onChange={(e) => setDataSourceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800 cursor-pointer"
            >
              <option value="all">All Data Sources</option>
              <option value="demo">Demo Data Only</option>
              <option value="live">Live Modbus Data Only</option>
            </select>
          </div>

        </div>
      </div>

      {/* Timeframe Quick Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tf) => (      
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-1.5 px-3 rounded-lg capitalize transition-all cursor-pointer ${
              timeframe === tf ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tf} Report
          </button>
        ))}
      </div>

      {/* Printable Report Preview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 print:shadow-none print:border-none">

        <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
              <span>KMN INDUSTRIAL MOTOR CONDITION REPORT</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full uppercase">
                {timeframe}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Period: <strong className="text-slate-800">{timeframeLabels[timeframe]}</strong> | Generated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-bold">Project: 415-V Induction Motor Monitoring</p>
            <p>Data Mode: <span className="uppercase font-bold text-blue-600">{dataSourceFilter}</span></p>
          </div>
        </div>

        {/* Report Preview Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                <th className="py-2.5 px-3">Motor</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Voltage</th>
                <th className="py-2.5 px-3">Current</th>
                <th className="py-2.5 px-3">Temp</th>
                <th className="py-2.5 px-3">Vibration</th>
                <th className="py-2.5 px-3">Power</th>
                <th className="py-2.5 px-3">Health Index</th>
                <th className="py-2.5 px-3">Timeframe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {getFilteredMotors().map((m) => (
                <tr key={m.motor_id}>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{m.motor_name}</td>
                  <td className="py-2.5 px-3 capitalize font-bold text-slate-800">{m.motor_status}</td>
                  <td className="py-2.5 px-3 font-mono">{m.voltage} V</td>      
                  <td className="py-2.5 px-3 font-mono">{m.current} A</td>      
                  <td className="py-2.5 px-3 font-mono">{m.temperature} Â°C</td>
                  <td className="py-2.5 px-3 font-mono">{m.vibration_rms} g</td>
                  <td className="py-2.5 px-3 font-mono">{m.power} kW</td>       
                  <td className="py-2.5 px-3 font-bold">{m.health_index} / 100</td>
                  <td className="py-2.5 px-3 font-semibold text-blue-700 capitalize">{timeframe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </MainLayout>
  );
};