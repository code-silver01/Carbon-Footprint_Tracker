import { ValidationError } from '../errors';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface SustainabilityGoalProps {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetReductionKg: number;
  currentReductionKg: number;
  startDate: Date;
  targetDate: Date;
  status: GoalStatus;
  createdAt: Date;
}

/**
 * SustainabilityGoal entity — represents a user's emission reduction target.
 */
export class SustainabilityGoal {
  public readonly id: string;
  public readonly userId: string;
  public readonly title: string;
  public readonly description: string;
  public readonly targetReductionKg: number;
  public readonly currentReductionKg: number;
  public readonly startDate: Date;
  public readonly targetDate: Date;
  public readonly status: GoalStatus;
  public readonly createdAt: Date;

  constructor(props: SustainabilityGoalProps) {
    if (props.targetReductionKg <= 0) {
      throw new ValidationError('Target reduction must be positive');
    }
    if (props.currentReductionKg < 0) {
      throw new ValidationError('Current reduction cannot be negative');
    }
    if (props.targetDate <= props.startDate) {
      throw new ValidationError('Target date must be after start date');
    }

    this.id = props.id;
    this.userId = props.userId;
    this.title = props.title;
    this.description = props.description;
    this.targetReductionKg = props.targetReductionKg;
    this.currentReductionKg = props.currentReductionKg;
    this.startDate = props.startDate;
    this.targetDate = props.targetDate;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }

  /** Progress as a percentage (0-100) */
  public getProgressPercentage(): number {
    if (this.targetReductionKg === 0) return 0;
    return Math.min(100, (this.currentReductionKg / this.targetReductionKg) * 100);
  }

  /** Days remaining until target date */
  public getDaysRemaining(): number {
    const now = new Date();
    const diff = this.targetDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /** Whether the goal is on track based on linear progression */
  public isOnTrack(): boolean {
    const totalDays =
      (this.targetDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays =
      (new Date().getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = (elapsedDays / totalDays) * 100;
    return this.getProgressPercentage() >= expectedProgress * 0.8; // 80% of expected
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      targetReductionKg: this.targetReductionKg,
      currentReductionKg: this.currentReductionKg,
      progressPercentage: this.getProgressPercentage(),
      startDate: this.startDate.toISOString(),
      targetDate: this.targetDate.toISOString(),
      status: this.status,
      daysRemaining: this.getDaysRemaining(),
      isOnTrack: this.isOnTrack(),
      createdAt: this.createdAt.toISOString(),
    };
  }
}
