import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/query/queryClient';
import { clientesApi, imoveisApi, cidadesApi } from '@/lib/api/client';
import { Cliente } from '@/types/cliente';
import { Imovel } from '@/types/imovel';
import { Cidade } from '@/types/cidade';

// Clientes hooks
export function useClientes(filters: Record<string, any> = {}) {
    return useQuery({
        queryKey: queryKeys.clientes.list(filters),
        queryFn: async () => {
            const response = await clientesApi.getAll(filters);
            return response as { data: Cliente[]; pagination?: any };
        },
        select: (data) => data.data,
    });
}

export function useCliente(id: string) {
    return useQuery({
        queryKey: queryKeys.clientes.detail(id),
        queryFn: async () => {
            const response = await clientesApi.getById(id);
            return response as Cliente;
        },
        enabled: !!id,
    });
}

export function useCreateCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Cliente>) => {
            return await clientesApi.create(data);
        },
        onSuccess: () => {
            invalidateQueries.clientes();
        },
    });
}

export function useUpdateCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Cliente> }) => {
            return await clientesApi.update(id, data);
        },
        onSuccess: (_, { id }) => {
            invalidateQueries.clientes();
            invalidateQueries.clienteDetail(id);
        },
    });
}

export function useDeleteCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await clientesApi.delete(id);
        },
        onSuccess: () => {
            invalidateQueries.clientes();
        },
    });
}

// Imóveis hooks
export function useImoveis(filters: Record<string, any> = {}) {
    return useQuery({
        queryKey: queryKeys.imoveis.list(filters),
        queryFn: async () => {
            const response = await imoveisApi.getAll(filters);
            return response as { data: Imovel[]; pagination?: any };
        },
        select: (data) => data.data,
    });
}

export function useImovel(id: string) {
    return useQuery({
        queryKey: queryKeys.imoveis.detail(id),
        queryFn: async () => {
            const response = await imoveisApi.getById(id);
            return response as Imovel;
        },
        enabled: !!id,
    });
}

export function useCreateImovel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Imovel>) => {
            return await imoveisApi.create(data);
        },
        onSuccess: () => {
            invalidateQueries.imoveis();
            invalidateQueries.public();
        },
    });
}

export function useUpdateImovel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Imovel> }) => {
            return await imoveisApi.update(id, data);
        },
        onSuccess: (_, { id }) => {
            invalidateQueries.imoveis();
            invalidateQueries.imovelDetail(id);
            invalidateQueries.public();
        },
    });
}

export function useDeleteImovel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await imoveisApi.delete(id);
        },
        onSuccess: () => {
            invalidateQueries.imoveis();
            invalidateQueries.public();
        },
    });
}

export function useUploadImovelImages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            imovelId,
            files,
            onProgress
        }: {
            imovelId: string;
            files: File[];
            onProgress?: (progress: number) => void;
        }) => {
            return await imoveisApi.uploadImages(imovelId, files, onProgress);
        },
        onSuccess: (_, { imovelId }) => {
            invalidateQueries.imovelDetail(imovelId);
            queryClient.invalidateQueries({ queryKey: queryKeys.imoveis.images(imovelId) });
        },
    });
}

// Cidades hooks
export function useCidades(filters: Record<string, any> = {}) {
    return useQuery({
        queryKey: queryKeys.cidades.list(filters),
        queryFn: async () => {
            const response = await cidadesApi.getAll();
            return response as { cidades: Cidade[] };
        },
        select: (data) => data.cidades,
    });
}

export function useCidade(id: string) {
    return useQuery({
        queryKey: queryKeys.cidades.detail(id),
        queryFn: async () => {
            const response = await cidadesApi.getById(id);
            return response as Cidade;
        },
        enabled: !!id,
    });
}

export function useCreateCidade() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Cidade>) => {
            return await cidadesApi.create(data);
        },
        onSuccess: () => {
            invalidateQueries.cidades();
            invalidateQueries.public();
        },
    });
}

export function useUpdateCidade() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Cidade> }) => {
            return await cidadesApi.update(id, data);
        },
        onSuccess: (_, { id }) => {
            invalidateQueries.cidades();
            invalidateQueries.cidadeDetail(id);
            invalidateQueries.public();
        },
    });
}

export function useDeleteCidade() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await cidadesApi.delete(id);
        },
        onSuccess: () => {
            invalidateQueries.cidades();
            invalidateQueries.public();
        },
    });
}

// Public API hooks (for the main site)
export function usePublicImoveis(filters: Record<string, any> = {}) {
    return useQuery({
        queryKey: queryKeys.public.imoveis(),
        queryFn: async () => {
            const response = await fetch(`/api/public/imoveis?${new URLSearchParams(filters)}`);
            return response.json();
        },
        staleTime: 2 * 60 * 1000, // 2 minutes for public data
    });
}

export function usePublicImoveisDestaque() {
    return useQuery({
        queryKey: queryKeys.public.imoveisDestaque(),
        queryFn: async () => {
            const response = await fetch('/api/public/imoveis/destaque');
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes for featured properties
    });
}

export function usePublicCidades() {
    return useQuery({
        queryKey: queryKeys.public.cidades(),
        queryFn: async () => {
            const response = await fetch('/api/public/cidades');
            return response.json();
        },
        staleTime: 10 * 60 * 1000, // 10 minutes for cities (rarely change)
    });
}

// Optimistic updates helper
export function useOptimisticUpdate<T>(
    queryKey: readonly unknown[],
    updateFn: (oldData: T | undefined, newData: any) => T
) {
    const queryClient = useQueryClient();

    return {
        optimisticUpdate: (newData: any) => {
            queryClient.setQueryData(queryKey, (oldData: T | undefined) =>
                updateFn(oldData, newData)
            );
        },
        rollback: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    };
}

// Infinite query for large datasets
export function useInfiniteImoveis(filters: Record<string, any> = {}) {
    return useQuery({
        queryKey: [...queryKeys.imoveis.list(filters), 'infinite'],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await imoveisApi.getAll({ ...filters, page: pageParam });
            return response as { data: Imovel[]; pagination: any };
        },
        // getNextPageParam: (lastPage) => {
        //   const { pagination } = lastPage;
        //   return pagination.hasNextPage ? pagination.page + 1 : undefined;
        // },
        select: (data) => data.data,
    });
}