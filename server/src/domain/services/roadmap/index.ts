/**
 * Barrel export for the roadmap service module.
 *
 * Re-exports all roadmap-related services, types, and constants
 * so consumers can import from a single path.
 */
export { RoadmapService } from './RoadmapService';
export { MilestoneCalculator, IMilestoneCalculator } from './MilestoneCalculator';
export { StrategyAllocator, IStrategyAllocator } from './StrategyAllocator';
export { Strategy, DEFAULT_STRATEGIES } from './strategies';
