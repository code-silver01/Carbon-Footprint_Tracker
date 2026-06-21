import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Leaf, LineChart, Target, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar Navigation */}
      <motion.aside 
        className={`glass-panel ${styles.sidebar}`}
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className={styles.logo}>
          <Leaf className={styles.logoIcon} size={28} />
          <h2>CarbonWise</h2>
        </div>

        <nav className={styles.nav}>
          <a href="#dashboard" className={`${styles.navItem} ${styles.active}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a href="#calculate" className={styles.navItem}>
            <Leaf size={20} />
            <span>Calculate</span>
          </a>
          <a href="#roadmaps" className={styles.navItem}>
            <Target size={20} />
            <span>Roadmaps</span>
          </a>
          <a href="#history" className={styles.navItem}>
            <LineChart size={20} />
            <span>History</span>
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <a href="#settings" className={styles.navItem}>
            <Settings size={20} />
            <span>Settings</span>
          </a>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.greeting}>
              Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}! 👋
            </h1>
            <p className={styles.subtitle}>Here is your sustainability overview for today.</p>
          </div>
          
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Placeholder for Dashboard Widgets */}
        <div className={styles.widgetsGrid}>
          <motion.div 
            className={`glass-panel ${styles.widget} ${styles.scoreWidget}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3>Sustainability Score</h3>
            <div className={styles.scoreCircle}>
              <span className={styles.scoreNumber}>85</span>
              <span className={styles.scoreLabel}>/ 100</span>
            </div>
            <p className={styles.trendText}>↑ 5% from last month</p>
          </motion.div>

          <motion.div 
            className={`glass-panel ${styles.widget}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3>Monthly Savings</h3>
            <div className={styles.statValue}>124 kg CO₂</div>
            <p className={styles.trendText}>Keep up the good work!</p>
          </motion.div>

          <motion.div 
            className={`glass-panel ${styles.widget} ${styles.wideWidget}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3>Active Milestone</h3>
            <div className={styles.milestoneContent}>
              <div className={styles.milestoneIcon}><Target size={24} /></div>
              <div className={styles.milestoneText}>
                <h4>Meatless Mondays</h4>
                <p>2 weeks remaining • Est. savings: 15 kg CO₂</p>
              </div>
              <button className={styles.actionBtn}>View Details</button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
