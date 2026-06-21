import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Route, Play, CheckCircle, Clock, Map } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { Button } from '../components/common/Button';
import styles from './Roadmaps.module.css';

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

interface Roadmap {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  milestones: Milestone[];
  createdAt: string;
}

export const Roadmaps: React.FC = () => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchRoadmap = async () => {
    try {
      const response = await apiClient.get('/roadmaps/active');
      setRoadmap(response.data);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError('Failed to fetch active roadmap');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const generateRoadmap = async () => {
    setGenerating(true);
    try {
      // In a real app we'd let them select strategies, but for now we'll fetch available ones
      const stratResponse = await apiClient.get('/roadmaps/strategies');
      const strategyIds = stratResponse.data.strategies.slice(0, 3).map((s: any) => s.id);
      
      const response = await apiClient.post('/roadmaps/generate', { strategyIds });
      setRoadmap(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate roadmap');
    } finally {
      setGenerating(false);
    }
  };

  const updateMilestone = async (milestoneId: string, status: string) => {
    if (!roadmap) return;
    try {
      await apiClient.patch(`/roadmaps/${roadmap.id}/milestones/${milestoneId}`, { status });
      // Optimistically update
      setRoadmap(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map(m => m.id === milestoneId ? { ...m, status: status as any } : m)
        };
      });
    } catch (err) {
      console.error('Failed to update milestone', err);
    }
  };

  if (loading) return <div className={styles.loader}>Loading your sustainability journey...</div>;

  if (!roadmap) {
    return (
      <main className={styles.container}>
        <div className={styles.emptyState}>
          <Map size={64} className={styles.emptyIcon} />
          <h2>No Active Roadmap</h2>
          <p>Commit to a personalized 30, 90, or 365-day journey to reduce your emissions.</p>
          <Button onClick={generateRoadmap} disabled={generating}>
            {generating ? 'Plotting Route...' : 'Generate New Roadmap'}
          </Button>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <Route className={styles.icon} size={32} />
          <h1>Your Progressive Roadmap</h1>
        </div>
        <p>Stay on track with your reduction milestones. You got this!</p>
      </header>

      <div className={styles.timeline}>
        {roadmap.milestones.map((milestone, idx) => (
          <motion.div 
            key={milestone.id} 
            className={styles.timelineItem}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
          >
            <div className={`${styles.statusIndicator} ${styles[milestone.status]}`}>
              {milestone.status === 'completed' && <CheckCircle size={20} />}
              {milestone.status === 'in_progress' && <Play size={20} />}
              {milestone.status === 'pending' && <Clock size={20} />}
              {milestone.status === 'skipped' && <Clock size={20} />}
            </div>
            
            <div className={styles.milestoneContent}>
              <div className={styles.milestoneHeader}>
                <h3>{milestone.title}</h3>
                <span className={styles.targetDate}>Due: {new Date(milestone.targetDate).toLocaleDateString()}</span>
              </div>
              <p>{milestone.description}</p>
              
              <div className={styles.actions}>
                {milestone.status !== 'completed' && (
                  <button onClick={() => updateMilestone(milestone.id, 'completed')} className={styles.completeBtn}>
                    Mark Completed
                  </button>
                )}
                {milestone.status === 'pending' && (
                  <button onClick={() => updateMilestone(milestone.id, 'in_progress')} className={styles.startBtn}>
                    Start Working
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
};
export default Roadmaps;
