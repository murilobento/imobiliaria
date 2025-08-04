# Design Document

## Overview

O painel administrativo será desenvolvido como uma aplicação web responsiva integrada ao projeto Next.js existente. O sistema utilizará uma arquitetura modular com componentes React reutilizáveis, gerenciamento de estado local, e integração com APIs para persistência de dados. O design seguirá os padrões visuais já estabelecidos no site principal, mantendo consistência na experiência do usuário.

## Architecture

### Frontend Architecture
```
src/
├── app/
│   └── admin/
│       ├── layout.tsx          # Layout do painel admin
│       ├── page.tsx            # Dashboard principal
│       ├── clientes/
│       │   ├── page.tsx        # Lista de clientes
│       │   ├── novo/page.tsx   # Formulário novo cliente
│       │   └── [id]/
│       │       └── page.tsx    # Editar cliente
│       ├── imoveis/
│       │   ├── page.tsx        # Lista de imóveis
│       │   ├── novo/page.tsx   # Formulário novo imóvel
│       │   └── [id]/
│       │       └── page.tsx    # Editar imóvel
│       └── cidades/
│           ├── page.tsx        # Lista de cidades
│           └── nova/page.tsx   # Formulário nova cidade
├── components/
│   └── admin/
│       ├── Layout/
│       │   ├── AdminLayout.tsx
│       │   ├── Sidebar.tsx
│       │   └── TopBar.tsx
│       ├── Forms/
│       │   ├── ClienteForm.tsx
│       │   ├── ImovelForm.tsx
│       │   ├── CidadeForm.tsx
│       │   └── ImageUpload.tsx
│       ├── Tables/
│       │   ├── ClientesTable.tsx
│       │   ├── ImoveisTable.tsx
│       │   └── CidadesTable.tsx
│       └── Common/
│           ├── Modal.tsx
│           ├── ConfirmDialog.tsx
│           ├── LoadingSpinner.tsx
│           └── Toast.tsx
├── lib/
│   ├── api/
│   │   ├── clientes.ts
│   │   ├── imoveis.ts
│   │   └── cidades.ts
│   ├── utils/
│   │   ├── imageProcessing.ts
│   │   ├── validation.ts
│   │   └── formatters.ts
│   └── types/
│       ├── cliente.ts
│       ├── imovel.ts
│       └── cidade.ts
└── hooks/
    ├── useClientes.ts
    ├── useImoveis.ts
    └── useCidades.ts
```

### Backend Architecture
```
src/app/api/
├── auth/
│   └── route.ts              # Autenticação admin
├── clientes/
│   ├── route.ts              # GET, POST clientes
│   └── [id]/
│       └── route.ts          # GET, PUT, DELETE cliente específico
├── imoveis/
│   ├── route.ts              # GET, POST imóveis
│   ├── [id]/
│   │   └── route.ts          # GET, PUT, DELETE imóvel específico
│   └── upload/
│       └── route.ts          # Upload e processamento de imagens
└── cidades/
    ├── route.ts              # GET, POST cidades
    └── [id]/
        └── route.ts          # GET, PUT, DELETE cidade específica
```

### Supabase Database Schema
```sql
-- Tabela de Clientes
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Cidades
CREATE TABLE cidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Imóveis
CREATE TABLE imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- Apartamento, Casa, Terreno, etc.
  finalidade VARCHAR(20) NOT NULL, -- venda, aluguel, ambos
  valor_venda DECIMAL(12,2),
  valor_aluguel DECIMAL(12,2),
  descricao TEXT,
  quartos INTEGER DEFAULT 0,
  banheiros INTEGER DEFAULT 0,
  area_total DECIMAL(10,2),
  caracteristicas JSONB, -- Array de características
  comodidades JSONB, -- Array de comodidades
  endereco_completo TEXT,
  cidade_id UUID REFERENCES cidades(id),
  bairro VARCHAR(255),
  destaque BOOLEAN DEFAULT false,
  cliente_id UUID REFERENCES clientes(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Imagens dos Imóveis
CREATE TABLE imovel_imagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  url_thumb VARCHAR(500), -- Thumbnail
  storage_path VARCHAR(500), -- Caminho no Supabase Storage
  ordem INTEGER DEFAULT 0,
  tipo VARCHAR(20) DEFAULT 'paisagem', -- retrato ou paisagem
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_imoveis_cidade_id ON imoveis(cidade_id);
CREATE INDEX idx_imoveis_cliente_id ON imoveis(cliente_id);
CREATE INDEX idx_imoveis_tipo ON imoveis(tipo);
CREATE INDEX idx_imoveis_finalidade ON imoveis(finalidade);
CREATE INDEX idx_imoveis_destaque ON imoveis(destaque);
CREATE INDEX idx_imovel_imagens_imovel_id ON imovel_imagens(imovel_id);

-- RLS (Row Level Security) policies
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE imovel_imagens ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (apenas leitura)
CREATE POLICY "Permitir leitura pública de cidades ativas" ON cidades
  FOR SELECT USING (ativa = true);

CREATE POLICY "Permitir leitura pública de imóveis ativos" ON imoveis
  FOR SELECT USING (ativo = true);

CREATE POLICY "Permitir leitura pública de imagens" ON imovel_imagens
  FOR SELECT USING (true);
```

### Supabase Storage Configuration
```typescript
// Configuração do Storage para imagens
const STORAGE_BUCKET = 'imoveis-images';

// Políticas de Storage
const storagePolicy = {
  name: 'Permitir upload de imagens para admins',
  definition: 'auth.role() = "authenticated"',
  check: 'bucket_id = "imoveis-images"'
};
```

## Components and Interfaces

### Core Data Types
```typescript
// Cliente
interface Cliente {
  id?: string; // UUID do Supabase
  nome: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  endereco?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

// Cidade
interface Cidade {
  id?: string; // UUID do Supabase
  nome: string;
  ativa: boolean;
  created_at?: string;
}

// Imóvel
interface Imovel {
  id?: string; // UUID do Supabase
  nome: string;
  tipo: string;
  finalidade: 'venda' | 'aluguel' | 'ambos';
  valor_venda?: number;
  valor_aluguel?: number;
  descricao?: string;
  quartos: number;
  banheiros: number;
  area_total?: number;
  caracteristicas: string[];
  comodidades: string[];
  endereco_completo?: string;
  cidade_id?: string; // UUID referência
  bairro?: string;
  destaque: boolean;
  cliente_id?: string; // UUID referência
  ativo: boolean;
  imagens?: ImovelImagem[];
  cidade?: Cidade;
  cliente?: Cliente;
}

// Imagem do Imóvel
interface ImovelImagem {
  id?: string; // UUID do Supabase
  imovel_id: string; // UUID referência
  url: string;
  url_thumb?: string;
  storage_path?: string; // Caminho no Supabase Storage
  ordem: number;
  tipo: 'retrato' | 'paisagem';
}
```

### Key Components

#### AdminLayout Component
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

// Responsável por:
// - Sidebar de navegação
// - TopBar com informações do usuário
// - Breadcrumbs
// - Layout responsivo
```

#### ImageUpload Component
```typescript
interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  existingImages?: ImovelImagem[];
  onRemove?: (imageId: number) => void;
  onReorder?: (images: ImovelImagem[]) => void;
}

// Funcionalidades:
// - Drag & drop de múltiplas imagens
// - Preview das imagens
// - Reordenação por arrastar
// - Remoção de imagens
// - Indicador de progresso de upload
// - Validação de tipos e tamanhos
```

#### DataTable Component
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchable?: boolean;
  filterable?: boolean;
}

// Funcionalidades:
// - Ordenação por colunas
// - Busca em tempo real
// - Filtros customizáveis
// - Paginação
// - Ações em linha (editar, excluir)
// - Loading states
```

## Data Models

### Image Processing System
O sistema de processamento de imagens será implementado com as seguintes especificações:

#### Dimensões Padronizadas
```typescript
const IMAGE_CONFIGS = {
  retrato: {
    width: 400,
    height: 600,
    quality: 85
  },
  paisagem: {
    width: 800,
    height: 500,
    quality: 85
  },
  thumbnail: {
    width: 200,
    height: 150,
    quality: 70
  }
};
```

#### Fluxo de Processamento
1. **Upload**: Receber arquivos via FormData
2. **Validação**: Verificar tipo, tamanho e dimensões
3. **Detecção**: Identificar se é retrato (altura > largura) ou paisagem
4. **Redimensionamento**: Aplicar dimensões padronizadas mantendo proporção
5. **Otimização**: Comprimir com qualidade adequada
6. **Armazenamento**: Salvar arquivo original e thumbnail
7. **Persistência**: Registrar no banco de dados

### Validation Rules
```typescript
const validationRules = {
  cliente: {
    nome: { required: true, minLength: 2, maxLength: 255 },
    email: { type: 'email', unique: true },
    telefone: { pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/ },
    cpf_cnpj: { pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/ }
  },
  imovel: {
    nome: { required: true, minLength: 5, maxLength: 255 },
    tipo: { required: true, enum: ['Apartamento', 'Casa', 'Terreno', 'Chácara', 'Sítio', 'Fazenda'] },
    finalidade: { required: true, enum: ['venda', 'aluguel', 'ambos'] },
    valor_venda: { type: 'number', min: 0 },
    valor_aluguel: { type: 'number', min: 0 },
    quartos: { type: 'number', min: 0, max: 20 },
    banheiros: { type: 'number', min: 0, max: 20 },
    area_total: { type: 'number', min: 1 }
  },
  cidade: {
    nome: { required: true, minLength: 2, maxLength: 255, unique: true }
  }
};
```

## Error Handling

### Error Types
```typescript
enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  AUTH = 'auth',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission'
}

interface AppError {
  type: ErrorType;
  message: string;
  field?: string;
  code?: string;
}
```

### Error Handling Strategy
1. **Client-side Validation**: Validação em tempo real nos formulários
2. **Server-side Validation**: Validação robusta nas APIs
3. **Network Errors**: Retry automático e fallbacks
4. **User Feedback**: Toast notifications e mensagens contextuais
5. **Error Logging**: Log detalhado para debugging

### Error Recovery
- **Auto-retry**: Para falhas de rede temporárias
- **Offline Support**: Cache local para operações críticas
- **Graceful Degradation**: Funcionalidade reduzida em caso de falhas
- **User Guidance**: Instruções claras para resolução de problemas

## Testing Strategy

### Unit Tests
- Componentes React com React Testing Library
- Funções utilitárias e validações
- Hooks customizados
- Processamento de imagens

### Integration Tests
- Fluxos completos de CRUD
- Upload e processamento de imagens
- Integração com APIs
- Navegação entre páginas

### E2E Tests
- Cenários de uso completos
- Testes de responsividade
- Performance em diferentes dispositivos
- Acessibilidade

### Test Coverage Goals
- Componentes: 90%+
- Utilities: 95%+
- API Routes: 85%+
- Critical Paths: 100%

## Security Considerations

### Authentication & Authorization
```typescript
// Middleware de autenticação
const authMiddleware = async (req: NextRequest) => {
  const token = req.cookies.get('admin-token');
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect('/admin/login');
  }
  return NextResponse.next();
};
```

### Data Protection
- **Input Sanitization**: Sanitizar todos os inputs do usuário
- **SQL Injection Prevention**: Usar prepared statements
- **XSS Protection**: Escapar outputs e validar inputs
- **CSRF Protection**: Tokens CSRF em formulários
- **File Upload Security**: Validação rigorosa de tipos e tamanhos

### Access Control
- **Role-based Access**: Diferentes níveis de permissão
- **Resource Protection**: Verificar ownership de recursos
- **Rate Limiting**: Limitar requests por IP/usuário
- **Audit Logging**: Log de todas as operações administrativas

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy loading de componentes admin
- **Image Optimization**: Next.js Image component com otimizações
- **Caching**: React Query para cache de dados
- **Bundle Analysis**: Monitoramento do tamanho do bundle

### Backend Optimization
- **Database Indexing**: Índices em campos de busca frequente
- **Query Optimization**: Evitar N+1 queries
- **Image Processing**: Processamento assíncrono
- **Caching Strategy**: Cache de dados estáticos

### Monitoring
- **Performance Metrics**: Core Web Vitals
- **Error Tracking**: Sentry ou similar
- **Usage Analytics**: Tracking de uso do painel
- **Database Performance**: Monitoramento de queries lentas