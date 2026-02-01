# Quick Delete Invalid Achievement
# Paste your token and run this script

Write-Host "`n🗑️  Quick Delete Invalid Achievement" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Instructions to get token
Write-Host "STEP 1: Get your auth token" -ForegroundColor Yellow
Write-Host "  1. In your browser, press F12 (Developer Tools)" -ForegroundColor White
Write-Host "  2. Go to Console tab" -ForegroundColor White
Write-Host "  3. Type: localStorage.getItem('token')" -ForegroundColor White
Write-Host "  4. Copy the value (without quotes)" -ForegroundColor White
Write-Host ""

# Get token
$token = Read-Host "Paste your token here"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "`n❌ No token provided!" -ForegroundColor Red
    exit 1
}

# Clean token (remove quotes if user copied them)
$token = $token.Trim('"').Trim("'")

Write-Host "`n🔍 STEP 2: Checking your achievements..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    # Validate first
    Write-Host "Validating achievements for barathgobi2007@gmail.com..." -ForegroundColor Gray
    $validateResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/achievements/validate" -Method Get -Headers $headers
    
    Write-Host "`n📊 VALIDATION RESULTS:" -ForegroundColor Cyan
    Write-Host "  Total checked: $($validateResponse.data.totalChecked)" -ForegroundColor White
    Write-Host "  ✅ Valid: $($validateResponse.data.validCount)" -ForegroundColor Green
    Write-Host "  ❌ Invalid: $($validateResponse.data.invalidCount)" -ForegroundColor Red
    
    if ($validateResponse.data.invalidCount -eq 0) {
        Write-Host "`n✨ All achievements are valid! Nothing to delete." -ForegroundColor Green
        exit 0
    }
    
    Write-Host "`n❌ INVALID ACHIEVEMENTS FOUND:" -ForegroundColor Red
    foreach ($invalid in $validateResponse.data.invalidAchievements) {
        Write-Host "  Month/Year: $($invalid.month)/$($invalid.year)" -ForegroundColor Yellow
        Write-Host "  Reason: $($invalid.reason)" -ForegroundColor Yellow
        Write-Host ""
    }
    
    # Delete
    Write-Host "🗑️  STEP 3: Deleting invalid achievements..." -ForegroundColor Yellow
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/achievements/clean" -Method Delete -Headers $headers
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Gray
    Write-Host "Deleted: $($deleteResponse.data.deletedCount) achievement(s)" -ForegroundColor Green
    Write-Host "`n📱 NEXT STEP: Refresh your FinPal page in the browser" -ForegroundColor Cyan
    Write-Host "   The achievement page should now show 0 stars ✨" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "  - Server is running (http://localhost:3001)" -ForegroundColor Yellow
    Write-Host "  - You copied the correct token" -ForegroundColor Yellow
    Write-Host "  - You're logged in as barathgobi2007@gmail.com" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
