'use client';

import { lazy, Suspense } from 'react';
import LoadingSpinner from './Common/LoadingSpinner';

// Lazy load admin components for better performance
export const LazyImovelForm = lazy(() => import('./Forms/ImovelForm'));
export const LazyImageUpload = lazy(() => import('./Common/ImageUpload'));
export const LazyDataTable = lazy(() => import('./Common/DataTable'));
export const LazyModal = lazy(() => import('./Common/Modal'));
export const LazyConfirmDialog = lazy(() => import('./Common/ConfirmDialog'));

// Higher-order component for wrapping lazy components with suspense
export function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Pre-configured lazy components with loading states
export const ImovelFormLazy = withLazyLoading(LazyImovelForm);
export const ImageUploadLazy = withLazyLoading(LazyImageUpload);
export const DataTableLazy = withLazyLoading(LazyDataTable);
export const ModalLazy = withLazyLoading(LazyModal);
export const ConfirmDialogLazy = withLazyLoading(LazyConfirmDialog);

// Preload components for better UX
export const preloadAdminComponents = () => {
  // Preload commonly used components using dynamic imports
  import('./Forms/ImovelForm');
  import('./Common/DataTable');
  import('./Common/Modal');
};

// Component for preloading on route change
export function AdminComponentPreloader() {
  // Preload components when admin area is accessed
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadAdminComponents);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(preloadAdminComponents, 100);
    }
  }

  return null;
}