'use client';

import React from 'react';
import styles from './GlassContainer.module.css';

interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  variant?: 'default' | 'elevated';
  children: React.ReactNode;
}

export const GlassContainer = React.forwardRef<HTMLDivElement, GlassContainerProps>(
  ({ glow = false, variant = 'default', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.container} ${styles[variant]} ${glow ? styles.glow : ''} ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassContainer.displayName = 'GlassContainer';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 3, gap = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.grid} ${styles[`gap${gap.toUpperCase()}`]} ${className || ''}`}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      direction = 'row',
      justify = 'start',
      align = 'center',
      gap = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
    };

    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    };

    return (
      <div
        ref={ref}
        className={`${styles.flex} ${className || ''}`}
        style={{
          flexDirection: direction,
          justifyContent: justifyMap[justify],
          alignItems: alignMap[align],
          gap: `var(--spacing-${gap})`,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ spacing = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.stack} ${className || ''}`}
        style={{ gap: `var(--spacing-${spacing})` }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ maxWidth = 'lg', className, children, ...props }, ref) => {
    const maxWidthMap = {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      full: '100%',
    };

    return (
      <div
        ref={ref}
        className={`${styles.container} ${className || ''}`}
        style={{ maxWidth: maxWidthMap[maxWidth] }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';
