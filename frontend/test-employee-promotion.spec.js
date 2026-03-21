import { test, expect } from '@playwright/test';

test.describe('Employee Promotion Feature', () => {
  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete Employee Promotion Workflow', async () => {
    console.log('🧪 Starting Employee Promotion Test with Playwright');
    
    // Step 1: Navigate to the application
    console.log('📱 Navigating to CRM application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Step 2: Login as admin
    console.log('🔐 Logging in as admin...');
    
    // Check if we're on login page or already logged in
    const isLoginPage = await page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]').isVisible().catch(() => false);
    
    if (isLoginPage) {
      // Fill login form
      await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'admin@example.com');
      await page.fill('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]', 'admin123');
      
      // Click login button
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Admin login successful');
    } else {
      console.log('✅ Already logged in');
    }

    // Step 3: Navigate to User Management
    console.log('👥 Navigating to User Management...');
    
    // Look for Users menu item in various possible locations
    const userMenuSelectors = [
      'a:has-text("Users")',
      'a:has-text("User Management")',
      '[href*="/users"]',
      '[href*="/admin/users"]',
      'nav a:has-text("Users")',
      '.sidebar a:has-text("Users")'
    ];
    
    let userMenuFound = false;
    for (const selector of userMenuSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          userMenuFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!userMenuFound) {
      // Try to find admin menu first
      const adminMenuSelectors = [
        'a:has-text("Admin")',
        '[href*="/admin"]',
        'nav a:has-text("Admin")'
      ];
      
      for (const selector of adminMenuSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            await page.waitForTimeout(1000);
            
            // Now try to find Users submenu
            for (const userSelector of userMenuSelectors) {
              try {
                const userElement = page.locator(userSelector).first();
                if (await userElement.isVisible({ timeout: 2000 })) {
                  await userElement.click();
                  userMenuFound = true;
                  break;
                }
              } catch (e) {
                // Continue
              }
            }
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }
    
    if (!userMenuFound) {
      throw new Error('❌ Could not find User Management menu');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to User Management');

    // Step 4: Create a test employee (if not exists)
    console.log('👤 Creating test employee...');
    
    // Look for Add User button
    const addUserButton = page.locator('button:has-text("Add User"), button:has-text("Add"), button:has-text("Create User")').first();
    await addUserButton.click();
    await page.waitForTimeout(1000);

    // Fill employee form
    await page.fill('input[name="name"], input[placeholder*="name"], input[placeholder*="Name"]', 'John Test Employee');
    await page.fill('input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'john.test@example.com');
    await page.fill('input[name="phone"], input[placeholder*="phone"], input[placeholder*="Phone"]', '1234567890');
    await page.fill('input[name="password"], input[placeholder*="password"], input[placeholder*="Password"]', 'employee123');
    
    // Select employee role
    const roleDropdown = page.locator('select[name="role"], [role="combobox"]:has-text("Role")').first();
    if (await roleDropdown.isVisible()) {
      await roleDropdown.click();
      await page.click('option[value="employee"], [role="option"]:has-text("Employee")');
    }
    
    // Select company (if required)
    const companyDropdown = page.locator('select[name="company"], [role="combobox"]:has-text("Company")').first();
    if (await companyDropdown.isVisible()) {
      await companyDropdown.click();
      await page.click('option:not([value=""]):not([value="0"]), [role="option"]:not(:has-text("Select"))').first();
    }
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    await page.waitForTimeout(2000);
    
    console.log('✅ Test employee created');

    // Step 5: Find the test employee in the list
    console.log('🔍 Finding test employee in user list...');
    
    // Wait for user list to load
    await page.waitForSelector('table, .user-list, [data-testid="user-list"]', { timeout: 10000 });
    
    // Look for the test employee row
    const employeeRow = page.locator('tr:has-text("John Test Employee"), .user-row:has-text("John Test Employee")').first();
    await expect(employeeRow).toBeVisible({ timeout: 10000 });
    
    // Verify employee role badge
    const employeeBadge = employeeRow.locator('[class*="badge"]:has-text("employee"), .role-badge:has-text("employee")');
    await expect(employeeBadge).toBeVisible();
    
    console.log('✅ Test employee found in list');

    // Step 6: Open employee actions menu
    console.log('⚙️ Opening employee actions menu...');
    
    const actionsButton = employeeRow.locator('button[aria-label*="actions"], button:has([data-testid="more-horizontal"]), button:has(.lucide-more-horizontal)').first();
    await actionsButton.click();
    await page.waitForTimeout(500);
    
    console.log('✅ Actions menu opened');

    // Step 7: Click "Promote to Manager" option
    console.log('🚀 Clicking Promote to Manager...');
    
    const promoteOption = page.locator('[role="menuitem"]:has-text("Promote"), button:has-text("Promote"), a:has-text("Promote")').first();
    await expect(promoteOption).toBeVisible({ timeout: 5000 });
    await promoteOption.click();
    await page.waitForTimeout(1000);
    
    console.log('✅ Promotion option clicked');

    // Step 8: Verify promotion modal appears
    console.log('📋 Verifying promotion modal...');
    
    const promotionModal = page.locator('[role="dialog"]:has-text("Promote"), .modal:has-text("Promote"), [data-testid="promotion-modal"]').first();
    await expect(promotionModal).toBeVisible({ timeout: 5000 });
    
    // Verify modal content
    await expect(promotionModal.locator(':has-text("John Test Employee")')).toBeVisible();
    await expect(promotionModal.locator(':has-text("Employee")')).toBeVisible();
    await expect(promotionModal.locator(':has-text("Manager")')).toBeVisible();
    
    console.log('✅ Promotion modal verified');

    // Step 9: Confirm promotion
    console.log('✅ Confirming promotion...');
    
    const confirmButton = promotionModal.locator('button:has-text("Confirm"), button:has-text("Promote"), button[type="submit"]').first();
    await confirmButton.click();
    
    // Wait for promotion to complete
    await page.waitForTimeout(3000);
    
    console.log('✅ Promotion confirmed');

    // Step 10: Verify success screen
    console.log('🎉 Verifying promotion success...');
    
    // Look for success indicators
    const successIndicators = [
      ':has-text("Promotion Successful")',
      ':has-text("successfully promoted")',
      ':has-text("Manager")',
      '.success, .green'
    ];
    
    let successFound = false;
    for (const indicator of successIndicators) {
      try {
        const element = page.locator(indicator).first();
        if (await element.isVisible({ timeout: 3000 })) {
          successFound = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (successFound) {
      console.log('✅ Promotion success screen verified');
      
      // Close success modal
      const doneButton = page.locator('button:has-text("Done"), button:has-text("Close"), button:has-text("OK")').first();
      if (await doneButton.isVisible({ timeout: 2000 })) {
        await doneButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Step 11: Verify user list updates
    console.log('🔄 Verifying user list updates...');
    
    // Wait for list to refresh
    await page.waitForTimeout(2000);
    
    // Find the user row again
    const updatedEmployeeRow = page.locator('tr:has-text("John Test Employee"), .user-row:has-text("John Test Employee")').first();
    await expect(updatedEmployeeRow).toBeVisible({ timeout: 10000 });
    
    // Verify role changed to manager
    const managerBadge = updatedEmployeeRow.locator('[class*="badge"]:has-text("manager"), .role-badge:has-text("manager")');
    await expect(managerBadge).toBeVisible({ timeout: 5000 });
    
    console.log('✅ User role updated to Manager in list');

    // Step 12: Check for promotion announcement
    console.log('📢 Checking for promotion announcement...');
    
    // Navigate to announcements
    const announcementMenuSelectors = [
      'a:has-text("Announcements")',
      '[href*="/announcements"]',
      'nav a:has-text("Announcements")'
    ];
    
    let announcementMenuFound = false;
    for (const selector of announcementMenuSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          announcementMenuFound = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (announcementMenuFound) {
      await page.waitForLoadState('networkidle');
      
      // Look for promotion announcement
      const promotionAnnouncement = page.locator(':has-text("Congratulations"), :has-text("promoted"), :has-text("John")').first();
      
      if (await promotionAnnouncement.isVisible({ timeout: 5000 })) {
        console.log('✅ Promotion announcement found');
      } else {
        console.log('⚠️ Promotion announcement not found (may take time to appear)');
      }
    } else {
      console.log('⚠️ Could not navigate to announcements');
    }

    // Step 13: Cleanup - Delete test user
    console.log('🧹 Cleaning up test user...');
    
    // Navigate back to users
    for (const selector of userMenuSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    await page.waitForLoadState('networkidle');
    
    // Find and delete the test user
    const testUserRow = page.locator('tr:has-text("John Test Employee"), .user-row:has-text("John Test Employee")').first();
    if (await testUserRow.isVisible({ timeout: 5000 })) {
      const deleteActionsButton = testUserRow.locator('button[aria-label*="actions"], button:has([data-testid="more-horizontal"])').first();
      await deleteActionsButton.click();
      await page.waitForTimeout(500);
      
      const deleteOption = page.locator('[role="menuitem"]:has-text("Delete"), button:has-text("Delete")').first();
      if (await deleteOption.isVisible({ timeout: 2000 })) {
        await deleteOption.click();
        await page.waitForTimeout(500);
        
        // Confirm deletion if dialog appears
        const confirmDelete = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
        if (await confirmDelete.isVisible({ timeout: 2000 })) {
          await confirmDelete.click();
          await page.waitForTimeout(1000);
        }
        
        console.log('✅ Test user cleaned up');
      }
    }

    console.log('🎉 Employee Promotion Test Completed Successfully!');
  });

  test('Promotion Button Visibility', async () => {
    console.log('🔍 Testing promotion button visibility...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Navigate to users (assuming already logged in)
    const userMenuSelectors = [
      'a:has-text("Users")',
      'a:has-text("User Management")',
      '[href*="/users"]'
    ];
    
    for (const selector of userMenuSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    await page.waitForLoadState('networkidle');
    
    // Find an employee row
    const employeeRows = page.locator('tr:has([class*="badge"]:has-text("employee")), .user-row:has(.role-badge:has-text("employee"))');
    const employeeCount = await employeeRows.count();
    
    if (employeeCount > 0) {
      const firstEmployee = employeeRows.first();
      const actionsButton = firstEmployee.locator('button[aria-label*="actions"], button:has([data-testid="more-horizontal"])').first();
      await actionsButton.click();
      await page.waitForTimeout(500);
      
      // Verify promote option is visible for employees
      const promoteOption = page.locator('[role="menuitem"]:has-text("Promote")').first();
      await expect(promoteOption).toBeVisible();
      
      console.log('✅ Promote option visible for employees');
      
      // Close menu
      await page.keyboard.press('Escape');
    }
    
    // Find a manager row
    const managerRows = page.locator('tr:has([class*="badge"]:has-text("manager")), .user-row:has(.role-badge:has-text("manager"))');
    const managerCount = await managerRows.count();
    
    if (managerCount > 0) {
      const firstManager = managerRows.first();
      const actionsButton = firstManager.locator('button[aria-label*="actions"], button:has([data-testid="more-horizontal"])').first();
      await actionsButton.click();
      await page.waitForTimeout(500);
      
      // Verify promote option is NOT visible for managers
      const promoteOption = page.locator('[role="menuitem"]:has-text("Promote")').first();
      await expect(promoteOption).not.toBeVisible();
      
      console.log('✅ Promote option hidden for managers');
      
      // Close menu
      await page.keyboard.press('Escape');
    }
  });
});

// Helper function to take screenshot on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  }
});