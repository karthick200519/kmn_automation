import type {
  OverallMetrics,
  ModelMetadata,
  ClassMetrics,
  ConfusionMatrix,
  TrainingHistory,
  ROCData,
  ModelComparison,
  EmbeddingPoint,
} from '../types/modelResults';

export const DEMO_OVERALL_METRICS: OverallMetrics = {
  accuracy: 0.9583,
  precision: 0.9375,
  recall: 0.9583,
  f1Score: 0.9444,
  rocAuc: 0.9965,
  validationLoss: 0.1835,
};

export const SELECTED_MODEL_METADATA: ModelMetadata = {
  architecture: '1D CNN',
  inputFeatures: 8,
  sequenceLength: 5,
  convLayer1: 'Conv1D 8 → 32 (kernel=3, padding=1, ReLU)',
  convLayer2: 'Conv1D 32 → 64 (kernel=3, padding=1, ReLU)',
  pooling: 'Global Temporal Mean',
  denseLayer: 'Dense 64 → 64 (ReLU)',
  outputLayer: 'Dense 64 → 24 (Softmax)',
  parameters: 12728,
  modelSizeMB: 0.0529,
  inferenceTimeMsPerSample: 0.0439,
  datasetType: 'Literature-guided synthetic demo dataset',
  validationNote: 'Dataset-validation results; not industrial field validation.',
};

export const DEMO_CLASS_NAMES: string[] = [
  'Healthy',
  'Stator Inter-Turn Fault – Phase A',
  'Stator Inter-Turn Fault – Phase B',
  'Stator Inter-Turn Fault – Phase C',
  'Phase-to-Phase Fault',
  'Phase-to-Ground Fault',
  'Single Phasing – Phase A',
  'Single Phasing – Phase B',
  'Single Phasing – Phase C',
  'Voltage / Phase Unbalance',
  'Overload',
  'Broken Rotor Bar',
  'Static Eccentricity',
  'Dynamic Eccentricity',
  'Rotor Unbalance',
  'Rotor Misalignment',
  'Bearing Inner-Race Fault',
  'Bearing Outer-Race Fault',
  'Bearing Rolling-Element Fault',
  'Bearing Cage / Train Fault',
  'Insufficient Lubrication',
  'Severe Insufficient Lubrication',
  'Cracked Outer Ring',
  'Over-Temperature / Thermal Fault',
];

export const DEMO_CLASS_METRICS: ClassMetrics[] = [
  { classId: 0, faultClass: 'Healthy', accuracy: 0.9960, precision: 0.9920, recall: 0.9960, f1Score: 0.9940, support: 250 },
  { classId: 1, faultClass: 'Stator Inter-Turn Fault – Phase A', accuracy: 0.9880, precision: 0.9840, recall: 0.9880, f1Score: 0.9860, support: 250 },
  { classId: 2, faultClass: 'Stator Inter-Turn Fault – Phase B', accuracy: 0.9840, precision: 0.9800, recall: 0.9840, f1Score: 0.9820, support: 250 },
  { classId: 3, faultClass: 'Stator Inter-Turn Fault – Phase C', accuracy: 0.9860, precision: 0.9840, recall: 0.9840, f1Score: 0.9840, support: 250 },
  { classId: 4, faultClass: 'Phase-to-Phase Fault', accuracy: 0.9920, precision: 0.9920, recall: 0.9880, f1Score: 0.9900, support: 250 },
  { classId: 5, faultClass: 'Phase-to-Ground Fault', accuracy: 0.9940, precision: 0.9960, recall: 0.9920, f1Score: 0.9940, support: 250 },
  { classId: 6, faultClass: 'Single Phasing – Phase A', accuracy: 0.9900, precision: 0.9920, recall: 0.9880, f1Score: 0.9900, support: 250 },
  { classId: 7, faultClass: 'Single Phasing – Phase B', accuracy: 0.9880, precision: 0.9880, recall: 0.9840, f1Score: 0.9860, support: 250 },
  { classId: 8, faultClass: 'Single Phasing – Phase C', accuracy: 0.9920, precision: 0.9880, recall: 0.9920, f1Score: 0.9900, support: 250 },
  { classId: 9, faultClass: 'Voltage / Phase Unbalance', accuracy: 0.9820, precision: 0.9800, recall: 0.9800, f1Score: 0.9800, support: 250 },
  { classId: 10, faultClass: 'Overload', accuracy: 0.9860, precision: 0.9840, recall: 0.9840, f1Score: 0.9840, support: 250 },
  { classId: 11, faultClass: 'Broken Rotor Bar', accuracy: 0.9780, precision: 0.9760, recall: 0.9760, f1Score: 0.9760, support: 250 },
  { classId: 12, faultClass: 'Static Eccentricity', accuracy: 0.9740, precision: 0.9720, recall: 0.9720, f1Score: 0.9720, support: 250 },
  { classId: 13, faultClass: 'Dynamic Eccentricity', accuracy: 0.9760, precision: 0.9740, recall: 0.9720, f1Score: 0.9730, support: 250 },
  { classId: 14, faultClass: 'Rotor Unbalance', accuracy: 0.9820, precision: 0.9800, recall: 0.9800, f1Score: 0.9800, support: 250 },
  { classId: 15, faultClass: 'Rotor Misalignment', accuracy: 0.9800, precision: 0.9780, recall: 0.9760, f1Score: 0.9770, support: 250 },
  { classId: 16, faultClass: 'Bearing Inner-Race Fault', accuracy: 0.9800, precision: 0.9760, recall: 0.9800, f1Score: 0.9780, support: 250 },
  { classId: 17, faultClass: 'Bearing Outer-Race Fault', accuracy: 0.9840, precision: 0.9820, recall: 0.9840, f1Score: 0.9830, support: 250 },
  { classId: 18, faultClass: 'Bearing Rolling-Element Fault', accuracy: 0.9760, precision: 0.9740, recall: 0.9720, f1Score: 0.9730, support: 250 },
  { classId: 19, faultClass: 'Bearing Cage / Train Fault', accuracy: 0.9820, precision: 0.9800, recall: 0.9800, f1Score: 0.9800, support: 250 },
  { classId: 20, faultClass: 'Insufficient Lubrication', accuracy: 0.9860, precision: 0.9840, recall: 0.9840, f1Score: 0.9840, support: 250 },
  { classId: 21, faultClass: 'Severe Insufficient Lubrication', accuracy: 0.9900, precision: 0.9880, recall: 0.9880, f1Score: 0.9880, support: 250 },
  { classId: 22, faultClass: 'Cracked Outer Ring', accuracy: 0.9840, precision: 0.9820, recall: 0.9800, f1Score: 0.9810, support: 250 },
  { classId: 23, faultClass: 'Over-Temperature / Thermal Fault', accuracy: 0.9940, precision: 0.9920, recall: 0.9920, f1Score: 0.9920, support: 250 },
];

// 24x24 matrix generator function with realistic diagonal (high counts) and minor off-diagonals
const generateDemoMatrix = (): number[][] => {
  const size = 24;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  
  // Specific realistic small off-diagonal misclassifications between related fault types
  const misclassifications: [number, number, number][] = [
    [1, 2, 2], [2, 1, 3], [2, 3, 2], [3, 2, 2], // Stator phase turn variations
    [6, 7, 1], [7, 8, 2], [8, 6, 1],             // Single phasing phase variations
    [12, 13, 3], [13, 12, 4],                   // Eccentricity static vs dynamic
    [14, 15, 2], [15, 14, 3],                   // Rotor unbalance vs misalignment
    [16, 18, 3], [18, 16, 2], [17, 18, 2],       // Bearing inner vs rolling element
    [20, 21, 2], [21, 20, 1],                   // Lubrication mild vs severe
  ];

  for (let i = 0; i < size; i++) {
    let offDiagonalSum = 0;

    misclassifications.forEach(([row, col, count]) => {
      if (row === i) {
        matrix[row][col] = count;
        offDiagonalSum += count;
      }
    });

    // Remainder on diagonal out of 250 support
    matrix[i][i] = 250 - offDiagonalSum;
  }

  return matrix;
};

export const DEMO_CONFUSION_MATRIX: ConfusionMatrix = {
  classNames: DEMO_CLASS_NAMES,
  matrix: generateDemoMatrix(),
};

// 50-Epoch training curves simulation
export const DEMO_TRAINING_HISTORY: TrainingHistory = {
  epochs: Array.from({ length: 50 }, (_, i) => {
    const epoch = i + 1;
    // Accuracy smooth asymptotic curve from ~0.60 to 0.96
    const factor = 1 - Math.exp(-epoch / 8);
    const trainAcc = Math.min(0.970, 0.58 + 0.388 * factor + (Math.sin(epoch) * 0.003));
    const valAcc = Math.min(0.9583, 0.55 + 0.405 * factor - (Math.cos(epoch) * 0.004));

    // Loss exponential decay from 1.65 to 0.1835
    const trainLoss = Math.max(0.150, 1.65 * Math.exp(-epoch / 7) + 0.150 + Math.abs(Math.sin(epoch * 0.5)) * 0.005);
    const valLoss = Math.max(0.1835, 1.72 * Math.exp(-epoch / 7.5) + 0.180 + Math.abs(Math.cos(epoch * 0.5)) * 0.006);

    return {
      epoch,
      trainAccuracy: Number((trainAcc * 100).toFixed(2)),
      valAccuracy: Number((valAcc * 100).toFixed(2)),
      trainLoss: Number(trainLoss.toFixed(4)),
      valLoss: Number(valLoss.toFixed(4)),
    };
  }),
};

export const DEMO_ROC_DATA: ROCData = {
  auc: 0.9965,
  macroROC: [
    { fpr: 0.0, tpr: 0.0 },
    { fpr: 0.002, tpr: 0.880 },
    { fpr: 0.005, tpr: 0.935 },
    { fpr: 0.010, tpr: 0.965 },
    { fpr: 0.020, tpr: 0.982 },
    { fpr: 0.030, tpr: 0.990 },
    { fpr: 0.050, tpr: 0.994 },
    { fpr: 0.100, tpr: 0.997 },
    { fpr: 0.200, tpr: 0.999 },
    { fpr: 0.500, tpr: 1.000 },
    { fpr: 1.000, tpr: 1.000 },
  ],
};

export const DEMO_MODEL_COMPARISONS: ModelComparison[] = [
  { model: 'CNN-BiGRU', accuracy: 0.8333, precision: 0.8120, recall: 0.8333, f1Score: 0.7847, validationLoss: 0.3420 },
  { model: 'BiGRU', accuracy: 0.8750, precision: 0.8540, recall: 0.8750, f1Score: 0.8333, validationLoss: 0.2850 },
  { model: 'MLP', accuracy: 0.9062, precision: 0.8980, recall: 0.9062, f1Score: 0.9076, validationLoss: 0.2310 },
  { model: '1D CNN', accuracy: 0.9583, precision: 0.9375, recall: 0.9583, f1Score: 0.9444, validationLoss: 0.1835, isProposed: true },
];

// Generate 24 cluster centers for 2D t-SNE scatter plot
const generateEmbeddings = (): EmbeddingPoint[] => {
  const points: EmbeddingPoint[] = [];
  const totalClasses = 24;

  for (let c = 0; c < totalClasses; c++) {
    const angle = (c / totalClasses) * 2 * Math.PI;
    // Radius with subtle variation
    const radius = 25 + (c % 3) * 12;
    const centerX = Math.cos(angle) * radius;
    const centerY = Math.sin(angle) * radius;

    const samplesPerCluster = 6;
    for (let s = 0; s < samplesPerCluster; s++) {
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetY = (Math.random() - 0.5) * 4;
      points.push({
        id: `emb_${c}_${s}`,
        x: Number((centerX + offsetX).toFixed(2)),
        y: Number((centerY + offsetY).toFixed(2)),
        classId: c,
        className: DEMO_CLASS_NAMES[c],
        cluster: `Class ${c}`,
      });
    }
  }

  return points;
};

export const DEMO_EMBEDDING_POINTS: EmbeddingPoint[] = generateEmbeddings();
