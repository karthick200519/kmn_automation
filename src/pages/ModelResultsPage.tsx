import React, { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { MainLayout } from '../components/layout/MainLayout';
import { motorService } from '../services/motorService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AiPrediction, CurrentMotorStatus, Motor } from '../types/database';
import { FAULT_CLASSES } from '../config/faultClasses';
import {
  DEMO_OVERALL_METRICS,
  SELECTED_MODEL_METADATA,
  DEMO_CLASS_METRICS,
  DEMO_CONFUSION_MATRIX,
  DEMO_TRAINING_HISTORY,
  DEMO_ROC_DATA,
  DEMO_MODEL_COMPARISONS,
  DEMO_EMBEDDING_POINTS,
  DEMO_CLASS_NAMES,
} from '../data/modelResultsData';
import {
  formatTimeAgo,
  formatTimeHHMMSS,
  getDataFreshness,
  getSeverityColorClass,
} from '../utils/formatters';

import {
  Brain,
  Award,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Activity,
  Zap,
  Filter,
  Info,
  TrendingUp,
  Cpu,
  RefreshCw,
  Clock,
  ShieldCheck,
  Radio,
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

interface LiveMotorPredictionItem {
  motor_id: string;
  motor_number: number;
  motor_name: string;
  prediction: AiPrediction | null;
}

export const ModelResultsPage: React.FC = () => {
  const [motorStatuses, setMotorStatuses] = useState<CurrentMotorStatus[]>([]);
  const [livePredictions, setLivePredictions] = useState<LiveMotorPredictionItem[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('CONNECTING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClusterClass, setSelectedClusterClass] = useState<string>('all');

  // Load the latest stored prediction independently for each configured motor.
  // LIVE mode never falls back to hard-coded/mock motors.
  const fetchLivePredictions = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLiveError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      setLivePredictions([]);
      setMotorStatuses([]);
      setIsLoadingLive(false);
      return;
    }

    try {
      setIsLoadingLive(true);
      setLiveError(null);

      const { data: baseMotors, error: motorsError } = await supabase
        .from('motors')
        .select('*')
        .order('motor_number', { ascending: true });

      if (motorsError) {
        throw new Error(`Unable to load motors: ${motorsError.message}`);
      }

      const configuredMotors = (baseMotors as Motor[] | null) ?? [];

      if (configuredMotors.length === 0) {
        setLivePredictions([]);
        setMotorStatuses([]);
        setLiveError('No configured motors were found in the Supabase motors table.');
        return;
      }

      const items = await Promise.all(
        configuredMotors.map(async (motor) => {
          try {
            const { data: newestPred, error: predictionError } = await supabase
              .from('ai_predictions')
              .select('*')
              .eq('motor_id', motor.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (predictionError) {
              throw new Error(predictionError.message);
            }

            return {
              motor_id: motor.id,
              motor_number: motor.motor_number,
              motor_name: motor.motor_name || `Motor ${motor.motor_number}`,
              prediction: (newestPred as AiPrediction | null) ?? null,
            };
          } catch (err) {
            console.warn(
              `Failed to fetch latest prediction for motor ${motor.motor_number}:`,
              err,
            );

            return {
              motor_id: motor.id,
              motor_number: motor.motor_number,
              motor_name: motor.motor_name || `Motor ${motor.motor_number}`,
              prediction: null,
            };
          }
        }),
      );

      setLivePredictions(items);

      try {
        const statusData = await motorService.getCurrentMotorStatus();
        setMotorStatuses(statusData ?? []);
      } catch (err) {
        console.warn('Failed to load current motor health summary:', err);
        setMotorStatuses([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Supabase error';
      console.error('Error fetching live predictions for ModelResultsPage:', err);
      setLiveError(message);
      setLivePredictions([]);
      setMotorStatuses([]);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    void fetchLivePredictions();

    if (!isSupabaseConfigured()) {
      setRealtimeStatus('NOT CONFIGURED');
      return;
    }

    const channel = supabase
      .channel('realtime_model_results_live_predictions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_predictions' },
        (payload) => {
          const newPred = payload.new as AiPrediction;
          const oldPred = payload.old as Partial<AiPrediction> | null;
          const motorId = newPred?.motor_id ?? oldPred?.motor_id;

          if (!motorId) return;

          setLivePredictions((prev) =>
            prev.map((item) =>
              item.motor_id === motorId
                ? {
                    ...item,
                    prediction: payload.eventType === 'DELETE' ? null : newPred,
                  }
                : item,
            ),
          );

          void fetchLivePredictions();
        },
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLivePredictions]);

  // Filter class-wise performance table by search query
  const filteredClassMetrics = DEMO_CLASS_METRICS.filter(
    (c) =>
      c.faultClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.classId.toString() === searchQuery.trim()
  );

  // Filter t-SNE scatter points
  const filteredEmbeddings = DEMO_EMBEDDING_POINTS.filter((p) => {
    if (selectedClusterClass === 'all') return true;
    return p.classId.toString() === selectedClusterClass;
  });

  // Export results to Excel (.xlsx) spreadsheet with 3 distinct sheets
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Model Performance
    const overallData = [
      { Metric: 'Accuracy', Value: `${(DEMO_OVERALL_METRICS.accuracy * 100).toFixed(2)}%` },
      { Metric: 'Precision', Value: `${(DEMO_OVERALL_METRICS.precision * 100).toFixed(2)}%` },
      { Metric: 'Recall', Value: `${(DEMO_OVERALL_METRICS.recall * 100).toFixed(2)}%` },
      { Metric: 'F1 Score', Value: `${(DEMO_OVERALL_METRICS.f1Score * 100).toFixed(2)}%` },
      { Metric: 'ROC-AUC', Value: DEMO_OVERALL_METRICS.rocAuc.toFixed(4) },
      { Metric: 'Validation Loss', Value: DEMO_OVERALL_METRICS.validationLoss.toFixed(4) },
    ];
    const wsOverall = XLSX.utils.json_to_sheet(overallData);
    XLSX.utils.book_append_sheet(wb, wsOverall, 'Model Performance');

    // Sheet 2: Class Performance (24 Evaluation Classes)
    const classData = DEMO_CLASS_METRICS.map((c) => ({
      'Class ID': c.classId,
      'Fault Class Name': c.faultClass,
      'Accuracy (%)': (c.accuracy * 100).toFixed(2),
      'Precision (%)': (c.precision * 100).toFixed(2),
      'Recall (%)': (c.recall * 100).toFixed(2),
      'F1 Score (%)': (c.f1Score * 100).toFixed(2),
      'Support (Samples)': c.support,
    }));
    const wsClass = XLSX.utils.json_to_sheet(classData);
    XLSX.utils.book_append_sheet(wb, wsClass, 'Class Performance');

    // Sheet 3: Live Motor AI Predictions
    const livePredData = livePredictions.map((item) => {
      const pred = item.prediction;
      let className = pred?.class_name || 'No Prediction Available';
      if (pred?.class_id !== undefined && FAULT_CLASSES[pred.class_id]) {
        className = FAULT_CLASSES[pred.class_id].class_name;
      }
      const freshness = getDataFreshness(pred?.timestamp);

      return {
        'Motor Number': `Motor ${item.motor_number}`,
        'Motor Name': item.motor_name,
        'Motor ID': item.motor_id,
        'Predicted Class ID': pred ? `#${pred.class_id}` : 'N/A',
        'Predicted Fault Class': className,
        'Confidence (%)': pred ? `${Math.round((pred.confidence || 0) * 100)}%` : 'N/A',
        'Model Version': pred?.model_version || 'N/A',
        'Prediction Timestamp': pred?.timestamp || 'N/A',
        'Freshness Status': freshness.label,
      };
    });
    const wsLive = XLSX.utils.json_to_sheet(livePredData);
    XLSX.utils.book_append_sheet(wb, wsLive, 'Live Motor Predictions');

    // Save Excel file
    XLSX.writeFile(wb, 'DL_Model_Results_Evaluation.xlsx');
  };

  return (
    <MainLayout pageTitle="Model Results & Live AI Predictions">
      <div className="space-y-6">
        {/* Header Banner & Disclaimers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-blue-600" />
                  <span>Model Results & Live Fault Inference</span>
                </h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Demo / Sample Results
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Deep Learning Model Evaluation Performance and Live Edge AI Classification Results
              </p>
            </div>

            {/* Excel Export Button */}
            <button
              onClick={handleExportToExcel}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export to Excel (.xlsx)</span>
            </button>
          </div>

          {/* Warning Disclaimer Box */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> Model Evaluation Metrics represent training/sample results for interface development. Replace with experimentally validated DL results before publication. Live Motor Predictions below reflect real-time Supabase records.
            </p>
          </div>
        </div>

        {/* SECTION 1 — MODEL PERFORMANCE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Section 1 — Model Performance (1D CNN Validation Metrics)</span>
            </h3>
            <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-semibold">
              Selected Architecture: {SELECTED_MODEL_METADATA.architecture}
            </span>
          </div>

          {/* Model Specification & Metadata Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 text-sm">Selected Model Architecture & Metadata</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Dataset: {SELECTED_MODEL_METADATA.datasetType}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[11px]">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block font-medium">Architecture</span>
                <strong className="text-slate-900 font-bold">{SELECTED_MODEL_METADATA.architecture}</strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block font-medium">Input Features / Seq</span>
                <strong className="text-slate-900 font-mono">{SELECTED_MODEL_METADATA.inputFeatures} features × {SELECTED_MODEL_METADATA.sequenceLength} steps</strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block font-medium">Total Parameters</span>
                <strong className="text-slate-900 font-mono">{SELECTED_MODEL_METADATA.parameters.toLocaleString()}</strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block font-medium">Model Size</span>
                <strong className="text-slate-900 font-mono">~{SELECTED_MODEL_METADATA.modelSizeMB} MB</strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block font-medium">Inference Latency</span>
                <strong className="text-slate-900 font-mono">~{SELECTED_MODEL_METADATA.inferenceTimeMsPerSample} ms/sample</strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="text-slate-400 block font-medium">Validation Scope</span>
                <strong className="text-slate-900 font-semibold text-[10px] text-amber-700">Dataset Validation</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 italic">
              <strong>Validation Note:</strong> {SELECTED_MODEL_METADATA.validationNote}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Accuracy */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Accuracy</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {(DEMO_OVERALL_METRICS.accuracy * 100).toFixed(2)}%
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Top-1 Overall Accuracy</p>
              </div>
            </div>

            {/* Precision */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Precision</span>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {(DEMO_OVERALL_METRICS.precision * 100).toFixed(2)}%
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Macro Weighted Precision</p>
              </div>
            </div>

            {/* Recall */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Recall</span>
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {(DEMO_OVERALL_METRICS.recall * 100).toFixed(2)}%
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Sensitivity / True Positive</p>
              </div>
            </div>

            {/* F1 Score */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">F1 Score</span>
                <BarChart2 className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {(DEMO_OVERALL_METRICS.f1Score * 100).toFixed(2)}%
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Harmonic Mean Metric</p>
              </div>
            </div>

            {/* ROC-AUC */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">ROC-AUC</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">
                  {DEMO_OVERALL_METRICS.rocAuc.toFixed(4)}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Area Under Curve</p>
              </div>
            </div>

            {/* Validation Loss */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Validation Loss</span>
                <Layers className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {DEMO_OVERALL_METRICS.validationLoss.toFixed(4)}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Cross-Entropy Loss</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 — LIVE MOTOR AI PREDICTIONS */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Section 2 — Live Motor AI Predictions</span>
              </h3>
              <p className="text-xs text-slate-500">
                Latest fault classification results received from Raspberry Pi / Supabase (`ai_predictions`)
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    realtimeStatus === 'SUBSCRIBED'
                      ? 'text-emerald-500 animate-pulse'
                      : realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT'
                      ? 'text-red-500'
                      : 'text-amber-500'
                  }`}
                />
                <span>
                  {realtimeStatus === 'SUBSCRIBED'
                    ? 'Realtime Active'
                    : `Realtime ${realtimeStatus.toLowerCase()}`}
                </span>
              </span>
              <button
                onClick={() => fetchLivePredictions()}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                title="Refresh Predictions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {liveError && (


            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">


              <strong>Live data notice:</strong> {liveError}


            </div>


          )}

          

          {isLoadingLive && livePredictions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading live AI motor predictions from Supabase...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {livePredictions.map((item) => {
                const pred = item.prediction;
                const freshness = getDataFreshness(pred?.timestamp);

                let className = pred?.class_name;
                if (pred?.class_id !== undefined && FAULT_CLASSES[pred.class_id]) {
                  className = FAULT_CLASSES[pred.class_id].class_name;
                }

                return (
                  <div
                    key={item.motor_id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Accent Strip */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        !pred
                          ? 'bg-slate-300'
                          : pred.class_id === 0
                          ? 'bg-emerald-500'
                          : pred.class_id >= 20
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                      }`}
                    />

                    <div>
                      {/* Motor Card Header */}
                      <div className="flex items-center justify-between pt-1 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-8 h-8 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-xs border border-slate-300">
                            M{item.motor_number}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{item.motor_name}</h4>
                            <p className="text-[11px] text-slate-400 font-mono">
                              ID: {item.motor_id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${freshness.colorClass}`}>
                          {freshness.label}
                        </span>
                      </div>

                      {/* AI Prediction Details */}
                      {pred ? (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-xs my-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Class ID:</span>
                            <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-slate-200/60 rounded text-[11px]">
                              Class #{pred.class_id}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Fault Class:
                            </span>
                            <span className="font-bold text-slate-900 truncate max-w-[170px]" title={className || 'Healthy'}>
                              {className || 'Healthy'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Confidence:</span>
                            <span className="font-mono font-black text-blue-600">
                              {Math.round((pred.confidence || 0) * 100)}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>Model Tag:</span>
                            <span className="font-mono text-slate-700">{pred.model_version || 'cnn-24class-v1'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center my-2">
                          <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                          <p className="text-xs font-semibold text-slate-500 italic">No AI prediction available yet</p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Timestamp */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-auto">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Prediction Time: <strong className="text-slate-700">{formatTimeHHMMSS(pred?.timestamp)}</strong>
                      </span>
                      <span>{formatTimeAgo(pred?.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3 — 24-CLASS PERFORMANCE EVALUATION TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Section 3 — 24-Class Performance (Model Evaluation Metrics)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Detailed test dataset evaluation metrics per fault category (not live predictions)
              </p>
            </div>

            {/* Search Filter */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search fault class or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 font-medium placeholder-slate-400 w-44"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                  <th className="py-2.5 px-3">Class ID</th>
                  <th className="py-2.5 px-4">Fault Class</th>
                  <th className="py-2.5 px-3 text-right">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">Precision</th>
                  <th className="py-2.5 px-3 text-right">Recall</th>
                  <th className="py-2.5 px-3 text-right">F1 Score</th>
                  <th className="py-2.5 px-3 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClassMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                      No matching fault classes found.
                    </td>
                  </tr>
                ) : (
                  filteredClassMetrics.map((cm) => (
                    <tr key={cm.classId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        #{cm.classId}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {cm.faultClass}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {(cm.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {(cm.precision * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {(cm.recall * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                        {(cm.f1Score * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {cm.support}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4 — 24x24 CONFUSION MATRIX HEATMAP */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span>Section 4 — 24×24 Confusion Matrix Heatmap</span>
              </h3>
              <p className="text-xs text-slate-500">
                Actual Class (Y-axis) vs Predicted Class (X-axis) for 24-class DL fault model
              </p>
            </div>

            {/* Color Scale Legend */}
            <div className="flex items-center space-x-3 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600"></span> Correct (High)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400"></span> Misclassification
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200"></span> Zero
              </span>
            </div>
          </div>

          {/* Scrollable Matrix Container */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px] select-none">
              <div className="text-center font-bold text-xs text-slate-600 uppercase tracking-wider mb-2">
                Predicted Class →
              </div>

              <table className="w-full text-center border-collapse font-mono text-[10px]">
                <thead>
                  <tr>
                    <th className="p-1 text-left font-sans text-xs font-bold text-slate-500 w-16">
                      Actual ↓
                    </th>
                    {DEMO_CONFUSION_MATRIX.classNames.map((_, colIdx) => (
                      <th
                        key={colIdx}
                        className="p-1 font-bold text-slate-700 bg-slate-100 border border-slate-200 text-center"
                        title={`C${colIdx}: ${DEMO_CONFUSION_MATRIX.classNames[colIdx]}`}
                      >
                        C{colIdx}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_CONFUSION_MATRIX.matrix.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td
                        className="p-1 font-sans text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 text-left truncate max-w-[120px]"
                        title={`C${rowIdx}: ${DEMO_CONFUSION_MATRIX.classNames[rowIdx]}`}
                      >
                        C{rowIdx}
                      </td>
                      {row.map((val, colIdx) => {
                        const isDiagonal = rowIdx === colIdx;
                        let cellBg = 'bg-slate-50 text-slate-400 border-slate-100';

                        if (isDiagonal && val > 0) {
                          cellBg = 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs';
                        } else if (!isDiagonal && val > 0) {
                          cellBg = 'bg-amber-100 text-amber-900 font-bold border-amber-300';
                        }

                        return (
                          <td
                            key={colIdx}
                            className={`p-1.5 border transition-all ${cellBg}`}
                            title={`Actual: C${rowIdx} (${DEMO_CONFUSION_MATRIX.classNames[rowIdx]})\nPredicted: C${colIdx} (${DEMO_CONFUSION_MATRIX.classNames[colIdx]})\nCount: ${val}`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTIONS 5 & 6 — TRAINING HISTORY CHARTS (ACCURACY & LOSS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 5 — TRAINING VS VALIDATION ACCURACY */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Section 5 — Training vs Validation Accuracy</span>
              </h3>
              <p className="text-xs text-slate-500">Epoch 1 to 50 training progression (%)</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={DEMO_TRAINING_HISTORY.epochs}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="epoch" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[50, 100]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip formatter={(val: number) => [`${val}%`, '']} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="trainAccuracy"
                    name="Training Accuracy"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="valAccuracy"
                    name="Validation Accuracy"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SECTION 6 — TRAINING VS VALIDATION LOSS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Section 6 — Training vs Validation Loss</span>
              </h3>
              <p className="text-xs text-slate-500">Cross-entropy loss convergence over 50 epochs</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={DEMO_TRAINING_HISTORY.epochs}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="epoch" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0, 1.8]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="trainLoss"
                    name="Training Loss"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="valLoss"
                    name="Validation Loss"
                    stroke="#F43F5E"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SECTIONS 7 & 8 — ROC CURVE & MODEL COMPARISON */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 7 — ROC CURVE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Section 7 — Receiver Operating Characteristic (ROC)</span>
                </h3>
                <p className="text-xs text-slate-500">True Positive Rate vs False Positive Rate</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-mono font-bold text-xs rounded border border-emerald-200">
                Macro AUC = {DEMO_ROC_DATA.auc.toFixed(4)}
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={DEMO_ROC_DATA.macroROC}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="fpr"
                    label={{ value: 'False Positive Rate', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                    stroke="#94A3B8"
                    fontSize={11}
                    domain={[0, 1]}
                  />
                  <YAxis
                    label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    stroke="#94A3B8"
                    fontSize={11}
                    domain={[0, 1]}
                  />
                  <Tooltip formatter={(val: number) => [val.toFixed(4), '']} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="tpr"
                    name="Proposed DL Model (AUC = 0.9965)"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SECTION 8 — MODEL COMPARISON */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span>Section 8 — Deep Learning Model Comparison</span>
              </h3>
              <p className="text-xs text-slate-500">Benchmark metrics across baseline architectures</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3 text-right">Accuracy</th>
                    <th className="py-2.5 px-3 text-right">Precision</th>
                    <th className="py-2.5 px-3 text-right">Recall</th>
                    <th className="py-2.5 px-3 text-right">F1 Score</th>
                    <th className="py-2.5 px-3 text-right">Val Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {DEMO_MODEL_COMPARISONS.map((m) => (
                    <tr
                      key={m.model}
                      className={`transition-colors ${
                        m.isProposed
                          ? 'bg-blue-50/80 font-bold text-blue-900 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      <td className="py-2.5 px-3 flex items-center space-x-2">
                        <span className="font-bold">{m.model}</span>
                        {m.isProposed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white tracking-wider">
                            Proposed Best
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {(m.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {(m.precision * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {(m.recall * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {(m.f1Score * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {m.validationLoss.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 9 — FEATURE SPACE VISUALIZATION (t-SNE / UMAP 2D) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Section 9 — Feature Space Embedding Visualization (t-SNE / UMAP 2D)</span>
              </h3>
              <p className="text-xs text-slate-500">
                High-dimensional deep latent representation projected to 2D manifold clusters across 24 fault classes
              </p>
            </div>

            {/* Cluster Filter */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClusterClass}
                onChange={(e) => setSelectedClusterClass(e.target.value)}
                className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All 24 Fault Clusters</option>
                {DEMO_CLASS_NAMES.map((name, idx) => (
                  <option key={idx} value={idx.toString()}>
                    C{idx}: {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-80 w-full border border-slate-100 rounded-lg p-2 bg-slate-950/5">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" dataKey="x" name="Dimension 1" stroke="#94A3B8" fontSize={11} />
                <YAxis type="number" dataKey="y" name="Dimension 2" stroke="#94A3B8" fontSize={11} />
                <ZAxis type="number" range={[40, 40]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-bold text-blue-400">Class #{data.classId}: {data.className}</p>
                          <p className="font-mono text-[10px] text-slate-300">
                            X: {data.x}, Y: {data.y}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="t-SNE Embeddings" data={filteredEmbeddings} fill="#2563EB" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 10 — CURRENT MOTOR FLEET HEALTH SUMMARY */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Section 10 — Current Motor Fleet Health Summary</span>
              </h3>
              <p className="text-xs text-slate-500">
                Integrated health status & maintenance decisions stored in Supabase
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {motorStatuses.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-slate-400 text-xs italic">
                No current fleet-health records are available from the Supabase status query.
              </div>
            ) : (
              motorStatuses.slice(0, 3).map((m) => (
                <div
                  key={m.motor_id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      m.motor_status === 'healthy'
                        ? 'bg-emerald-500'
                        : m.motor_status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-red-600'
                    }`}
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-xs border border-slate-300">
                        M{m.motor_number}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{m.motor_name}</h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColorClass(
                        m.severity || 'low'
                      )}`}
                    >
                      {m.severity || 'Normal'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Predicted Fault:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[170px]" title={m.class_name || 'Healthy'}>
                        {m.class_name || 'Healthy'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Confidence:</span>
                      <span className="font-mono font-bold text-blue-600">
                        {Math.round((m.confidence || 0.95) * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Health Index:</span>
                      <span className="font-bold text-slate-900">
                        {m.health_index ?? 98} / 100
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Degradation Status:</span>
                      <span className="font-semibold text-slate-800">
                        {m.degradation_status || 'Stable'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 font-medium mb-0.5">Maintenance Recommendation:</p>
                      <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-100 leading-snug">
                        {m.maintenance_recommendation || 'Continuous routine telemetry monitoring.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 text-right pt-1">
                    Sync: {formatTimeAgo(m.sensor_timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default ModelResultsPage;
