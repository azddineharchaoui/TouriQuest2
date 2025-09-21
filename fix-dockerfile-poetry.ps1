$services = @(
    "admin-service", "ai-service", "analytics-service", "api-gateway", 
    "auth-service", "booking-service", "experience-service", 
    "media-service", "notification-service", "poi-service", 
    "property-service", "recommendation-service"
)

$servicesDir = "touriquest-backend\services"

Write-Host "🔧 Fixing remaining Dockerfile.dev Poetry install commands..." -ForegroundColor Cyan

foreach ($service in $services) {
    $dockerfilePath = "$servicesDir\$service\Dockerfile.dev"
    
    if (Test-Path $dockerfilePath) {
        Write-Host "   Fixing $service..." -ForegroundColor Yellow
        
        $content = Get-Content $dockerfilePath -Raw
        $newContent = $content -replace '--with dev', '--with dev'
        
        if ($content -ne $newContent) {
            Set-Content -Path $dockerfilePath -Value $newContent -NoNewline
            Write-Host "   ✅ Fixed $service" -ForegroundColor Green
        } else {
            Write-Host "   ℹ️  $service already correct" -ForegroundColor Blue
        }
    } else {
        Write-Host "   ⚠️  $dockerfilePath not found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ All Dockerfile.dev files updated!" -ForegroundColor Green
Write-Host "🐳 You can now try building the services:" -ForegroundColor Cyan
Write-Host "docker-compose -f docker-compose.dev.yml build" -ForegroundColor White