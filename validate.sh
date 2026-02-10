#!/bin/bash
# Script de validação da aplicação - 04/02/2026

echo "================================"
echo "Validação de Compilação TypeScript"
echo "================================"

# Verificar se há erros de TypeScript
echo "Executando verificação de tipos..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript: OK - Sem erros de compilação"
else
    echo "❌ TypeScript: ERRO - Verifique os erros acima"
    exit 1
fi

echo ""
echo "================================"
echo "Verificação de Ambiente"
echo "================================"

# Verificar se .env.local existe
if [ -f ".env.local" ]; then
    echo "✅ .env.local: Arquivo encontrado"
    
    # Verificar se contém as variáveis necessárias
    if grep -q "VITE_SUPABASE_URL" .env.local && grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
        echo "✅ Variáveis de ambiente: OK"
    else
        echo "⚠️  AVISO: Variáveis de ambiente não encontradas ou vazias"
    fi
else
    echo "❌ .env.local: NÃO ENCONTRADO"
    exit 1
fi

echo ""
echo "================================"
echo "Verificação de Dependências"
echo "================================"

# Verificar se node_modules existe
if [ -d "node_modules" ]; then
    echo "✅ node_modules: OK"
else
    echo "⚠️  node_modules não encontrado. Execute 'npm install'"
fi

echo ""
echo "================================"
echo "Validação Concluída com Sucesso!"
echo "================================"
echo ""
echo "Para iniciar o servidor de desenvolvimento, execute:"
echo "  npm run dev"
echo ""
echo "Em seguida, acesse:"
echo "  - http://localhost:5173/owner/login"
echo "  - http://localhost:5173/owner/app"
