# Follow-up Notification Format Update

## What Changed?

The notification messages are now **different for users vs admins** to provide appropriate level of detail.

---

## 📱 USER NOTIFICATION (for creator/assigned user)

### Format
```
Follow-up reminder: {customer_name} in {minutes} minutes ({time})
```

### Example
```
Follow-up reminder: dileep in 15 minutes (06:40 PM)
```

### What Users See
- Customer name
- Time remaining
- Scheduled time

**Why?** Users only need to know about their own follow-ups, so the message is simple and focused.

---

## 👔 ADMIN NOTIFICATION (supervisory view)

### Format
```
Follow-up: {customer_name} ({phone}) - Assigned to: {user_name} - Time: {time} (in {minutes} min)
```

### Example
```
Follow-up: dileep (7418526455) - Assigned to: admin admin - Time: 06:40 PM (in 15 min)
```

### What Admins See
- Customer name
- Customer phone number
- Which user is assigned/responsible
- Scheduled time
- Time remaining

**Why?** Admins need to oversee all follow-ups across the team, so they need more context:
- **Customer phone**: Quick access to contact info
- **Assigned user**: Know who is responsible
- **Full details**: Monitor team activity

---

## Visual Comparison

### Before (Same for Everyone)
```
📬 Follow-up Reminder
Follow-up reminder: dileep in 8 minutes (06:40 PM)
Jul 29, 6:31 PM
```

### After - User Panel
```
📬 Follow-up Reminder
Follow-up reminder: dileep in 15 minutes (06:40 PM)
Jul 29, 6:41 PM
```

### After - Admin Panel ⭐ NEW
```
📬 Follow-up Reminder
Follow-up: dileep (7418526455) - Assigned to: admin admin - Time: 06:40 PM (in 15 min)
Jul 29, 6:41 PM
```

---

## Benefits for Admins

1. **Quick Contact**: See phone number immediately without opening the call
2. **Team Visibility**: Know which user is handling the follow-up
3. **Better Monitoring**: Track all team follow-ups from notification panel
4. **Context**: Make informed decisions without switching screens

---

## Testing

✅ **Test notification created!**

### To see it:
1. **Refresh your admin panel** (F5)
2. **Click the bell icon** in the top navigation
3. You should see the new detailed format

### Test with Real Follow-up:
1. Create a new call with follow-up time set to 20 minutes from now
2. Wait for the scheduled task to run (or run manually)
3. Check notifications:
   - **User panel**: Simple format
   - **Admin panel**: Detailed format with phone + assigned user

---

## Who Gets What?

| Recipient | Role | Message Format |
|-----------|------|----------------|
| Call Creator | User/Employee | Simple: name + time |
| Assigned User | User/Employee | Simple: name + time |
| Admin | Administrator | Detailed: name + phone + assigned user + time |

---

## Files Updated

✅ `backend/ase_customers/management/commands/send_followup_notifications.py`
- Separate `user_message` and `admin_message` variables
- Admin message includes phone and assigned user name
- Uses `get_full_name()` to show user's full name instead of username

---

## Example Scenarios

### Scenario 1: User's Own Follow-up
**User sees:**
```
Follow-up reminder: John Smith in 15 minutes (02:30 PM)
```
**Admin sees:**
```
Follow-up: John Smith (9876543210) - Assigned to: Raj Kumar - Time: 02:30 PM (in 15 min)
```

### Scenario 2: Unassigned Call
**User (creator) sees:**
```
Follow-up reminder: ABC Company in 15 minutes (03:00 PM)
```
**Admin sees:**
```
Follow-up: ABC Company (9123456789) - Assigned to: Priya Sharma - Time: 03:00 PM (in 15 min)
```

---

## Need to Revert?

If you want to go back to the same format for everyone, just change this line in `send_followup_notifications.py`:

```python
# Line 72 - Change from:
message=admin_message,

# Back to:
message=user_message,
```
