# Quick Reference Guide - ASE Customers Updates

## 🚀 Quick Start

### To Apply Changes:
```bash
1. Restart Backend:
   cd backend
   python manage.py runserver

2. Refresh Frontend:
   Press Ctrl+Shift+R in browser
```

---

## ✨ New Features

### 1. School Management Service
**Where:** ASE Customer Form → Service Interests  
**What:** New checkbox option "School Management"  
**Use:** Select for customers interested in school management software

### 2. Notes Character Limit
**Where:** All notes fields (Customer notes, CustomerNote, CallLog)  
**What:** Maximum 500 characters  
**Display:** Shows "X/500 characters" counter  
**Error:** Stops input at 500 chars, API returns error if exceeded

### 3. Custom Services Display
**Where:** ASE Customers table → Services column  
**What:** Shows actual custom text instead of "Custom/Other Services"  
**Example:** 
- Before: "Custom/Other Services"
- After: "School ERP Software" (actual text entered)

### 4. Follow-up Date
**Where:** ASE Customer Form (after Assign To field)  
**What:** DateTime picker to schedule follow-ups  
**Overdue:** Customer appears in "Overdue" filter when date passes

---

## 📊 Statistics (Current)

- Total ASE Customers: **444**
- With scheduled dates: **393** (89%)
- Currently overdue: **113**
- Upcoming scheduled: **3**

---

## 🔍 Quick Troubleshooting

### Follow-up Date not showing?
✅ Hard refresh browser (Ctrl+Shift+R)
✅ Check backend server is running

### Notes field allows > 500 characters?
✅ Hard refresh browser (Ctrl+Shift+R)
✅ Backend will reject on save if > 500

### Custom services not displaying?
✅ Ensure customer has "custom" in service_interests
✅ Ensure custom_services field has text
✅ Hard refresh browser

### Overdue filter empty?
✅ Check customers have scheduled_date set
✅ Check customers are in "pending" status
✅ Check scheduled_date is in the past

---

## 📁 Key Files Changed

**Backend:**
- `backend/ase_customers/models.py`
- `backend/ase_customers/serializers.py`

**Frontend:**
- `frontend/src/components/ase-customers/ASECustomerFormModal.tsx`
- `frontend/src/pages/admin/AdminASECustomers.tsx`

**Documentation:**
- `ASE_BACKEND_UPDATES.md` - Detailed technical docs
- `SESSION_UPDATES_SUMMARY.md` - Complete feature summary
- `QUICK_REFERENCE.md` - This file

---

## 💡 Common Tasks

### Create Customer with Follow-up
1. Click "Add New ASE Call"
2. Fill phone number (required)
3. Select service interests
4. Set Follow-up Date (datetime picker)
5. Add notes (max 500 chars)
6. Save

### Find Overdue Customers
1. Click "Show Overdue" button
2. Badge shows count: "Overdue (113)"
3. Table shows only overdue customers
4. Click button again to clear filter

### Add Custom Service
1. Check "Custom/Other Services" in Service Interests
2. New field appears: "Custom Services"
3. Enter specific service (e.g., "School ERP Software")
4. Save - custom text will appear in table

---

## 🎯 Validation Rules

### Notes Fields
- **Max length:** 500 characters
- **Enforced at:** Frontend, API, Database
- **Error message:** "Notes cannot exceed 500 characters."

### Service Interests
- **Valid options:** 12 predefined services
- **Custom option:** Requires custom_services text
- **Backend validates:** Against SERVICE_CHOICES

### Follow-up Date
- **Type:** DateTime (date + time)
- **Format:** ISO 8601 (YYYY-MM-DDTHH:mm:ss)
- **Timezone:** UTC in database
- **Optional:** Can be blank

---

## 🔄 Data Flow

### Follow-up Date:
```
Frontend Form (datetime-local)
    ↓ ISO 8601 string
Backend API (serializer)
    ↓ validation
Database (DateTimeField, UTC)
    ↓ query filter
Overdue Filter (scheduled_date < now AND status=pending)
```

### Custom Services:
```
Frontend Form (checkbox + text input)
    ↓ 'custom' in service_interests + custom_services text
Backend API (saves both fields)
    ↓ stored
Database (service_interests JSON + custom_services text)
    ↓ display logic
Frontend Table (shows custom_services text if 'custom' selected)
```

---

## 📞 Need Help?

**Backend Issues:**
- Check `ASE_BACKEND_UPDATES.md` for technical details
- Verify Django server is running
- Check backend console for errors

**Frontend Issues:**
- Hard refresh: Ctrl+Shift+R
- Check browser console (F12)
- Verify API calls in Network tab

**Data Issues:**
- Use Django admin: http://localhost:8000/admin
- Check database directly if needed
- Review `SESSION_UPDATES_SUMMARY.md`

---

*Last Updated: July 2, 2026*
