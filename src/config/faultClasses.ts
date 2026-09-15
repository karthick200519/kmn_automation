export interface FaultClassDefinition {
  class_id: number;
  class_name: string;
  category: 'Healthy' | 'Stator' | 'Phase' | 'Rotor' | 'Bearing' | 'Lubrication' | 'Thermal';
  severity_default: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export const FAULT_CLASSES: Record<number, FaultClassDefinition> = {
  0: {
    class_id: 0,
    class_name: 'Healthy',
    category: 'Healthy',
    severity_default: 'low',
    description: 'Motor operating normally within nominal voltage, current, thermal, and vibration limits.',
  },
  1: {
    class_id: 1,
    class_name: 'Stator Inter-Turn Fault – Phase A',
    category: 'Stator',
    severity_default: 'medium',
    description: 'Short circuit between turns in Phase A stator winding leading to localized hot spots.',
  },
  2: {
    class_id: 2,
    class_name: 'Stator Inter-Turn Fault – Phase B',
    category: 'Stator',
    severity_default: 'medium',
    description: 'Short circuit between turns in Phase B stator winding leading to localized hot spots.',
  },
  3: {
    class_id: 3,
    class_name: 'Stator Inter-Turn Fault – Phase C',
    category: 'Stator',
    severity_default: 'medium',
    description: 'Short circuit between turns in Phase C stator winding leading to localized hot spots.',
  },
  4: {
    class_id: 4,
    class_name: 'Phase-to-Phase Fault',
    category: 'Phase',
    severity_default: 'critical',
    description: 'Direct insulation failure between two stator phase windings causing heavy fault current.',
  },
  5: {
    class_id: 5,
    class_name: 'Phase-to-Ground Fault',
    category: 'Phase',
    severity_default: 'critical',
    description: 'Insulation breakdown between stator phase conductor and grounded motor frame.',
  },
  6: {
    class_id: 6,
    class_name: 'Single Phasing – Phase A',
    category: 'Phase',
    severity_default: 'critical',
    description: 'Loss of Phase A supply line causing dangerous single-phase operation and rapid overheating.',
  },
  7: {
    class_id: 7,
    class_name: 'Single Phasing – Phase B',
    category: 'Phase',
    severity_default: 'critical',
    description: 'Loss of Phase B supply line causing dangerous single-phase operation and rapid overheating.',
  },
  8: {
    class_id: 8,
    class_name: 'Single Phasing – Phase C',
    category: 'Phase',
    severity_default: 'critical',
    description: 'Loss of Phase C supply line causing dangerous single-phase operation and rapid overheating.',
  },
  9: {
    class_id: 9,
    class_name: 'Voltage / Phase Unbalance',
    category: 'Phase',
    severity_default: 'high',
    description: 'Asymmetry in 3-phase supply voltages inducing severe negative-sequence currents.',
  },
  10: {
    class_id: 10,
    class_name: 'Overload',
    category: 'Stator',
    severity_default: 'high',
    description: 'Continuous mechanical load exceeding rated motor power capacity causing high current.',
  },
  11: {
    class_id: 11,
    class_name: 'Broken Rotor Bar',
    category: 'Rotor',
    severity_default: 'high',
    description: 'Physical fracture in squirrel-cage rotor bar creating sideband frequencies in current.',
  },
  12: {
    class_id: 12,
    class_name: 'Static Eccentricity',
    category: 'Rotor',
    severity_default: 'medium',
    description: 'Non-uniform air gap where minimal air-gap position remains fixed in space.',
  },
  13: {
    class_id: 13,
    class_name: 'Dynamic Eccentricity',
    category: 'Rotor',
    severity_default: 'high',
    description: 'Non-uniform air gap where minimum air-gap position rotates with rotor shaft.',
  },
  14: {
    class_id: 14,
    class_name: 'Rotor Unbalance',
    category: 'Rotor',
    severity_default: 'medium',
    description: 'Uneven mass distribution around shaft center causing 1X rotational frequency vibration.',
  },
  15: {
    class_id: 15,
    class_name: 'Rotor Misalignment',
    category: 'Rotor',
    severity_default: 'high',
    description: 'Angular or parallel offset between motor shaft and driven equipment shaft.',
  },
  16: {
    class_id: 16,
    class_name: 'Bearing Inner-Race Fault',
    category: 'Bearing',
    severity_default: 'high',
    description: 'Spalling or pitting defect on bearing inner ring race (BPFI frequency peak).',
  },
  17: {
    class_id: 17,
    class_name: 'Bearing Outer-Race Fault',
    category: 'Bearing',
    severity_default: 'high',
    description: 'Surface flaw or degradation on stationary bearing outer ring (BPFO frequency peak).',
  },
  18: {
    class_id: 18,
    class_name: 'Bearing Rolling-Element Fault',
    category: 'Bearing',
    severity_default: 'high',
    description: 'Damage to rolling elements/balls causing distinct impact pulses (BSF frequency peak).',
  },
  19: {
    class_id: 19,
    class_name: 'Bearing Cage / Train Fault',
    category: 'Bearing',
    severity_default: 'high',
    description: 'Fracture or excessive wear in ball separator cage (FTF fundamental train frequency).',
  },
  20: {
    class_id: 20,
    class_name: 'Insufficient Lubrication',
    category: 'Lubrication',
    severity_default: 'medium',
    description: 'Depleted grease lubricant leading to elevated friction, temperature, and ultrasonic noise.',
  },
  21: {
    class_id: 21,
    class_name: 'Severe Insufficient Lubrication',
    category: 'Lubrication',
    severity_default: 'critical',
    description: 'Dry metal-to-metal contact in bearing assembly threatening catastrophic seizure.',
  },
  22: {
    class_id: 22,
    class_name: 'Cracked Outer Ring',
    category: 'Bearing',
    severity_default: 'critical',
    description: 'Structural crack in bearing housing or outer race threatening mechanical collapse.',
  },
  23: {
    class_id: 23,
    class_name: 'Over-Temperature / Thermal Fault',
    category: 'Thermal',
    severity_default: 'critical',
    description: 'Frame or winding temperature exceeding maximum thermal insulation rating.',
  },
};

export const getFaultClass = (classId: number): FaultClassDefinition => {
  return (
    FAULT_CLASSES[classId] || {
      class_id: classId,
      class_name: `Unknown Fault Class ${classId}`,
      category: 'Healthy',
      severity_default: 'low',
      description: 'Unrecognized fault code reported by AI model.',
    }
  );
};
