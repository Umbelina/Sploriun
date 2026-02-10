# Script de validação da aplicação - Windows (04/02/2026)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Validação de Compilação TypeScript" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se há erros de TypeScript
Write-Host "Executando verificação de tipos..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript: OK - Sem erros de compilação" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript: ERRO - Verifique os erros acima" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Verificação de Ambiente" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env.local existe
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local: Arquivo encontrado" -ForegroundColor Green
    
    # Verificar se contém as variáveis necessárias
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_SUPABASE_URL" -and $envContent -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host "✅ Variáveis de ambiente: OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️  AVISO: Variáveis de ambiente não encontradas ou vazias" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env.local: NÃO ENCONTRADO" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Verificação de Dependências" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se node_modules existe
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules: OK" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules não encontrado. Execute 'npm install'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Validação Concluída com Sucesso!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o servidor de desenvolvimento, execute:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Em seguida, acesse:" -ForegroundColor Cyan
Write-Host "  - http://localhost:5173/owner/login" -ForegroundColor Yellow
Write-Host "  - http://localhost:5173/owner/app" -ForegroundColor Yellow
