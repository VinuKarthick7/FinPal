# Test Achievement Fix - Verify NO BUDGET = NO STAR rule
# This script validates and cleans invalid achievements

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ACHIEVEMENT VALIDATION TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "🔧 Testing fix for: Users without budgets should NOT have stars`n" -ForegroundColor Yellow

# Check if .env exists in server folder
$envFile = "server\.env"
if (Test-Path $envFile) {
    Write-Host "✅ Found .env file`n" -ForegroundColor Green
    
    # Load environment variables
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "⚠️  .env file not found - using default MongoDB connection`n" -ForegroundColor Yellow
}

Write-Host "Running achievement validation...`n" -ForegroundColor Cyan

# Run the test script
node test-achievement-fix.js

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
