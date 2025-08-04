'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
  error?: string;
  onRetry?: () => void;
  showNetworkStatus?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  color = 'blue',
  text,
  fullScreen = false,
  error,
  onRetry,
  showNetworkStatus = false
}: LoadingSpinnerProps) {
  const networkStatus = useNetworkStatus();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  // Estado de erro
  if (error) {
    const errorContent = (
      <div className="flex flex-col items-center justify-center text-center">
        <AlertCircle className={`${sizeClasses[size]} text-red-500 mb-2`} />
        <p className="text-sm text-red-600 mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Tentar novamente
          </button>
        )}
      </div>
    );

    if (fullScreen) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
          {errorContent}
        </div>
      );
    }

    return errorContent;
  }

  // Estado de loading normal
  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      
      {text && (
        <p className={`mt-2 text-sm ${colorClasses[color]}`}>
          {text}
        </p>
      )}
      
      {/* Status da rede */}
      {showNetworkStatus && (
        <div className="mt-2 flex items-center text-xs text-gray-500">
          {networkStatus.isOnline ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              {networkStatus.isSlowConnection ? 'Conexão lenta' : 'Online'}
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Inline loading spinner for buttons
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-white`}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}