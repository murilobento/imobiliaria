#!/bin/bash

echo "🧪 Testando API de Perfil do Usuário..."
echo

# Configurações
BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/test_cookies.txt"

# 1. Fazer login
echo "1. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "Resposta do login: $LOGIN_RESPONSE"

# Verificar se o login foi bem-sucedido
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Login realizado com sucesso"
else
  echo "❌ Falha no login"
  exit 1
fi

echo

# 2. Obter perfil atual
echo "2. Obtendo perfil atual..."
PROFILE_RESPONSE=$(curl -s -b "$COOKIE_FILE" \
  "$BASE_URL/api/user/profile")

echo "Resposta do perfil: $PROFILE_RESPONSE"
echo

# 3. Atualizar perfil
echo "3. Atualizando perfil..."
UPDATE_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X PATCH \
  "$BASE_URL/api/user/profile" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Administrador do Sistema","username":"admin","email":"admin@imobiliaria.com"}')

echo "Resposta da atualização: $UPDATE_RESPONSE"
echo

# 4. Verificar mudanças
echo "4. Verificando mudanças..."
VERIFY_RESPONSE=$(curl -s -b "$COOKIE_FILE" \
  "$BASE_URL/api/user/profile")

echo "Resposta da verificação: $VERIFY_RESPONSE"

# Limpar arquivo de cookies
rm -f "$COOKIE_FILE"

echo
echo "✅ Teste concluído!"