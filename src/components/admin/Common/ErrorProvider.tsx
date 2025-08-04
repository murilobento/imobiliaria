'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useToast, ToastContainer } from './Toast';

interface ErrorContextType {
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const { 
    toasts, 
    removeToast, 
    showSuccess: toastSuccess, 
    showError: toastError, 
    showWarning: toastWarning, 
    showInfo: toastInfo 
  } = useToast();

  const showError = useCallback((title: string, message?: string) => {
    toastError(title, message);
  }, [toastError]);

  const showSuccess = useCallback((title: string, message?: string) => {
    toastSuccess(title, message);
  }, [toastSuccess]);

  const showWarning = useCallback((title: string, message?: string) => {
    toastWarning(title, message);
  }, [toastWarning]);

  const showInfo = useCallback((title: string, message?: string) => {
    toastInfo(title, message);
  }, [toastInfo]);

  const value: ErrorContextType = {
    showError,
    showSuccess,
    showWarning,
    showInfo
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
}