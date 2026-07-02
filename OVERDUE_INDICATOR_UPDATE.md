# Overdue Indicator Feature

## 📅 Date: July 2, 2026

## ✨ Feature Overview

Added visual indicators to highlight overdue customers directly in the calls table and mobile view.

---

## 🎯 What's New

### Visual Overdue Badge
Customers with past-due follow-up dates now display a prominent red badge:

**Desktop Table View:**
```
📞 9063974348 ⏰ OVERDUE
```

**Mobile Card View:**
```
📞 9063974348 ⏰
```

### Badge Features
- 🔴 **Red background** - Immediately draws attention
- ⏰ **Clock emoji** - Universal "time" symbol
- ✨ **Pulse animation** - Subtle animated effect
- 💬 **Tooltip** - Shows exact due date/time on hover

---

## 🔧 Technical Implementation

### Helper Function
**File:** `frontend/src/pages/admin/AdminASECustomers.tsx`

Added `isOverdue()` function to determine if customer is overdue:

```typescript
const isOverdue = (customer: ASECustomer) => {
  if (!customer.scheduled_date || customer.call_status !== 'pending') {
    return false;
  }
  const scheduledDate = new Date(customer.scheduled_date);
  const now = new Date();
  return scheduledDate < now;
};
```

**Logic:**
1. Check if customer has `scheduled_date` set
2. Check if customer status is `pending`
3. Compare scheduled date with current time
4. Return `true` if date has passed

### Table View Badge

**Location:** Phone number column

```typescript
{isOverdue(customer) && (
  <span 
    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white animate-pulse"
    title={`Overdue! Follow-up was due on ${new Date(customer.scheduled_date!).toLocaleString()}`}
  >
    ⏰ OVERDUE
  </span>
)}
```

### Mobile View Badge

**Location:** Phone number row (compact version)

```typescript
{isOverdue(customer) && (
  <span 
    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white animate-pulse"
    title={`Overdue! Follow-up was due on ${new Date(customer.scheduled_date!).toLocaleString()}`}
  >
    ⏰
  </span>
)}
```

---

## 🎨 Design Specifications

### Colors
- **Background:** `bg-red-500` (bright red)
- **Text:** `text-white` (high contrast)

### Typography
- **Size:** `text-[10px]` (compact, non-intrusive)
- **Weight:** `font-semibold` (stands out)

### Animation
- **Effect:** `animate-pulse` (Tailwind's built-in pulse)
- **Purpose:** Draws eye to overdue items

### Spacing
- **Padding:** `px-1.5 py-0.5` (compact badge)
- **Rounded:** `rounded` (smooth corners)

---

## 📊 Visual Examples

### Desktop Table View
```
┌──────────────────────────────────────────────────────────┐
│ Phone                    │ Name        │ Services         │
├──────────────────────────────────────────────────────────┤
│ 📞 9063974348            │ John Doe    │ SEO              │
│ 📞 9999999905 ⏰ OVERDUE │ Test User   │ Custom Services  │
│ 📞 9454665692 ⏰ OVERDUE │ Jane Smith  │ Social Media     │
└──────────────────────────────────────────────────────────┘
```

### Mobile Card View
```
┌─────────────────────────────────────┐
│ □ 📞 9999999905 ⏰                  │
│   Test User                         │
│                                     │
│   Status: Pending                   │
│   Services: Custom Services         │
└─────────────────────────────────────┘
```

### Tooltip on Hover
```
Overdue! Follow-up was due on 6/10/2026, 9:35:07 AM
```

---

## 🔍 When Badge Appears

The overdue badge displays when **ALL** conditions are met:

1. ✅ Customer has `scheduled_date` set (Follow-up Date)
2. ✅ Customer `call_status` is `'pending'`
3. ✅ Current time > scheduled_date

### Examples

**✅ Shows Badge:**
- scheduled_date: June 10, 2026 9:00 AM
- call_status: pending
- current_date: July 2, 2026 (past due)

**❌ No Badge:**
- scheduled_date: July 5, 2026 (future date)
- call_status: pending
- current_date: July 2, 2026

**❌ No Badge:**
- scheduled_date: June 10, 2026
- call_status: answered (not pending)
- current_date: July 2, 2026

**❌ No Badge:**
- scheduled_date: null (not set)
- call_status: pending
- current_date: July 2, 2026

---

## 💡 User Benefits

### Quick Identification
- **Before:** Had to use "Overdue" filter to find overdue customers
- **After:** Immediately visible in main table with red badge

### Better Prioritization
- Overdue items stand out visually
- Pulse animation catches attention
- Easy to scan through list

### Information at a Glance
- See overdue status without filtering
- Hover for exact due date/time
- Works alongside existing filters

### Mobile-Friendly
- Compact clock emoji on mobile
- Doesn't clutter small screens
- Same functionality as desktop

---

## 🔄 Integration with Existing Features

### Works With Filters
The badge appears regardless of active filters:

```
✅ All Status filter → Shows overdue badges
✅ Pending filter → Shows overdue badges
✅ Date filter → Shows overdue badges if customer matches
✅ Overdue filter → All shown customers have badges
```

### Complements Overdue Filter
- **Filter button:** Isolates overdue customers (113)
- **Visual badge:** Shows overdue within any view
- **Use together:** Filter to overdue, see badges confirming status

### Follow-up Date Field
The badge relies on the Follow-up Date field added earlier:

```
User Flow:
1. Create/edit customer
2. Set Follow-up Date (e.g., June 15, 2026)
3. Save customer
4. Date passes → Badge appears automatically
5. Change status to "Answered" → Badge disappears
```

---

## 📈 Current Statistics

Based on backend test results:

- **Total customers:** 444
- **With scheduled dates:** 393 (89%)
- **Currently overdue:** 113
- **With badges showing:** 113 (all overdue + pending)

---

## 🚀 Testing Instructions

### Test 1: Verify Badge Shows for Overdue
1. Open ASE Customers page
2. Look for customers with red "⏰ OVERDUE" badge
3. Should see 113 customers with badges (if filter not applied)
4. Hover over badge → Tooltip shows due date

### Test 2: Verify Badge Logic
1. Create new customer
2. Set Follow-up Date to yesterday
3. Set Status to "Pending"
4. Save → Badge should appear

### Test 3: Verify Badge Disappears
1. Find customer with overdue badge
2. Edit customer
3. Change status to "Answered"
4. Save → Badge should disappear

### Test 4: Mobile View
1. Open page on mobile or resize browser small
2. Cards should show compact "⏰" clock emoji
3. Hover/tap for tooltip

### Test 5: Filter Interaction
1. Click "Show Overdue" filter
2. All visible customers should have badges
3. Clear filter → Badges still show on overdue customers

---

## 📁 Files Modified

**Frontend:**
- ✅ `frontend/src/pages/admin/AdminASECustomers.tsx`
  - Added `isOverdue()` helper function
  - Added badge to table phone column
  - Added badge to mobile card phone row

**Documentation:**
- ✅ `OVERDUE_INDICATOR_UPDATE.md` (this file)

**No backend changes needed** - uses existing `scheduled_date` and `call_status` fields.

---

## 🎯 Success Criteria

✅ Badge appears for all overdue + pending customers  
✅ Badge styling is consistent (red, white, pulsing)  
✅ Tooltip shows exact due date/time  
✅ Works in both desktop and mobile views  
✅ Doesn't break existing functionality  
✅ Performs well with 444 customers  

---

## 🔮 Future Enhancements (Optional)

### Potential Improvements:
1. **Color coding by severity:**
   - 🟡 Overdue by 1-3 days (yellow)
   - 🟠 Overdue by 4-7 days (orange)
   - 🔴 Overdue by 8+ days (red)

2. **Badge variants:**
   - "Due Today" badge for today's follow-ups
   - "Due Tomorrow" badge for next day

3. **Sortable column:**
   - Click to sort by overdue status
   - Group overdue customers at top

4. **Dashboard widget:**
   - Show overdue count on main dashboard
   - Quick link to overdue filter

---

## ✅ Completion Status

- [x] Helper function added
- [x] Badge added to desktop table
- [x] Badge added to mobile cards
- [x] Tooltip with due date added
- [x] Pulse animation applied
- [x] Tested with existing data (113 overdue)
- [x] Documentation created
- [x] Ready for production

---

**End of Overdue Indicator Feature Documentation**
