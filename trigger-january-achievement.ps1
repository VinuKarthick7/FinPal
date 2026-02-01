# PowerShell script to trigger January 2026 achievement
# Run this after logging into the application

Write-Host "🔍 Triggering January 2026 Achievement Check..." -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Open your browser and log into FinPal (http://localhost:3001)"
Write-Host "2. Open browser DevTools (F12)"
Write-Host "3. Go to Application tab → Local Storage → http://localhost:3001"
Write-Host "4. Copy the value of 'authToken' or 'token'"
Write-Host "5. Paste it when prompted below"
Write-Host ""

$token = Read-Host "Enter your auth token"

if (-not $token) {
    Write-Host "❌ No token provided. Exiting." -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    month = 1
    year = 2026
} | ConvertTo-Json

try {
    Write-Host "📡 Sending request to check January 2026..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/test-achievements/manual-check" -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "✅ Response received:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
    if ($response.success) {
        Write-Host ""
        Write-Host "🌟 SUCCESS! Achievement awarded for January 2026!" -ForegroundColor Green
        Write-Host "👉 Refresh your Achievements page to see your star!" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "ℹ️  No achievement earned. Reasons:" -ForegroundColor Yellow
        Write-Host "   - Budget might not be set for January" -ForegroundColor Gray
        Write-Host "   - No expenses recorded in January" -ForegroundColor Gray
        Write-Host "   - Expenses exceeded budget in January" -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running on http://localhost:5000" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
