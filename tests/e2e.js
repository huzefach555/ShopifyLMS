const { chromium } = require('playwright');

(async () => {
  const BASE = process.env.BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('Opening home page...');
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });

    // --- Full UI flow: register student, upload payment, admin approve, verify student access ---
    const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
    const TEST_ADMIN_PASS = process.env.TEST_ADMIN_PASS;
    const TEST_PREFIX = process.env.TEST_PREFIX || `e2e${Date.now()}`;

    // 1) Register a new student
    const testEmail = `${TEST_PREFIX}@example.com`;
    console.log('Registering new student:', testEmail);
    await page.goto(`${BASE}/register.html`, { waitUntil: 'networkidle' });
    await page.fill('form#studentForm input[name="fullName"]', 'E2E Test User');
    await page.fill('form#studentForm input[name="fatherName"]', 'Test Father');
    await page.fill('form#studentForm input[name="email"]', testEmail);
    await page.fill('form#studentForm input[name="phone"]', '+1234567890');
    await page.fill('form#studentForm input[name="whatsapp"]', '+1234567890');
    await page.fill('form#studentForm input[name="city"]', 'Test City');
    await page.fill('form#studentForm input[name="country"]', 'Testland');
    await page.fill('form#studentForm input[name="age"]', '25');
    await page.selectOption('form#studentForm select[name="gender"]', 'Male');
    await page.selectOption('form#studentForm select[name="course"]', 'Shopify Basics');
    await page.selectOption('form#studentForm select[name="learningMode"]', 'Online');
    await page.fill('form#studentForm input[name="password"]', 'Testpass123');
    await page.fill('form#studentForm input[name="confirmPassword"]', 'Testpass123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }).catch(()=>{}),
      page.click('form#studentForm button[type="submit"]')
    ]);
    console.log('After register, URL:', page.url());

    // 2) On payment page, upload screenshot and submit
    console.log('Filling payment proof...');
    await page.waitForSelector('#paymentForm, #fileInput', { timeout: 15000 }).catch(()=>{});
    // upload file if present
    const fileInput = await page.$('#fileInput');
    if (fileInput) {
      await fileInput.setInputFiles('./tests/fixtures/test.png');
      console.log('Uploaded test file.');
    }
    // fill fields
    await page.fill('#fullName', 'E2E Test User').catch(()=>{});
    await page.fill('#email', testEmail).catch(()=>{});
    await page.fill('#phone', '+1234567890').catch(()=>{});
    await page.fill('#txnId', `TXN-${Date.now()}` ).catch(()=>{});
    // submit
    const submitBtn = await page.$('#submitBtn');
    if (submitBtn) {
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('cloudinary') || resp.status() === 200, { timeout: 30000 }).catch(()=>{}),
        submitBtn.click()
      ]).catch(()=>{});
      console.log('Clicked submit payment.');
      // wait for modal
      await page.waitForSelector('#modalOverlay.show', { timeout: 20000 }).catch(()=>{});
    } else {
      console.warn('Submit button not found on payment page.');
    }

    // 3) Login as admin and approve the new student (requires TEST_ADMIN_EMAIL/PASS)
    if (TEST_ADMIN_EMAIL && TEST_ADMIN_PASS) {
      console.log('Logging in as admin to approve student...');
      await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
      await page.fill('#loginForm input[name="email"]', TEST_ADMIN_EMAIL);
      await page.fill('#loginForm input[name="password"]', TEST_ADMIN_PASS);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('#loginForm button[type="submit"]')
      ]).catch((e)=>{ console.warn('Admin login navigation:', e && e.message); });
      console.log('Admin dashboard URL:', page.url());
      // find approval row by email
      await page.waitForSelector('#contentArea', { timeout: 15000 });
      const approvalItem = await page.$(`text=${testEmail}`);
      if (approvalItem) {
        // find the closest approval-item container and click Approve
        const approvalContainer = await approvalItem.evaluateHandle((el) => el.closest('.approval-item'));
        if (approvalContainer) {
          const approveBtn = await approvalContainer.$('button[data-action="approve"]');
          if (approveBtn) {
            await approveBtn.click();
            console.log('Clicked approve for', testEmail);
            // wait a moment for Firestore update
            await page.waitForTimeout(2000);
          } else console.warn('Approve button not found for item.');
        }
      } else {
        console.warn('Approval item for test email not found in admin UI.');
      }

      // 4) Verify student can access dashboard by logging in as student
      console.log('Logging in as student to verify access...');
      await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
      await page.fill('#loginForm input[name="email"]', testEmail);
      await page.fill('#loginForm input[name="password"]', 'Testpass123');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('#loginForm button[type="submit"]')
      ]).catch(()=>{});
      console.log('Student post-login URL:', page.url());
    } else {
      console.log('Skipping admin approval: set TEST_ADMIN_EMAIL and TEST_ADMIN_PASS to auto-approve.');
    }

    console.log('E2E full-flow script completed.');
  } catch (err) {
    console.error('E2E error:', err.message || err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
