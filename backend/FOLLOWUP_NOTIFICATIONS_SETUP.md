# Follow-up Notifications Setup

## Overview
This feature sends notifications to users 15 minutes before their scheduled follow-up calls.

## Who Gets Notified?
1. **The user who created the call**
2. **The user assigned to the call** (if different from creator)
3. **All admin users** in the same company

## Notification Types
- **Bell icon notification** - Shows in the app's notification center
- **Browser push notification** - Shows as a desktop notification (if user has allowed browser notifications)

## Setup Instructions

### Step 1: Run the Setup Script
1. Open PowerShell **as Administrator**
2. Navigate to the backend folder:
   ```powershell
   cd "C:\Users\Asus\OneDrive\Desktop\dileep\eswari-connects-10-04\eswari-crm-temp\backend"
   ```
3. Run the setup script:
   ```powershell
   .\setup_followup_scheduler.ps1
   ```

This will create a Windows Task Scheduler task that runs every minute to check for upcoming follow-ups.

### Step 2: Verify the Task
1. Open **Task Scheduler** (search in Windows Start menu)
2. Look for task named: **CRM_FollowUp_Notifications**
3. You should see it running every 1 minute

### Step 3: Test the Notification
1. Go to ASE Calls page
2. Create or edit a call
3. Set the "Follow-up Date" to 15-20 minutes from now
4. Wait 8-10 minutes (notification will arrive when follow-up is 8-20 minutes away)
5. You should receive:
   - A bell icon notification in the app
   - A browser push notification (if enabled)

## Manual Testing
You can manually run the command to test:
```bash
python manage.py send_followup_notifications
```

## How It Works
1. Every minute, the task checks for calls with `scheduled_date` between 8-20 minutes away
2. This wider window (targeting 15 minutes, but catching 8-20) ensures notifications aren't missed even if the task runs irregularly
3. For each upcoming follow-up, it creates notifications for:
   - Creator
   - Assigned user (if different)
   - All admins
4. Each notification is sent only once (deduplication prevents duplicates within 1 hour)
5. Notifications appear in the bell icon menu
6. If browser push is enabled, desktop notifications are also sent

## Troubleshooting

### Task Not Running?
- Check Task Scheduler to see if the task exists
- Check if Python is in your system PATH
- Try running the batch file manually: `run_followup_notifications.bat`

### Not Receiving Notifications?
- Check that the follow-up time is set correctly (in IST)
- Verify the call status is "pending" (not answered/converted)
- Check the Django logs for any errors
- Ensure the user is logged into the app

### To Disable Notifications
1. Open Task Scheduler
2. Find **CRM_FollowUp_Notifications**
3. Right-click → Disable

### To Remove Completely
1. Open Task Scheduler
2. Find **CRM_FollowUp_Notifications**
3. Right-click → Delete

## Time Zone Note
The system uses **India Standard Time (IST, UTC+5:30)** for follow-up times.
