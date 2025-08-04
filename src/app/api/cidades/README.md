# Cidades API

API endpoints para gerenciamento de cidades.

## Endpoints

### GET /api/cidades
Lista todas as cidades cadastradas, ordenadas por nome.

**Response:**
```json
{
  "cidades": [
    {
      "id": "uuid",
      "nome": "São Paulo",
      "ativa": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/cidades
Cria uma nova cidade.

**Request Body:**
```json
{
  "nome": "Nome da Cidade",
  "ativa": true
}
```

**Response:**
```json
{
  "cidade": {
    "id": "uuid",
    "nome": "Nome da Cidade",
    "ativa": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/cidades/[id]
Busca uma cidade específica por ID.

**Response:**
```json
{
  "cidade": {
    "id": "uuid",
    "nome": "São Paulo",
    "ativa": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /api/cidades/[id]
Atualiza uma cidade existente.

**Request Body:**
```json
{
  "nome": "Novo Nome",
  "ativa": false
}
```

**Response:**
```json
{
  "cidade": {
    "id": "uuid",
    "nome": "Novo Nome",
    "ativa": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api/cidades/[id]
Exclui uma cidade. Verifica se não há imóveis vinculados antes da exclusão.

**Response:**
```json
{
  "message": "Cidade excluída com sucesso"
}
```

## Validações

- Nome da cidade é obrigatório (mínimo 2 caracteres, máximo 255)
- Nome deve ser único
- Não é possível excluir cidade com imóveis vinculados

## Códigos de Erro

- `400` - Dados inválidos
- `404` - Cidade não encontrada
- `409` - Conflito (nome duplicado ou imóveis vinculados)
- `500` - Erro interno do servidor