Firestore verification helper

This script uses the Firebase Admin SDK to inspect Firestore documents created by the web app.

Prerequisites:
- A Firebase service account JSON file with Firestore access.
- Node.js installed.

Usage:

```bash
# from project root
SERVICE_ACCOUNT=./serviceAccount.json FIREBASE_PROJECT_ID=my-firebase-project TEST_EMAIL=testuser@example.com node tests/verify_firestore.js
```

- `SERVICE_ACCOUNT`: path to the service account JSON.
- `FIREBASE_PROJECT_ID`: your Firebase project id.
- `TEST_EMAIL` (optional): email of the test student to search for specific docs.

The script will print matching `students` and `payments` documents.

Security note: keep service account keys secret and do not commit them to source control.
