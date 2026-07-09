import { google } from 'googleapis';
import { Appointment } from '../types';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// Simplified calendar integration helper
export async function syncAppointmentToCalendar(appt: Appointment, userId: string) {
  const configDoc = await getDoc(doc(db, 'userCalendarConfigs', userId));
  if (!configDoc.exists() || !configDoc.data().syncEnabled) return;
  
  const { accessToken, refreshToken } = configDoc.data();
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: `Consulta: ${appt.serviceName} - ${appt.patientName}`,
    description: `Consulta agendada via sistema DentalFlow.\nStatus: ${appt.status}\nTelefone: ${appt.patientPhone}`,
    start: {
      dateTime: `${appt.date}T${appt.time}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${appt.date}T${appt.time}:00`,
      timeZone: 'America/Sao_Paulo',
    },
  };

  try {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
  } catch (error) {
    console.error('Error syncing appointment to calendar:', error);
  }
}
