import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle, performanceMonitor } from '@/lib/utils/performance';

// Hook for optimized search functionality
export function useOptimizedSearch<T>(
  data: T[],
  searchFields: (keyof T)[],
  delay: number = 300
) {
  const searchRef = useRef<string>('');
  
  const debouncedSearch = useCallback(
    debounce((searchTerm: string, callback: (results: T[]) => void) => {
      performanceMonitor.startTimer('search_operation');
      
      if (!searchTerm.trim()) {
        callback(data);
        performanceMonitor.endTimer('search_operation');
        return;
      }

      const filtered = data.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && 
            String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
      
      callback(filtered);
      performanceMonitor.endTimer('search_operation');
    }, delay),
    [data, searchFields, delay]
  );

  return {
    search: debouncedSearch,
    currentSearch: searchRef.current,
    setCurrentSearch: (term: string) => {
      searchRef.current = term;
    }
  };
}

// Hook for optimized pagination
export function useOptimizedPagination<T>(
  data: T[],
  itemsPerPage: number = 10
) {
  const paginatedData = useMemo(() => {
    performanceMonitor.startTimer('pagination_calculation');
    
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const pages: T[][] = [];
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * itemsPerPage;
      const end = start + itemsPerPage;
      pages.push(data.slice(start, end));
    }
    
    performanceMonitor.endTimer('pagination_calculation');
    
    return {
      pages,
      totalPages,
      totalItems: data.length
    };
  }, [data, itemsPerPage]);

  return paginatedData;
}

// Hook for optimized sorting
export function useOptimizedSorting<T>(
  data: T[],
  defaultSortKey?: keyof T,
  defaultSortDirection: 'asc' | 'desc' = 'asc'
) {
  const sortedData = useMemo(() => {
    if (!defaultSortKey) return data;
    
    performanceMonitor.startTimer('sorting_operation');
    
    const sorted = [...data].sort((a, b) => {
      const aValue = a[defaultSortKey];
      const bValue = b[defaultSortKey];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return defaultSortDirection === 'asc' ? comparison : -comparison;
    });
    
    performanceMonitor.endTimer('sorting_operation');
    
    return sorted;
  }, [data, defaultSortKey, defaultSortDirection]);

  const sort = useCallback((
    key: keyof T,
    direction: 'asc' | 'desc' = 'asc'
  ) => {
    performanceMonitor.startTimer('manual_sort');
    
    const sorted = [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });
    
    performanceMonitor.endTimer('manual_sort');
    
    return sorted;
  }, [data]);

  return {
    sortedData,
    sort
  };
}

// Hook for optimized image loading
export function useOptimizedImageLoading() {
  const loadedImages = useRef<Set<string>>(new Set());
  const loadingImages = useRef<Set<string>>(new Set());

  const preloadImage = useCallback((src: string): Promise<void> => {
    if (loadedImages.current.has(src)) {
      return Promise.resolve();
    }

    if (loadingImages.current.has(src)) {
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (loadedImages.current.has(src)) {
            resolve();
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }

    loadingImages.current.add(src);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        loadedImages.current.add(src);
        loadingImages.current.delete(src);
        resolve();
      };
      
      img.onerror = () => {
        loadingImages.current.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback((sources: string[]) => {
    return Promise.allSettled(sources.map(preloadImage));
  }, [preloadImage]);

  return {
    preloadImage,
    preloadImages,
    isLoaded: (src: string) => loadedImages.current.has(src),
    isLoading: (src: string) => loadingImages.current.has(src)
  };
}

// Hook for optimized scroll handling
export function useOptimizedScroll(
  callback: (scrollY: number) => void,
  throttleMs: number = 16
) {
  const throttledCallback = useCallback(
    throttle((scrollY: number) => {
      performanceMonitor.recordMetric({
        name: 'scroll_position',
        value: scrollY,
        timestamp: Date.now(),
        type: 'gauge'
      });
      callback(scrollY);
    }, throttleMs),
    [callback, throttleMs]
  );

  useEffect(() => {
    const handleScroll = () => {
      throttledCallback(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [throttledCallback]);
}

// Hook for optimized resize handling
export function useOptimizedResize(
  callback: (width: number, height: number) => void,
  debounceMs: number = 250
) {
  const debouncedCallback = useCallback(
    debounce((width: number, height: number) => {
      performanceMonitor.recordMetric({
        name: 'viewport_width',
        value: width,
        timestamp: Date.now(),
        type: 'gauge'
      });
      callback(width, height);
    }, debounceMs),
    [callback, debounceMs]
  );

  useEffect(() => {
    const handleResize = () => {
      debouncedCallback(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    
    // Call once on mount
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [debouncedCallback]);
}

// Hook for virtual scrolling (for large lists)
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const visibleItems = useMemo(() => {
    performanceMonitor.startTimer('virtual_scroll_calculation');
    
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalItems = items.length;
    
    // Calculate which items should be visible
    const startIndex = Math.max(0, Math.floor(window.scrollY / itemHeight) - overscan);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);
    
    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
    
    performanceMonitor.endTimer('virtual_scroll_calculation');
    
    return {
      items: visibleItems,
      totalHeight: totalItems * itemHeight,
      startIndex,
      endIndex
    };
  }, [items, itemHeight, containerHeight, overscan]);

  return visibleItems;
}

// Hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  useEffect(() => {
    performanceMonitor.startTimer(`${componentName}_mount`);
    
    return () => {
      performanceMonitor.endTimer(`${componentName}_mount`);
    };
  }, [componentName]);

  const trackOperation = useCallback((operationName: string, operation: () => void) => {
    performanceMonitor.startTimer(`${componentName}_${operationName}`);
    operation();
    performanceMonitor.endTimer(`${componentName}_${operationName}`);
  }, [componentName]);

  const trackAsyncOperation = useCallback(async (
    operationName: string, 
    operation: () => Promise<any>
  ) => {
    performanceMonitor.startTimer(`${componentName}_${operationName}`);
    try {
      const result = await operation();
      performanceMonitor.endTimer(`${componentName}_${operationName}`);
      return result;
    } catch (error) {
      performanceMonitor.endTimer(`${componentName}_${operationName}`);
      performanceMonitor.recordMetric({
        name: `${componentName}_${operationName}_error`,
        value: 1,
        timestamp: Date.now(),
        type: 'counter'
      });
      throw error;
    }
  }, [componentName]);

  return {
    trackOperation,
    trackAsyncOperation,
    getMetrics: () => performanceMonitor.getMetrics(componentName),
    getAverageTime: (operationName: string) => 
      performanceMonitor.getAverageTime(`${componentName}_${operationName}`)
  };
}