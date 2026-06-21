import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Route, Map, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import styles from './Roadmaps.module.css';

interface Strategy {
  id: string;
  title: string;
  description: string;
  estimatedMonthlySavings: number;
}

interface Milestone {
  id: string;
  targetReduction: number;
  dayRange: [number, number];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  strategies: Strategy[];
}

interface Roadmap {
  id: string;
  milestones: Milestone[];
}

const Roadmaps: React.FC = () => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveRoadmap = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/roadmaps/active');
      setRoadmap(response.data);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError('Failed to load roadmap.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRoadmap();
  }, []);

  const generateRoadmap = async () => {
    try {
      setGenerating(true);
      // Let backend select default strategies for now based on user footprint
      // If endpoint requires strategyIds, we pass some defaults or backend logic handles it
      const response = await apiClient.post('/roadmaps/generate', {
        strategyIds: ['strat-carpool', 'strat-renewable', 'strat-plant-based', 'strat-efficiency', 'strat-slow-fashion', 'strat-reduce-buy'] // Default selection
      });
      setRoadmap(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const updateMilestone = async (milestoneId: string, status: string) => {
    if (!roadmap) return;
    try {
      await apiClient.patch(`/roadmaps/${roadmap.id}/milestones/${milestoneId}`, { status });
      // Optimistic update
      setRoadmap({
        ...roadmap,
        milestones: roadmap.milestones.map(m => 
          m.id === milestoneId ? { ...m, status: status as any } : m
        )
      });
    } catch (err) {
      console.error('Failed to update milestone status');
    }
  };

  if (loading) {
    return (
      <div className={styles.centerContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your roadmap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerContainer}>
        <div className="glass-panel">
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className={styles.emptyContainer}>
        <motion.div 
          className={`glass-panel ${styles.emptyCard}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Map size={48} className={styles.emptyIcon} />
          <h2>No Active Roadmap</h2>
          <p>Generate a personalized 30/90/365-day roadmap to start reducing your emissions systematically.</p>
          <button 
            className={styles.generateBtn}
            onClick={generateRoadmap}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Roadmap'}
          </button>
        </motion.div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className={styles.statusCompleted} />;
      case 'in_progress': return <Clock className={styles.statusInProgress} />;
      default: return <Circle className={styles.statusPending} />;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <Route size={32} className={styles.headerIcon} />
          <h1>Your Progressive Roadmap</h1>
        </div>
        <p>Follow these milestones to steadily reach net zero.</p>
      </header>

      <div className={styles.timeline}>
        {roadmap.milestones.map((milestone, idx) => (
          <motion.div 
            key={milestone.id}
            className={styles.milestoneNode}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            <div className={styles.timelineLine}>
              <div className={styles.iconContainer}>
                {getStatusIcon(milestone.status)}
              </div>
              {idx !== roadmap.milestones.length - 1 && (
                <div className={`${styles.line} ${milestone.status === 'completed' ? styles.lineCompleted : ''}`}></div>
              )}
            </div>

            <div className={`glass-panel ${styles.milestoneCard} ${styles[milestone.status]}`}>
              <div className={styles.milestoneHeader}>
                <div>
                  <h3>Days {milestone.dayRange[0]} - {milestone.dayRange[1]}</h3>
                  <span className={styles.targetBadge}>
                    Target: {milestone.targetReduction.toFixed(1)} kg CO₂
                  </span>
                </div>
                
                <div className={styles.actions}>
                  {milestone.status === 'pending' && (
                    <button onClick={() => updateMilestone(milestone.id, 'in_progress')}>
                      Start <ArrowRight size={16} />
                    </button>
                  )}
                  {milestone.status === 'in_progress' && (
                    <button onClick={() => updateMilestone(milestone.id, 'completed')} className={styles.completeBtn}>
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.strategiesGrid}>
                {milestone.strategies.map(strategy => (
                  <div key={strategy.id} className={styles.strategyItem}>
                    <h4>{strategy.title}</h4>
                    <p>{strategy.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Roadmaps;
