# Design Document

## Overview

Este documento descreve o design para um sistema completo de gerenciamento de usuários que se integra ao sistema de autenticação existente. O sistema permitirá cadastro de novos usuários por administradores, gerenciamento de perfil pelos próprios usuários, e administração de usuários com funcionalidades de ativação/desativação.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    A[Admin Interface] --> B[User Management API]
    C[User Profile Interface] --> B
    B --> D[Auth Database Layer]
    B --> E[Validation Layer]
    B --> F[Security Layer]
    D --> G[(Supabase - auth_users)]
    
    subgraph "Frontend Components"
        A1[User Registration Form]
        A2[User List/Management]
        C1[Profile View/Edit]
        C2[Password Change]
    end
    
    subgraph "API Routes"
        B1[/api/admin/users]
        B2[/api/user/profile]
        B3[/api/user/password]
    end
```

### Database Schema Extensions

Vamos estender a tabela `auth_users` existente para incluir campos necessários:

```sql
-- Adicionar campos à tabela auth_users existente
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) REFERENCES auth_users(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_is_active ON auth_users(is_active);
```

## Components and Interfaces

### 1. Admin User Management Components

#### UserRegistrationForm
- **Location**: `src/components/admin/Users/UserRegistrationForm.tsx`
- **Purpose**: Formulário para cadastro de novos usuários
- **Props**:
  ```typescript
  interface UserRegistrationFormProps {
    onSuccess: (user: User) => void;
    onCancel: () => void;
  }
  ```

#### UserManagementTable
- **Location**: `src/components/admin/Users/UserManagementTable.tsx`
- **Purpose**: Tabela para listar e gerenciar usuários
- **Features**: Busca, paginação, ações de ativar/desativar

#### UserManagementPage
- **Location**: `src/app/admin/usuarios/page.tsx`
- **Purpose**: Página principal de gerenciamento de usuários

### 2. User Profile Components

#### ProfileView
- **Location**: `src/components/user/ProfileView.tsx`
- **Purpose**: Visualização dos dados do perfil do usuário

#### ProfileEditForm
- **Location**: `src/components/user/ProfileEditForm.tsx`
- **Purpose**: Formulário para edição de dados do perfil

#### PasswordChangeForm
- **Location**: `src/components/user/PasswordChangeForm.tsx`
- **Purpose**: Formulário para alteração de senha

#### UserProfilePage
- **Location**: `src/app/admin/perfil/page.tsx`
- **Purpose**: Página de perfil do usuário logado

### 3. API Routes

#### Admin User Management API
- **Location**: `src/app/api/admin/users/route.ts`
- **Methods**:
  - `GET`: Listar usuários com paginação e busca
  - `POST`: Criar novo usuário

#### Individual User Management API
- **Location**: `src/app/api/admin/users/[id]/route.ts`
- **Methods**:
  - `GET`: Obter dados de um usuário específico
  - `PATCH`: Atualizar status (ativar/desativar)
  - `DELETE`: Remover usuário (soft delete)

#### User Profile API
- **Location**: `src/app/api/user/profile/route.ts`
- **Methods**:
  - `GET`: Obter dados do perfil do usuário logado
  - `PATCH`: Atualizar dados do perfil

#### Password Change API
- **Location**: `src/app/api/user/password/route.ts`
- **Methods**:
  - `PATCH`: Alterar senha do usuário logado

## Data Models

### Extended User Interface
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}
```

### Database Service Extensions
```typescript
// Extend existing auth database functions
export interface UserManagementService {
  createUser(userData: CreateUserRequest, createdBy: string): Promise<User>;
  updateUserProfile(userId: string, updates: UpdateProfileRequest): Promise<User>;
  changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  getUsersList(page: number, limit: number, search?: string): Promise<UserListResponse>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean>;
  checkEmailAvailability(email: string, excludeUserId?: string): Promise<boolean>;
}
```

## Error Handling

### Validation Errors
- Username já existe
- Email já existe
- Senha atual incorreta
- Senhas não coincidem
- Campos obrigatórios não preenchidos

### Security Errors
- Tentativa de acesso não autorizado
- Token inválido ou expirado
- Tentativa de alterar dados de outro usuário

### Database Errors
- Erro de conexão
- Violação de constraints
- Timeout de operação

### Error Response Format
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string; // Para erros de validação específicos
  };
}
```

## Testing Strategy

### Unit Tests
- Validação de formulários
- Funções de database
- Utilitários de validação
- Componentes isolados

### Integration Tests
- Fluxo completo de cadastro de usuário
- Fluxo de edição de perfil
- Fluxo de alteração de senha
- APIs de gerenciamento de usuários

### E2E Tests
- Cadastro de usuário pelo admin
- Login com novo usuário
- Edição de perfil
- Alteração de senha
- Desativação/ativação de usuário

### Security Tests
- Tentativas de acesso não autorizado
- Validação de unicidade de username/email
- Verificação de senha atual
- Proteção contra CSRF

## Security Considerations

### Authentication & Authorization
- Apenas administradores podem cadastrar novos usuários
- Usuários só podem editar seus próprios dados
- Validação de token JWT em todas as operações

### Data Validation
- Sanitização de inputs
- Validação de formato de email
- Validação de força de senha
- Prevenção de SQL injection

### Password Security
- Hash com bcrypt (já implementado)
- Verificação de senha atual antes de alteração
- Invalidação de sessões após mudança de senha

### Rate Limiting
- Limitar tentativas de cadastro por IP
- Limitar tentativas de alteração de senha
- Proteção contra ataques de força bruta

## Performance Considerations

### Database Optimization
- Índices em campos de busca (username, email)
- Paginação eficiente para lista de usuários
- Queries otimizadas para evitar N+1

### Frontend Optimization
- Lazy loading de componentes
- Debounce em campos de busca
- Cache de dados do usuário logado
- Validação client-side para feedback imediato

### API Optimization
- Compressão de responses
- Caching de dados estáticos
- Validação eficiente de unicidade

## Navigation Integration

### Admin Sidebar Update
Adicionar nova seção no menu de navegação:
```typescript
const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Imóveis', href: '/admin/imoveis', icon: Building },
  { name: 'Cidades', href: '/admin/cidades', icon: MapPin },
  { name: 'Usuários', href: '/admin/usuarios', icon: UserCog }, // Nova seção
]
```

### User Profile Access
Adicionar link para perfil no TopBar:
- Dropdown com nome do usuário
- Opção "Meu Perfil"
- Opção "Alterar Senha"
- Opção "Sair"

## Accessibility

### Form Accessibility
- Labels apropriados para todos os campos
- Mensagens de erro associadas aos campos
- Navegação por teclado
- Indicadores visuais de campos obrigatórios

### Table Accessibility
- Headers apropriados para tabelas
- Descrições para ações
- Navegação por teclado
- Screen reader support

### Visual Feedback
- Estados de loading
- Confirmações de sucesso
- Mensagens de erro claras
- Indicadores de progresso