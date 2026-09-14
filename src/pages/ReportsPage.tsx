import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { supabase } from '../services/supabase/client';
import { Calendar, Download, FileText, Printer, RefreshCw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

type TelemetryRow = {
  id: string;
  motor_id: string;
  timestamp: string;
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  vibration_rms: number | null;
  power: number | null;
  energy: number | null;
  frequency: number | null;
  power_factor: number | null;
  data_quality?: string | null;
  source?: string | null;
};

type PredictionRow = {
  motor_id: string;
  timestamp: string;
  class_id: number | null;
  class_name: string | null;
  confidence: number | null;
};

type HealthRow = {
  motor_id: string;
  timestamp: string;
  health_index: number | null;
  health_status: string | null;
};

type Motor = {
  id: string;
  motor_number: number;
  motor_name: string;
  status: string;
};

type JoinedRow = TelemetryRow & {
  motor_number: number;
  motor_name: string;
  fault_type: string;
  fault_class_id: number | null;
  confidence: number | null;
  health_index: number | null;
  health_status: string | null;
};

const timeframeLabels: Record<Timeframe, string> = {
  daily: 'Daily (Last 24 Hours)',
  weekly: 'Weekly (Last 7 Days)',
  monthly: 'Monthly (Last 30 Days)',
  yearly: 'Yearly (Last 365 Days)',
};

const timeframeMinutes: Record<Timeframe, number> = {
  daily: 24 * 60,
  weekly: 7 * 24 * 60,
  monthly: 30 * 24 * 60,
  yearly: 365 * 24 * 60,
};

const toKw = (power: number | null) => {
  if (power == null) return null;
  return Math.abs(power) > 100 ? power / 1000 : power;
};

const nearestValue = <T extends { timestamp: string }>(
  rows: T[],
  timestamp: string,
  maxGapMs = 90_000
): T | null => {
  const target = new Date(timestamp).getTime();
  let best: T | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const gap = Math.abs(new Date(row.timestamp).getTime() - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = row;
    }
  }

  return best && bestGap <= maxGapMs ? best : null;
};

/** Keep exactly one telemetry row per UTC minute: the latest Pi reading in that minute. */
const oneRowPerMinute = (rows: TelemetryRow[]) => {
  const map = new Map<string, TelemetryRow>();

  for (const row of rows) {
    const d = new Date(row.timestamp);
    const key = `${row.motor_id}|${d.toISOString().slice(0, 16)}`;
    const existing = map.get(key);

    if (!existing || new Date(row.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      map.set(key, row);
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('sensor_monitoring');
  const [selectedMotor, setSelectedMotor] = useState('all');
  const [dataSourceFilter, setDataSourceFilter] = useState('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');

  const [motors, setMotors] = useState<Motor[]>([]);
  const [joinedRows, setJoinedRows] = useState<JoinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getStartTime = (tf: Timeframe) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - timeframeMinutes[tf]);
    return d.toISOString();
  };

  const fetchReportData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data: motorData, error: motorError } = await supabase
        .from('motors')
        .select('id, motor_number, motor_name, status')
        .order('motor_number', { ascending: true });

      if (motorError) throw motorError;

      const motorList = (motorData || []) as Motor[];
      const startTime = getStartTime(timeframe);

      const { data: telemetry, error: telemetryError } = await supabase
        .from('motor_sensor_data')
        .select(
          'id,motor_id,timestamp,voltage,current,temperature,vibration_rms,power,energy,frequency,power_factor,data_quality,source'
        )
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true })
        .limit(10000);

      if (telemetryError) throw telemetryError;

      const { data: predictions, error: predictionError } = await supabase
        .from('ai_predictions')
        .select('motor_id,timestamp,class_id,class_name,confidence')
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true })
        .limit(10000);

      if (predictionError) throw predictionError;

      const { data: health, error: healthError } = await supabase
        .from('machine_health')
        .select('motor_id,timestamp,health_index,health_status')
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true })
        .limit(10000);

      if (healthError) throw healthError;

      const motorMap = new Map(motorList.map((m) => [m.id, m]));
      const predictionMap = new Map<string, PredictionRow[]>();
      const healthMap = new Map<string, HealthRow[]>();

      for (const p of (predictions || []) as PredictionRow[]) {
        const list = predictionMap.get(p.motor_id) || [];
        list.push(p);
        predictionMap.set(p.motor_id, list);
      }

      for (const h of (health || []) as HealthRow[]) {
        const list = healthMap.get(h.motor_id) || [];
        list.push(h);
        healthMap.set(h.motor_id, list);
      }

      const minuteRows = oneRowPerMinute((telemetry || []) as TelemetryRow[]);

      const combined: JoinedRow[] = minuteRows
        .map((t) => {
          const motor = motorMap.get(t.motor_id);
          if (!motor) return null;

          const prediction = nearestValue(
            predictionMap.get(t.motor_id) || [],
            t.timestamp,
            90_000
          );
          const healthPoint = nearestValue(
            healthMap.get(t.motor_id) || [],
            t.timestamp,
            90_000
          );

          return {
            ...t,
            motor_number: motor.motor_number,
            motor_name: motor.motor_name,
            fault_type: prediction?.class_name || 'No prediction',
            fault_class_id: prediction?.class_id ?? null,
            confidence: prediction?.confidence ?? null,
            health_index: healthPoint?.health_index ?? null,
            health_status: healthPoint?.health_status ?? null,
          };
        })
        .filter((row): row is JoinedRow => row !== null);

      setMotors(motorList);
      setJoinedRows(combined);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Reports live data fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live report data.');
      setJoinedRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchReportData();
    const interval = window.setInterval(() => void fetchReportData(), 5000);
    return () => window.clearInterval(interval);
  }, [timeframe]);

  const currentRows = useMemo(() => {
    return motors.map((motor) => {
      const rows = joinedRows.filter((r) => r.motor_id === motor.id);
      return rows.length ? rows[rows.length - 1] : null;
    }).filter((row): row is JoinedRow => row !== null);
  }, [motors, joinedRows]);

  const displayRows = useMemo(() => {
    return currentRows.filter((row) => {
      const motorMatch =
        selectedMotor === 'all' || row.motor_number === Number(selectedMotor);
      const source = (row.source || '').toLowerCase();
      const sourceMatch =
        dataSourceFilter === 'all' ||
        (dataSourceFilter === 'demo' && source === 'sample') ||
        (dataSourceFilter === 'live' && source === 'modbus');
      return motorMatch && sourceMatch;
    });
  }, [currentRows, selectedMotor, dataSourceFilter]);

  const exportRows = useMemo(() => {
    return joinedRows.filter((row) => {
      const motorMatch =
        dataSourceFilter === 'all' ||
        (dataSourceFilter === 'demo' && (row.source || '').toLowerCase() === 'sample') ||
        (dataSourceFilter === 'live' && (row.source || '').toLowerCase() === 'modbus');

      const selectedMatch =
        selectedMotor === 'all' || row.motor_number === Number(selectedMotor);

      return motorMatch && selectedMatch;
    });
  }, [joinedRows, selectedMotor, dataSourceFilter]);

  const makeSheetRows = (motorNumber: number) => {
    return exportRows
      .filter((row) => row.motor_number === motorNumber)
      .map((row, index) => ({
        'Record No.': index + 1,
        'Timestamp': new Date(row.timestamp).toLocaleString(),
        'Motor Number': row.motor_number,
        'Motor Name': row.motor_name,
        'Voltage (V)': row.voltage ?? '',
        'Current (A)': row.current ?? '',
        'Temperature (°C)': row.temperature ?? '',
        'Vibration': row.vibration_rms ?? '',
        'Power (kW)': toKw(row.power) ?? '',
        'Energy (kWh)': row.energy ?? '',
        'Frequency (Hz)': row.frequency ?? '',
        'Power Factor': row.power_factor ?? '',
        'Fault Class ID': row.fault_class_id ?? '',
        'Fault Type': row.fault_type,
        'AI Confidence': row.confidence == null ? '' : `${(row.confidence * 100).toFixed(1)}%`,
        'Health Index': row.health_index ?? '',
        'Health Status': row.health_status ?? '',
        'Data Quality': row.data_quality ?? '',
        'Data Source': row.source ?? '',
      }));
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Always create exactly 3 motor sheets.
    [1, 2, 3].forEach((motorNumber) => {
      const motor = motors.find((m) => m.motor_number === motorNumber);
      const sheetRows = makeSheetRows(motorNumber);

      const rows = sheetRows.length
        ? sheetRows
        : [{
            'Record No.': '',
            'Timestamp': '',
            'Motor Number': motorNumber,
            'Motor Name': motor?.motor_name || `Motor ${motorNumber}`,
            'Voltage (V)': '',
            'Current (A)': '',
            'Temperature (°C)': '',
            'Vibration': '',
            'Power (kW)': '',
            'Energy (kWh)': '',
            'Frequency (Hz)': '',
            'Power Factor': '',
            'Fault Class ID': '',
            'Fault Type': 'No data in selected period',
            'AI Confidence': '',
            'Health Index': '',
            'Health Status': '',
            'Data Quality': '',
            'Data Source': '',
          }];

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      worksheet['!autofilter'] = {
        ref: worksheet['!ref'] || 'A1:S1',
      };

      worksheet['!cols'] = [
        { wch: 11 }, { wch: 22 }, { wch: 13 }, { wch: 18 },
        { wch: 13 }, { wch: 13 }, { wch: 16 }, { wch: 14 },
        { wch: 13 }, { wch: 14 }, { wch: 15 }, { wch: 14 },
        { wch: 15 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
        { wch: 16 }, { wch: 14 }, { wch: 14 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, `Motor ${motorNumber}`);
    });

    const suffix = timeframe.toUpperCase();
    XLSX.writeFile(
      workbook,
      `KMN_Motor_Report_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handlePrintPDF = () => window.print();

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
              Raspberry Pi data is stored at 1-minute resolution and exported as one Excel workbook with three motor sheets.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={() => void fetchReportData()}
              disabled={refreshing}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
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
              className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-blue-700 bg-blue-50/50"
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
              className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800"
            >
              <option value="sensor_monitoring">Sensor Telemetry Monitoring</option>
              <option value="motor_condition">Motor Condition Summary</option>
              <option value="fault_diagnosis">Fault Diagnosis History</option>
              <option value="health">Machine Health Analytics</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Motor</label>
            <select
              value={selectedMotor}
              onChange={(e) => setSelectedMotor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800"
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
              className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800"
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
            className={`flex-1 py-1.5 px-3 rounded-lg capitalize ${
              timeframe === tf
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tf} Report
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">
              KMN INDUSTRIAL MOTOR CONDITION REPORT
            </h3>
            <p className="text-xs text-slate-500">
              Period: <strong className="text-slate-800">{timeframeLabels[timeframe]}</strong>
              {' | '}
              Live fetch: {lastUpdated?.toLocaleTimeString() || '—'}
            </p>
          </div>

          <div className="text-right text-xs text-slate-600">
            <p className="font-bold">Project: 415-V Induction Motor Monitoring</p>
            <p>Records exported at 1-minute resolution</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading Raspberry Pi / Supabase data...
          </div>
        ) : error ? (
          <div className="py-10 px-4 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            Failed to load live report data: {error}
          </div>
        ) : displayRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No Raspberry Pi data found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                  <th className="py-2.5 px-3">Motor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Fault Type</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Voltage</th>
                  <th className="py-2.5 px-3">Current</th>
                  <th className="py-2.5 px-3">Temp</th>
                  <th className="py-2.5 px-3">Vibration</th>
                  <th className="py-2.5 px-3">Power</th>
                  <th className="py-2.5 px-3">Energy</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">PF</th>
                  <th className="py-2.5 px-3">Health</th>
                  <th className="py-2.5 px-3">Updated</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {displayRows.map((row) => (
                  <tr key={`${row.motor_id}-${row.timestamp}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {row.motor_name}
                    </td>
                    <td className="py-2.5 px-3 capitalize font-bold">
                      {row.health_status || row.source || 'unknown'}
                    </td>
                    <td className="py-2.5 px-3 font-bold">{row.fault_type}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {row.confidence == null ? '—' : `${(row.confidence * 100).toFixed(0)}%`}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.voltage)} V</td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.current)} A</td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.temperature)} °C</td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.vibration_rms)} g</td>
                    <td className="py-2.5 px-3 font-mono">
                      {toKw(row.power) == null ? '—' : `${toKw(row.power)!.toFixed(2)} kW`}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.energy)} kWh</td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.frequency)} Hz</td>
                    <td className="py-2.5 px-3 font-mono">{formatValue(row.power_factor, 3)}</td>
                    <td className="py-2.5 px-3 font-bold">
                      {row.health_index == null ? '—' : `${row.health_index.toFixed(1)} / 100`}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleTimeString()}
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
