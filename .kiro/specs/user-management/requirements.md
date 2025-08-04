# Requirements Document

## Introduction

Este documento define os requisitos para um sistema de cadastro de usuários e gerenciamento de perfil que permite aos administradores cadastrar novos usuários e aos usuários logados gerenciar seus próprios dados, incluindo a alteração de username único.

## Requirements

### Requirement 1

**User Story:** Como um administrador, eu quero cadastrar novos usuários no sistema, para que eles possam acessar o painel administrativo.

#### Acceptance Criteria

1. WHEN um administrador acessa a página de cadastro de usuários THEN o sistema SHALL exibir um formulário com campos para username, email, senha e confirmação de senha
2. WHEN um administrador submete o formulário com dados válidos THEN o sistema SHALL criar um novo usuário na base de dados
3. WHEN um administrador tenta cadastrar um usuário com username já existente THEN o sistema SHALL exibir uma mensagem de erro informando que o username já está em uso
4. WHEN um administrador tenta cadastrar um usuário com email já existente THEN o sistema SHALL exibir uma mensagem de erro informando que o email já está em uso
5. WHEN um administrador submete o formulário com senha e confirmação diferentes THEN o sistema SHALL exibir uma mensagem de erro
6. WHEN um usuário é cadastrado com sucesso THEN o sistema SHALL exibir uma mensagem de confirmação e limpar o formulário

### Requirement 2

**User Story:** Como um usuário logado, eu quero visualizar meus dados de perfil, para que eu possa verificar minhas informações atuais.

#### Acceptance Criteria

1. WHEN um usuário logado acessa a página de perfil THEN o sistema SHALL exibir seus dados atuais (username, email, data de criação)
2. WHEN um usuário acessa a página de perfil THEN o sistema SHALL exibir um botão para editar os dados
3. IF o usuário não estiver autenticado THEN o sistema SHALL redirecionar para a página de login

### Requirement 3

**User Story:** Como um usuário logado, eu quero editar meu username e email, para que eu possa manter meus dados atualizados.

#### Acceptance Criteria

1. WHEN um usuário clica no botão de editar perfil THEN o sistema SHALL exibir um formulário preenchido com os dados atuais
2. WHEN um usuário altera seu username para um valor único THEN o sistema SHALL salvar a alteração
3. WHEN um usuário tenta alterar seu username para um valor já existente THEN o sistema SHALL exibir uma mensagem de erro
4. WHEN um usuário altera seu email para um valor único THEN o sistema SHALL salvar a alteração
5. WHEN um usuário tenta alterar seu email para um valor já existente THEN o sistema SHALL exibir uma mensagem de erro
6. WHEN um usuário salva alterações válidas THEN o sistema SHALL atualizar os dados e exibir uma mensagem de sucesso
7. WHEN um usuário cancela a edição THEN o sistema SHALL retornar à visualização dos dados sem salvar alterações

### Requirement 4

**User Story:** Como um usuário logado, eu quero alterar minha senha, para que eu possa manter minha conta segura.

#### Acceptance Criteria

1. WHEN um usuário acessa a opção de alterar senha THEN o sistema SHALL exibir um formulário com campos para senha atual, nova senha e confirmação
2. WHEN um usuário submete o formulário com senha atual incorreta THEN o sistema SHALL exibir uma mensagem de erro
3. WHEN um usuário submete nova senha e confirmação diferentes THEN o sistema SHALL exibir uma mensagem de erro
4. WHEN um usuário submete uma nova senha válida THEN o sistema SHALL atualizar a senha e exibir mensagem de sucesso
5. WHEN a senha é alterada com sucesso THEN o sistema SHALL manter o usuário logado

### Requirement 5

**User Story:** Como um administrador, eu quero visualizar uma lista de todos os usuários cadastrados, para que eu possa gerenciar o sistema.

#### Acceptance Criteria

1. WHEN um administrador acessa a página de usuários THEN o sistema SHALL exibir uma tabela com todos os usuários (username, email, data de criação, status)
2. WHEN um administrador visualiza a lista THEN o sistema SHALL incluir opções de busca por username ou email
3. WHEN um administrador busca por um usuário THEN o sistema SHALL filtrar a lista em tempo real
4. WHEN um administrador visualiza a lista THEN o sistema SHALL incluir paginação se houver muitos usuários

### Requirement 6

**User Story:** Como um administrador, eu quero desativar/ativar usuários, para que eu possa controlar o acesso ao sistema.

#### Acceptance Criteria

1. WHEN um administrador visualiza a lista de usuários THEN o sistema SHALL exibir o status atual de cada usuário (ativo/inativo)
2. WHEN um administrador clica para desativar um usuário ativo THEN o sistema SHALL solicitar confirmação
3. WHEN um administrador confirma a desativação THEN o sistema SHALL marcar o usuário como inativo e impedir seu login
4. WHEN um administrador clica para ativar um usuário inativo THEN o sistema SHALL reativar o usuário
5. WHEN um usuário é desativado THEN suas sessões ativas SHALL ser invalidadas