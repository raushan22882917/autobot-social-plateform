
import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className || ''}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  onRemove?: () => void;
  variant?: 'default' | 'active';
  icon?: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ label, onRemove, variant = 'default', icon, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.chip} ${styles[`chip${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} ${className || ''}`}
        {...props}
      >
        {icon && <span className={styles.chipIcon}>{icon}</span>}
        <span className={styles.chipLabel}>{label}</span>
        {onRemove && (
          <button
            className={styles.chipRemove}
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = 'Chip';
