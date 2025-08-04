/**
 * Unit tests for security logging and monitoring system
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SecurityLogger, getSecurityLogger, logSecurityEvent, isSuspiciousIP, isSuspiciousUser, getSecurityStats, resetSecurityLogger } from '../securityLogger';
import type { SecurityEvent } from '@/types/auth';

// Mock fs module
vi.mock('fs/promises');
const mockFs = fs as any;

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

describe('SecurityLogger', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset singleton instance
    resetSecurityLogger();
    
    // Mock console methods
    console.log = mockConsole.log;
    console.info = mockConsole.info;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    
    // Mock fs methods
    mockFs.mkdir = vi.fn().mockResolvedValue(undefined);
    mockFs.appendFile = vi.fn().mockResolvedValue(undefined);
    mockFs.stat = vi.fn().mockRejectedValue({ code: 'ENOENT' });
    mockFs.readdir = vi.fn().mockResolvedValue([]);
    mockFs.rename = vi.fn().mockResolvedValue(undefined);
    mockFs.unlink = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    vi.restoreAllMocks();
  });

  describe('SecurityLogger class', () => {
    it('should create instance with default configuration', () => {
      const logger = new SecurityLogger();
      expect(logger).toBeInstanceOf(SecurityLogger);
    });

    it('should create instance with custom configuration', () => {
      const config = {
        logLevel: 'error' as const,
        logToFile: false,
        maxLogFiles: 5
      };
      
      const logger = new SecurityLogger(config);
      expect(logger).toBeInstanceOf(SecurityLogger);
    });

    it('should log security event to console', async () => {
      const logger = new SecurityLogger({ logToFile: false });
      
      const event: SecurityEvent = {
        type: 'login_attempt',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      await logger.logSecurityEvent(event);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY:LOW]')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('login_attempt')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1')
      );
    });

    it('should log security event to file when enabled', async () => {
      const logger = new SecurityLogger({ 
        logToFile: true,
        logToConsole: false,
        logDirectory: '/test/logs'
      });
      
      const event: SecurityEvent = {
        type: 'login_failure',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        details: { username: 'testuser' }
      };

      await logger.logSecurityEvent(event);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/logs', { recursive: true });
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('/test/logs/security-'),
        expect.stringContaining('"type":"login_failure"'),
        'utf8'
      );
    });

    it('should calculate correct severity levels', async () => {
      const logger = new SecurityLogger({ logToFile: false });
      
      const events: Array<{ event: SecurityEvent; expectedLevel: string }> = [
        {
          event: { type: 'login_success', ip_address: '1.1.1.1', user_agent: 'test', timestamp: new Date() },
          expectedLevel: 'LOW'
        },
        {
          event: { type: 'login_failure', ip_address: '1.1.1.1', user_agent: 'test', timestamp: new Date() },
          expectedLevel: 'MEDIUM'
        },
        {
          event: { 
            type: 'login_failure', 
            ip_address: '1.1.1.1', 
            user_agent: 'test', 
            timestamp: new Date(),
            details: { reason: 'account_locked' }
          },
          expectedLevel: 'HIGH'
        },
        {
          event: { type: 'token_invalid', ip_address: '1.1.1.1', user_agent: 'test', timestamp: new Date() },
          expectedLevel: 'MEDIUM'
        }
      ];

      for (const { event, expectedLevel } of events) {
        mockConsole.info.mockClear();
        mockConsole.warn.mockClear();
        mockConsole.error.mockClear();
        
        await logger.logSecurityEvent(event);
        
        const logCalls = [
          ...mockConsole.info.mock.calls,
          ...mockConsole.warn.mock.calls,
          ...mockConsole.error.mock.calls
        ];
        
        expect(logCalls.some(call => 
          call[0].includes(`[SECURITY:${expectedLevel}]`)
        )).toBe(true);
      }
    });

    it('should detect suspicious activity patterns', async () => {
      const logger = new SecurityLogger({ 
        logToFile: false,
        suspiciousActivityThresholds: {
          maxFailedAttemptsPerIP: 3,
          maxFailedAttemptsPerUser: 2,
          timeWindowMs: 60000,
          maxTokenInvalidationsPerIP: 5
        }
      });
      
      const baseEvent: SecurityEvent = {
        type: 'login_failure',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: { username: 'testuser' }
      };

      // Generate multiple failed login attempts
      for (let i = 0; i < 4; i++) {
        await logger.logSecurityEvent({
          ...baseEvent,
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      // The last event should be flagged as suspicious
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('suspicious_activity')
      );
    });

    it('should detect unusual user agents', async () => {
      const logger = new SecurityLogger({ logToFile: false });
      
      const suspiciousUserAgents = [
        'curl/7.68.0',
        'python-requests/2.25.1',
        'bot-scanner',
        '',
        'unknown'
      ];

      for (const userAgent of suspiciousUserAgents) {
        mockConsole.info.mockClear();
        mockConsole.warn.mockClear();
        
        const event: SecurityEvent = {
          type: 'login_attempt',
          ip_address: '192.168.1.1',
          user_agent: userAgent,
          timestamp: new Date()
        };

        await logger.logSecurityEvent(event);

        const logCalls = [
          ...mockConsole.info.mock.calls,
          ...mockConsole.warn.mock.calls
        ];
        
        expect(logCalls.some(call => 
          call[0].includes('Unusual user agent detected')
        )).toBe(true);
      }
    });

    it('should detect rapid successive attempts', async () => {
      const logger = new SecurityLogger({ logToFile: false });
      
      const baseTime = Date.now();
      const events: SecurityEvent[] = [
        {
          type: 'login_failure',
          ip_address: '192.168.1.200',
          user_agent: 'Mozilla/5.0',
          timestamp: new Date(baseTime)
        },
        {
          type: 'login_failure',
          ip_address: '192.168.1.200',
          user_agent: 'Mozilla/5.0',
          timestamp: new Date(baseTime + 5000) // 5 seconds later
        },
        {
          type: 'login_failure',
          ip_address: '192.168.1.200',
          user_agent: 'Mozilla/5.0',
          timestamp: new Date(baseTime + 10000) // 10 seconds later
        }
      ];

      for (const event of events) {
        await logger.logSecurityEvent(event);
      }

      // Should detect rapid successive attempts - check for suspicious_activity in the log
      const logCalls = [
        ...mockConsole.info.mock.calls,
        ...mockConsole.warn.mock.calls,
        ...mockConsole.error.mock.calls
      ];
      
      expect(logCalls.some(call => 
        call[0].includes('suspicious_activity') && call[0].includes('Rapid successive authentication attempts detected')
      )).toBe(true);
    });

    it('should track activity for suspicious IP detection', async () => {
      const logger = new SecurityLogger({
        logToFile: false,
        suspiciousActivityThresholds: {
          maxFailedAttemptsPerIP: 2,
          maxFailedAttemptsPerUser: 5,
          timeWindowMs: 60000,
          maxTokenInvalidationsPerIP: 10
        }
      });

      // Generate failed login attempts
      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.50',
        user_agent: 'test',
        timestamp: new Date()
      });

      expect(logger.isSuspiciousIP('192.168.1.50')).toBe(false);

      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.50',
        user_agent: 'test',
        timestamp: new Date()
      });

      expect(logger.isSuspiciousIP('192.168.1.50')).toBe(true);
    });

    it('should track activity for suspicious user detection', async () => {
      const logger = new SecurityLogger({
        logToFile: false,
        suspiciousActivityThresholds: {
          maxFailedAttemptsPerIP: 10,
          maxFailedAttemptsPerUser: 2,
          timeWindowMs: 60000,
          maxTokenInvalidationsPerIP: 10
        }
      });

      // Generate failed login attempts for user
      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date(),
        details: { username: 'suspicioususer' }
      });

      expect(logger.isSuspiciousUser('suspicioususer')).toBe(false);

      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.2',
        user_agent: 'test',
        timestamp: new Date(),
        details: { username: 'suspicioususer' }
      });

      expect(logger.isSuspiciousUser('suspicioususer')).toBe(true);
    });

    it('should provide security statistics', async () => {
      const logger = new SecurityLogger({ logToFile: false });

      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date(),
        details: { username: 'user1' }
      });

      await logger.logSecurityEvent({
        type: 'token_invalid',
        ip_address: '192.168.1.2',
        user_agent: 'test',
        timestamp: new Date()
      });

      const stats = logger.getSecurityStats();

      expect(stats.failedLoginsByIP).toHaveProperty('192.168.1.1', 1);
      expect(stats.failedLoginsByUser).toHaveProperty('user1', 1);
      expect(stats.tokenInvalidationsByIP).toHaveProperty('192.168.1.2', 1);
      expect(stats.lastCleanup).toBeInstanceOf(Date);
    });

    it('should handle file logging errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      const logger = new SecurityLogger({ 
        logToFile: true,
        logToConsole: false
      });

      const event: SecurityEvent = {
        type: 'login_attempt',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date()
      };

      // Should not throw error
      await expect(logger.logSecurityEvent(event)).resolves.not.toThrow();
      
      // Should log error to console
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[SECURITY_LOGGER_ERROR]',
        'Failed to write to log file:',
        expect.any(Error)
      );
    });

    it('should rotate logs when file size exceeds limit', async () => {
      const mockStats = {
        size: 11 * 1024 * 1024 // 11MB, exceeds 10MB limit
      };
      mockFs.stat.mockResolvedValue(mockStats);
      
      const logger = new SecurityLogger({ 
        logToFile: true,
        logToConsole: false,
        maxLogFileSize: 10 * 1024 * 1024
      });

      const event: SecurityEvent = {
        type: 'login_attempt',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date()
      };

      await logger.logSecurityEvent(event);

      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should clean up old log files', async () => {
      const mockFiles = [
        'security-2024-01-01.log',
        'security-2024-01-02.log',
        'security-2024-01-03.log',
        'security-2024-01-04.log',
        'security-2024-01-05.log',
        'security-2024-01-06.log' // 6 files, exceeds limit of 5
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockImplementation((filePath: string) => {
        const fileName = path.basename(filePath as string);
        const index = mockFiles.indexOf(fileName);
        return Promise.resolve({
          mtime: new Date(Date.now() - (mockFiles.length - index) * 24 * 60 * 60 * 1000)
        });
      });

      const logger = new SecurityLogger({ 
        logToFile: true,
        logToConsole: false,
        maxLogFiles: 5
      });

      // Trigger log rotation which should clean up old files
      const mockStatsLarge = { size: 11 * 1024 * 1024 };
      mockFs.stat.mockResolvedValueOnce(mockStatsLarge);

      const event: SecurityEvent = {
        type: 'login_attempt',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date()
      };

      await logger.logSecurityEvent(event);

      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('Singleton functions', () => {
    it('should return same instance from getSecurityLogger', () => {
      const logger1 = getSecurityLogger();
      const logger2 = getSecurityLogger();
      
      expect(logger1).toBe(logger2);
    });

    it('should log security event using convenience function', async () => {
      const event: SecurityEvent = {
        type: 'login_success',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date()
      };

      await logSecurityEvent(event);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('login_success')
      );
    });

    it('should check suspicious IP using convenience function', async () => {
      const logger = getSecurityLogger({
        suspiciousActivityThresholds: {
          maxFailedAttemptsPerIP: 1,
          maxFailedAttemptsPerUser: 5,
          timeWindowMs: 60000,
          maxTokenInvalidationsPerIP: 10
        }
      });

      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.100',
        user_agent: 'test',
        timestamp: new Date()
      });

      expect(isSuspiciousIP('192.168.1.100')).toBe(true);
      expect(isSuspiciousIP('192.168.1.200')).toBe(false);
    });

    it('should check suspicious user using convenience function', async () => {
      const logger = getSecurityLogger({
        suspiciousActivityThresholds: {
          maxFailedAttemptsPerIP: 10,
          maxFailedAttemptsPerUser: 1,
          timeWindowMs: 60000,
          maxTokenInvalidationsPerIP: 10
        }
      });

      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date(),
        details: { username: 'testuser' }
      });

      expect(isSuspiciousUser('testuser')).toBe(true);
      expect(isSuspiciousUser('otheruser')).toBe(false);
    });

    it('should get security stats using convenience function', async () => {
      await logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date(),
        details: { username: 'testuser' }
      });

      const stats = getSecurityStats();

      expect(stats).toHaveProperty('failedLoginsByIP');
      expect(stats).toHaveProperty('failedLoginsByUser');
      expect(stats).toHaveProperty('tokenInvalidationsByIP');
      expect(stats).toHaveProperty('lastCleanup');
    });
  });

  describe('Activity cleanup', () => {
    it('should clean up old activity data outside time window', async () => {
      const logger = new SecurityLogger({
        logToFile: false,
        suspiciousActivityThresholds: {
          maxFailedAttemptsPerIP: 10,
          maxFailedAttemptsPerUser: 10,
          timeWindowMs: 100, // Very short window for testing
          maxTokenInvalidationsPerIP: 10
        }
      });

      // Add activity with old timestamp
      await logger.logSecurityEvent({
        type: 'login_failure',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date(Date.now() - 200), // 200ms ago, outside the 100ms window
        details: { username: 'testuser' }
      });

      // Wait for time to pass beyond the window
      await new Promise(resolve => setTimeout(resolve, 150));

      // Manually trigger cleanup
      (logger as any).cleanupOldActivity();

      const stats = logger.getSecurityStats();
      expect(Object.keys(stats.failedLoginsByIP)).toHaveLength(0);
      expect(Object.keys(stats.failedLoginsByUser)).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should handle errors in logSecurityEvent gracefully', async () => {
      const logger = new SecurityLogger({ logToFile: false });
      
      // Mock console.log to throw an error
      mockConsole.info.mockImplementation(() => {
        throw new Error('Console error');
      });

      const event: SecurityEvent = {
        type: 'login_attempt',
        ip_address: '192.168.1.1',
        user_agent: 'test',
        timestamp: new Date()
      };

      // Should not throw error
      await expect(logger.logSecurityEvent(event)).resolves.not.toThrow();
      
      // Should log the error
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[SECURITY_LOGGER_ERROR]',
        'Failed to log security event:',
        expect.any(Error)
      );
    });

    it('should handle file system errors during cleanup', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));
      
      const logger = new SecurityLogger({ 
        logToFile: true,
        logToConsole: false
      });

      // Manually trigger cleanup
      await (logger as any).cleanupOldLogFiles();

      // Should handle error gracefully
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[SECURITY_LOGGER_ERROR]',
        'Failed to cleanup old log files:',
        expect.any(Error)
      );
    });
  });
});