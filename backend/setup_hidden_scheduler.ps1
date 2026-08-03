# PowerShell script to setup hidden task scheduler for follow-up notifications
# Run this as Administrator

$TaskName = "CRM_FollowUp_Notifications"
$BackendPath = $PSScriptRoot
$VBSFile = Join-Path $BackendPath "run_followup_notifications_hidden.vbs"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setting Up Hidden Task Scheduler" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if VBS file exists
if (-not (Test-Path $VBSFile)) {
    Write-Host "ERROR: VBS file not found: $VBSFile" -ForegroundColor Red
    exit 1
}

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Write-Host "Creating new hidden task..." -ForegroundColor Yellow
Write-Host ""

# Create the task using schtasks command (more reliable for complex schedules)
$Command = "wscript.exe `"$VBSFile`""
schtasks /Create /TN $TaskName /TR $Command /SC MINUTE /MO 1 /F /RL HIGHEST

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✓ Task is now running HIDDEN - no CMD window will appear!" -ForegroundColor Green
    Write-Host ""
    Write-Host "How it works:" -ForegroundColor Cyan
    Write-Host "  - Task runs every 1 minute" -ForegroundColor Gray
    Write-Host "  - VBScript wrapper hides the CMD window" -ForegroundColor Gray
    Write-Host "  - Everything runs silently in background" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To verify:" -ForegroundColor Cyan
    Write-Host "  - Set follow-up 15 minutes from now" -ForegroundColor Gray
    Write-Host "  - Wait 2-3 minutes" -ForegroundColor Gray
    Write-Host "  - Check bell icon for notification" -ForegroundColor Gray
    Write-Host "  - No CMD window should appear!" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to create scheduled task!" -ForegroundColor Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    exit 1
}
