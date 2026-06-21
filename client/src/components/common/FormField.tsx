import React, { useId, forwardRef } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const ariaDescribedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`${styles.inputGroup} ${className || ''}`}>
        <label htmlFor={id}>{label}</label>
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={error ? styles.inputError : ''}
          {...props}
        />
        {error && (
          <span id={errorId} className={styles.errorText} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className={styles.hintText}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;
