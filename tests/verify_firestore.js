/*
  Verify Firestore documents created by the app using Firebase Admin SDK.
  Usage:
    SERVICE_ACCOUNT=./serviceAccount.json FIREBASE_PROJECT_ID=your-project-id TEST_EMAIL=you@example.com node tests/verify_firestore.js
*/

const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
  const saPath = process.env.SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const testEmail = process.env.TEST_EMAIL;

  if (!saPath || !projectId) {
    console.error('Missing SERVICE_ACCOUNT or FIREBASE_PROJECT_ID environment variables.');
    process.exit(1);
  }

  if (!fs.existsSync(saPath)) {
    console.error('Service account file not found at', saPath);
    process.exit(1);
  }

  const serviceAccount = require(saPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId
n  });

  const db = admin.firestore();

  try {
    if (testEmail) {
      console.log('Looking up student by email:', testEmail);
      const studentsRef = db.collection('students');
      const snapshot = await studentsRef.where('email', '==', testEmail).get();
      if (snapshot.empty) {
        console.warn('No student document found for', testEmail);
      } else {
        snapshot.forEach((doc) => {
          console.log('Student doc:', doc.id, doc.data());
        });
      }

      console.log('Looking up payments for email:', testEmail);
      const paymentsRef = db.collection('payments');
      const pSnap = await paymentsRef.where('studentEmail', '==', testEmail).get();
      if (pSnap.empty) console.warn('No payments found for', testEmail);
      else pSnap.forEach(d => console.log('Payment:', d.id, d.data()));
    } else {
      console.log('No TEST_EMAIL provided; listing recent students (limit 10)');
      const students = await db.collection('students').orderBy('createdAt', 'desc').limit(10).get();
      students.forEach(d => console.log('Student:', d.id, d.data()));
    }
  } catch (err) {
    console.error('Error querying Firestore:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

main();
