import React from 'react';
import { Trophy, TrendingUp, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './LeaderboardCard.module.css';

interface LeaderboardProps {
  rank: number;
  score: number;
}

export const LeaderboardCard: React.FC<LeaderboardProps> = ({ rank, score }) => {
  // Mock total users for percentile calculation (in a real app this comes from backend)
  const totalUsers = 15420;
  const percentile = Math.max(1, Math.round((rank / totalUsers) * 100));
  
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Trophy className={styles.icon} size={24} />
          <h3>Community Standing</h3>
        </div>
        <span className={styles.scoreBadge}>Score: {score}/100</span>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Global Rank</span>
          <span className={styles.statValue}>#{rank.toLocaleString()}</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Percentile</span>
          <span className={styles.statValue}>Top {percentile}%</span>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressLabels}>
          <span>Novice</span>
          <span>Eco-Warrior</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${Math.max(5, 100 - percentile)}%` }}></div>
        </div>
        <p className={styles.insight}>
          <TrendingUp size={16} />
          You are more sustainable than {100 - percentile}% of our users!
        </p>
      </div>

      <div className={styles.actions}>
        <NavLink to="/advisor" className={styles.actionBtn}>
          <Users size={16} />
          Get Advice to Rank Up
        </NavLink>
      </div>
    </div>
  );
};
