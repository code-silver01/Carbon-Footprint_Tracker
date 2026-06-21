import { Roadmap } from '../value-objects/Milestone';

/**
 * IRoadmapRepository — repository interface for roadmap persistence.
 */
export interface IRoadmapRepository {
  /** Create a new roadmap */
  create(roadmap: Roadmap): Promise<void>;

  /** Find roadmap by ID */
  findById(id: string): Promise<Roadmap | null>;

  /** Get active roadmap for a user */
  getActiveByUserId(userId: string): Promise<Roadmap | null>;

  /** Get roadmap version history for a user */
  getVersionHistory(userId: string): Promise<Roadmap[]>;

  /** Update milestone status within a roadmap */
  updateMilestoneStatus(
    roadmapId: string,
    milestoneId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped',
  ): Promise<void>;
}
