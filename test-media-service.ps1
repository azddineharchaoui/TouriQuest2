Write-Host "🧪 Testing media-service fix..." -ForegroundColor Cyan
Write-Host "==============================="

$MediaServiceDir = "touriquest-backend\services\media-service"
$PyprojectFile = "$MediaServiceDir\pyproject.toml"

Write-Host "`n1. Checking if file exists..." -ForegroundColor Blue

if (Test-Path $PyprojectFile) {
    Write-Host "✅ pyproject.toml found" -ForegroundColor Green
} else {
    Write-Host "❌ pyproject.toml not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Testing Docker build..." -ForegroundColor Blue

Write-Host "Building media-service..." -ForegroundColor Yellow
$buildResult = docker-compose -f docker-compose.dev.yml build media-service

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 media-service builds successfully!" -ForegroundColor Green
    
    Write-Host "`n🚀 Next steps:" -ForegroundColor Blue
    Write-Host "1. Build all services: docker-compose -f docker-compose.dev.yml build" -ForegroundColor Yellow
    Write-Host "2. Start all services: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ media-service build failed" -ForegroundColor Red
    Write-Host "💡 Check the error above" -ForegroundColor Yellow
    exit 1
}