import React, { useState } from 'react';
import styles from './Calculator.module.css';
import { Button } from '../components/common/Button';
import { apiClient } from '../api/apiClient';

interface CalculatorState {
  transportation: { carMiles: number; bikeMiles: number; transitMiles: number; flightHours: number; };
  energy: { electricityKwh: number; renewablePercentage: number; };
  dietType: 'vegan' | 'vegetarian' | 'mixed' | 'high-meat';
  shopping: { monthlySpend: number; fastFashionFrequency: number; };
}

export const CarbonCalculator: React.FC = () => {
  const [state, setState] = useState<CalculatorState>({
    transportation: { carMiles: 0, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
    energy: { electricityKwh: 0, renewablePercentage: 0 },
    dietType: 'mixed',
    shopping: { monthlySpend: 0, fastFashionFrequency: 0 },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await apiClient.post('/footprints', state);

      const message = 'Carbon footprint calculated successfully';
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.textContent = message;
      announcement.className = styles.srOnly;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 3000);
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.details && data.details.length > 0) {
        setErrors({ submit: `${data.error}: ${data.details[0].message}` });
      } else {
        setErrors({ submit: data?.error || error.message || 'Unknown error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.calculatorContainer} role="main" aria-labelledby="calc-heading">
      <h1 id="calc-heading">Calculate Your Carbon Footprint</h1>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend className={styles.sectionTitle}>Transportation</legend>
          <div className={styles.formGroup}>
            <label htmlFor="carMiles">
              Car Travel (miles/month)
              <span className={styles.required} aria-label="required">*</span>
            </label>
            <input
              id="carMiles"
              type="number"
              min="0"
              max="50000"
              step="0.1"
              value={state.transportation.carMiles}
              onChange={(e) => setState({ ...state, transportation: { ...state.transportation, carMiles: parseFloat(e.target.value) } })}
              aria-describedby="carMiles-help"
              aria-invalid={!!errors.carMiles}
              aria-errormessage={errors.carMiles ? 'carMiles-error' : undefined}
            />
            <small id="carMiles-help">Average monthly car travel distance in miles.</small>
            {errors.carMiles && <span id="carMiles-error" role="alert" className={styles.errorMessage}>{errors.carMiles}</span>}
          </div>
        </fieldset>

        <fieldset>
          <legend className={styles.sectionTitle}>Home Energy</legend>
          <div className={styles.formGroup}>
            <label htmlFor="electricityKwh">
              Electricity Usage (kWh/month)
              <span className={styles.required} aria-label="required">*</span>
            </label>
            <input
              id="electricityKwh"
              type="number"
              min="0"
              max="10000"
              value={state.energy.electricityKwh}
              onChange={(e) => setState({ ...state, energy: { ...state.energy, electricityKwh: parseFloat(e.target.value) } })}
              aria-describedby="electricityKwh-help"
            />
            <small id="electricityKwh-help">Your total electricity consumption per month.</small>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="renewablePercentage">
              Renewable Energy %
              <span className={styles.required} aria-label="required">*</span>
            </label>
            <input
              id="renewablePercentage"
              type="range"
              min="0"
              max="100"
              value={state.energy.renewablePercentage}
              onChange={(e) => setState({ ...state, energy: { ...state.energy, renewablePercentage: parseInt(e.target.value, 10) } })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={state.energy.renewablePercentage}
              aria-describedby="renewable-help"
            />
            <small id="renewable-help">Percentage of your electricity from renewable sources ({state.energy.renewablePercentage}%)</small>
          </div>
        </fieldset>

        <fieldset>
          <legend className={styles.sectionTitle}>Diet Type</legend>
          <div className={styles.radioGroup} role="radiogroup" aria-labelledby="diet-legend">
            <div className={styles.radioOption}>
              <input
                id="diet-vegan"
                type="radio"
                name="diet"
                value="vegan"
                checked={state.dietType === 'vegan'}
                onChange={(e) => setState({ ...state, dietType: e.target.value as any })}
              />
              <label htmlFor="diet-vegan">Vegan</label>
            </div>
            <div className={styles.radioOption}>
              <input
                id="diet-mixed"
                type="radio"
                name="diet"
                value="mixed"
                checked={state.dietType === 'mixed'}
                onChange={(e) => setState({ ...state, dietType: e.target.value as any })}
              />
              <label htmlFor="diet-mixed">Mixed</label>
            </div>
          </div>
        </fieldset>

        {errors.submit && (
          <div role="alert" className={styles.errorAlert} aria-live="assertive">{errors.submit}</div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className={styles.submitButton}
          aria-label={loading ? 'Calculating carbon footprint...' : 'Calculate footprint'}
        >
          {loading ? 'Calculating...' : 'Calculate My Footprint'}
        </Button>
      </form>
    </main>
  );
};
