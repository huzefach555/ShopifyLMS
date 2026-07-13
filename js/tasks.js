import { createDoc, deleteDocById, readDocs, updateDocById } from './firestore.js';
import { getFirebaseAuth } from './firebase.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

async function getCurrentUser() {
  const auth = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('Please sign in.');
  return auth.currentUser;
}

export async function fetchAssignableStudents() {
  const students = await readDocs('students');
  return students.filter((student) => student.approvalStatus === 'approved');
}

export async function fetchTasksForTeacher() {
  const user = await getCurrentUser();
  const tasks = await readDocs('tasks', [{ field: 'teacherId', operator: '==', value: user.uid }]);
  return tasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

export async function createTask(payload) {
  const user = await getCurrentUser();
  const task = {
    title: payload.title,
    description: payload.description || '',
    dueDate: payload.dueDate || '',
    assignedTo: payload.assignedTo || 'all',
    assignedToName: payload.assignedToName || 'All Students',
    status: 'pending',
    completed: false,
    teacherId: user.uid,
    teacherEmail: user.email || '',
    createdAt: serverTimestamp()
  };
  return createDoc('tasks', task);
}

export async function updateTask(taskId, payload) {
  return updateDocById('tasks', taskId, {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTask(taskId) {
  return deleteDocById('tasks', taskId);
}

export async function fetchTasksForStudent(studentId) {
  const tasks = await readDocs('tasks');
  return tasks.filter((task) => task.assignedTo === 'all' || task.assignedTo === studentId);
}

export async function markTaskCompleted(taskId) {
  return updateDocById('tasks', taskId, {
    status: 'completed',
    completed: true,
    completedAt: serverTimestamp()
  });
}
