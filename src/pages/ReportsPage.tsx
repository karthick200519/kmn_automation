import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { exportToCSV } from '../utils/export';
import { supabase } from '../services/supabase/client';
import { FileText, Download, Printer, Calendar, FileCode, RefreshCw } from 'lucide-react';

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

type ReportMotor = {
  motor_id: string;
  motor_number: number;
  motor_name: string;
  motor_status: string;
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  vibration_rms: number | null;
  power: number | null;
  energy: number | null;
  frequency: number | null;
  power_factor: number | null;
  health_index: number | null;
  health_status: string | null;
  sensor_source: string | null;
  ai_class: string | null;
  ai_confidence: number | null;
  timestamp: string | null;
};

const timeframeLabels: Record<Timeframe, string> = {
  daily: 'Daily (Last 24 Hours)',
  weekly: 'Weekly (Last 7 Days)',
  monthly: 'Monthly (Last 30 Days)',
  yearly: 'Yearly (Last 365 Days)',
};

const timeframeHours: Record<Timeframe, number> = {
  daily: 24,
  weekly: 24 * 7,
  monthly: 24 * 30,
  yearly: 24 * 365,
};

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('sensor_monitoring');
  const [selectedMotor, setSelectedMotor] = useState<string>('all');
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');

  const [motors, setMotors] = useState<ReportMotor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getStartTime = (tf: Timeframe) => {
    const d = new Date();
    d.setHours(d.getHours() - timeframeHours[tf]);
    return d.toISOString();
  };

  const fetchLiveReportData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data: motorRows, error: motorsError } = await supabase
        .from('motors')
        .select('id, motor_number, motor_name, status')
        .order('motor_number', { ascending: true });

      if (motorsError) throw motorsError;

      const startTime = getStartTime(timeframe);

      const rows: ReportMotor[] = await Promise.all(
        (motorRows || []).map(async (motor) => {
          const [{ data: sensor }, { data: health }, { data: prediction }] = await Promise.all([
            supabase
              .from('motor_sensor_data')
              .select(
                'motor_id,timestamp,voltage,current,temperature,vibration_rms,power,energy,frequency,power_factor,sensor_source'
              )
              .eq('motor_id', motor.id)
              .gte('timestamp', startTime)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from('machine_health')
              .select('motor_id,timestamp,health_index,health_status')
              .eq('motor_id', motor.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from('ai_predictions')
              .select('motor_id,timestamp,class_name,confidence')
              .eq('motor_id', motor.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          return {
            motor_id: motor.id,
            motor_number: motor.motor_number,
            motor_name: motor.motor_name,
            motor_status: health?.health_status || motor.status || 'unknown',
            voltage: sensor?.voltage ?? null,
            current: sensor?.current ?? null,
            temperature: sensor?.temperature ?? null,
            vibration_rms: sensor?.vibration_rms ?? null,
            power: sensor?.power ?? null,
            energy: sensor?.energy ?? null,
            frequency: sensor?.frequency ?? null,
            power_factor: sensor?.power_factor ?? null,
            health_index: health?.health_index ?? null,
            health_status: health?.health_status ?? null,
            sensor_source: sensor?.sensor_source ?? null,
            ai_class: prediction?.class_name ?? null,
            ai_confidence: prediction?.confidence ?? null,
            timestamp: sensor?.timestamp ?? health?.timestamp ?? prediction?.timestamp ?? null,
          };
        })
      );

      setMotors(rows);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Reports live data fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live report data.');
      setMotors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveReportData();
    const interval = window.setInterval(fetchLiveReportData, 5000);
    return () => window.clearInterval(interval);
  }, [timeframe]);

  const filteredMotors = useMemo(() => {
    return motors.filter((m) => {
      const motorMatches =
        selectedMotor === 'all' || m.motor_number === Number(selectedMotor);

      const sourceMatches =
        dataSourceFilter === 'all' ||
        (dataSourceFilter === 'demo' && (m.sensor_source || '').toLowerCase().includes('demo')) ||
        (dataSourceFilter === 'live' &&
          !((m.sensor_source || '').toLowerCase().includes('demo')));

      return motorMatches && sourceMatches;
    });
  }, [motors, selectedMotor, dataSourceFilter]);

  const handleExportCSV = () => {
    const headers = [
      'Timeframe',
      'Motor Number',
      'Motor Name',
      'Status',
      'AI Condition',
      'AI Confidence',
      'Voltage (V)',
      'Current (A)',
      'Temp (°C)',
      'Vibration',
      'Power (kW)',
      'Energy (kWh)',
      'Frequency (Hz)',
      'Power Factor',
      'Health Index',
      'Source',
      'Timestamp',
    ];

    const rows = filteredMotors.map((m) => [
      timeframeLabels[timeframe],
      m.motor_number,
      m.motor_name,
      m.motor_status,
      m.ai_class || 'No prediction',
      m.ai_confidence == null ? '' : `${(m.ai_confidence * 100).toFixed(1)}%`,
      m.voltage ?? '',
      m.current ?? '',
      m.temperature ?? '',
      m.vibration_rms ?? '',
      m.power ?? '',
      m.energy ?? '',
      m.frequency ?? '',
      m.power_factor ?? '',
      m.health_index ?? '',
      m.sensor_source || 'unknown',
      m.timestamp ? new Date(m.timestamp).toLocaleString() : '',
    ]);

    exportToCSV(`KMN_Report_${reportType}_${timeframe.toUpperCase()}`, headers, rows);
  };

  const handleExportJSON = () => {
    const dataObj = {
      report_title: `KMN Industrial Automation - ${timeframeLabels[timeframe]} Report`,
      generated_at: new Date().toISOString(),
      timeframe,
      report_type: reportType,
      target_motor: selectedMotor,
      data_source: dataSourceFilter,
      source: 'Supabase live data',
      motors: filteredMotors,
    };

    const jsonString =
      `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataObj, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `KMN_Report_${timeframe}_${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatValue = (value: number | null, digits = 2) =>
    value == null ? '—' : value.toFixed(digits);

  return (
    <MainLayout pageTitle="Engineering Reports & Export Center">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>KMN Industrial Monitoring Report Generator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reports now read current telemetry, health and AI results from Supabase.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={fetchLiveReportData}
              disabled={refreshing}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Timeframe Period</span>
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
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
              <option value="live">Live / Raspberry Pi Data</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
        {(['daily', 'weekly', 'monthly', 'yearly'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-1.5 px-3 rounded-lg capitalize transition-all cursor-pointer ${
              timeframe === tf
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tf} Report
          </button>
        ))}
      </div>

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
              Period: <strong className="text-slate-800">{timeframeLabels[timeframe]}</strong>
              {' | '}
              Generated: {new Date().toLocaleString()}
              {lastUpdated && (
                <>
                  {' | '}
                  Live fetch: {lastUpdated.toLocaleTimeString()}
                </>
              )}
            </p>
          </div>

          <div className="text-right text-xs text-slate-600">
            <p className="font-bold">Project: 415-V Induction Motor Monitoring</p>
            <p>
              Data Mode:{' '}
              <span className="uppercase font-bold text-blue-600">
                {dataSourceFilter}
              </span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading live Supabase motor data...
          </div>
        ) : error ? (
          <div className="py-10 px-4 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            Failed to load live report data: {error}
          </div>
        ) : filteredMotors.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No live motor data found for the selected filters/timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                  <th className="py-2.5 px-3">Motor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">AI Condition</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Voltage</th>
                  <th className="py-2.5 px-3">Current</th>
                  <th className="py-2.5 px-3">Temp</th>
                  <th className="py-2.5 px-3">Vibration</th>
                  <th className="py-2.5 px-3">Power</th>
                  <th className="py-2.5 px-3">Health</th>
                  <th className="py-2.5 px-3">Updated</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMotors.map((m) => (
                  <tr key={m.motor_id}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {m.motor_name}
                    </td>
                    <td className="py-2.5 px-3 capitalize font-bold text-slate-800">
                      {m.motor_status}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {m.ai_class || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {m.ai_confidence == null
                        ? '—'
                        : `${(m.ai_confidence * 100).toFixed(0)}%`}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {formatValue(m.voltage)} V
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {formatValue(m.current)} A
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {formatValue(m.temperature)} °C
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {formatValue(m.vibration_rms)} g
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {formatValue(m.power)} kW
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {m.health_index == null ? '—' : `${m.health_index.toFixed(1)} / 100`}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">
                      {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
