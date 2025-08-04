// Performance monitoring utilities

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  // Start timing a operation
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  // End timing and record metric
  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    
    this.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type: 'timing'
    });

    return duration;
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Get metrics by name
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  // Get average timing for a metric
  getAverageTime(name: string): number {
    const timingMetrics = this.metrics.filter(
      m => m.name === name && m.type === 'timing'
    );
    
    if (timingMetrics.length === 0) return 0;
    
    const sum = timingMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / timingMetrics.length;
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // Export metrics for analysis
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Higher-order function to measure component render time
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    React.useEffect(() => {
      performanceMonitor.startTimer(`${componentName}_render`);
      
      return () => {
        performanceMonitor.endTimer(`${componentName}_render`);
      };
    });

    return React.createElement(Component, props);
  };
}

// Hook to measure async operations
export function usePerformanceTracking() {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAverageTime: performanceMonitor.getAverageTime.bind(performanceMonitor),
  };
}

// Measure API call performance
export async function measureApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  performanceMonitor.startTimer(`api_${name}`);
  
  try {
    const result = await apiCall();
    performanceMonitor.endTimer(`api_${name}`);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(`api_${name}`);
    performanceMonitor.recordMetric({
      name: `api_${name}_error`,
      value: 1,
      timestamp: Date.now(),
      type: 'counter'
    });
    throw error;
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }
  return null;
}

// Web Vitals monitoring
export function measureWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Measure Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        performanceMonitor.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          type: 'timing'
        });
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP measurement not supported');
    }

    // Measure First Input Delay (FID)
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          performanceMonitor.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            type: 'timing'
          });
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID measurement not supported');
    }

    // Measure Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        performanceMonitor.recordMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
          type: 'gauge'
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS measurement not supported');
    }
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring(): void {
  if (typeof window !== 'undefined') {
    measureWebVitals();
    
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      const memory = getMemoryUsage();
      if (memory) {
        performanceMonitor.recordMetric({
          name: 'memory_usage',
          value: memory.percentage,
          timestamp: Date.now(),
          type: 'gauge'
        });
      }
    }, 30000);
  }
}

// React import for the withPerformanceTracking function
import React from 'react';