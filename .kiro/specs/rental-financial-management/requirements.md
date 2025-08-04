# Requirements Document

## Introduction

Este documento define os requisitos para um sistema de controle de aluguéis e finanças da imobiliária. O sistema permitirá o gerenciamento completo de contratos de aluguel, controle de pagamentos, inadimplência, e relatórios financeiros, integrando-se ao sistema existente de gestão de imóveis e clientes.

## Requirements

### Requirement 1

**User Story:** Como administrador da imobiliária, eu quero gerenciar contratos de aluguel, para que eu possa controlar todos os aluguéis ativos e suas condições.

#### Acceptance Criteria

1. WHEN o administrador acessa a seção de contratos THEN o sistema SHALL exibir uma lista de todos os contratos de aluguel
2. WHEN o administrador cria um novo contrato THEN o sistema SHALL permitir vincular um imóvel, inquilino, valor do aluguel, data de início e fim
3. WHEN o administrador edita um contrato THEN o sistema SHALL permitir alterar dados como valor, datas e condições especiais
4. WHEN o administrador visualiza um contrato THEN o sistema SHALL exibir histórico completo de pagamentos e pendências

### Requirement 2

**User Story:** Como administrador da imobiliária, eu quero controlar os pagamentos de aluguel, para que eu possa acompanhar quais foram pagos e quais estão em atraso.

#### Acceptance Criteria

1. WHEN um pagamento é registrado THEN o sistema SHALL atualizar o status do aluguel para "pago" no mês correspondente
2. WHEN um aluguel não é pago até o vencimento THEN o sistema SHALL marcar automaticamente como "em atraso"
3. WHEN o administrador visualiza pagamentos THEN o sistema SHALL exibir calendário mensal com status de cada aluguel
4. WHEN um pagamento em atraso é quitado THEN o sistema SHALL calcular automaticamente juros e multas conforme configurado

### Requirement 3

**User Story:** Como administrador da imobiliária, eu quero gerar relatórios financeiros, para que eu possa analisar a performance financeira da empresa.

#### Acceptance Criteria

1. WHEN o administrador solicita relatório mensal THEN o sistema SHALL exibir receitas, despesas e inadimplência do período
2. WHEN o administrador solicita relatório por imóvel THEN o sistema SHALL mostrar rentabilidade individual de cada propriedade
3. WHEN o administrador solicita relatório de inadimplência THEN o sistema SHALL listar todos os aluguéis em atraso com valores e prazos
4. WHEN o administrador exporta relatórios THEN o sistema SHALL permitir download em PDF e Excel

### Requirement 4

**User Story:** Como administrador da imobiliária, eu quero configurar taxas e regras financeiras, para que o sistema calcule automaticamente juros, multas e comissões.

#### Acceptance Criteria

1. WHEN o administrador configura taxas THEN o sistema SHALL permitir definir percentuais de juros, multa e comissão
2. WHEN um pagamento atrasa THEN o sistema SHALL aplicar automaticamente as taxas configuradas
3. WHEN um contrato é criado THEN o sistema SHALL permitir definir regras específicas de cobrança para aquele contrato
4. IF existem regras específicas do contrato THEN o sistema SHALL priorizar essas regras sobre as configurações gerais

### Requirement 5

**User Story:** Como administrador da imobiliária, eu quero controlar despesas relacionadas aos imóveis, para que eu possa calcular a rentabilidade líquida de cada propriedade.

#### Acceptance Criteria

1. WHEN o administrador registra uma despesa THEN o sistema SHALL permitir vincular a despesa a um imóvel específico
2. WHEN o administrador categoriza despesas THEN o sistema SHALL permitir classificar como manutenção, impostos, seguros, etc.
3. WHEN o administrador visualiza rentabilidade THEN o sistema SHALL calcular receita bruta menos despesas por imóvel
4. WHEN o administrador gera relatório de despesas THEN o sistema SHALL agrupar por categoria e período

### Requirement 6

**User Story:** Como administrador da imobiliária, eu quero receber notificações sobre vencimentos e atrasos, para que eu possa tomar ações proativas na cobrança.

#### Acceptance Criteria

1. WHEN um aluguel está próximo do vencimento THEN o sistema SHALL enviar notificação 3 dias antes
2. WHEN um aluguel atrasa THEN o sistema SHALL enviar notificação imediata e lembretes periódicos
3. WHEN um contrato está próximo do fim THEN o sistema SHALL notificar 30 dias antes do vencimento
4. WHEN o administrador configura notificações THEN o sistema SHALL permitir personalizar prazos e tipos de alerta

### Requirement 7

**User Story:** Como administrador da imobiliária, eu quero integrar com o sistema existente de imóveis e clientes, para que eu não precise duplicar informações.

#### Acceptance Criteria

1. WHEN o administrador cria um contrato THEN o sistema SHALL utilizar a base existente de imóveis cadastrados
2. WHEN o administrador seleciona um inquilino THEN o sistema SHALL utilizar a base existente de clientes
3. WHEN dados são atualizados no sistema principal THEN o sistema SHALL refletir automaticamente nos contratos
4. WHEN o administrador acessa um imóvel THEN o sistema SHALL mostrar se está alugado e detalhes do contrato ativo