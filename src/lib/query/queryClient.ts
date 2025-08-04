import { QueryClient } from '@tanstack/react-query'

// Configuração centralizada do QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

// Definição das chaves de query
export const queryKeys = {
  clientes: {
    all: ['clientes'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.clientes.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.clientes.all, 'detail', id] as const,
  },
  imoveis: {
    all: ['imoveis'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.imoveis.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.imoveis.all, 'detail', id] as const,
    images: (imovelId: string) => [...queryKeys.imoveis.all, 'images', imovelId] as const,
  },
  cidades: {
    all: ['cidades'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.cidades.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.cidades.all, 'detail', id] as const,
  },
  public: {
    imoveis: () => ['public', 'imoveis'] as const,
    imoveisDestaque: () => ['public', 'imoveis', 'destaque'] as const,
    cidades: () => ['public', 'cidades'] as const,
  }
}

// Funções para invalidar queries
export const invalidateQueries = {
  clientes: () => queryClient.invalidateQueries({ queryKey: queryKeys.clientes.all }),
  clienteDetail: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.clientes.detail(id) }),
  imoveis: () => queryClient.invalidateQueries({ queryKey: queryKeys.imoveis.all }),
  imovelDetail: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.imoveis.detail(id) }),
  cidades: () => queryClient.invalidateQueries({ queryKey: queryKeys.cidades.all }),
  cidadeDetail: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.cidades.detail(id) }),
  public: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.public.imoveis() })
    queryClient.invalidateQueries({ queryKey: queryKeys.public.imoveisDestaque() })
    queryClient.invalidateQueries({ queryKey: queryKeys.public.cidades() })
  }
}