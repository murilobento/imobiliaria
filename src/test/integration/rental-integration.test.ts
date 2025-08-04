import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IntegracaoService } from '../../lib/services/integracaoService';
import { supabase } from '../../lib/supabase';

describe('Rental Integration Service', () => {
  let testImovelId: string;
  let testClienteId: string;
  let testContratoId: string;

  beforeEach(async () => {
    // Create test data
    // Create test client
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .insert({
        nome: 'Cliente Teste Integração',
        email: 'teste.integracao@example.com',
        telefone: '(11) 99999-9999'
      })
      .select()
      .single();

    if (clienteError) throw clienteError;
    testClienteId = cliente.id;

    // Create test city
    const { data: cidade, error: cidadeError } = await supabase
      .from('cidades')
      .insert({
        nome: 'Cidade Teste',
        estado: 'SP'
      })
      .select()
      .single();

    if (cidadeError) throw cidadeError;

    // Create test property
    const { data: imovel, error: imovelError } = await supabase
      .from('imoveis')
      .insert({
        nome: 'Imóvel Teste Integração',
        tipo: 'Casa',
        finalidade: 'aluguel',
        valor_aluguel: 1500,
        quartos: 2,
        banheiros: 1,
        cidade_id: cidade.id,
        cliente_id: testClienteId,
        ativo: true
      })
      .select()
      .single();

    if (imovelError) throw imovelError;
    testImovelId = imovel.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testContratoId) {
      await supabase
        .from('contratos_aluguel')
        .delete()
        .eq('id', testContratoId);
    }

    if (testImovelId) {
      await supabase
        .from('imoveis')
        .delete()
        .eq('id', testImovelId);
    }

    if (testClienteId) {
      await supabase
        .from('clientes')
        .delete()
        .eq('id', testClienteId);
    }

    // Clean up city
    await supabase
      .from('cidades')
      .delete()
      .eq('nome', 'Cidade Teste');
  });

  describe('getImovelStatusAluguel', () => {
    it('should return not rented status for available property', async () => {
      const status = await IntegracaoService.getImovelStatusAluguel(testImovelId);
      
      expect(status.alugado).toBe(false);
      expect(status.contrato_ativo).toBeUndefined();
      expect(status.valor_aluguel).toBeUndefined();
      expect(status.inquilino).toBeUndefined();
    });

    it('should return rented status for property with active contract', async () => {
      // Create active contract
      const { data: contrato, error } = await supabase
        .from('contratos_aluguel')
        .insert({
          imovel_id: testImovelId,
          inquilino_id: testClienteId,
          valor_aluguel: 1500,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      testContratoId = contrato.id;

      const status = await IntegracaoService.getImovelStatusAluguel(testImovelId);
      
      expect(status.alugado).toBe(true);
      expect(status.contrato_ativo).toBeDefined();
      expect(status.valor_aluguel).toBe(1500);
      expect(status.inquilino).toBeDefined();
      expect(status.inquilino?.nome).toBe('Cliente Teste Integração');
      expect(status.data_inicio).toBe('2024-01-01');
      expect(status.data_fim).toBe('2024-12-31');
    });
  });

  describe('getImoveisStatusAluguel', () => {
    it('should return status for multiple properties', async () => {
      // Create second property
      const { data: imovel2, error: imovel2Error } = await supabase
        .from('imoveis')
        .insert({
          nome: 'Imóvel Teste 2',
          tipo: 'Apartamento',
          finalidade: 'aluguel',
          valor_aluguel: 2000,
          quartos: 3,
          banheiros: 2,
          cliente_id: testClienteId,
          ativo: true
        })
        .select()
        .single();

      if (imovel2Error) throw imovel2Error;

      // Create contract for first property
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos_aluguel')
        .insert({
          imovel_id: testImovelId,
          inquilino_id: testClienteId,
          valor_aluguel: 1500,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo'
        })
        .select()
        .single();

      if (contratoError) throw contratoError;
      testContratoId = contrato.id;

      const statusMap = await IntegracaoService.getImoveisStatusAluguel([testImovelId, imovel2.id]);
      
      expect(statusMap[testImovelId].alugado).toBe(true);
      expect(statusMap[imovel2.id].alugado).toBe(false);

      // Clean up second property
      await supabase
        .from('imoveis')
        .delete()
        .eq('id', imovel2.id);
    });
  });

  describe('getClienteContratosAtivos', () => {
    it('should return empty contracts for client without active contracts', async () => {
      const contratos = await IntegracaoService.getClienteContratosAtivos(testClienteId);
      
      expect(contratos.contratos).toHaveLength(0);
      expect(contratos.total_contratos).toBe(0);
      expect(contratos.valor_total_mensal).toBe(0);
    });

    it('should return active contracts for client', async () => {
      // Create active contract
      const { data: contrato, error } = await supabase
        .from('contratos_aluguel')
        .insert({
          imovel_id: testImovelId,
          inquilino_id: testClienteId,
          valor_aluguel: 1500,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      testContratoId = contrato.id;

      const contratos = await IntegracaoService.getClienteContratosAtivos(testClienteId);
      
      expect(contratos.contratos).toHaveLength(1);
      expect(contratos.total_contratos).toBe(1);
      expect(contratos.valor_total_mensal).toBe(1500);
      expect(contratos.contratos[0].valor_aluguel).toBe(1500);
      expect(contratos.contratos[0].imovel).toBeDefined();
    });
  });

  describe('getImoveisDisponiveis', () => {
    it('should return available properties for rent', async () => {
      const imoveisDisponiveis = await IntegracaoService.getImoveisDisponiveis();
      
      // Should include our test property since it has no active contract
      const testProperty = imoveisDisponiveis.find(imovel => imovel.id === testImovelId);
      expect(testProperty).toBeDefined();
      expect(testProperty?.finalidade).toMatch(/aluguel|ambos/);
      expect(testProperty?.ativo).toBe(true);
    });

    it('should not return properties with active contracts', async () => {
      // Create active contract
      const { data: contrato, error } = await supabase
        .from('contratos_aluguel')
        .insert({
          imovel_id: testImovelId,
          inquilino_id: testClienteId,
          valor_aluguel: 1500,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      testContratoId = contrato.id;

      const imoveisDisponiveis = await IntegracaoService.getImoveisDisponiveis();
      
      // Should not include our test property since it now has an active contract
      const testProperty = imoveisDisponiveis.find(imovel => imovel.id === testImovelId);
      expect(testProperty).toBeUndefined();
    });
  });

  describe('canEditImovel', () => {
    it('should allow editing property without active contracts', async () => {
      const result = await IntegracaoService.canEditImovel(testImovelId);
      
      expect(result.canEdit).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow editing property with active contracts', async () => {
      // Create active contract
      const { data: contrato, error } = await supabase
        .from('contratos_aluguel')
        .insert({
          imovel_id: testImovelId,
          inquilino_id: testClienteId,
          valor_aluguel: 1500,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      testContratoId = contrato.id;

      const result = await IntegracaoService.canEditImovel(testImovelId);
      
      expect(result.canEdit).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('contrato ativo');
    });
  });

  describe('canDeleteCliente', () => {
    it('should allow deleting client without active contracts', async () => {
      const result = await IntegracaoService.canDeleteCliente(testClienteId);
      
      expect(result.canDelete).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow deleting client with active contracts', async () => {
      // Create active contract
      const { data: contrato, error } = await supabase
        .from('contratos_aluguel')
        .insert({
          imovel_id: testImovelId,
          inquilino_id: testClienteId,
          valor_aluguel: 1500,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31',
          dia_vencimento: 10,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      testContratoId = contrato.id;

      const result = await IntegracaoService.canDeleteCliente(testClienteId);
      
      expect(result.canDelete).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('contratos ativos');
    });
  });
});