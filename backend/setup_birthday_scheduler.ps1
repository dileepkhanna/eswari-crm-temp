# PowerShell script to create Windows Task Scheduler task for birthday announcements
# Run this script as Administrator

$taskName = "CRM Birthday Announcements"
$scriptPath = "$PSScriptRoot\run_birthday_announcements.bat"
$logPath = "$PSScriptRoot\logs"

# Create logs directory if it doesn't exist
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force
    Write-Host "Created logs directory: $logPath"
}

# Check if task already exists and delete it
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task: $taskName"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task to run every day at 8:00 AM
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At 8:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -DontStopIfGoingOnBatteries

# Get current user for the task
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Register the task
Register-ScheduledTask -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Runs daily birthday announcements and sends push notifications at 8:00 AM"

Write-Host ""
Write-Host "✓ Successfully created scheduled task: $taskName" -ForegroundColor Green
Write-Host "  - Runs daily at: 8:00 AM" -ForegroundColor Cyan
Write-Host "  - Script: $scriptPath" -ForegroundColor Cyan
Write-Host "  - Logs: $logPath\birthday_announcements.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "To modify the schedule:"
Write-Host "  1. Open Task Scheduler (taskschd.msc)"
Write-Host "  2. Find '$taskName' in Task Scheduler Library"
Write-Host "  3. Right-click and select Properties"
Write-Host ""
Write-Host "To test the task now:"
Write-Host "  Start-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Yellow
