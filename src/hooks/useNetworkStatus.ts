import { useState, useEffect, useCallback } from 'react';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType?: string;
  effectiveType?: string;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false
  });

  const { showWarning, showInfo } = useErrorContext();

  const updateNetworkStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    let isSlowConnection = false;
    let connectionType: string | undefined;
    let effectiveType: string | undefined;

    // Verificar tipo de conexão se disponível
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connectionType = connection?.type;
      effectiveType = connection?.effectiveType;
      
      // Considerar conexão lenta se for 2g ou slow-2g
      isSlowConnection = effectiveType === '2g' || effectiveType === 'slow-2g';
    }

    setNetworkStatus({
      isOnline,
      isSlowConnection,
      connectionType,
      effectiveType
    });
  }, []);

  const handleOnline = useCallback(() => {
    updateNetworkStatus();
    showInfo('Conexão restaurada', 'Você está online novamente');
  }, [updateNetworkStatus, showInfo]);

  const handleOffline = useCallback(() => {
    updateNetworkStatus();
    showWarning('Sem conexão', 'Você está offline. Algumas funcionalidades podem não funcionar');
  }, [updateNetworkStatus, showWarning]);

  const handleConnectionChange = useCallback(() => {
    const wasSlowConnection = networkStatus.isSlowConnection;
    updateNetworkStatus();
    
    // Notificar sobre mudanças na velocidade da conexão
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const isNowSlow = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
      
      if (!wasSlowConnection && isNowSlow) {
        showWarning('Conexão lenta', 'Sua conexão está lenta. As operações podem demorar mais');
      } else if (wasSlowConnection && !isNowSlow) {
        showInfo('Conexão melhorou', 'Sua conexão está mais rápida agora');
      }
    }
  }, [networkStatus.isSlowConnection, updateNetworkStatus, showWarning, showInfo]);

  useEffect(() => {
    // Atualizar status inicial
    updateNetworkStatus();

    // Adicionar listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listener para mudanças na conexão (se suportado)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, updateNetworkStatus]);

  return networkStatus;
}

// Hook para operações que dependem da rede
export function useNetworkAwareOperation() {
  const networkStatus = useNetworkStatus();
  const { showWarning } = useErrorContext();

  const executeIfOnline = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      showOfflineWarning?: boolean;
      offlineMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const { 
      showOfflineWarning = true, 
      offlineMessage = 'Esta operação requer conexão com a internet' 
    } = options;

    if (!networkStatus.isOnline) {
      if (showOfflineWarning) {
        showWarning('Sem conexão', offlineMessage);
      }
      return null;
    }

    if (networkStatus.isSlowConnection) {
      showWarning('Conexão lenta', 'Esta operação pode demorar devido à conexão lenta');
    }

    try {
      return await operation();
    } catch (error) {
      // Se o erro é de rede e agora estamos offline, mostrar mensagem específica
      if (!navigator.onLine) {
        showWarning('Conexão perdida', 'A conexão foi perdida durante a operação');
      }
      throw error;
    }
  }, [networkStatus, showWarning]);

  return {
    ...networkStatus,
    executeIfOnline
  };
}