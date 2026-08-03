@echo off
echo ================================================
echo Setting Up Hidden Task Scheduler
echo ================================================
echo.
echo Creating task that runs HIDDEN (no CMD window)...
echo.

schtasks /Create /TN "CRM_FollowUp_Notifications" /TR "wscript.exe \"%~dp0run_followup_notifications_hidden.vbs\"" /SC MINUTE /MO 1 /F /RL HIGHEST

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Task created successfully!
    echo.
    echo The task will now run every minute in the background.
    echo No CMD window will appear!
    echo.
) else (
    echo.
    echo ERROR: Failed to create task!
    echo.
    echo Please right-click this file and select "Run as administrator"
    echo.
)

pause
