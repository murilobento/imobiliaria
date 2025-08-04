# Sistema de Processamento Automático

Este documento descreve o sistema de processamento automático de vencimentos implementado para o sistema de controle de aluguéis e finanças.

## Visão Geral

O sistema de processamento automático executa diariamente as seguintes operações:

1. **Processamento de Vencimentos**: Atualiza status de pagamentos vencidos e calcula juros/multas
2. **Envio de Notificações**: Cria e envia notificações automáticas para vencimentos próximos e atrasos
3. **Limpeza de Dados**: Remove logs antigos e dados desnecessários
4. **Auditoria**: Registra todas as operações para controle e monitoramento

## Componentes

### 1. ProcessamentoAutomaticoService

Serviço principal que coordena todas as operações automáticas.

**Localização**: `src/lib/services/processamentoAutomaticoService.ts`

**Principais métodos**:
- `executarProcessamentoDiario()`: Executa o processamento completo
- `buscarLogsAuditoria()`: Consulta logs de auditoria
- `obterEstatisticasUltimoProcessamento()`: Obtém estatísticas do último processamento

### 2. API Endpoints

#### POST /api/processamento-automatico
Executa o processamento automático completo.

**Autenticação**: Bearer token (CRON_SECRET_KEY)

**Parâmetros**:
```json
{
  "dataReferencia": "2024-01-15", // Opcional
  "forcarExecucao": false         // Opcional
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "processamento_vencimentos": {
      "pagamentos_processados": 5,
      "pagamentos_vencidos": 2,
      "notificacoes_enviadas": 3,
      "erros": []
    },
    "notificacoes_processadas": 3,
    "tempo_total_execucao_ms": 1500,
    "logs_criados": 6
  },
  "message": "Processamento concluído com sucesso"
}
```

#### GET /api/processamento-automatico
Obtém estatísticas do último processamento.

#### GET /api/logs-auditoria
Consulta logs de auditoria com filtros.

**Parâmetros de query**:
- `tipo`: Tipo de operação
- `resultado`: Resultado da operação (sucesso/erro/parcial)
- `operacao`: Nome da operação
- `data_inicio`: Data de início do filtro
- `data_fim`: Data de fim do filtro
- `page`: Página (padrão: 1)
- `limit`: Limite por página (padrão: 50, máximo: 100)

### 3. Cron Job Script

**Localização**: `scripts/cron-processamento-automatico.js`

Script Node.js para execução via cron job.

**Uso**:
```bash
# Execução básica
node scripts/cron-processamento-automatico.js

# Com data específica
node scripts/cron-processamento-automatico.js --data=2024-01-15

# Forçar execução
node scripts/cron-processamento-automatico.js --forcar

# Modo verbose
node scripts/cron-processamento-automatico.js --verbose
```

**Configuração do cron** (executar diariamente às 6:00):
```bash
0 6 * * * /usr/bin/node /path/to/project/scripts/cron-processamento-automatico.js >> /var/log/processamento-automatico.log 2>&1
```

### 4. Componente de Interface

**Localização**: `src/components/admin/Financeiro/ProcessamentoAutomatico/StatusProcessamento.tsx`

Componente React para visualizar o status do processamento automático no painel administrativo.

**Funcionalidades**:
- Exibe estatísticas do último processamento
- Permite execução manual do processamento
- Mostra logs recentes de auditoria
- Atualização automática a cada 5 minutos

## Configuração

### Variáveis de Ambiente

```env
# Chave secreta para autenticação do cron job
CRON_SECRET_KEY=sua_chave_secreta_aqui

# URL base da aplicação
NEXT_PUBLIC_SITE_URL=https://sua-aplicacao.com

# Chave de serviço do Supabase (para operações automáticas)
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### Banco de Dados

O sistema utiliza as seguintes tabelas:

1. **logs_auditoria**: Armazena logs de todas as operações automáticas
2. **configuracoes_financeiras**: Configurações de taxas e prazos
3. **pagamentos_aluguel**: Pagamentos que são processados
4. **notificacoes**: Notificações geradas automaticamente

## Fluxo de Processamento

### 1. Processamento de Vencimentos

1. Busca pagamentos pendentes com vencimento até a data de referência
2. Para cada pagamento:
   - Calcula dias de atraso
   - Aplica juros e multa se necessário (respeitando carência)
   - Atualiza status para "atrasado" se aplicável
   - Registra log de auditoria individual

### 2. Processamento de Notificações

1. Executa `NotificacaoService.processarNotificacoes()`
2. Cria notificações para:
   - Vencimentos próximos (3 dias antes)
   - Pagamentos atrasados
   - Contratos próximos do vencimento
   - Lembretes de cobrança periódicos

### 3. Limpeza de Dados

1. Remove logs de auditoria mais antigos que 90 dias
2. Remove notificações lidas mais antigas que 30 dias

### 4. Auditoria

Cada operação gera logs detalhados com:
- Tipo de operação
- Resultado (sucesso/erro/parcial)
- Tempo de execução
- Número de registros afetados
- Detalhes específicos da operação

## Monitoramento

### Logs de Auditoria

Todos os logs são armazenados na tabela `logs_auditoria` com:
- Timestamp da execução
- Tipo de operação
- Resultado
- Detalhes em JSON
- Tempo de execução
- Registros afetados

### Estatísticas

O sistema mantém estatísticas do último processamento:
- Data/hora da última execução
- Número de pagamentos processados
- Número de notificações enviadas
- Tempo total de execução
- Status de sucesso/erro

### Interface de Monitoramento

O componente `StatusProcessamento` fornece:
- Dashboard com métricas em tempo real
- Histórico de logs recentes
- Botões para execução manual
- Atualização automática dos dados

## Tratamento de Erros

### Estratégias de Recuperação

1. **Retry automático**: O script de cron tenta 3 vezes com delay de 5 segundos
2. **Processamento parcial**: Continua processando mesmo se alguns itens falharem
3. **Logs detalhados**: Registra todos os erros para análise posterior
4. **Rollback**: Operações críticas são atômicas

### Tipos de Erro

1. **Erros de conexão**: Problemas de rede ou banco de dados
2. **Erros de validação**: Dados inválidos ou inconsistentes
3. **Erros de cálculo**: Problemas nos cálculos financeiros
4. **Erros de notificação**: Falhas no envio de notificações

## Segurança

### Autenticação

- API protegida por token secreto (`CRON_SECRET_KEY`)
- Validação de origem das requisições
- Rate limiting para prevenir abuso

### Auditoria

- Todos os acessos são logados
- Operações críticas têm rastreabilidade completa
- Logs incluem informações de contexto

### Dados Sensíveis

- Valores financeiros são validados antes do processamento
- Operações são atômicas para manter consistência
- Backup automático através dos logs de auditoria

## Troubleshooting

### Problemas Comuns

1. **Processamento não executou**:
   - Verificar se o cron job está configurado
   - Validar variáveis de ambiente
   - Checar logs do sistema

2. **Erros de cálculo**:
   - Verificar configurações financeiras
   - Validar dados dos contratos
   - Checar logs de auditoria

3. **Notificações não enviadas**:
   - Verificar configurações de notificação
   - Validar dados dos usuários
   - Checar status do serviço de notificações

### Comandos de Diagnóstico

```bash
# Testar execução manual
node scripts/cron-processamento-automatico.js --verbose

# Verificar logs recentes
curl -H "Authorization: Bearer $CRON_SECRET_KEY" \
     "https://sua-app.com/api/logs-auditoria?limit=10"

# Obter estatísticas
curl -H "Authorization: Bearer $CRON_SECRET_KEY" \
     "https://sua-app.com/api/processamento-automatico"
```

## Desenvolvimento

### Testes

Execute os testes do sistema:

```bash
npm test src/test/integration/processamento-automatico.test.ts
```

### Extensões

Para adicionar novas funcionalidades ao processamento automático:

1. Estenda o `ProcessamentoAutomaticoService`
2. Adicione novos tipos de log de auditoria
3. Atualize a interface de monitoramento
4. Adicione testes correspondentes

### Configurações Personalizadas

O sistema permite configurações personalizadas através da tabela `configuracoes_financeiras`:

- Taxa de juros mensal
- Taxa de multa
- Dias de carência
- Intervalos de notificação

## Backup e Recuperação

### Backup Automático

- Logs de auditoria servem como backup das operações
- Dados críticos são preservados por 90 dias
- Configurações são versionadas

### Recuperação

Em caso de problemas:

1. Consulte os logs de auditoria para identificar o problema
2. Use a funcionalidade de "forçar execução" se necessário
3. Valide a consistência dos dados após recuperação
4. Execute testes para garantir funcionamento correto