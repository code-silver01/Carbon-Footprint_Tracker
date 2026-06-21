import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/apiClient';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await apiClient.post(endpoint, { email, password });
      
      const { accessToken, refreshToken } = response.data;
      await login(accessToken, refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details && data.details.length > 0) {
        setError(`${data.error}: ${data.details[0].message}`);
      } else {
        setError(data?.error || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div 
        className={`glass-panel ${styles.card}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className={styles.header}>
          <motion.div 
            className={styles.iconWrapper}
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
          >
            <Leaf size={32} />
          </motion.div>
          <h1>CarbonWise AI</h1>
          <p>Your intelligent path to net zero.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <motion.div 
              className={styles.error}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
            {!isLogin && (
              <span className={styles.passwordHint}>
                Must be at least 12 chars, include uppercase, number, and symbol.
              </span>
            )}
          </div>

          <motion.button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div className={styles.btnSpinner}></div>
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </>
            )}
          </motion.button>
        </form>

        <div className={styles.footer}>
          <button 
            className={styles.switchBtn}
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            type="button"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
