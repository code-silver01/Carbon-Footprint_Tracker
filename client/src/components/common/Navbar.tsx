import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Leaf, LayoutDashboard, Calculator, LogOut } from 'lucide-react';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const { logout, user } = useAuth();

  if (!user) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <Leaf size={24} className={styles.brandIcon} />
        <span>CarbonWise</span>
      </div>
      <div className={styles.links}>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/calculator" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
          <Calculator size={20} />
          <span>Calculator</span>
        </NavLink>
        <button onClick={logout} className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};
