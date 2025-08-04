import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { useNetworkStatus, useNetworkAwareOperation } from '../useNetworkStatus';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
});
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
});

describe('useNetworkStatus Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('should initialize with current online status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should initialize as offline when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should add event listeners on mount', () => {
    renderHook(() => useNetworkStatus());

    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should update status when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Find and call the offline event handler
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];

      if (offlineHandler) {
        offlineHandler();
      }
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should update status when going back online', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Go offline first
    act(() => {
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];

      if (offlineHandler) {
        offlineHandler();
      }
    });

    // Then go back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const onlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];

      if (onlineHandler) {
        onlineHandler();
      }
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should detect slow connection when available', async () => {
    // Mock navigator.connection
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '2g',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      writable: true
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Simulate connection change
    act(() => {
      const connectionChangeHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      if (connectionChangeHandler) {
        connectionChangeHandler();
      }
    });

    expect(result.current.isSlowConnection).toBe(true);
    expect(result.current.effectiveType).toBe('2g');
  });
});

describe('useNetworkAwareOperation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('should execute operation when online', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useNetworkAwareOperation());

    const response = await result.current.executeIfOnline(mockOperation);

    expect(mockOperation).toHaveBeenCalled();
    expect(response).toBe('success');
  });

  it('should not execute operation when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useNetworkAwareOperation());

    const response = await result.current.executeIfOnline(mockOperation);

    expect(mockOperation).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it('should show custom offline message', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const mockOperation = vi.fn();
    const mockShowError = vi.fn();

    // Mock the error context
    vi.doMock('@/components/admin/Common/ErrorProvider', () => ({
      useErrorContext: () => ({
        showError: mockShowError
      })
    }));

    const { result } = renderHook(() => useNetworkAwareOperation());

    await result.current.executeIfOnline(mockOperation, {
      offlineMessage: 'Custom offline message'
    });

    expect(mockOperation).not.toHaveBeenCalled();
  });

  it('should handle operation errors', async () => {
    const mockError = new Error('Operation failed');
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useNetworkAwareOperation());

    await expect(result.current.executeIfOnline(mockOperation)).rejects.toThrow('Operation failed');
    expect(mockOperation).toHaveBeenCalled();
  });

  it('should return network status', () => {
    const { result } = renderHook(() => useNetworkAwareOperation());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should handle offline to online transition', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result, rerender } = renderHook(() => useNetworkAwareOperation());

    expect(result.current.isOnline).toBe(false);

    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Trigger re-render to update hook
    rerender();

    const mockOperation = vi.fn().mockResolvedValue('success');
    const response = await result.current.executeIfOnline(mockOperation);

    expect(mockOperation).toHaveBeenCalled();
    expect(response).toBe('success');
  });

  it('should handle retry after network recovery', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useNetworkAwareOperation());

    // First attempt while online
    await result.current.executeIfOnline(mockOperation);
    expect(mockOperation).toHaveBeenCalledTimes(1);

    // Second attempt
    await result.current.executeIfOnline(mockOperation);
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});