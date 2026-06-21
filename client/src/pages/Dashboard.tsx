import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';
import { apiClient } from '../api/apiClient';
import { TrendChart } from '../components/Dashboard/TrendChart';


interface UserStats { currentMonth: number; cumulative: number; sustainabilityScore: number; rank: number; }

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<{ month: string; savings: number; }[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/progress');
        const progressData = response.data;
        if (progressData) {
          setData(progressData.monthlyData || []);
          setStats({
            currentMonth: progressData.currentMonth || 0,
            cumulative: progressData.cumulative || 0,
            sustainabilityScore: progressData.score || 0,
            rank: progressData.rank || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch progress data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className={styles.loader} role="status" aria-live="polite">Loading...</div>;

  return (
    <main className={styles.dashboard} role="main" aria-label="Progress dashboard">
      <section className={styles.header}>
        <h1>Welcome back, {user?.displayName || user?.email || 'User'}!</h1>
        <p>Here's your sustainability progress.</p>
      </section>

      <section className={styles.metrics} aria-labelledby="metrics-heading">
        <h2 id="metrics-heading">Your Progress</h2>
        <div className={styles.metricGrid}>
          <div className={styles.card} aria-label={`This month you saved ${stats?.currentMonth || 0} kilograms of CO2`}>
            <h3>This Month's Savings</h3>
            <p className={styles.value}>{stats?.currentMonth?.toFixed(1) || 0} kg CO₂</p>
          </div>
          <div className={styles.card} aria-label={`Total savings of ${stats?.cumulative || 0} kilograms of CO2`}>
            <h3>Cumulative Savings</h3>
            <p className={styles.value}>{stats?.cumulative?.toFixed(1) || 0} kg CO₂</p>
          </div>
          <div className={styles.card} aria-label={`Your sustainability score is ${stats?.sustainabilityScore || 0} out of 100`}>
            <h3>Sustainability Score</h3>
            <p className={styles.value}>{stats?.sustainabilityScore || 0}/100</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-labelledby="chart-heading" style={{ marginTop: '2rem' }}>
        <h2 id="chart-heading">Monthly Trend</h2>
        <TrendChart data={data} />
      </section>
    </main>
  );
};
export default Dashboard;
