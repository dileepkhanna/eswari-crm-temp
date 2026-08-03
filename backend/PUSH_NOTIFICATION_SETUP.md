# Push Notifications - Complete Setup

## What Was Done ✓

### 1. Updated Notification System
- Changed from `Notification.objects.create()` to `send_push_notification()`
- This function does BOTH:
  - Creates in-app notification (bell icon)
  - Sends browser push notification (desktop popup)

### 2. Detailed Messages for Admins
**User Notification (Simple):**
```
Follow-up reminder: dileep in 15 minutes (06:40 PM)
```

**Admin Notification (Detailed):**
```
Follow-up: dileep (7418526455) - Assigned to: admin admin - Time: 06:40 PM (in 15 min)
```

### 3. Push Notification Features
- ✓ In-app bell icon notification
- ✓ Browser desktop push notification
- ✓ Same detailed format sent to both places
- ✓ Works even when browser tab is closed/minimized
- ✓ Automatic cleanup of expired subscriptions

## How It Works

### For Users (Creator/Assigned)
1. Bell icon shows notification
2. Desktop push shows: "Follow-up reminder: dileep in 15 minutes (06:40 PM)"
3. Click to view customer details

### For Admins (Supervisors)
1. Bell icon shows notification
2. Desktop push shows: "Follow-up: dileep (7418526455) - Assigned to: admin admin - Time: 06:40 PM (in 15 min)"
3. Includes phone number and assigned user name
4. Better oversight of team follow-ups

## Browser Permissions Required

### First Time Setup
1. User must **allow notifications** in browser when prompted
2. Browser will ask: "Allow notifications from this site?"
3. Click **Allow**
4. Push subscription is created and stored

### If Notifications Don't Appear
Check browser settings:

**Chrome:**
- Settings → Privacy and security → Site settings → Notifications
- Find your site URL and ensure it's set to "Allow"

**Firefox:**
- Settings → Privacy & Security → Permissions → Notifications
- Find your site and set to "Allow"

**Edge:**
- Settings → Cookies and site permissions → Notifications
- Find your site and set to "Allow"

## Testing

### Clean Up Expired Subscriptions First
```bash
cd backend
python cleanup_expired_subscriptions.py
```

### Send Test Push Notification
```bash
python test_push_notification.py
```

### What Should Happen
1. ✓ In-app notification created
2. ✓ Desktop notification appears (if browser allows)
3. ✓ Notification shows detailed format for admin

### Test with Real Follow-up
1. Create a call with follow-up set to 20 minutes from now
2. Wait 8-10 minutes (notification triggers 8-20 min before)
3. Check for:
   - Bell icon notification (in-app)
   - Desktop push notification (browser popup)

## Troubleshooting

### "No push subscriptions found"
→ User hasn't allowed browser notifications yet
→ Go to your CRM in browser and allow notifications when prompted

### "Push subscription has expired"
→ Old subscriptions are automatically marked inactive
→ Run `python cleanup_expired_subscriptions.py` to clean up
→ Refresh browser and allow notifications again

### Notifications Not Appearing in Browser
→ Check browser notification permissions
→ Make sure browser is allowed to show notifications (Windows settings)
→ Try a different browser to test

### Push Works But Wrong Message Format
→ Verify you're logged in as admin to see admin format
→ Regular users will see simpler format

## System Architecture

```
Follow-up Time Arrives
       ↓
Windows Task Scheduler (every minute)
       ↓
send_followup_notifications.py
       ↓
send_push_notification() function
       ├→ Creates DB notification (bell icon)
       ├→ Sends Web Push (browser popup)
       └→ Sends FCM (mobile - if configured)
       ↓
User receives:
  - In-app notification ✓
  - Desktop push notification ✓
```

## Files Modified

1. **backend/ase_customers/management/commands/send_followup_notifications.py**
   - Added `from notifications.utils import send_push_notification`
   - Changed `Notification.objects.create()` to `send_push_notification()`
   - Separate `user_message` and `admin_message`

2. **backend/notifications/utils.py**
   - Already had `send_push_notification()` function
   - Handles both web push and FCM
   - Automatic cleanup of expired subscriptions

## Security Notes

- Push subscriptions use VAPID authentication
- Each subscription is tied to specific device/browser
- Expired subscriptions automatically disabled
- Users can revoke permissions anytime in browser settings

## Cleanup Recommendations

Run this monthly to clean up expired subscriptions:
```bash
python cleanup_expired_subscriptions.py
```

Or add to Django management commands for automatic cleanup.

## Next Steps

1. ✓ Notification system updated to use push notifications
2. ✓ Admin messages show detailed format
3. ✓ Test notification created
4. [ ] User needs to allow browser notifications
5. [ ] Set up Windows Task Scheduler (run setup_followup_scheduler.ps1)
6. [ ] Test with real follow-up

## Support

If push notifications still don't work:
1. Check browser console for errors
2. Verify VAPID keys are configured in settings
3. Check Django logs for push errors
4. Try from a fresh browser session
5. Ensure HTTPS is being used (push notifications require secure context)
