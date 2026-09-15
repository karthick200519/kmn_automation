export interface OverallMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  validationLoss: number;
}

export interface ModelMetadata {
  architecture: string;
  inputFeatures: number;
  sequenceLength: number;
  convLayer1: string;
  convLayer2: string;
  pooling: string;
  denseLayer: string;
  outputLayer: string;
  parameters: number;
  modelSizeMB: number;
  inferenceTimeMsPerSample: number;
  datasetType: string;
  validationNote: string;
}

export interface ClassMetrics {
  classId: number;
  faultClass: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface ConfusionMatrix {
  classNames: string[];
  matrix: number[][];
}

export interface EpochMetrics {
  epoch: number;
  trainAccuracy: number;
  valAccuracy: number;
  trainLoss: number;
  valLoss: number;
}

export interface TrainingHistory {
  epochs: EpochMetrics[];
}

export interface ROCPoint {
  fpr: number;
  tpr: number;
}

export interface ROCData {
  macroROC: ROCPoint[];
  auc: number;
  classROCs?: {
    classId: number;
    className: string;
    auc: number;
    points: ROCPoint[];
  }[];
}

export interface ModelComparison {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  validationLoss: number;
  isProposed?: boolean;
}

export interface EmbeddingPoint {
  id: string | number;
  x: number;
  y: number;
  classId: number;
  className: string;
  cluster: string;
}
