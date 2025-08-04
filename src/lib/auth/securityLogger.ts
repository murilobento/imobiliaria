/**
 * Security logging and monitoring system
 * Handles security event logging, audit trails, and suspicious activity detection
 * Edge Runtime compatible version
 */

import { SecurityEvent } from '@/types/auth';

// Security logging configuration
interface SecurityLoggerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  logToConsole: boolean;
  logDirectory: string;
  maxLogFileSize: number; // in bytes
  maxLogFiles: number;
  suspiciousActivityThresholds: {
    maxFailedAttemptsPerIP: number;
    maxFailedAttemptsPerUser: number;
    timeWindowMs: number;
    maxTokenInvalidationsPerIP: number;
  };
}

// Default configuration - Edge Runtime compatible
const DEFAULT_CONFIG: SecurityLoggerConfig = {
  logLevel: (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ? 'info' : 'debug',
  logToFile: false, // Disabled in Edge Runtime
  logToConsole: true,
  logDirectory: '/tmp/logs/security', // Fallback path, not used in Edge Runtime
  maxLogFileSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 10,
  suspiciousActivityThresholds: {
    maxFailedAttemptsPerIP: 10,
    maxFailedAttemptsPerUser: 5,
    timeWindowMs: 15 * 60 * 1000, // 15 minutes
    maxTokenInvalidationsPerIP: 20
  }
};

// In-memory storage for suspicious activity tracking
interface ActivityTracker {
  failedLoginsByIP: Map<string, { count: number; timestamps: number[] }>;
  failedLoginsByUser: Map<string, { count: number; timestamps: number[] }>;
  tokenInvalidationsByIP: Map<string, { count: number; timestamps: number[] }>;
  lastCleanup: number;
}

class SecurityLogger {
  private config: SecurityLoggerConfig;
  private activityTracker: ActivityTracker;

  constructor(config: Partial<SecurityLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activityTracker = {
      failedLoginsByIP: new Map(),
      failedLoginsByUser: new Map(),
      tokenInvalidationsByIP: new Map(),
      lastCleanup: Date.now()
    };

    // Cleanup old tracking data every 5 minutes
    setInterval(() => this.cleanupOldActivity(), 5 * 60 * 1000);
  }

  /**
   * Log a security event with audit trail
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Enrich event with additional metadata
      const enrichedEvent = this.enrichEvent(event);

      // Update activity tracking BEFORE suspicious activity detection
      this.updateActivityTracking(enrichedEvent);

      // Check for suspicious activity
      const suspiciousActivity = await this.detectSuspiciousActivity(enrichedEvent);
      if (suspiciousActivity) {
        enrichedEvent.details = {
          ...enrichedEvent.details,
          suspicious_activity: suspiciousActivity
        };
      }

      // Log to console if enabled
      if (this.config.logToConsole) {
        this.logToConsole(enrichedEvent);
      }

      // Log to file if enabled
      if (this.config.logToFile) {
        await this.logToFile(enrichedEvent);
      }

    } catch (error) {
      console.error('[SECURITY_LOGGER_ERROR]', 'Failed to log security event:', error);
    }
  }

  /**
   * Enrich event with additional metadata
   */
  private enrichEvent(event: SecurityEvent): SecurityEvent & {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    environment: string;
  } {
    const id = this.generateEventId();
    const severity = this.calculateSeverity(event);
    const environment = (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'development';

    return {
      ...event,
      id,
      severity,
      environment,
      timestamp: new Date(event.timestamp) // Ensure it's a Date object
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate event severity based on type and context
   */
  private calculateSeverity(event: SecurityEvent): 'low' | 'medium' | 'high' | 'critical' {
    switch (event.type) {
      case 'login_success':
        return 'low';
      case 'login_attempt':
        return 'low';
      case 'logout':
        return 'low';
      case 'login_failure':
        // Check if this is part of a pattern
        const failureDetails = event.details as any;
        if (failureDetails?.reason === 'account_locked') {
          return 'high';
        }
        if (failureDetails?.reason === 'rate_limited') {
          return 'medium';
        }
        return 'medium';
      case 'token_invalid':
        return 'medium';
      default:
        return 'medium';
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(event: SecurityEvent): Promise<string[] | null> {
    const suspicious: string[] = [];

    // Check for excessive failed logins from IP
    if (event.type === 'login_failure') {
      const ipActivity = this.activityTracker.failedLoginsByIP.get(event.ip_address);
      if (ipActivity && ipActivity.count >= this.config.suspiciousActivityThresholds.maxFailedAttemptsPerIP) {
        suspicious.push(`Excessive failed login attempts from IP: ${event.ip_address}`);
      }

      // Check for excessive failed logins for user
      if (event.details?.username) {
        const userActivity = this.activityTracker.failedLoginsByUser.get(event.details.username);
        if (userActivity && userActivity.count >= this.config.suspiciousActivityThresholds.maxFailedAttemptsPerUser) {
          suspicious.push(`Excessive failed login attempts for user: ${event.details.username}`);
        }
      }
    }

    // Check for excessive token invalidations
    if (event.type === 'token_invalid') {
      const tokenActivity = this.activityTracker.tokenInvalidationsByIP.get(event.ip_address);
      if (tokenActivity && tokenActivity.count >= this.config.suspiciousActivityThresholds.maxTokenInvalidationsPerIP) {
        suspicious.push(`Excessive token invalidation attempts from IP: ${event.ip_address}`);
      }
    }

    // Check for unusual user agent patterns
    if (this.isUnusualUserAgent(event.user_agent)) {
      suspicious.push(`Unusual user agent detected: ${event.user_agent}`);
    }

    // Check for rapid successive attempts
    if (this.isRapidSuccessiveAttempt(event)) {
      suspicious.push('Rapid successive authentication attempts detected');
    }

    return suspicious.length > 0 ? suspicious : null;
  }

  /**
   * Check if user agent is unusual/suspicious
   */
  private isUnusualUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /bot/i,
      /crawler/i,
      /scanner/i,
      /^$/,
      /unknown/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check for rapid successive attempts (potential automated attack)
   */
  private isRapidSuccessiveAttempt(event: SecurityEvent): boolean {
    if (event.type !== 'login_failure' && event.type !== 'login_attempt') {
      return false;
    }

    const ipActivity = this.activityTracker.failedLoginsByIP.get(event.ip_address);
    if (!ipActivity || ipActivity.timestamps.length < 3) {
      return false;
    }

    // Check if last 3 attempts were within 30 seconds
    const recentAttempts = ipActivity.timestamps.slice(-3);
    const timeSpan = recentAttempts[recentAttempts.length - 1] - recentAttempts[0];
    return timeSpan < 30 * 1000; // 30 seconds
  }

  /**
   * Update activity tracking for suspicious activity detection
   */
  private updateActivityTracking(event: SecurityEvent): void {
    const now = Date.now();
    const windowMs = this.config.suspiciousActivityThresholds.timeWindowMs;

    if (event.type === 'login_failure') {
      // Track by IP
      this.updateActivityMap(
        this.activityTracker.failedLoginsByIP,
        event.ip_address,
        now,
        windowMs
      );

      // Track by username if available
      if (event.details?.username) {
        this.updateActivityMap(
          this.activityTracker.failedLoginsByUser,
          event.details.username,
          now,
          windowMs
        );
      }
    }

    if (event.type === 'token_invalid') {
      this.updateActivityMap(
        this.activityTracker.tokenInvalidationsByIP,
        event.ip_address,
        now,
        windowMs
      );
    }
  }

  /**
   * Update activity map with time window cleanup
   */
  private updateActivityMap(
    map: Map<string, { count: number; timestamps: number[] }>,
    key: string,
    timestamp: number,
    windowMs: number
  ): void {
    const activity = map.get(key) || { count: 0, timestamps: [] };

    // Remove old timestamps outside the window
    activity.timestamps = activity.timestamps.filter(ts => timestamp - ts < windowMs);

    // Add new timestamp
    activity.timestamps.push(timestamp);
    activity.count = activity.timestamps.length;

    map.set(key, activity);
  }

  /**
   * Clean up old activity tracking data
   */
  private cleanupOldActivity(): void {
    const now = Date.now();
    const windowMs = this.config.suspiciousActivityThresholds.timeWindowMs;

    [
      this.activityTracker.failedLoginsByIP,
      this.activityTracker.failedLoginsByUser,
      this.activityTracker.tokenInvalidationsByIP
    ].forEach(map => {
      for (const [key, activity] of map.entries()) {
        activity.timestamps = activity.timestamps.filter(ts => now - ts < windowMs);
        activity.count = activity.timestamps.length;

        if (activity.count === 0) {
          map.delete(key);
        }
      }
    });

    this.activityTracker.lastCleanup = now;
  }

  /**
   * Log to console with structured format
   */
  private logToConsole(event: SecurityEvent & { id: string; severity: string }): void {
    const logLevel = this.getLogLevel(event.severity);
    const logMessage = this.formatLogMessage(event);

    switch (logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
      default:
        console.log(logMessage);
        break;
    }
  }

  /**
   * Get appropriate log level for console output
   */
  private getLogLevel(severity: string): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }

  /**
   * Format log message for output
   */
  private formatLogMessage(event: SecurityEvent & { id: string; severity: string }): string {
    return `[SECURITY:${event.severity.toUpperCase()}] ${event.id} - ${event.type} | IP: ${event.ip_address} | User: ${event.user_id || 'anonymous'} | ${event.timestamp.toISOString()}${event.details ? ` | Details: ${JSON.stringify(event.details)}` : ''}`;
  }

  /**
   * Log to file with rotation - Edge Runtime compatible (no-op)
   */
  private async logToFile(event: SecurityEvent & { id: string; severity: string }): Promise<void> {
    // File logging is not supported in Edge Runtime
    // In production, you would typically send logs to an external service
    // like CloudWatch, Datadog, or a custom logging endpoint
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      // TODO: Implement external logging service integration
      console.warn('[SECURITY_LOGGER]', 'File logging not available in Edge Runtime. Consider using external logging service.');
    }
  }

  /**
   * Get security statistics for monitoring
   */
  getSecurityStats(): {
    failedLoginsByIP: Record<string, number>;
    failedLoginsByUser: Record<string, number>;
    tokenInvalidationsByIP: Record<string, number>;
    lastCleanup: Date;
  } {
    return {
      failedLoginsByIP: Object.fromEntries(
        Array.from(this.activityTracker.failedLoginsByIP.entries()).map(([key, value]) => [key, value.count])
      ),
      failedLoginsByUser: Object.fromEntries(
        Array.from(this.activityTracker.failedLoginsByUser.entries()).map(([key, value]) => [key, value.count])
      ),
      tokenInvalidationsByIP: Object.fromEntries(
        Array.from(this.activityTracker.tokenInvalidationsByIP.entries()).map(([key, value]) => [key, value.count])
      ),
      lastCleanup: new Date(this.activityTracker.lastCleanup)
    };
  }

  /**
   * Check if IP is currently flagged as suspicious
   */
  isSuspiciousIP(ipAddress: string): boolean {
    const failedLogins = this.activityTracker.failedLoginsByIP.get(ipAddress);
    const tokenInvalidations = this.activityTracker.tokenInvalidationsByIP.get(ipAddress);

    return Boolean(
      (failedLogins && failedLogins.count >= this.config.suspiciousActivityThresholds.maxFailedAttemptsPerIP) ||
      (tokenInvalidations && tokenInvalidations.count >= this.config.suspiciousActivityThresholds.maxTokenInvalidationsPerIP)
    );
  }

  /**
   * Check if user is currently flagged as suspicious
   */
  isSuspiciousUser(username: string): boolean {
    const failedLogins = this.activityTracker.failedLoginsByUser.get(username);
    return Boolean(failedLogins && failedLogins.count >= this.config.suspiciousActivityThresholds.maxFailedAttemptsPerUser);
  }
}

// Singleton instance
let securityLoggerInstance: SecurityLogger | null = null;

/**
 * Get singleton security logger instance
 */
export function getSecurityLogger(config?: Partial<SecurityLoggerConfig>): SecurityLogger {
  if (!securityLoggerInstance) {
    securityLoggerInstance = new SecurityLogger(config);
  }
  return securityLoggerInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetSecurityLogger(): void {
  securityLoggerInstance = null;
}

/**
 * Convenience function to log security events
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const logger = getSecurityLogger();
  await logger.logSecurityEvent(event);
}

/**
 * Convenience function to check if IP is suspicious
 */
export function isSuspiciousIP(ipAddress: string): boolean {
  const logger = getSecurityLogger();
  return logger.isSuspiciousIP(ipAddress);
}

/**
 * Convenience function to check if user is suspicious
 */
export function isSuspiciousUser(username: string): boolean {
  const logger = getSecurityLogger();
  return logger.isSuspiciousUser(username);
}

/**
 * Get current security statistics
 */
export function getSecurityStats() {
  const logger = getSecurityLogger();
  return logger.getSecurityStats();
}

export { SecurityLogger };
export type { SecurityLoggerConfig };