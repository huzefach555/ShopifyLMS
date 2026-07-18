E2E test harness (Playwright)

Quick start

1. Install dev dependencies:

```bash
npm install
npx playwright install
```

2. Serve the site locally (from project root):

```bash
npm run serve
```

3. Run the smoke E2E script:

```bash
TEST_ADMIN_EMAIL=admin@example.com TEST_ADMIN_PASS=secret npm run test:e2e
```

Notes

- The script performs basic navigation checks. To fully test auth and uploads, provide valid Firebase-connected credentials and ensure you have configured Cloudinary and Firestore.
- Adjust `BASE_URL` by setting `BASE_URL` env var if you serve on a different host/port.
