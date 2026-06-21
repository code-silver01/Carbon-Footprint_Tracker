import { ValidationError } from '../errors';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface MilestoneProps {
  id: string;
  dayRange: [number, number];
  targetReduction: number;
  estimatedSavings: number;
  difficulty: DifficultyLevel;
  strategies: string[];
  status: MilestoneStatus;
  completedAt?: Date;
}

/**
 * Milestone — value object within a Roadmap.
 * Represents a specific checkpoint in the user's carbon reduction journey.
 */
export class Milestone {
  public readonly id: string;
  public readonly dayRange: readonly [number, number];
  public readonly targetReduction: number;
  public readonly estimatedSavings: number;
  public readonly difficulty: DifficultyLevel;
  public readonly strategies: readonly string[];
  public readonly status: MilestoneStatus;
  public readonly completedAt?: Date;

  constructor(props: MilestoneProps) {
    if (props.dayRange[0] >= props.dayRange[1]) {
      throw new ValidationError('Day range start must be less than end');
    }
    if (props.targetReduction < 0) {
      throw new ValidationError('Target reduction cannot be negative');
    }
    if (props.estimatedSavings < 0) {
      throw new ValidationError('Estimated savings cannot be negative');
    }

    this.id = props.id;
    this.dayRange = Object.freeze([...props.dayRange]) as readonly [number, number];
    this.targetReduction = props.targetReduction;
    this.estimatedSavings = props.estimatedSavings;
    this.difficulty = props.difficulty;
    this.strategies = Object.freeze([...props.strategies]);
    this.status = props.status;
    this.completedAt = props.completedAt;
  }

  /** Duration in days */
  public getDurationDays(): number {
    return this.dayRange[1] - this.dayRange[0];
  }

  /** Daily target for this milestone */
  public getDailyTarget(): number {
    const days = this.getDurationDays();
    return days > 0 ? this.targetReduction / days : 0;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      dayRange: [...this.dayRange],
      targetReduction: this.targetReduction,
      estimatedSavings: this.estimatedSavings,
      difficulty: this.difficulty,
      strategies: [...this.strategies],
      status: this.status,
      completedAt: this.completedAt?.toISOString(),
      durationDays: this.getDurationDays(),
      dailyTarget: this.getDailyTarget(),
    };
  }
}

export interface RoadmapProps {
  id: string;
  userId: string;
  milestones: Milestone[];
  selectedStrategies: string[];
  baselineFootprint: number;
  version: number;
  createdAt: Date;
}

/**
 * Roadmap — aggregate containing milestones.
 */
export class Roadmap {
  public readonly id: string;
  public readonly userId: string;
  public readonly milestones: readonly Milestone[];
  public readonly selectedStrategies: readonly string[];
  public readonly baselineFootprint: number;
  public readonly version: number;
  public readonly createdAt: Date;

  constructor(props: RoadmapProps) {
    if (props.milestones.length === 0) {
      throw new ValidationError('Roadmap must have at least one milestone');
    }
    if (props.baselineFootprint < 0) {
      throw new ValidationError('Baseline footprint cannot be negative');
    }

    this.id = props.id;
    this.userId = props.userId;
    this.milestones = Object.freeze([...props.milestones]);
    this.selectedStrategies = Object.freeze([...props.selectedStrategies]);
    this.baselineFootprint = props.baselineFootprint;
    this.version = props.version;
    this.createdAt = props.createdAt;
  }

  /** Total potential reduction across all milestones */
  public getTotalReduction(): number {
    return this.milestones.reduce((sum, m) => sum + m.targetReduction, 0);
  }

  /** Total estimated savings across all milestones */
  public getTotalSavings(): number {
    return this.milestones.reduce((sum, m) => sum + m.estimatedSavings, 0);
  }

  /** Completion percentage */
  public getCompletionPercentage(): number {
    const completed = this.milestones.filter((m) => m.status === 'completed').length;
    return (completed / this.milestones.length) * 100;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      milestones: this.milestones.map((m) => m.toJSON()),
      selectedStrategies: [...this.selectedStrategies],
      baselineFootprint: this.baselineFootprint,
      totalReduction: this.getTotalReduction(),
      totalSavings: this.getTotalSavings(),
      completionPercentage: this.getCompletionPercentage(),
      version: this.version,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
