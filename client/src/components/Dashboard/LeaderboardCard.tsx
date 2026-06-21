import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './LeaderboardCard.module.css';

interface LeaderboardCardProps {
  rank: string; // e.g., "Top 10%" or "Newcomer"
  sustainabilityScore: number; // 0-100
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ rank, sustainabilityScore }) => {
  
  // Calculate relative fill percentage for the progress bar
  const scorePercent = Math.min(Math.max(sustainabilityScore, 0), 100);

  return (
    <motion.div 
      className={`glass-panel ${styles.card}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Trophy className={styles.icon} size={24} />
          <h2>Community Standing</h2>
        </div>
        <div className={styles.badge}>{rank}</div>
      </div>

      <div className={styles.scoreContainer}>
        <div className={styles.scoreLabel}>
          <span>Sustainability Score</span>
          <span className={styles.scoreValue}>{sustainabilityScore} / 100</span>
        </div>
        
        <div className={styles.progressBarBg}>
          <motion.div 
            className={styles.progressBarFill}
            initial={{ width: 0 }}
            animate={{ width: `${scorePercent}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <Users size={16} className={styles.statIcon} />
          <span>Anonymous Comparison</span>
        </div>
        <div className={styles.statItem}>
          <TrendingUp size={16} className={styles.statIcon} />
          <span>Top performers reduce 30% more</span>
        </div>
      </div>

      <div className={styles.footer}>
        <p>Boost your score by following tailored advice.</p>
        <Link to="/advisor" className={styles.actionBtn}>
          Get AI Advice
        </Link>
      </div>
    </motion.div>
  );
};

export default LeaderboardCard;
