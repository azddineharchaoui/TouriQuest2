Write-Host "🔧 Missing Dependencies Fix Tool" -ForegroundColor Cyan
Write-Host "================================="

$ServicesDir = "touriquest-backend\services"
$Services = @(
    "admin-service", "ai-service", "analytics-service", "api-gateway",
    "auth-service", "booking-service", "communication-service",
    "experience-service", "integrations-service", "media-service",
    "monitoring-service", "notification-service", "poi-service",
    "property-service", "recommendation-service"
)

# Common package replacements for non-existent packages
$PackageReplacements = @{
    "magic" = "python-magic"
    "weather-api" = "pyowm"
    "weather-service" = "pyowm"
    "crypto" = "cryptography"
    "PIL" = "pillow"
    "cv2" = "opencv-python"
    "sklearn" = "scikit-learn"
    "jose" = "python-jose"
    "multipart" = "python-multipart"
    "decouple" = "python-decouple"
    "dateutil" = "python-dateutil"
}

function Check-And-Fix-Service {
    param($Service)
    
    $PyprojectFile = "$ServicesDir\$Service\pyproject.toml"
    
    Write-Host "`n🔍 Checking $Service..." -ForegroundColor Blue
    
    if (!(Test-Path $PyprojectFile)) {
        Write-Host "  ❌ pyproject.toml not found" -ForegroundColor Red
        return $false
    }
    
    # Create backup
    Copy-Item $PyprojectFile "$PyprojectFile.dep-check.backup"
    
    $content = Get-Content $PyprojectFile -Raw
    $originalContent = $content
    $fixed = $false
    
    # Check for common problematic packages
    foreach ($badPackage in $PackageReplacements.Keys) {
        $replacement = $PackageReplacements[$badPackage]
        $pattern = "^$badPackage = "
        
        if ($content -match $pattern) {
            Write-Host "  🔧 Replacing $badPackage with $replacement" -ForegroundColor Yellow
            $content = $content -replace "^$badPackage = ", "$replacement = "
            $fixed = $true
        }
    }
    
    # Check for other potentially problematic packages
    $problematicPackages = @("weather-api", "magic", "crypto", "PIL", "cv2", "sklearn", "jose", "multipart", "decouple", "dateutil")
    
    foreach ($pkg in $problematicPackages) {
        if ($content -match "^$pkg = ") {
            Write-Host "  ⚠️  Found potentially problematic package: $pkg" -ForegroundColor Yellow
        }
    }
    
    if ($fixed) {
        Set-Content -Path $PyprojectFile -Value $content
        Write-Host "  ✅ Fixed dependencies in $Service" -ForegroundColor Green
    } else {
        Write-Host "  ✅ No issues found in $Service" -ForegroundColor Green
    }
    
    return $true
}

function Test-Service-Build {
    param($Service)
    
    Write-Host "`n🧪 Testing $Service build..." -ForegroundColor Blue
    
    $result = docker-compose -f docker-compose.dev.yml build $Service 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $Service builds successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ $Service build failed" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "`n🚀 Starting dependency fix process...`n" -ForegroundColor Green

$fixedCount = 0
$buildSuccessCount = 0
$buildTotalCount = 0

# Fix all services
foreach ($service in $Services) {
    if (Check-And-Fix-Service $service) {
        $fixedCount++
    }
}

Write-Host "`n📊 Fix Summary:" -ForegroundColor Blue
Write-Host "=================="
Write-Host "Services processed: $($Services.Count)" -ForegroundColor Yellow
Write-Host "Services fixed: $fixedCount" -ForegroundColor Green

# Test critical services first
$criticalServices = @("media-service", "experience-service", "api-gateway", "auth-service")

Write-Host "`n🧪 Testing critical services..." -ForegroundColor Blue

foreach ($service in $criticalServices) {
    $buildTotalCount++
    if (Test-Service-Build $service) {
        $buildSuccessCount++
    }
}

Write-Host "`n📊 Build Test Summary:" -ForegroundColor Blue
Write-Host "======================"
Write-Host "Services tested: $buildTotalCount" -ForegroundColor Yellow
Write-Host "Successful builds: $buildSuccessCount" -ForegroundColor Green
Write-Host "Failed builds: $($buildTotalCount - $buildSuccessCount)" -ForegroundColor Red

if ($buildSuccessCount -eq $buildTotalCount) {
    Write-Host "`n🎉 All critical services build successfully!" -ForegroundColor Green
    Write-Host "`n🚀 Ready to build all services:" -ForegroundColor Blue
    Write-Host "docker-compose -f docker-compose.dev.yml build" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Some services still have issues. Check the output above." -ForegroundColor Yellow
    Write-Host "`n💾 Backups saved as .dep-check.backup files" -ForegroundColor Blue
}

Write-Host "`n📚 Available tools:" -ForegroundColor Blue
Write-Host "  .\test-media-service.ps1 - Test media service specifically"
Write-Host "  .\fix-media-dependencies.ps1 - Fix media service dependencies"