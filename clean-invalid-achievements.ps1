# Script to clean invalid achievements from your account
# Run this after logging into your FinPal account

Write-Host "🔍 Cleaning Invalid Achievements..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Check all your achievements" -ForegroundColor Yellow
Write-Host "  2. Validate each one against actual budget/spending" -ForegroundColor Yellow
Write-Host "  3. Remove any achievements where you exceeded the budget" -ForegroundColor Yellow
Write-Host ""

# Get the authentication token (you'll need to be logged in)
$BaseUrl = "http://localhost:3001"

Write-Host "Please make sure you're logged into FinPal in your browser first!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue or Ctrl+C to cancel..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Instructions
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "INSTRUCTIONS:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Open your browser's Developer Tools (F12)" -ForegroundColor White
Write-Host "2. Go to Application tab (Chrome) or Storage tab (Firefox)" -ForegroundColor White
Write-Host "3. Find 'localStorage' under your domain" -ForegroundColor White
Write-Host "4. Look for 'token' key and copy its value" -ForegroundColor White
Write-Host ""
Write-Host "Paste your auth token here (it will be hidden):" -ForegroundColor Cyan
$Token = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
$TokenValue = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

if ([string]::IsNullOrWhiteSpace($TokenValue)) {
    Write-Host ""
    Write-Host "❌ No token provided. Exiting..." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Validating your achievements..." -ForegroundColor Cyan

try {
    $Headers = @{
        "Authorization" = "Bearer $TokenValue"
        "Content-Type" = "application/json"
    }

    # Validate achievements
    $ValidateResponse = Invoke-RestMethod -Uri "$BaseUrl/api/achievements/validate" -Method Get -Headers $Headers
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "VALIDATION RESULTS" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Valid achievements: $($ValidateResponse.data.validCount)" -ForegroundColor Green
    Write-Host "❌ Invalid achievements: $($ValidateResponse.data.invalidCount)" -ForegroundColor Red
    Write-Host ""

    if ($ValidateResponse.data.invalidCount -gt 0) {
        Write-Host "Invalid Achievements Found:" -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($invalid in $ValidateResponse.data.invalidAchievements) {
            $monthNames = @("", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
            $monthName = $monthNames[$invalid.month]
            
            Write-Host "  📅 $monthName $($invalid.year)" -ForegroundColor White
            Write-Host "     Reason: $($invalid.reason)" -ForegroundColor Yellow
            if ($invalid.actualBudget -and $invalid.actualSpent) {
                Write-Host "     Budget: ₹$($invalid.actualBudget) | Spent: ₹$($invalid.actualSpent) | Exceeded by: ₹$($invalid.exceeded)" -ForegroundColor Red
            }
            Write-Host ""
        }

        Write-Host "Do you want to delete these invalid achievements? (y/n): " -ForegroundColor Cyan -NoNewline
        $Confirm = Read-Host

        if ($Confirm -eq 'y' -or $Confirm -eq 'Y') {
            Write-Host ""
            Write-Host "Step 2: Cleaning invalid achievements..." -ForegroundColor Cyan
            
            $CleanResponse = Invoke-RestMethod -Uri "$BaseUrl/api/achievements/clean" -Method Delete -Headers $Headers
            
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "CLEANUP COMPLETE" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "✅ Deleted $($CleanResponse.data.deletedCount) invalid achievement(s)" -ForegroundColor Green
            Write-Host ""
            Write-Host "Please refresh your FinPal page to see the updated achievements!" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "⚠️ Cleanup cancelled. No changes made." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✨ All your achievements are valid! No cleanup needed." -ForegroundColor Green
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Your server is running (npm run dev)" -ForegroundColor Yellow
    Write-Host "  2. You're logged into FinPal" -ForegroundColor Yellow
    Write-Host "  3. You copied the correct auth token" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
