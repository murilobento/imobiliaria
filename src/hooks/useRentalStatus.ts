import { useState, useEffect } from 'react';
import { IntegracaoService, ImovelStatusAluguel, ClienteContratosAtivos } from '@/lib/services/integracaoService';

// Hook para buscar status de aluguel de um imóvel
export function useImovelRentalStatus(imovelId: string | undefined) {
  const [status, setStatus] = useState<ImovelStatusAluguel>({ alugado: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imovelId) {
      setStatus({ alugado: false });
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const rentalStatus = await IntegracaoService.getImovelStatusAluguel(imovelId);
        setStatus(rentalStatus);
      } catch (err) {
        console.error('Erro ao buscar status de aluguel:', err);
        setError('Erro ao carregar status de aluguel');
        setStatus({ alugado: false });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [imovelId]);

  return { status, loading, error, refetch: () => {
    if (imovelId) {
      const fetchStatus = async () => {
        try {
          setLoading(true);
          setError(null);
          const rentalStatus = await IntegracaoService.getImovelStatusAluguel(imovelId);
          setStatus(rentalStatus);
        } catch (err) {
          console.error('Erro ao buscar status de aluguel:', err);
          setError('Erro ao carregar status de aluguel');
          setStatus({ alugado: false });
        } finally {
          setLoading(false);
        }
      };
      fetchStatus();
    }
  }};
}

// Hook para buscar status de aluguel de múltiplos imóveis
export function useImoveisRentalStatus(imovelIds: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, ImovelStatusAluguel>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (imovelIds.length === 0) {
      setStatusMap({});
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const statusData = await IntegracaoService.getImoveisStatusAluguel(imovelIds);
        setStatusMap(statusData);
      } catch (err) {
        console.error('Erro ao buscar status de aluguel dos imóveis:', err);
        setError('Erro ao carregar status de aluguel');
        // Inicializar todos como não alugados em caso de erro
        const emptyStatusMap: Record<string, ImovelStatusAluguel> = {};
        imovelIds.forEach(id => {
          emptyStatusMap[id] = { alugado: false };
        });
        setStatusMap(emptyStatusMap);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [imovelIds.join(',')]); // Usar join para comparação de array

  return { statusMap, loading, error };
}

// Hook para buscar contratos ativos de um cliente
export function useClienteActiveContracts(clienteId: string | undefined) {
  const [contratos, setContratos] = useState<ClienteContratosAtivos>({
    contratos: [],
    total_contratos: 0,
    valor_total_mensal: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) {
      setContratos({
        contratos: [],
        total_contratos: 0,
        valor_total_mensal: 0
      });
      return;
    }

    const fetchContratos = async () => {
      try {
        setLoading(true);
        setError(null);
        const clienteContratos = await IntegracaoService.getClienteContratosAtivos(clienteId);
        setContratos(clienteContratos);
      } catch (err) {
        console.error('Erro ao buscar contratos ativos do cliente:', err);
        setError('Erro ao carregar contratos ativos');
        setContratos({
          contratos: [],
          total_contratos: 0,
          valor_total_mensal: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContratos();
  }, [clienteId]);

  return { contratos, loading, error, refetch: () => {
    if (clienteId) {
      const fetchContratos = async () => {
        try {
          setLoading(true);
          setError(null);
          const clienteContratos = await IntegracaoService.getClienteContratosAtivos(clienteId);
          setContratos(clienteContratos);
        } catch (err) {
          console.error('Erro ao buscar contratos ativos do cliente:', err);
          setError('Erro ao carregar contratos ativos');
          setContratos({
            contratos: [],
            total_contratos: 0,
            valor_total_mensal: 0
          });
        } finally {
          setLoading(false);
        }
      };
      fetchContratos();
    }
  }};
}