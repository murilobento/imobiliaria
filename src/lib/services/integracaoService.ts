import { supabase } from '../supabase';
import { ContratoAluguel } from '../../types/financeiro';
import { Imovel } from '../../types/imovel';
import { Cliente } from '../../types/cliente';

// Interface para status de aluguel de um imóvel
export interface ImovelStatusAluguel {
  alugado: boolean;
  contrato_ativo?: ContratoAluguel;
  valor_aluguel?: number;
  inquilino?: Cliente;
  data_inicio?: string;
  data_fim?: string;
}

// Interface para contratos ativos de um cliente
export interface ClienteContratosAtivos {
  contratos: ContratoAluguel[];
  total_contratos: number;
  valor_total_mensal: number;
}

// Serviço de integração entre módulos
export class IntegracaoService {
  // Buscar status de aluguel de um imóvel
  static async getImovelStatusAluguel(imovelId: string): Promise<ImovelStatusAluguel> {
    try {
      // Primeiro, buscar o contrato ativo
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos_aluguel')
        .select('*')
        .eq('imovel_id', imovelId)
        .eq('status', 'ativo')
        .single();

      if (contratoError && contratoError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Erro ao buscar status do imóvel: ${contratoError.message}`);
      }

      if (!contrato) {
        return { alugado: false };
      }

      // Buscar dados do inquilino
      const { data: inquilino, error: inquilinoError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', contrato.inquilino_id)
        .single();

      if (inquilinoError) {
        console.warn('Erro ao buscar dados do inquilino:', inquilinoError.message);
      }

      return {
        alugado: true,
        contrato_ativo: contrato,
        valor_aluguel: contrato.valor_aluguel,
        inquilino: inquilino,
        data_inicio: contrato.data_inicio,
        data_fim: contrato.data_fim
      };
    } catch (error) {
      console.error('Erro ao buscar status de aluguel do imóvel:', error);
      return { alugado: false };
    }
  }

  // Buscar status de aluguel para múltiplos imóveis
  static async getImoveisStatusAluguel(imovelIds: string[]): Promise<Record<string, ImovelStatusAluguel>> {
    try {
      // Primeiro, buscar os contratos ativos
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos_aluguel')
        .select('*')
        .in('imovel_id', imovelIds)
        .eq('status', 'ativo');

      if (contratosError) {
        throw new Error(`Erro ao buscar contratos ativos: ${contratosError.message}`);
      }

      const statusMap: Record<string, ImovelStatusAluguel> = {};

      // Inicializar todos os imóveis como não alugados
      imovelIds.forEach(id => {
        statusMap[id] = { alugado: false };
      });

      // Se não há contratos ativos, retornar todos como não alugados
      if (!contratos || contratos.length === 0) {
        return statusMap;
      }

      // Buscar dados dos inquilinos para os contratos encontrados
      const inquilinoIds = contratos.map((c: any) => c.inquilino_id);
      const { data: inquilinos, error: inquilinosError } = await supabase
        .from('clientes')
        .select('*')
        .in('id', inquilinoIds);

      if (inquilinosError) {
        console.warn('Erro ao buscar dados dos inquilinos:', inquilinosError.message);
      }

      // Criar mapa de inquilinos para facilitar o acesso
      const inquilinosMap = new Map();
      inquilinos?.forEach((inquilino: any) => {
        inquilinosMap.set(inquilino.id, inquilino);
      });

      // Atualizar com dados dos contratos ativos
      contratos.forEach((contrato: any) => {
        const inquilino = inquilinosMap.get(contrato.inquilino_id);
        statusMap[contrato.imovel_id] = {
          alugado: true,
          contrato_ativo: contrato,
          valor_aluguel: contrato.valor_aluguel,
          inquilino: inquilino,
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim
        };
      });

      return statusMap;
    } catch (error) {
      console.error('Erro ao buscar status de aluguel dos imóveis:', error);
      // Retornar todos como não alugados em caso de erro
      const statusMap: Record<string, ImovelStatusAluguel> = {};
      imovelIds.forEach(id => {
        statusMap[id] = { alugado: false };
      });
      return statusMap;
    }
  }

  // Buscar contratos ativos de um cliente
  static async getClienteContratosAtivos(clienteId: string): Promise<ClienteContratosAtivos> {
    try {
      // Buscar contratos ativos do cliente
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos_aluguel')
        .select('*')
        .eq('inquilino_id', clienteId)
        .eq('status', 'ativo');

      if (contratosError) {
        throw new Error(`Erro ao buscar contratos do cliente: ${contratosError.message}`);
      }

      if (!contratos || contratos.length === 0) {
        return {
          contratos: [],
          total_contratos: 0,
          valor_total_mensal: 0
        };
      }

      // Buscar dados dos imóveis para os contratos encontrados
      const imovelIds = contratos.map((c: any) => c.imovel_id);
      const { data: imoveis, error: imoveisError } = await supabase
        .from('imoveis')
        .select('*')
        .in('id', imovelIds);

      if (imoveisError) {
        console.warn('Erro ao buscar dados dos imóveis:', imoveisError.message);
      }

      // Criar mapa de imóveis para facilitar o acesso
      const imoveisMap = new Map();
      imoveis?.forEach((imovel: any) => {
        imoveisMap.set(imovel.id, imovel);
      });

      // Adicionar dados do imóvel aos contratos
      const contratosComImovel = contratos.map((contrato: any) => ({
        ...contrato,
        imovel: imoveisMap.get(contrato.imovel_id)
      }));

      const valor_total_mensal = contratos.reduce((total: number, contrato: any) => total + contrato.valor_aluguel, 0);

      return {
        contratos: contratosComImovel,
        total_contratos: contratos.length,
        valor_total_mensal
      };
    } catch (error) {
      console.error('Erro ao buscar contratos ativos do cliente:', error);
      return {
        contratos: [],
        total_contratos: 0,
        valor_total_mensal: 0
      };
    }
  }

  // Buscar imóveis disponíveis para aluguel
  static async getImoveisDisponiveis(): Promise<Imovel[]> {
    try {
      // Buscar todos os imóveis que têm finalidade de aluguel ou ambos
      const { data: imoveis, error: imoveisError } = await supabase
        .from('imoveis')
        .select(`
          *,
          cidade:cidades(*),
          cliente:clientes(*)
        `)
        .in('finalidade', ['aluguel', 'ambos'])
        .eq('ativo', true);

      if (imoveisError) {
        throw new Error(`Erro ao buscar imóveis: ${imoveisError.message}`);
      }

      if (!imoveis || imoveis.length === 0) {
        return [];
      }

      // Buscar contratos ativos para filtrar imóveis já alugados
      const imovelIds = imoveis.map((imovel: any) => imovel.id);
      const { data: contratosAtivos, error: contratosError } = await supabase
        .from('contratos_aluguel')
        .select('imovel_id')
        .in('imovel_id', imovelIds)
        .eq('status', 'ativo');

      if (contratosError) {
        throw new Error(`Erro ao buscar contratos ativos: ${contratosError.message}`);
      }

      // Filtrar imóveis que não têm contratos ativos
      const imoveisAlugados = new Set(contratosAtivos?.map((c: any) => c.imovel_id) || []);
      const imoveisDisponiveis = imoveis.filter((imovel: any) => !imoveisAlugados.has(imovel.id));

      return imoveisDisponiveis;
    } catch (error) {
      console.error('Erro ao buscar imóveis disponíveis:', error);
      return [];
    }
  }

  // Buscar histórico de contratos de um imóvel
  static async getImovelHistoricoContratos(imovelId: string): Promise<ContratoAluguel[]> {
    try {
      // Buscar contratos do imóvel
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos_aluguel')
        .select('*')
        .eq('imovel_id', imovelId)
        .order('data_inicio', { ascending: false });

      if (contratosError) {
        throw new Error(`Erro ao buscar histórico de contratos: ${contratosError.message}`);
      }

      if (!contratos || contratos.length === 0) {
        return [];
      }

      // Buscar dados dos inquilinos e proprietários
      const inquilinoIds = contratos.map((c: any) => c.inquilino_id);
      const proprietarioIds = contratos.map((c: any) => c.proprietario_id).filter(Boolean);
      const allClienteIds = [...new Set([...inquilinoIds, ...proprietarioIds])];

      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .in('id', allClienteIds);

      if (clientesError) {
        console.warn('Erro ao buscar dados dos clientes:', clientesError.message);
      }

      // Criar mapa de clientes para facilitar o acesso
      const clientesMap = new Map();
      clientes?.forEach((cliente: any) => {
        clientesMap.set(cliente.id, cliente);
      });

      // Adicionar dados dos clientes aos contratos
      const contratosComClientes = contratos.map((contrato: any) => ({
        ...contrato,
        inquilino: clientesMap.get(contrato.inquilino_id),
        proprietario: contrato.proprietario_id ? clientesMap.get(contrato.proprietario_id) : null
      }));

      return contratosComClientes;
    } catch (error) {
      console.error('Erro ao buscar histórico de contratos do imóvel:', error);
      return [];
    }
  }

  // Buscar histórico de contratos de um cliente
  static async getClienteHistoricoContratos(clienteId: string): Promise<ContratoAluguel[]> {
    try {
      // Buscar contratos do cliente
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos_aluguel')
        .select('*')
        .eq('inquilino_id', clienteId)
        .order('data_inicio', { ascending: false });

      if (contratosError) {
        throw new Error(`Erro ao buscar histórico de contratos: ${contratosError.message}`);
      }

      if (!contratos || contratos.length === 0) {
        return [];
      }

      // Buscar dados dos imóveis e proprietários
      const imovelIds = contratos.map((c: any) => c.imovel_id);
      const proprietarioIds = contratos.map((c: any) => c.proprietario_id).filter(Boolean);

      // Buscar imóveis
      const { data: imoveis, error: imoveisError } = await supabase
        .from('imoveis')
        .select('*')
        .in('id', imovelIds);

      if (imoveisError) {
        console.warn('Erro ao buscar dados dos imóveis:', imoveisError.message);
      }

      // Buscar proprietários se existirem
      let proprietarios: any[] = [];
      if (proprietarioIds.length > 0) {
        const { data: proprietariosData, error: proprietariosError } = await supabase
          .from('clientes')
          .select('*')
          .in('id', proprietarioIds);

        if (proprietariosError) {
          console.warn('Erro ao buscar dados dos proprietários:', proprietariosError.message);
        } else {
          proprietarios = proprietariosData || [];
        }
      }

      // Criar mapas para facilitar o acesso
      const imoveisMap = new Map();
      imoveis?.forEach((imovel: any) => {
        imoveisMap.set(imovel.id, imovel);
      });

      const proprietariosMap = new Map();
      proprietarios.forEach(proprietario => {
        proprietariosMap.set(proprietario.id, proprietario);
      });

      // Adicionar dados relacionados aos contratos
      const contratosCompletos = contratos.map((contrato: any) => ({
        ...contrato,
        imovel: imoveisMap.get(contrato.imovel_id),
        proprietario: contrato.proprietario_id ? proprietariosMap.get(contrato.proprietario_id) : null
      }));

      return contratosCompletos;
    } catch (error) {
      console.error('Erro ao buscar histórico de contratos do cliente:', error);
      return [];
    }
  }

  // Verificar se um imóvel pode ser editado (não tem contratos ativos)
  static async canEditImovel(imovelId: string): Promise<{ canEdit: boolean; reason?: string }> {
    try {
      const { data, error } = await supabase
        .from('contratos_aluguel')
        .select('id')
        .eq('imovel_id', imovelId)
        .eq('status', 'ativo')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Erro ao verificar contratos ativos: ${error.message}`);
      }

      if (data) {
        return {
          canEdit: false,
          reason: 'Imóvel possui contrato ativo e não pode ser editado'
        };
      }

      return { canEdit: true };
    } catch (error) {
      console.error('Erro ao verificar se imóvel pode ser editado:', error);
      return { canEdit: true }; // Em caso de erro, permitir edição
    }
  }

  // Verificar se um cliente pode ser excluído (não tem contratos ativos)
  static async canDeleteCliente(clienteId: string): Promise<{ canDelete: boolean; reason?: string }> {
    try {
      const { data, error } = await supabase
        .from('contratos_aluguel')
        .select('id')
        .or(`inquilino_id.eq.${clienteId},proprietario_id.eq.${clienteId}`)
        .eq('status', 'ativo')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Erro ao verificar contratos ativos: ${error.message}`);
      }

      if (data) {
        return {
          canDelete: false,
          reason: 'Cliente possui contratos ativos e não pode ser excluído'
        };
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Erro ao verificar se cliente pode ser excluído:', error);
      return { canDelete: true }; // Em caso de erro, permitir exclusão
    }
  }
}