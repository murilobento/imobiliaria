import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase'
import { CreateDespesaData, DespesaImovel } from '@/types/financeiro'

describe('Despesas Workflow Integration Tests', () => {
  let testImovelId: string
  let testDespesaId: string

  beforeAll(async () => {
    // Create a test property for the despesas
    const { data: imovel, error: imovelError } = await supabase
      .from('imoveis')
      .insert([{
        titulo: 'Casa Teste Despesas',
        descricao: 'Casa para testes de despesas',
        tipo: 'casa',
        finalidade: 'aluguel',
        valor_aluguel: 1000,
        quartos: 2,
        banheiros: 1,
        area_total: 100,
        endereco: 'Rua Teste, 123',
        cidade_id: null,
        status: 'disponivel'
      }])
      .select('id')
      .single()

    if (imovelError) {
      throw new Error(`Failed to create test property: ${imovelError.message}`)
    }

    testImovelId = imovel.id
  })

  afterAll(async () => {
    // Clean up test data
    if (testDespesaId) {
      await supabase
        .from('despesas_imoveis')
        .delete()
        .eq('id', testDespesaId)
    }

    if (testImovelId) {
      await supabase
        .from('imoveis')
        .delete()
        .eq('id', testImovelId)
    }
  })

  it('should create, read, update, and delete a despesa', async () => {
    // 1. Create a despesa
    const despesaData: CreateDespesaData = {
      imovel_id: testImovelId,
      categoria: 'manutencao',
      descricao: 'Reparo no telhado da casa teste',
      valor: 750.50,
      data_despesa: '2024-01-15',
      status: 'pendente',
      observacoes: 'Reparo urgente necessário'
    }

    const { data: createdDespesa, error: createError } = await supabase
      .from('despesas_imoveis')
      .insert([despesaData])
      .select(`
        *,
        imovel:imoveis(*)
      `)
      .single()

    expect(createError).toBeNull()
    expect(createdDespesa).toBeDefined()
    expect(createdDespesa.imovel_id).toBe(testImovelId)
    expect(createdDespesa.categoria).toBe('manutencao')
    expect(createdDespesa.descricao).toBe('Reparo no telhado da casa teste')
    expect(createdDespesa.valor).toBe(750.50)
    expect(createdDespesa.status).toBe('pendente')
    expect(createdDespesa.imovel).toBeDefined()

    testDespesaId = createdDespesa.id

    // 2. Read the despesa
    const { data: readDespesa, error: readError } = await supabase
      .from('despesas_imoveis')
      .select(`
        *,
        imovel:imoveis(*)
      `)
      .eq('id', testDespesaId)
      .single()

    expect(readError).toBeNull()
    expect(readDespesa).toBeDefined()
    expect(readDespesa.id).toBe(testDespesaId)
    expect(readDespesa.descricao).toBe('Reparo no telhado da casa teste')

    // 3. Update the despesa
    const updateData = {
      status: 'pago' as const,
      data_pagamento: '2024-01-20',
      observacoes: 'Reparo concluído com sucesso'
    }

    const { data: updatedDespesa, error: updateError } = await supabase
      .from('despesas_imoveis')
      .update(updateData)
      .eq('id', testDespesaId)
      .select(`
        *,
        imovel:imoveis(*)
      `)
      .single()

    expect(updateError).toBeNull()
    expect(updatedDespesa).toBeDefined()
    expect(updatedDespesa.status).toBe('pago')
    expect(updatedDespesa.data_pagamento).toBe('2024-01-20')
    expect(updatedDespesa.observacoes).toBe('Reparo concluído com sucesso')

    // 4. List despesas with filters
    const { data: despesasList, error: listError } = await supabase
      .from('despesas_imoveis')
      .select(`
        *,
        imovel:imoveis(*)
      `)
      .eq('imovel_id', testImovelId)
      .eq('categoria', 'manutencao')

    expect(listError).toBeNull()
    expect(despesasList).toBeDefined()
    expect(despesasList.length).toBeGreaterThan(0)
    expect(despesasList.some(d => d.id === testDespesaId)).toBe(true)

    // 5. Delete the despesa
    const { error: deleteError } = await supabase
      .from('despesas_imoveis')
      .delete()
      .eq('id', testDespesaId)

    expect(deleteError).toBeNull()

    // 6. Verify deletion
    const { data: deletedDespesa, error: verifyError } = await supabase
      .from('despesas_imoveis')
      .select('id')
      .eq('id', testDespesaId)
      .single()

    expect(verifyError).toBeDefined() // Should error because record doesn't exist
    expect(deletedDespesa).toBeNull()

    testDespesaId = '' // Clear the ID since it's been deleted
  })

  it('should filter despesas by category', async () => {
    // Create despesas with different categories
    const despesas = [
      {
        imovel_id: testImovelId,
        categoria: 'manutencao' as const,
        descricao: 'Pintura externa',
        valor: 500,
        data_despesa: '2024-01-10',
        status: 'pendente' as const
      },
      {
        imovel_id: testImovelId,
        categoria: 'impostos' as const,
        descricao: 'IPTU 2024',
        valor: 300,
        data_despesa: '2024-01-05',
        status: 'pago' as const
      },
      {
        imovel_id: testImovelId,
        categoria: 'seguros' as const,
        descricao: 'Seguro residencial',
        valor: 200,
        data_despesa: '2024-01-01',
        status: 'pago' as const
      }
    ]

    const { data: createdDespesas, error: createError } = await supabase
      .from('despesas_imoveis')
      .insert(despesas)
      .select('id, categoria')

    expect(createError).toBeNull()
    expect(createdDespesas).toHaveLength(3)

    const createdIds = createdDespesas.map(d => d.id)

    try {
      // Filter by maintenance category
      const { data: manutencaoDespesas, error: manutencaoError } = await supabase
        .from('despesas_imoveis')
        .select('*')
        .eq('imovel_id', testImovelId)
        .eq('categoria', 'manutencao')

      expect(manutencaoError).toBeNull()
      expect(manutencaoDespesas).toHaveLength(1)
      expect(manutencaoDespesas[0].categoria).toBe('manutencao')

      // Filter by status
      const { data: pagosDespesas, error: pagosError } = await supabase
        .from('despesas_imoveis')
        .select('*')
        .eq('imovel_id', testImovelId)
        .eq('status', 'pago')

      expect(pagosError).toBeNull()
      expect(pagosDespesas.length).toBeGreaterThanOrEqual(2)
      expect(pagosDespesas.every(d => d.status === 'pago')).toBe(true)

    } finally {
      // Clean up created despesas
      await supabase
        .from('despesas_imoveis')
        .delete()
        .in('id', createdIds)
    }
  })

  it('should calculate total despesas for a property', async () => {
    // Create multiple despesas for calculation
    const despesas = [
      {
        imovel_id: testImovelId,
        categoria: 'manutencao' as const,
        descricao: 'Despesa 1',
        valor: 100,
        data_despesa: '2024-01-01',
        status: 'pago' as const
      },
      {
        imovel_id: testImovelId,
        categoria: 'impostos' as const,
        descricao: 'Despesa 2',
        valor: 200,
        data_despesa: '2024-01-02',
        status: 'pago' as const
      },
      {
        imovel_id: testImovelId,
        categoria: 'seguros' as const,
        descricao: 'Despesa 3',
        valor: 150,
        data_despesa: '2024-01-03',
        status: 'pendente' as const // This should not be included in total
      }
    ]

    const { data: createdDespesas, error: createError } = await supabase
      .from('despesas_imoveis')
      .insert(despesas)
      .select('id')

    expect(createError).toBeNull()
    expect(createdDespesas).toHaveLength(3)

    const createdIds = createdDespesas.map(d => d.id)

    try {
      // Calculate total for paid despesas only
      const { data: paidDespesas, error: calcError } = await supabase
        .from('despesas_imoveis')
        .select('valor')
        .eq('imovel_id', testImovelId)
        .eq('status', 'pago')
        .gte('data_despesa', '2024-01-01')
        .lte('data_despesa', '2024-01-31')

      expect(calcError).toBeNull()
      expect(paidDespesas).toBeDefined()

      const total = paidDespesas.reduce((sum, despesa) => sum + despesa.valor, 0)
      expect(total).toBe(300) // 100 + 200, excluding the pending one

    } finally {
      // Clean up created despesas
      await supabase
        .from('despesas_imoveis')
        .delete()
        .in('id', createdIds)
    }
  })

  it('should validate required fields', async () => {
    // Try to create despesa without required fields
    const invalidDespesa = {
      // Missing imovel_id
      categoria: 'manutencao',
      // Missing descricao
      valor: 100,
      // Missing data_despesa
      status: 'pendente'
    }

    const { data, error } = await supabase
      .from('despesas_imoveis')
      .insert([invalidDespesa])
      .select()

    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('should validate foreign key constraints', async () => {
    // Try to create despesa with non-existent imovel_id
    const invalidDespesa = {
      imovel_id: '00000000-0000-0000-0000-000000000000',
      categoria: 'manutencao',
      descricao: 'Test despesa',
      valor: 100,
      data_despesa: '2024-01-01',
      status: 'pendente'
    }

    const { data, error } = await supabase
      .from('despesas_imoveis')
      .insert([invalidDespesa])
      .select()

    expect(error).toBeDefined()
    expect(error.code).toBe('23503') // Foreign key violation
    expect(data).toBeNull()
  })
})