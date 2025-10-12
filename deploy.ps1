# Script de déploiement Eclairia sur eclairia.io
Write-Host "🚀 Déploiement d'Eclairia sur eclairia.io" -ForegroundColor Green

# Vérifier que le build existe
if (!(Test-Path "frontend/dist")) {
    Write-Host "❌ Le dossier frontend/dist n'existe pas. Lancement du build..." -ForegroundColor Red
    Set-Location frontend
    npm run build
    Set-Location ..
    
    if (!(Test-Path "frontend/dist")) {
        Write-Host "❌ Échec du build. Arrêt du script." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Build détecté dans frontend/dist" -ForegroundColor Green

# Vérifier la configuration netlify.toml
if (Test-Path "netlify.toml") {
    Write-Host "✅ Configuration netlify.toml trouvée" -ForegroundColor Green
} else {
    Write-Host "❌ netlify.toml manquant" -ForegroundColor Red
    exit 1
}

# Vérifier les fonctions Netlify
if (Test-Path "netlify/functions") {
    Write-Host "✅ Fonctions Netlify configurées" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier netlify/functions manquant" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Prêt pour le déploiement!" -ForegroundColor Cyan
Write-Host "Commandes à exécuter manuellement:" -ForegroundColor Yellow
Write-Host "1. netlify login (si pas déjà connecté)" -ForegroundColor White
Write-Host "2. netlify init (pour créer/connecter le projet)" -ForegroundColor White
Write-Host "3. netlify deploy --prod --dir=frontend/dist" -ForegroundColor White
Write-Host "`nOu utilisez l'interface web Netlify en glissant-déposant le dossier frontend/dist" -ForegroundColor Cyan

# Ouvrir le dossier dist dans l'explorateur pour faciliter le drag & drop
Write-Host "`n📁 Ouverture du dossier frontend/dist..." -ForegroundColor Green
Start-Process explorer.exe -ArgumentList (Resolve-Path "frontend/dist").Path

# Ouvrir Netlify dans le navigateur
Write-Host "🌐 Ouverture de Netlify..." -ForegroundColor Green
Start-Process "https://app.netlify.com/drop"

Write-Host "`n✨ Prêt pour le déploiement sur eclairia.io!" -ForegroundColor Green
