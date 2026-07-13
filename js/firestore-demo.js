import { createDoc, readDocs, updateDocById, deleteDocById } from './firestore.js';

export async function seedDemoData() {
  await createDoc('announcements', { title: 'Welcome', message: 'New course starts this week.' });
  await createDoc('tasks', { title: 'Module 1 Review', status: 'pending' });
  await createDoc('resources', { title: 'Starter Guide', type: 'pdf' });
}

export async function loadDashboardData() {
  const [announcements, tasks, resources] = await Promise.all([
    readDocs('announcements'),
    readDocs('tasks'),
    readDocs('resources')
  ]);
  return { announcements, tasks, resources };
}

export async function updateTaskStatus(id, status) {
  return updateDocById('tasks', id, { status });
}

export async function removeResource(id) {
  return deleteDocById('resources', id);
}
