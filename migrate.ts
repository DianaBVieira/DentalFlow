
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize admin SDK
// In Cloud Run, it uses the default service account credentials automatically
initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

async function migrate() {
  const data = JSON.parse(fs.readFileSync('./data-store.json', 'utf8'));

  console.log('Migrating services...');
  for (const service of data.services) {
    await db.collection('services').doc(service.id).set(service);
  }

  console.log('Migrating patients...');
  for (const patient of data.patients) {
    await db.collection('patients').doc(patient.id).set(patient);
  }

  console.log('Migrating appointments...');
  for (const appointment of data.appointments) {
    await db.collection('appointments').doc(appointment.id).set(appointment);
  }

  console.log('Migrating settings...');
  await db.collection('settings').doc('main').set(data.settings);

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(console.error);
