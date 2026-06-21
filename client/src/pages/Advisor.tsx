import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import styles from './Advisor.module.css';

interface AdviceData {
  advice: {
    topSources: { source: string; percentage: number }[];
    strategies: { id: string; title: string; description: string; impact: string; effort: string }[];
    weeklyChallenge: { title: string; description: string };
    generatedAt: string;
  };
  footprintSummary: { total: number; month: string };
}

export const Advisor: React.FC = () => {
  const [data, setData] = useState<AdviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        const response = await apiClient.get('/advice/recommendations');
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch recommendations');
      } finally {
        setLoading(false);
      }
    };
    fetchAdvice();
  }, []);

  if (loading) return <div className={styles.loader}>Analyzing your footprint with Gemini...</div>;
  if (error) return <div className={styles.errorContainer}>{error}</div>;
  if (!data) return null;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <Brain className={styles.icon} size={32} />
          <h1>AI Sustainability Advisor</h1>
        </div>
        <p>Personalized strategies powered by Google Gemini based on your recent {data.footprintSummary.total.toFixed(1)} kg CO₂ footprint.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.sourcesColumn}>
          <h2>Top Emission Sources</h2>
          <div className={styles.sourceList}>
            {data.advice.topSources.map((source, idx) => (
              <motion.div 
                key={idx} 
                className={styles.sourceCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <AlertTriangle className={styles.warningIcon} size={20} />
                <div className={styles.sourceInfo}>
                  <span className={styles.sourceName}>{source.source}</span>
                  <span className={styles.sourcePercent}>{source.percentage.toFixed(1)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${source.percentage}%` }}></div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className={styles.strategiesColumn}>
          <div className={styles.challengeCard}>
            <h3><Target size={20} /> Weekly Challenge</h3>
            <h4>{data.advice.weeklyChallenge.title}</h4>
            <p>{data.advice.weeklyChallenge.description}</p>
          </div>

          <h2>Recommended Strategies</h2>
          <div className={styles.strategyList}>
            {data.advice.strategies.map((strategy, idx) => (
              <motion.div 
                key={strategy.id} 
                className={styles.strategyCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <div className={styles.strategyHeader}>
                  <h3>{strategy.title}</h3>
                  <div className={styles.badges}>
                    <span className={styles.impactBadge}>Impact: {strategy.impact}</span>
                    <span className={styles.effortBadge}>Effort: {strategy.effort}</span>
                  </div>
                </div>
                <p>{strategy.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
export default Advisor;
