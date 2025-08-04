'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Filter, Star, Home, MapPin, User, DollarSign } from 'lucide-react';
import Link from 'next/link';
import DataTable, { Column, PaginationConfig } from '@/components/admin/Common/DataTable';
import Modal from '@/components/admin/Common/Modal';
import ConfirmDialog from '@/components/admin/Common/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/admin/Common/Toast';
import { Imovel, ImovelTipo, ImovelFinalidade } from '@/types/imovel';
import { Cidade } from '@/types/cidade';
import { getImoveis, deleteImovel, createImovel, updateImovel, ImovelFilters } from '@/lib/api/imoveis';
import { fetchCidades } from '@/lib/api/cidades';
import { fetchClientes } from '@/lib/api/clientes';
import { Cliente } from '@/types/cliente';
import SimpleImageUpload from '@/components/admin/Common/SimpleImageUpload';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { PageErrorBoundary } from '@/components/admin/Common/ErrorBoundary';
import StatusAluguel from '@/components/admin/Common/StatusAluguel';
import { useImoveisRentalStatus } from '@/hooks/useRentalStatus';

// Form data interface
interface ImovelFormData {
  nome: string;
  tipo: ImovelTipo;
  finalidade: ImovelFinalidade;
  valor_venda?: string;
  valor_aluguel?: string;
  descricao: string;
  quartos: number;
  banheiros: number;
  area_total?: string;
  caracteristicas: string[];
  comodidades: string[];
  endereco_completo: string;
  cidade_id: string;
  bairro: string;
  destaque: boolean;
  cliente_id: string;
  ativo: boolean;
}

export default function ImoveisPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | null>(null);
  const [deletingImovel, setDeletingImovel] = useState<Imovel | null>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ImovelFormData>({
    nome: '',
    tipo: 'Casa',
    finalidade: 'venda',
    valor_venda: '',
    valor_aluguel: '',
    descricao: '',
    quartos: 0,
    banheiros: 0,
    area_total: '',
    caracteristicas: [],
    comodidades: [],
    endereco_completo: '',
    cidade_id: '',
    bairro: '',
    destaque: false,
    cliente_id: '',
    ativo: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { toasts, removeToast, showSuccess, showError } = useToast();

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  // Filter state
  const [filters, setFilters] = useState<ImovelFilters>({
    ativo: true
  });

  // Rental status hook
  const imovelIds = imoveis.map(imovel => imovel.id!).filter(Boolean);
  const { statusMap: rentalStatusMap } = useImoveisRentalStatus(imovelIds);

  // Load data
  useEffect(() => {
    loadImoveis();
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    loadCidades();
    loadClientes();
  }, []);

  const loadImoveis = async () => {
    try {
      setLoading(true);
      const response = await getImoveis(filters, {
        page: pagination.page,
        limit: pagination.pageSize
      });

      setImoveis(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));
    } catch (error) {
      console.error('Erro ao carregar imóveis:', error);
      showError('Erro ao carregar imóveis');
    } finally {
      setLoading(false);
    }
  };

  const loadCidades = async () => {
    try {
      const cidades = await fetchCidades();
      setCidades(cidades);
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
    }
  };

  const loadClientes = async () => {
    try {
      const clientes = await fetchClientes();
      setClientes(clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const handleCreate = () => {
    setEditingImovel(null);
    setFormData({
      nome: '',
      tipo: 'Casa',
      finalidade: 'venda',
      valor_venda: '',
      valor_aluguel: '',
      descricao: '',
      quartos: 0,
      banheiros: 0,
      area_total: '',
      caracteristicas: [],
      comodidades: [],
      endereco_completo: '',
      cidade_id: '',
      bairro: '',
      destaque: false,
      cliente_id: '',
      ativo: true
    });
    setExistingImages([]);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (imovel: Imovel) => {
    setEditingImovel(imovel);
    setFormData({
      nome: imovel.nome,
      tipo: imovel.tipo,
      finalidade: imovel.finalidade,
      valor_venda: imovel.valor_venda?.toString() || '',
      valor_aluguel: imovel.valor_aluguel?.toString() || '',
      descricao: imovel.descricao || '',
      quartos: imovel.quartos,
      banheiros: imovel.banheiros,
      area_total: imovel.area_total?.toString() || '',
      caracteristicas: imovel.caracteristicas || [],
      comodidades: imovel.comodidades || [],
      endereco_completo: imovel.endereco_completo || '',
      cidade_id: imovel.cidade_id || '',
      bairro: imovel.bairro || '',
      destaque: imovel.destaque,
      cliente_id: imovel.cliente_id || '',
      ativo: imovel.ativo
    });

    // Carregar imagens existentes
    if (imovel.imagens) {
      const convertedImages = imovel.imagens.map(img => ({
        id: img.id!,
        url: img.url,
        url_thumb: img.url_thumb,
        ordem: img.ordem,
        tipo: img.tipo
      }));
      setExistingImages(convertedImages);
    } else {
      setExistingImages([]);
    }

    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (imovel: Imovel) => {
    setDeletingImovel(imovel);
    setIsConfirmDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validação do nome
    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 5) {
      errors.nome = 'Nome deve ter pelo menos 5 caracteres';
    } else if (formData.nome.trim().length > 255) {
      errors.nome = 'Nome deve ter no máximo 255 caracteres';
    }

    // Validação da cidade
    if (!formData.cidade_id) {
      errors.cidade_id = 'Cidade é obrigatória';
    }

    // Validação do cliente
    if (!formData.cliente_id) {
      errors.cliente_id = 'Cliente é obrigatório';
    }

    // Validação dos valores baseada na finalidade
    if (formData.finalidade === 'venda' && !formData.valor_venda) {
      errors.valor_venda = 'Valor de venda é obrigatório';
    } else if (formData.valor_venda && parseFloat(formData.valor_venda) < 0) {
      errors.valor_venda = 'Valor de venda deve ser maior que zero';
    }

    if (formData.finalidade === 'aluguel' && !formData.valor_aluguel) {
      errors.valor_aluguel = 'Valor de aluguel é obrigatório';
    } else if (formData.valor_aluguel && parseFloat(formData.valor_aluguel) < 0) {
      errors.valor_aluguel = 'Valor de aluguel deve ser maior que zero';
    }

    if (formData.finalidade === 'ambos') {
      if (!formData.valor_venda) {
        errors.valor_venda = 'Valor de venda é obrigatório';
      } else if (parseFloat(formData.valor_venda) < 0) {
        errors.valor_venda = 'Valor de venda deve ser maior que zero';
      }
      if (!formData.valor_aluguel) {
        errors.valor_aluguel = 'Valor de aluguel é obrigatório';
      } else if (parseFloat(formData.valor_aluguel) < 0) {
        errors.valor_aluguel = 'Valor de aluguel deve ser maior que zero';
      }
    }

    // Validação de quartos e banheiros
    if (formData.quartos < 0) {
      errors.quartos = 'Número de quartos deve ser maior ou igual a 0';
    } else if (formData.quartos > 20) {
      errors.quartos = 'Número de quartos deve ser menor ou igual a 20';
    }

    if (formData.banheiros < 0) {
      errors.banheiros = 'Número de banheiros deve ser maior ou igual a 0';
    } else if (formData.banheiros > 20) {
      errors.banheiros = 'Número de banheiros deve ser menor ou igual a 20';
    }

    // Validação da área total
    if (formData.area_total && parseFloat(formData.area_total) < 1) {
      errors.area_total = 'Área total deve ser maior que 0';
    }

    // Validação da descrição
    if (formData.descricao && formData.descricao.trim().length > 2000) {
      errors.descricao = 'Descrição deve ter no máximo 2000 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setFormLoading(true);

      const submitData = {
        ...formData,
        valor_venda: formData.valor_venda ? parseFloat(formData.valor_venda) : undefined,
        valor_aluguel: formData.valor_aluguel ? parseFloat(formData.valor_aluguel) : undefined,
        area_total: formData.area_total ? parseFloat(formData.area_total) : undefined,
      };

      if (editingImovel) {
        await updateImovel(editingImovel.id!, submitData);
        showSuccess('Imóvel atualizado com sucesso');
      } else {
        await createImovel(submitData);
        showSuccess('Imóvel criado com sucesso');
      }

      setIsModalOpen(false);
      loadImoveis();
    } catch (error) {
      console.error('Erro ao salvar imóvel:', error);
      showError('Erro ao salvar imóvel');
    } finally {
      setFormLoading(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (!editingImovel?.id) {
      showError('Erro', 'Salve o imóvel primeiro antes de adicionar imagens');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('imovelId', editingImovel.id);
      
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/imoveis/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess('Imagens enviadas com sucesso');
        // Recarregar dados do imóvel para atualizar as imagens
        loadImoveis();
      } else {
        showError('Erro ao enviar imagens', result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      showError('Erro ao enviar imagens', 'Verifique sua conexão com a internet');
    }
  };



  const handleConfirmDelete = async () => {
    if (!deletingImovel) return;

    try {
      await deleteImovel(deletingImovel.id!);
      showSuccess('Imóvel excluído com sucesso');
      setIsConfirmDialogOpen(false);
      setDeletingImovel(null);
      loadImoveis();
    } catch (error) {
      console.error('Erro ao excluir imóvel:', error);
      showError('Erro ao excluir imóvel');
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const handleFilterChange = (key: keyof ImovelFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ ativo: true });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatFinalidade = (finalidade: ImovelFinalidade) => {
    const labels = {
      venda: 'Venda',
      aluguel: 'Aluguel',
      ambos: 'Venda/Aluguel'
    };
    return labels[finalidade] || finalidade;
  };

  const renderImagePreview = (imovel: Imovel) => {
    if (!imovel.imagens || imovel.imagens.length === 0) {
      return (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
          <Home className="w-4 h-4 text-gray-400" />
        </div>
      );
    }

    return (
      <Image
        src={imovel.imagens[0].url}
        alt={imovel.nome}
        width={48}
        height={48}
        className="w-12 h-12 object-cover rounded"
      />
    );
  };

  const columns: Column<Imovel>[] = [
    {
      key: 'imagens',
      title: 'Imagem',
      width: '80px',
      render: (value: any, imovel: Imovel) => renderImagePreview(imovel)
    },
    {
      key: 'nome',
      title: 'Nome',
      sortable: true,
      searchable: true,
      width: '25%',
      render: (value: string, imovel: Imovel) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500 flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            {imovel.bairro && `${imovel.bairro}, `}{imovel.cidade?.nome}
          </div>
        </div>
      )
    },
    {
      key: 'tipo',
      title: 'Tipo',
      sortable: true,
      width: '10%',
      render: (value: ImovelTipo) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    {
      key: 'finalidade',
      title: 'Finalidade',
      sortable: true,
      width: '12%',
      render: (value: ImovelFinalidade) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          {formatFinalidade(value)}
        </span>
      )
    },
    {
      key: 'valor_venda',
      title: 'Valor',
      sortable: true,
      width: '15%',
      render: (value: number, imovel: Imovel) => {
        if (imovel.finalidade === 'venda' && imovel.valor_venda) {
          return <span className="font-semibold text-green-600">{formatCurrency(imovel.valor_venda)}</span>;
        }
        if (imovel.finalidade === 'aluguel' && imovel.valor_aluguel) {
          return <span className="font-semibold text-blue-600">{formatCurrency(imovel.valor_aluguel)}/mês</span>;
        }
        if (imovel.finalidade === 'ambos') {
          return (
            <div className="text-xs">
              <div className="text-green-600">{formatCurrency(imovel.valor_venda)}</div>
              <div className="text-blue-600">{formatCurrency(imovel.valor_aluguel)}/mês</div>
            </div>
          );
        }
        return <span className="text-gray-500">Consulte</span>;
      }
    },
    {
      key: 'quartos',
      title: 'Quartos',
      sortable: true,
      width: '8%',
      render: (value: number) => (
        <div className="flex items-center">
          <Home className="w-4 h-4 mr-1 text-gray-400" />
          {value}
        </div>
      )
    },
    {
      key: 'destaque',
      title: 'Destaque',
      sortable: true,
      width: '8%',
      render: (value: boolean) => (
        value ? (
          <Star className="w-5 h-5 text-yellow-500 fill-current" />
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      key: 'rental_status',
      title: 'Aluguel',
      width: '10%',
      render: (value: any, imovel: Imovel) => {
        if (!imovel.id || (imovel.finalidade !== 'aluguel' && imovel.finalidade !== 'ambos')) {
          return <span className="text-gray-400 text-xs">N/A</span>;
        }
        const status = rentalStatusMap[imovel.id];
        return status ? <StatusAluguel status={status} /> : <span className="text-gray-400 text-xs">Carregando...</span>;
      }
    },
    {
      key: 'ativo',
      title: 'Status',
      sortable: true,
      width: '8%',
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  return (
    <PageErrorBoundary pageName="Imóveis">
      <PermissionGuard permission="properties.view">
        <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Imóveis</h1>
            <p className="text-gray-600">{pagination.total} {pagination.total === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/financeiro"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Sistema Financeiro
            </Link>
            <button
              onClick={() => setShowFiltersModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Imóvel
            </button>
          </div>
        </div>
      </div>

      <DataTable
        data={imoveis}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable={false}
        emptyMessage="Nenhum imóvel cadastrado"
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingImovel ? 'Editar Imóvel' : 'Novo Imóvel'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Imóvel *
              </label>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.nome ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite o nome do imóvel"
                disabled={formLoading}
              />
              {formErrors.nome && (
                <p className="mt-1 text-sm text-red-600">{formErrors.nome}</p>
              )}
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as ImovelTipo })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={formLoading}
              >
                <option value="Casa">Casa</option>
                <option value="Apartamento">Apartamento</option>
                <option value="Chácara">Chácara</option>
                <option value="Fazenda">Fazenda</option>
                <option value="Sítio">Sítio</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div>
              <label htmlFor="finalidade" className="block text-sm font-medium text-gray-700 mb-1">
                Finalidade *
              </label>
              <select
                id="finalidade"
                value={formData.finalidade}
                onChange={(e) => setFormData({ ...formData, finalidade: e.target.value as ImovelFinalidade })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={formLoading}
              >
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
                <option value="ambos">Venda/Aluguel</option>
              </select>
            </div>

            <div>
              <label htmlFor="cidade_id" className="block text-sm font-medium text-gray-700 mb-1">
                Cidade *
              </label>
              <select
                id="cidade_id"
                value={formData.cidade_id}
                onChange={(e) => setFormData({ ...formData, cidade_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.cidade_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={formLoading}
              >
                <option value="">Selecione uma cidade</option>
                {cidades.map((cidade) => (
                  <option key={cidade.id} value={cidade.id}>
                    {cidade.nome}
                  </option>
                ))}
              </select>
              {formErrors.cidade_id && (
                <p className="mt-1 text-sm text-red-600">{formErrors.cidade_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="cliente_id" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <select
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.cliente_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={formLoading}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="mt-1 text-sm text-red-600">{formErrors.cliente_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <input
                type="text"
                id="bairro"
                value={formData.bairro}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o bairro"
                disabled={formLoading}
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.finalidade === 'venda' || formData.finalidade === 'ambos') && (
              <div>
                <label htmlFor="valor_venda" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor de Venda {formData.finalidade === 'venda' || formData.finalidade === 'ambos' ? '*' : ''}
                </label>
                <input
                  type="number"
                  id="valor_venda"
                  value={formData.valor_venda}
                  onChange={(e) => setFormData({ ...formData, valor_venda: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.valor_venda ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  disabled={formLoading}
                />
                {formErrors.valor_venda && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.valor_venda}</p>
                )}
              </div>
            )}

            {(formData.finalidade === 'aluguel' || formData.finalidade === 'ambos') && (
              <div>
                <label htmlFor="valor_aluguel" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor de Aluguel {formData.finalidade === 'aluguel' || formData.finalidade === 'ambos' ? '*' : ''}
                </label>
                <input
                  type="number"
                  id="valor_aluguel"
                  value={formData.valor_aluguel}
                  onChange={(e) => setFormData({ ...formData, valor_aluguel: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.valor_aluguel ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  disabled={formLoading}
                />
                {formErrors.valor_aluguel && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.valor_aluguel}</p>
                )}
              </div>
            )}
          </div>

          {/* Características */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quartos" className="block text-sm font-medium text-gray-700 mb-1">
                Quartos
              </label>
              <input
                type="number"
                id="quartos"
                value={formData.quartos}
                onChange={(e) => setFormData({ ...formData, quartos: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.quartos ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                max="20"
                disabled={formLoading}
              />
              {formErrors.quartos && (
                <p className="mt-1 text-sm text-red-600">{formErrors.quartos}</p>
              )}
            </div>

            <div>
              <label htmlFor="banheiros" className="block text-sm font-medium text-gray-700 mb-1">
                Banheiros
              </label>
              <input
                type="number"
                id="banheiros"
                value={formData.banheiros}
                onChange={(e) => setFormData({ ...formData, banheiros: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.banheiros ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                max="20"
                disabled={formLoading}
              />
              {formErrors.banheiros && (
                <p className="mt-1 text-sm text-red-600">{formErrors.banheiros}</p>
              )}
            </div>

            <div>
              <label htmlFor="area_total" className="block text-sm font-medium text-gray-700 mb-1">
                Área Total (m²)
              </label>
              <input
                type="number"
                id="area_total"
                value={formData.area_total}
                onChange={(e) => setFormData({ ...formData, area_total: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.area_total ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                step="0.01"
                min="1"
                disabled={formLoading}
              />
              {formErrors.area_total && (
                <p className="mt-1 text-sm text-red-600">{formErrors.area_total}</p>
              )}
            </div>
          </div>

          {/* Características e Comodidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Características
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                {[
                  'Piscina', 'Churrasqueira', 'Área de lazer', 'Playground', 'Salão de festas',
                  'Academia', 'Portaria 24h', 'Vagas de garagem', 'Elevador', 'Sacada',
                  'Varanda', 'Jardim', 'Quintal', 'Cozinha americana', 'Sala de estar',
                  'Sala de jantar', 'Escritório', 'Lavanderia', 'Despensa', 'Closet'
                ].map((caracteristica) => (
                  <label key={caracteristica} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.caracteristicas.includes(caracteristica)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            caracteristicas: [...formData.caracteristicas, caracteristica]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            caracteristicas: formData.caracteristicas.filter(c => c !== caracteristica)
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={formLoading}
                    />
                    <span className="ml-2 text-sm text-gray-700">{caracteristica}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comodidades
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                {[
                  'Ar condicionado', 'Aquecedor', 'Fogão', 'Geladeira', 'Máquina de lavar',
                  'Microondas', 'TV', 'Internet', 'Telefone', 'Mobiliado',
                  'Armários embutidos', 'Pisos frios', 'Pisos quentes', 'Janelas grandes',
                  'Iluminação natural', 'Ventilador de teto', 'Aspirador central',
                  'Sistema de som', 'Câmeras de segurança', 'Alarme'
                ].map((comodidade) => (
                  <label key={comodidade} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.comodidades.includes(comodidade)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            comodidades: [...formData.comodidades, comodidade]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            comodidades: formData.comodidades.filter(c => c !== comodidade)
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={formLoading}
                    />
                    <span className="ml-2 text-sm text-gray-700">{comodidade}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Endereço Completo */}
          <div>
            <label htmlFor="endereco_completo" className="block text-sm font-medium text-gray-700 mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              id="endereco_completo"
              value={formData.endereco_completo}
              onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o endereço completo"
              disabled={formLoading}
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.descricao ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Digite uma descrição detalhada do imóvel, incluindo informações sobre localização, infraestrutura, histórico de reformas, etc."
              disabled={formLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Descreva detalhadamente o imóvel para atrair potenciais compradores/inquilinos
            </p>
            {formErrors.descricao && (
              <p className="mt-1 text-sm text-red-600">{formErrors.descricao}</p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="flex space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.destaque}
                onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={formLoading}
              />
              <span className="ml-2 text-sm text-gray-700">Imóvel em destaque</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={formLoading}
              />
              <span className="ml-2 text-sm text-gray-700">Imóvel ativo</span>
            </label>
          </div>

          {/* Upload de Imagens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagens do Imóvel
            </label>
            <div className="border border-gray-300 rounded-md p-4">
              {editingImovel ? (
                <>
                  <SimpleImageUpload
                    onUpload={handleImageUpload}
                    disabled={formLoading}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Arraste e solte imagens ou clique para selecionar. Máximo 10 imagens.
                  </p>
                  
                  {/* Visualização das imagens existentes */}
                  {existingImages.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Imagens do Imóvel ({existingImages.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {existingImages.map((image, index) => (
                          <div key={image.id} className="relative group">
                            <Image
                              src={image.url}
                              alt={`Imagem ${index + 1}`}
                              width={80}
                              height={80}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                              <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                                Imagem {index + 1}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Salve o imóvel primeiro para adicionar imagens</p>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {formLoading ? 'Salvando...' : (editingImovel ? 'Atualizar' : 'Criar')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Filters Modal */}
      <Modal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Filtros de Imóveis"
        size="md"
      >
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={filters.tipo || ''}
              onChange={(e) => handleFilterChange('tipo', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os tipos</option>
              <option value="Casa">Casa</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Chácara">Chácara</option>
              <option value="Fazenda">Fazenda</option>
              <option value="Sítio">Sítio</option>
              <option value="Terreno">Terreno</option>
            </select>
          </div>

          {/* Finalidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Finalidade
            </label>
            <select
              value={filters.finalidade || ''}
              onChange={(e) => handleFilterChange('finalidade', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as finalidades</option>
              <option value="venda">Venda</option>
              <option value="aluguel">Aluguel</option>
              <option value="ambos">Venda/Aluguel</option>
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade
            </label>
            <select
              value={filters.cidade_id || ''}
              onChange={(e) => handleFilterChange('cidade_id', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as cidades</option>
              {cidades.map((cidade) => (
                <option key={cidade.id} value={cidade.id}>
                  {cidade.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.ativo === undefined ? '' : filters.ativo.toString()}
              onChange={(e) => handleFilterChange('ativo', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>

          {/* Destaque */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destaque
            </label>
            <select
              value={filters.destaque === undefined ? '' : filters.destaque.toString()}
              onChange={(e) => handleFilterChange('destaque', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Em destaque</option>
              <option value="false">Sem destaque</option>
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Limpar Filtros
            </button>
            <button
              type="button"
              onClick={() => setShowFiltersModal(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => {
          setIsConfirmDialogOpen(false);
          setDeletingImovel(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Imóvel"
        message={`Tem certeza que deseja excluir o imóvel "${deletingImovel?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        loading={false}
      />

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
      </PermissionGuard>
    </PageErrorBoundary>
  );
}