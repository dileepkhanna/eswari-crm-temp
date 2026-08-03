# PowerShell script to set up Windows Task Scheduler for follow-up notifications
# Run this script as Administrator

$taskName = "CRM_FollowUp_Notifications"
$scriptPath = Join-Path $PSScriptRoot "run_followup_notifications.bat"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task '$taskName' already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create a new task action
$action = New-ScheduledTaskAction -Execute $scriptPath

# Create a trigger to run every minute
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1)

# Create task settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the scheduled task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Check for ASE customer follow-ups and send notifications 15 minutes before"

Write-Host "Successfully created scheduled task: $taskName" -ForegroundColor Green
Write-Host "The task will run every 1 minute to check for upcoming follow-ups" -ForegroundColor Green
Write-Host ""
Write-Host "To view the task: Open Task Scheduler > Task Scheduler Library" -ForegroundColor Cyan
Write-Host "To disable: Right-click the task in Task Scheduler and select 'Disable'" -ForegroundColor Cyan
Write-Host "To remove: Run this script again or manually delete from Task Scheduler" -ForegroundColor Cyan
