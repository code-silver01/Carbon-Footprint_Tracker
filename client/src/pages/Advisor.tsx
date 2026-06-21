import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, Target, Leaf, Award } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import styles from './Advisor.module.css';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
  estimatedSavings: number;
}

interface Analysis {
  highestEmissionSource: string;
  insights: string[];
}

interface AdviceResponse {
  analysis: Analysis;
  recommendations: Recommendation[];
  weeklyChallenge: {
    title: string;
    description: string;
    rewardPoints: number;
  };
}

const Advisor: React.FC = () => {
  const [data, setData] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        setLoading(true);
        const response = await apiClient.post('/advice/recommendations');
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load AI recommendations.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdvice();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Brain size={48} className={styles.loadingIcon} />
        </motion.div>
        <p>Analyzing your footprint data with Gemini AI...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <div className="glass-panel">
          <h2>Oops!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <Brain size={32} className={styles.headerIcon} />
          <h1>AI Sustainability Advisor</h1>
        </div>
        <p>Powered by Gemini. Tailored strategies based on your latest footprint.</p>
      </header>

      <div className={styles.splitLayout}>
        {/* Left Column: Analysis & Insights */}
        <div className={styles.leftColumn}>
          <motion.div 
            className={`glass-panel ${styles.analysisCard}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3><Zap size={20} /> AI Analysis</h3>
            <div className={styles.highlight}>
              <span>Highest Emission Source:</span>
              <strong>{data.analysis.highestEmissionSource}</strong>
            </div>
            
            <ul className={styles.insightsList}>
              {data.analysis.insights.map((insight, idx) => (
                <li key={idx}>
                  <Leaf size={16} />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className={`glass-panel ${styles.challengeCard}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3><Award size={20} /> Weekly Challenge</h3>
            <div className={styles.challengeContent}>
              <h4>{data.weeklyChallenge.title}</h4>
              <p>{data.weeklyChallenge.description}</p>
              <div className={styles.reward}>
                Reward: {data.weeklyChallenge.rewardPoints} pts
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Recommendations */}
        <div className={styles.rightColumn}>
          <motion.h3 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.sectionTitle}
          >
            <Target size={20} /> Recommended Actions
          </motion.h3>
          
          <div className={styles.recommendationsList}>
            {data.recommendations.map((rec, idx) => (
              <motion.div 
                key={rec.id}
                className={`glass-panel ${styles.recCard}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className={styles.recHeader}>
                  <h4>{rec.title}</h4>
                  <span className={`${styles.impactBadge} ${styles[rec.impact.toLowerCase()]}`}>
                    {rec.impact} Impact
                  </span>
                </div>
                <p>{rec.description}</p>
                <div className={styles.recFooter}>
                  <span className={styles.category}>{rec.category}</span>
                  <span className={styles.savings}>
                    Save ~${rec.estimatedSavings.toFixed(2)}/mo
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advisor;
