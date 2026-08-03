# PowerShell script to modify Task Scheduler to run hidden (no CMD window)
# Run this as Administrator

$TaskName = "CRM_FollowUp_Notifications"
$BackendPath = $PSScriptRoot
$VBSFile = Join-Path $BackendPath "run_followup_notifications_hidden.vbs"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Fixing Task Scheduler to Run Hidden" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if VBS file exists
if (-not (Test-Path $VBSFile)) {
    Write-Host "ERROR: VBS file not found: $VBSFile" -ForegroundColor Red
    Write-Host "Please make sure run_followup_notifications_hidden.vbs exists." -ForegroundColor Yellow
    exit 1
}

# Check if task exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($null -eq $existingTask) {
    Write-Host "ERROR: Task '$TaskName' not found!" -ForegroundColor Red
    Write-Host "Please run setup_followup_scheduler.ps1 first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found existing task: $TaskName" -ForegroundColor Green
Write-Host ""

# Unregister the old task
Write-Host "Removing old task..." -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false

# Create new task with HIDDEN execution using VBS
Write-Host "Creating new task with hidden window (using VBScript)..." -ForegroundColor Yellow

$Action = New-ScheduledTaskAction `
    -Execute "wscript.exe" `
    -Argument "`"$VBSFile`"" `
    -WorkingDirectory $BackendPath

$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1)

$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 1) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Principal $Principal `
    -Settings $Settings `
    -Description "Check for upcoming follow-ups and send notifications (runs hidden, no CMD window)" | Out-Null

Write-Host ""
Write-Host "✓ Task updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Task is now running HIDDEN - no CMD window will appear!" -ForegroundColor Green
Write-Host ""
Write-Host "How it works:" -ForegroundColor Cyan
Write-Host "  - Task Scheduler runs: wscript.exe" -ForegroundColor Gray
Write-Host "  - VBScript runs: run_followup_notifications.bat (hidden)" -ForegroundColor Gray
Write-Host "  - Batch file runs: Python notification command" -ForegroundColor Gray
Write-Host "  - Everything happens in background, no visible window!" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify it's working:" -ForegroundColor Cyan
Write-Host "  1. Set a follow-up 15 minutes from now" -ForegroundColor Gray
Write-Host "  2. Wait 2-3 minutes" -ForegroundColor Gray
Write-Host "  3. Check bell icon for notification" -ForegroundColor Gray
Write-Host "  4. No CMD window should appear!" -ForegroundColor Gray
Write-Host ""

