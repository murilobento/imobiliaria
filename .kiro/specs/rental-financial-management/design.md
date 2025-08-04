# Design Document - Sistema de Controle de Aluguéis e Finanças

## Overview

O sistema de controle de aluguéis e finanças será integrado à aplicação Next.js existente, utilizando Supabase como backend e seguindo os padrões arquiteturais já estabelecidos. O sistema gerenciará contratos de aluguel, pagamentos, despesas e relatórios financeiros, mantendo integração completa com os módulos existentes de imóveis e clientes.

## Architecture

### Database Schema

O sistema utilizará as seguintes tabelas no Supabase:

```sql
-- Tabela de contratos de aluguel
CREATE TABLE contratos_aluguel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id UUID REFERENCES imoveis(id) NOT NULL,
  inquilino_id UUID REFERENCES clientes(id) NOT NULL,
  proprietario_id UUID REFERENCES clientes(id),
  valor_aluguel DECIMAL(10,2) NOT NULL,
  valor_deposito DECIMAL(10,2),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'suspenso')),
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pagamentos de aluguel
CREATE TABLE pagamentos_aluguel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos_aluguel(id) NOT NULL,
  mes_referencia DATE NOT NULL, -- Primeiro dia do mês de referência
  valor_devido DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_juros DECIMAL(10,2) DEFAULT 0,
  valor_multa DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de despesas dos imóveis
CREATE TABLE despesas_imoveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id UUID REFERENCES imoveis(id) NOT NULL,
  categoria VARCHAR(50) NOT NULL, -- 'manutencao', 'impostos', 'seguros', 'administracao', 'outros'
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_despesa DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de configurações financeiras
CREATE TABLE configuracoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxa_juros_mensal DECIMAL(5,4) DEFAULT 0.01, -- 1% ao mês
  taxa_multa DECIMAL(5,4) DEFAULT 0.02, -- 2%
  taxa_comissao DECIMAL(5,4) DEFAULT 0.10, -- 10%
  dias_carencia INTEGER DEFAULT 5,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Structure

Seguindo o padrão existente da aplicação, as APIs serão organizadas em:

```
src/app/api/
├── contratos/
│   ├── route.ts (GET, POST)
│   └── [id]/
│       └── route.ts (GET, PUT, DELETE)
├── pagamentos/
│   ├── route.ts (GET, POST)
│   ├── [id]/
│   │   └── route.ts (GET, PUT, DELETE)
│   └── processar-vencimentos/
│       └── route.ts (POST)
├── despesas/
│   ├── route.ts (GET, POST)
│   └── [id]/
│       └── route.ts (GET, PUT, DELETE)
├── relatorios/
│   ├── financeiro/
│   │   └── route.ts (GET)
│   ├── inadimplencia/
│   │   └── route.ts (GET)
│   └── rentabilidade/
│       └── route.ts (GET)
└── configuracoes-financeiras/
    └── route.ts (GET, PUT)
```

## Components and Interfaces

### Core Types

```typescript
// Tipos para contratos
export interface ContratoAluguel {
  id?: string;
  imovel_id: string;
  inquilino_id: string;
  proprietario_id?: string;
  valor_aluguel: number;
  valor_deposito?: number;
  data_inicio: string;
  data_fim: string;
  dia_vencimento: number;
  status: 'ativo' | 'encerrado' | 'suspenso';
  observacoes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  imovel?: Imovel;
  inquilino?: Cliente;
  proprietario?: Cliente;
  pagamentos?: PagamentoAluguel[];
}

// Tipos para pagamentos
export interface PagamentoAluguel {
  id?: string;
  contrato_id: string;
  mes_referencia: string;
  valor_devido: number;
  valor_pago?: number;
  data_vencimento: string;
  data_pagamento?: string;
  valor_juros: number;
  valor_multa: number;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  contrato?: ContratoAluguel;
}

// Tipos para despesas
export interface DespesaImovel {
  id?: string;
  imovel_id: string;
  categoria: 'manutencao' | 'impostos' | 'seguros' | 'administracao' | 'outros';
  descricao: string;
  valor: number;
  data_despesa: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  observacoes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  imovel?: Imovel;
}

// Tipos para configurações
export interface ConfiguracaoFinanceira {
  id?: string;
  taxa_juros_mensal: number;
  taxa_multa: number;
  taxa_comissao: number;
  dias_carencia: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}
```

### React Components

```
src/components/admin/Financeiro/
├── Contratos/
│   ├── ContratosList.tsx
│   ├── ContratoForm.tsx
│   ├── ContratoDetails.tsx
│   └── ContratoStatus.tsx
├── Pagamentos/
│   ├── PagamentosList.tsx
│   ├── PagamentoForm.tsx
│   ├── CalendarioPagamentos.tsx
│   └── ProcessarVencimentos.tsx
├── Despesas/
│   ├── DespesasList.tsx
│   ├── DespesaForm.tsx
│   └── DespesasCategoria.tsx
├── Relatorios/
│   ├── RelatorioFinanceiro.tsx
│   ├── RelatorioInadimplencia.tsx
│   ├── RelatorioRentabilidade.tsx
│   └── ExportarRelatorio.tsx
├── Configuracoes/
│   └── ConfiguracoesFinanceiras.tsx
└── Common/
    ├── FinanceiroCard.tsx
    ├── StatusBadge.tsx
    └── ValorDisplay.tsx
```

### Pages Structure

```
src/app/admin/financeiro/
├── page.tsx (Dashboard financeiro)
├── contratos/
│   ├── page.tsx (Lista de contratos)
│   ├── novo/
│   │   └── page.tsx (Novo contrato)
│   └── [id]/
│       └── page.tsx (Detalhes do contrato)
├── pagamentos/
│   ├── page.tsx (Gestão de pagamentos)
│   └── calendario/
│       └── page.tsx (Calendário de pagamentos)
├── despesas/
│   ├── page.tsx (Lista de despesas)
│   └── nova/
│       └── page.tsx (Nova despesa)
├── relatorios/
│   ├── page.tsx (Seleção de relatórios)
│   ├── financeiro/
│   │   └── page.tsx (Relatório financeiro)
│   ├── inadimplencia/
│   │   └── page.tsx (Relatório de inadimplência)
│   └── rentabilidade/
│       └── page.tsx (Relatório de rentabilidade)
└── configuracoes/
    └── page.tsx (Configurações financeiras)
```

## Data Models

### Business Logic Services

```typescript
// Serviço de cálculos financeiros
export class CalculoFinanceiroService {
  static calcularJurosMulta(
    valorDevido: number,
    diasAtraso: number,
    taxaJuros: number,
    taxaMulta: number
  ): { juros: number; multa: number; total: number }

  static calcularRentabilidade(
    receitas: number[],
    despesas: number[]
  ): { rentabilidadeBruta: number; rentabilidadeLiquida: number }

  static gerarPagamentosMensais(
    contrato: ContratoAluguel
  ): PagamentoAluguel[]
}

// Serviço de processamento de vencimentos
export class ProcessamentoVencimentosService {
  static async processarVencimentosDiarios(): Promise<void>
  static async enviarNotificacoes(): Promise<void>
  static async atualizarStatusPagamentos(): Promise<void>
}
```

## Error Handling

### Error Types

```typescript
export class FinanceiroError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'FinanceiroError';
  }
}

export const FINANCEIRO_ERRORS = {
  CONTRATO_NAO_ENCONTRADO: 'CONTRATO_NAO_ENCONTRADO',
  IMOVEL_JA_ALUGADO: 'IMOVEL_JA_ALUGADO',
  PAGAMENTO_JA_REALIZADO: 'PAGAMENTO_JA_REALIZADO',
  VALOR_INVALIDO: 'VALOR_INVALIDO',
  DATA_INVALIDA: 'DATA_INVALIDA',
  PERMISSAO_NEGADA: 'PERMISSAO_NEGADA'
} as const;
```

### Validation Schema

```typescript
export const contratoValidationSchema = {
  imovel_id: { required: true, type: 'uuid' },
  inquilino_id: { required: true, type: 'uuid' },
  valor_aluguel: { required: true, type: 'number', min: 0.01 },
  data_inicio: { required: true, type: 'date' },
  data_fim: { required: true, type: 'date' },
  dia_vencimento: { required: true, type: 'number', min: 1, max: 31 }
};

export const pagamentoValidationSchema = {
  contrato_id: { required: true, type: 'uuid' },
  valor_devido: { required: true, type: 'number', min: 0.01 },
  data_vencimento: { required: true, type: 'date' }
};
```

## Testing Strategy

### Unit Tests

- Testes para serviços de cálculo financeiro
- Testes para validação de dados
- Testes para componentes React isolados
- Testes para utilitários de formatação

### Integration Tests

- Testes de fluxo completo de criação de contratos
- Testes de processamento de pagamentos
- Testes de geração de relatórios
- Testes de integração com APIs existentes

### E2E Tests

- Fluxo completo de gestão de contratos
- Processo de registro de pagamentos
- Geração e exportação de relatórios
- Configuração de parâmetros financeiros

### Test Files Structure

```
src/test/
├── unit/
│   ├── services/
│   │   ├── calculoFinanceiro.test.ts
│   │   └── processamentoVencimentos.test.ts
│   └── components/
│       ├── ContratoForm.test.tsx
│       └── PagamentosList.test.tsx
├── integration/
│   ├── contratos-api.test.ts
│   ├── pagamentos-workflow.test.ts
│   └── relatorios-generation.test.ts
└── e2e/
    ├── gestao-contratos.test.ts
    ├── controle-pagamentos.test.ts
    └── relatorios-financeiros.test.ts
```

## Security Considerations

### Authentication & Authorization

- Todas as operações requerem autenticação
- Controle de acesso baseado em roles (admin/corretor)
- Validação de propriedade dos dados (user_id)
- Rate limiting nas APIs críticas

### Data Protection

- Validação rigorosa de inputs financeiros
- Sanitização de dados antes de persistência
- Logs de auditoria para operações financeiras
- Backup automático de dados críticos

### Financial Data Integrity

- Transações atômicas para operações financeiras
- Validação de consistência de dados
- Prevenção de manipulação de valores
- Controle de versioning para alterações

## Performance Optimizations

### Database Optimization

- Índices otimizados para consultas frequentes
- Paginação para listagens grandes
- Cache de configurações financeiras
- Queries otimizadas para relatórios

### Frontend Optimization

- Lazy loading de componentes pesados
- Memoização de cálculos complexos
- Debounce em campos de busca
- Virtualização para listas grandes

### Caching Strategy

- Cache de configurações no cliente
- Cache de dados de relatórios
- Invalidação inteligente de cache
- CDN para assets estáticos