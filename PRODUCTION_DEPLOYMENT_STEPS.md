# Production Deployment Steps - Fix Migration Conflicts

## Current Issue on Production:
```
CommandError: Conflicting migrations detected; multiple leaf nodes in the migration graph
```

---

## Step-by-Step Fix:

### Step 1: Merge the Conflicting Migrations

On your production server (ec2-user@ip-172-26-12-110), run:

```bash
cd /home/ec2-user/eswari-crm/backend
python3 manage.py makemigrations --merge
```

**What will happen:**
- Django will ask: "Do you want to merge these migrations? [y/N]"
- Type: **y** and press Enter
- Django will create merge migration files

### Step 2: Apply the Migrations

```bash
python3 manage.py migrate
```

This will apply all pending migrations including the merge.

### Step 3: Restart the Production Server

```bash
# If using systemd service:
sudo systemctl restart eswari-crm

# OR if using supervisor:
sudo supervisorctl restart eswari-crm

# OR if running manually with gunicorn/daphne:
# Kill the process and restart
```

---

## Alternative: Delete Conflicting Migrations (If Fresh Deploy)

**⚠️ WARNING: Only do this if you haven't deployed these migrations to production yet!**

If the conflicting migrations haven't been applied to production database:

1. **On your local machine**, delete the conflicting migration files:
   ```bash
   # Delete newer migrations that conflict
   rm backend/ase_leads/migrations/0025_*.py
   rm backend/ase_leads/migrations/0026_*.py
   rm backend/ase_leads/migrations/0027_*.py
   rm backend/ase_leads/migrations/0028_*.py
   rm backend/ase_leads/migrations/0029_*.py
   rm backend/ase_leads/migrations/0030_*.py
   rm backend/ase_customers/migrations/0010_add_is_disabled_fields.py
   ```

2. **Recreate migrations in order**:
   ```bash
   python manage.py makemigrations
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Fix migration conflicts"
   git push origin main
   ```

4. **On production**, pull and migrate:
   ```bash
   cd /home/ec2-user/eswari-crm
   git pull origin main
   cd backend
   python3 manage.py migrate
   sudo systemctl restart eswari-crm
   ```

---

## Recommended Approach:

✅ **Use Step 1-3 above** (merge migrations) - This is safer for production.

This will:
- Keep all existing migrations
- Create a merge migration that resolves conflicts
- Apply everything cleanly

---

## Commands Summary (Production Server):

```bash
# 1. Navigate to backend folder
cd /home/ec2-user/eswari-crm/backend

# 2. Merge conflicting migrations
python3 manage.py makemigrations --merge
# Type 'y' when prompted

# 3. Apply migrations
python3 manage.py migrate

# 4. Restart server
sudo systemctl restart eswari-crm
# OR
sudo supervisorctl restart eswari-crm

# 5. Check if server is running
sudo systemctl status eswari-crm
# OR
sudo supervisorctl status eswari-crm
```

---

## After Deployment:

1. ✅ Check if website loads: `http://your-production-domain.com`
2. ✅ Test lead to task conversion
3. ✅ Test follow-up notifications
4. ✅ Verify all features work

---

## Troubleshooting:

### If migrations fail:

Check which migrations are applied:
```bash
python3 manage.py showmigrations
```

Check for errors in logs:
```bash
# If using systemd:
sudo journalctl -u eswari-crm -n 50

# If using supervisor:
sudo tail -f /var/log/supervisor/eswari-crm-*.log
```

### If server won't start:

Check Python errors:
```bash
cd /home/ec2-user/eswari-crm/backend
python3 manage.py check
```

---

## Need Help?

If you encounter any issues during deployment, share:
1. The exact error message
2. Output of `python3 manage.py showmigrations`
3. Server logs

---

**Start with Step 1-3 on your production server now!** 🚀
