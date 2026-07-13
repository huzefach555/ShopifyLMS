import { initializeFirebase, getFirebaseAuth } from './firebase.js';
import { createDoc, readDoc } from './firestore.js';
import { uploadToCloudinary } from './cloudinary.js';

const RESOURCE_LIMIT = 20 * 1024 * 1024;
const IMAGE_LIMIT = 5 * 1024 * 1024;
const ALLOWED_RESOURCE_TYPES = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/x-zip'];
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

async function getUser() {
  await initializeFirebase();
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in.');
  return user;
}

async function ensureApprovedStudent(user) {
  const student = await readDoc('students', user.uid);
  if (!student || student.approvalStatus !== 'approved') {
    throw new Error('Your account must be approved before uploading payment proof.');
  }
}

function validateFile(file, allowedTypes, maxSize, label) {
  if (!file || !file.name) throw new Error(`Please choose a ${label}.`);
  if (!allowedTypes.includes(file.type)) throw new Error(`Please upload a valid ${label} file.`);
  if (file.size > maxSize) throw new Error(`${label} size must be ${maxSize / (1024 * 1024)}MB or less.`);
}

export async function uploadPaymentRecord(payload, file, onProgress = null) {
  const user = await getUser();
  await ensureApprovedStudent(user);
  validateFile(file, ALLOWED_IMAGE_TYPES, IMAGE_LIMIT, 'image');
  const response = await uploadToCloudinary(file, `payments/${user.uid}`, onProgress);
  const record = {
    studentId: user.uid,
    studentEmail: user.email || '',
    transactionId: payload.transactionId,
    paymentMethod: payload.paymentMethod,
    uploadDate: payload.uploadDate,
    paymentStatus: payload.paymentStatus || 'Pending',
    screenshotUrl: response.secure_url
  };
  await createDoc('payments', record);
  return record;
}

export async function uploadAssignmentFile(payload, file, onProgress = null) {
  const user = await getUser();
  validateFile(file, ALLOWED_RESOURCE_TYPES, RESOURCE_LIMIT, 'assignment');
  const response = await uploadToCloudinary(file, `assignments/${user.uid}`, onProgress);
  const record = {
    title: payload.title || file.name,
    dueDate: payload.dueDate || '',
    fileName: file.name,
    fileUrl: response.secure_url,
    uploadedBy: user.uid
  };
  await createDoc('assignments', record);
  return record;
}

export async function uploadResourceFile(payload, file, onProgress = null) {
  const user = await getUser();
  validateFile(file, ALLOWED_RESOURCE_TYPES, RESOURCE_LIMIT, 'resource');
  const response = await uploadToCloudinary(file, `resources/${user.uid}`, onProgress);
  const record = {
    title: payload.title || file.name,
    type: payload.type || 'PDF',
    fileName: file.name,
    fileUrl: response.secure_url,
    uploadedBy: user.uid
  };
  await createDoc('resources', record);
  return record;
}
