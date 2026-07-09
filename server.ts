/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { Service, Patient, Appointment, ClinicSettings } from './src/types.js';
import { syncAppointmentToCalendar } from './src/lib/calendar.js';
import { google } from 'googleapis';
import { db } from './src/lib/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const app = express();
app.use(express.json());

app.get('/api/auth/google', (req, res) => {
  const userId = req.query.userId;
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: userId as string,
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    await setDoc(doc(db, 'userCalendarConfigs', state as string), {
      userId: state as string,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      syncEnabled: true,
    });
    res.redirect('/settings');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data-store.json');

// --- DATABASE STATE ---
interface DBState {
  services: Service[];
  patients: Patient[];
  appointments: Appointment[];
  settings: ClinicSettings;
}

// Prepopulated beautiful seed data
const DEFAULT_STATE: DBState = {
  services: [
    {
      id: 's1',
      name: 'Limpeza e Profilaxia',
      duration: 45,
      buffer: 15,
      price: 220,
      description: 'Remoção de tártaro, placa bacteriana, polimento e aplicação de flúor.',
    },
    {
      id: 's2',
      name: 'Consulta de Avaliação',
      duration: 30,
      buffer: 15,
      price: 150,
      description: 'Exame clínico completo, diagnóstico inicial e planejamento de tratamento.',
    },
    {
      id: 's3',
      name: 'Restauração de Resina',
      duration: 60,
      buffer: 15,
      price: 250,
      description: 'Remoção de cárie e restauração estética com resina fotopolimerizável.',
    },
    {
      id: 's4',
      name: 'Tratamento de Canal',
      duration: 90,
      buffer: 30,
      price: 850,
      description: 'Tratamento endodôntico completo para alívio de dor e salvamento do dente.',
    },
    {
      id: 's5',
      name: 'Clareamento Dental',
      duration: 60,
      buffer: 15,
      price: 700,
      description: 'Procedimento clínico de clareamento a laser para um sorriso mais iluminado.',
    },
    {
      id: 's6',
      name: 'Manutenção de Aparelho',
      duration: 30,
      buffer: 15,
      price: 180,
      description: 'Ajuste mensal, troca de borrachinhas e higienização do aparelho ortodôntico.',
    }
  ],
  patients: [
    {
      id: 'p1',
      name: 'Carlos Roberto Santos',
      phone: '+55 11 98888-1111',
      email: 'carlos.santos@gmail.com',
      consentDate: '2026-07-01T10:00:00Z',
      createdAt: '2026-07-01T10:00:00Z',
    },
    {
      id: 'p2',
      name: 'Ana Júlia de Oliveira',
      phone: '+55 11 98888-2222',
      email: 'ana.julia@outlook.com',
      consentDate: '2026-07-02T14:30:00Z',
      createdAt: '2026-07-02T14:30:00Z',
    },
    {
      id: 'p3',
      name: 'Marcos Vinícius Pereira',
      phone: '+55 11 98888-3333',
      email: 'marcos.vp@hotmail.com',
      consentDate: '2026-07-03T16:15:00Z',
      createdAt: '2026-07-03T16:15:00Z',
    }
  ],
  appointments: [
    {
      id: 'a1',
      patientId: 'p1',
      patientName: 'Carlos Roberto Santos',
      patientPhone: '+55 11 98888-1111',
      serviceId: 's1',
      serviceName: 'Limpeza e Profilaxia',
      date: '2026-07-08',
      time: '09:00',
      duration: 45,
      buffer: 15,
      status: 'Realizada',
      source: 'WhatsApp',
      createdAt: '2026-07-05T09:12:00Z',
      price: 220,
    },
    {
      id: 'a2',
      patientId: 'p2',
      patientName: 'Ana Júlia de Oliveira',
      patientPhone: '+55 11 98888-2222',
      serviceId: 's2',
      serviceName: 'Consulta de Avaliação',
      date: '2026-07-08',
      time: '14:00',
      duration: 30,
      buffer: 15,
      status: 'Confirmada',
      source: 'WhatsApp',
      createdAt: '2026-07-06T11:45:00Z',
      price: 150,
    },
    {
      id: 'a3',
      patientId: 'p3',
      patientName: 'Marcos Vinícius Pereira',
      patientPhone: '+55 11 98888-3333',
      serviceId: 's3',
      serviceName: 'Restauração de Resina',
      date: '2026-07-09',
      time: '10:00',
      duration: 60,
      buffer: 15,
      status: 'Agendada',
      source: 'Manual',
      createdAt: '2026-07-07T15:20:00Z',
      price: 250,
    },
    {
      id: 'a4',
      patientId: 'p1',
      patientName: 'Carlos Roberto Santos',
      patientPhone: '+55 11 98888-1111',
      serviceId: 's4',
      serviceName: 'Tratamento de Canal',
      date: '2026-07-07',
      time: '15:00',
      duration: 90,
      buffer: 30,
      status: 'No-show',
      source: 'WhatsApp',
      createdAt: '2026-07-04T10:30:00Z',
      price: 850,
    }
  ],
  settings: {
    clinicName: 'Clinica Odontologia Rulho',
    professionalName: 'Dra. Marina Castro',
    startTime: '08:00',
    endTime: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
    googleMapsUrl: 'https://maps.app.goo.gl/3fX3b37pZgS8K8Hh8',
    aiDisplayName: 'Clinica Odontologia Rulho',
    aiGreeting: 'Olá! 😊 Aqui é da Clinica Odontologia Rulho! Como podemos te ajudar hoje? 🦷✨',
    aiSystemInstruction: 'Você é a Sofia, secretária da Clinica Odontologia Rulho (da Dra. Marina Castro) 🦷✨. Seu tom de conversa deve ser extremamente amigável, humano, caloroso e natural, idêntico a uma pessoa real atendendo no WhatsApp do consultório. NUNCA se apresente como robô, inteligência artificial ou assistente virtual. Use emojis com frequência e de forma acolhedora (como 😊, 🦷, 📅, 🌸, ✨, etc.) para tornar a conversa agradável e próxima, mantendo a clareza e o profissionalismo.',
  },
};

let state: DBState = { ...DEFAULT_STATE };

// --- FILE PERSISTENCE HELPERS ---
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      state = JSON.parse(data);
      console.log('State successfully loaded from storage file.');
    } else {
      saveState();
    }
  } catch (error) {
    console.error('Error loading state from file, using defaults.', error);
  }
}

function saveState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving state to file.', error);
  }
}

loadState();

// --- BUSINESS RULE LOGIC: AVAILABILITY CALCULATOR ---
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export function getAvailableSlots(dateStr: string, serviceId: string): string[] {
  const service = state.services.find(s => s.id === serviceId);
  if (!service) return [];

  const neededDuration = service.duration;
  const neededBuffer = service.buffer;
  const totalNeeded = neededDuration + neededBuffer;

  const startMin = timeToMinutes(state.settings.startTime);
  const endMin = timeToMinutes(state.settings.endTime);

  // Get active appointments for this day (excludes Cancelled)
  const dayBookings = state.appointments.filter(
    a => a.date === dateStr && a.status !== 'Cancelada' && a.status !== 'No-show'
  );

  const slots: string[] = [];
  const interval = 30; // 30-minute intervals for slot options

  for (let m = startMin; m + neededDuration <= endMin; m += interval) {
    const candidateStart = m;
    const candidateEnd = m + totalNeeded;

    let overlaps = false;
    for (const appt of dayBookings) {
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + appt.duration + appt.buffer;

      // Overlap formula: start1 < end2 AND end1 > start2
      if (candidateStart < apptEnd && candidateEnd > apptStart) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      slots.push(minutesToTime(candidateStart));
    }
  }

  return slots;
}

// Generate compact 7-day availability string for Gemini context
function getCompact7DayAvailability(serviceId: string): string {
  const service = state.services.find(s => s.id === serviceId);
  if (!service) return "Selecione um serviço para consultar disponibilidade.";

  let result = `Horários disponíveis para o serviço "${service.name}" (Duração: ${service.duration}min):\n`;
  const today = new Date('2026-07-08'); // Current system time is 2026-07-08

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayOfWeek = d.getDay();

    // Skip Sundays (0) and Saturdays (6) if clinic is closed on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const slots = getAvailableSlots(dateStr, serviceId).slice(0, 5); // top 5 slots
    const weekdayName = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

    if (slots.length > 0) {
      result += `- ${capitalizedWeekday} (${dateStr}): ${slots.join(', ')}\n`;
    } else {
      result += `- ${capitalizedWeekday} (${dateStr}): Esgotado\n`;
    }
  }
  return result;
}

// --- GEMINI INITIALIZATION ---
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// --- API ENDPOINTS ---

// Services API
app.get('/api/services', (req, res) => {
  res.json(state.services);
});

app.post('/api/services', (req, res) => {
  const newService: Service = {
    id: 's_' + Date.now(),
    name: req.body.name,
    duration: Number(req.body.duration),
    buffer: Number(req.body.buffer),
    price: Number(req.body.price),
    description: req.body.description || '',
  };
  state.services.push(newService);
  saveState();
  res.status(201).json(newService);
});

app.put('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.services.findIndex(s => s.id === id);
  if (idx !== -1) {
    state.services[idx] = {
      ...state.services[idx],
      name: req.body.name,
      duration: Number(req.body.duration),
      buffer: Number(req.body.buffer),
      price: Number(req.body.price),
      description: req.body.description || '',
    };
    saveState();
    res.json(state.services[idx]);
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;
  state.services = state.services.filter(s => s.id !== id);
  saveState();
  res.json({ success: true });
});

// Appointments API
app.get('/api/appointments', (req, res) => {
  res.json(state.appointments);
});

app.post('/api/appointments', (req, res) => {
  const { patientName, patientPhone, serviceId, date, time, source } = req.body;
  const service = state.services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(400).json({ error: 'Service not found' });
  }

  // Check overlap first (RN-01)
  const available = getAvailableSlots(date, serviceId);
  if (!available.includes(time)) {
    return res.status(400).json({ error: 'Horário indisponível devido a conflito na agenda.' });
  }

  // Register Patient in CRM if not exists
  let patient = state.patients.find(p => p.phone === patientPhone);
  if (!patient) {
    patient = {
      id: 'p_' + Date.now(),
      name: patientName,
      phone: patientPhone,
      createdAt: new Date().toISOString(),
      consentDate: new Date().toISOString(), // Manual implies consent
    };
    state.patients.push(patient);
  }

  const newAppt: Appointment = {
    id: 'a_' + Date.now(),
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: patient.phone,
    serviceId: service.id,
    serviceName: service.name,
    date,
    time,
    duration: service.duration,
    buffer: service.buffer,
    status: 'Agendada',
    source: source || 'Manual',
    createdAt: new Date().toISOString(),
    price: service.price,
  };

  state.appointments.push(newAppt);
  saveState();
  res.status(201).json(newAppt);
});

app.put('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.appointments.findIndex(a => a.id === id);
  if (idx !== -1) {
    state.appointments[idx] = {
      ...state.appointments[idx],
      ...req.body,
    };
    saveState();
    res.json(state.appointments[idx]);
  } else {
    res.status(404).json({ error: 'Appointment not found' });
  }
});

// Patients (CRM) API
app.get('/api/patients', (req, res) => {
  res.json(state.patients);
});

app.put('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.patients.findIndex(p => p.id === id);
  if (idx !== -1) {
    state.patients[idx] = {
      ...state.patients[idx],
      ...req.body,
    };
    saveState();
    res.json(state.patients[idx]);
  } else {
    res.status(404).json({ error: 'Patient not found' });
  }
});

// Settings API
app.get('/api/settings', (req, res) => {
  res.json(state.settings);
});

app.post('/api/settings', (req, res) => {
  state.settings = {
    ...state.settings,
    ...req.body,
  };
  saveState();
  res.json(state.settings);
});

// Slots Query API (Quick validation)
app.get('/api/slots', (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res.status(400).json({ error: 'Missing date or serviceId' });
  }
  const slots = getAvailableSlots(String(date), String(serviceId));
  res.json({ slots });
});

// --- AI INTELLIGENT ROUTE FOR WHATSAPP ---
app.post('/api/chat', async (req, res) => {
  const { messages, patientPhone } = req.body;
  if (!messages || !Array.isArray(messages) || !patientPhone) {
    return res.status(400).json({ error: 'Missing messages list or patientPhone' });
  }

  // Check if patient has LGPD consent in our CRM
  const patient = state.patients.find(p => p.phone === patientPhone);
  const hasConsent = !!(patient && patient.consentDate);

  // Compile general info for Gemini
  const todayStr = '2026-07-08 (Quarta-feira)';
  const servicesListStr = state.services
    .map(s => `- ID: "${s.id}", Nome: "${s.name}", Preço: R$${s.price}, Duração: ${s.duration} min`)
    .join('\n');

  // Let's find out which service the patient might be interested in, to attach slots dynamically
  // If no service chosen, let's list general slots for Consultation (s2)
  let targetServiceId = 's2'; 
  const serviceMatch = messages[messages.length - 1]?.text?.toLowerCase();
  for (const s of state.services) {
    if (serviceMatch && serviceMatch.includes(s.name.toLowerCase())) {
      targetServiceId = s.id;
      break;
    }
  }

  const availabilityStr = getCompact7DayAvailability(targetServiceId);

  // System instruction for Gemini
  const systemInstruction = `
Você atende como "${state.settings.aiDisplayName || state.settings.clinicName}".
${state.settings.aiSystemInstruction}
Endereço: ${state.settings.address}
Link Google Maps: ${state.settings.googleMapsUrl}

Hoje é dia: ${todayStr}.

REGRAS DE NEGÓCIO DA LEI GERAL DE PROTEÇÃO DE DADOS (LGPD):
 - Você tem acesso ao status de consentimento do paciente: ${hasConsent ? 'CONSENTIDO' : 'NÃO CONSENTIDO'}.
 - SE O STATUS FOR "NÃO CONSENTIDO", sua PRIMEIRA mensagem deve ser OBRIGATORIAMENTE:
   1. Se apresentar conforme definido nas suas instruções de sistema.
   2. Solicitar o Nome Completo do paciente.
   3. Pedir o consentimento explícito para tratamento de dados.
 - APÓS o paciente aceitar, NUNCA peça consentimento novamente e NUNCA repita sua saudação inicial ou apresentação. Se o paciente já aceitou, foque apenas em ajudar com agendamentos.
 - Você só pode falar de serviços e marcar consultas APÓS o paciente responder que sim/aceita/autoriza. Ao fazer isso, você deve acionar a ação "CONSENT" no JSON.

CATÁLOGO DE SERVIÇOS:
${servicesListStr}

DISPONIBILIDADE DA AGENDA REAL (atualizada dinamicamente):
${availabilityStr}

REGRAS DE AGENDAMENTO:
1. Quando o paciente disser o serviço que quer e o dia/horário preferido, confirme se o horário está listado como livre acima para aquele serviço. Se estiver, confirme os dados e acione a ação "BOOK".
2. Se o paciente quiser CANCELAR, localize as consultas dele e solicite a data para liberar a vaga. Acione a ação "CANCEL".
3. Se o paciente quiser REAGENDAR, peça a data/hora atual e a nova data/hora. Acione a ação "RESCHEDULE".
4. Ao marcar, o paciente pode dizer datas em linguagem natural como "amanhã" (será 2026-07-09), "sexta" (2026-07-10) ou "segunda que vem" (2026-07-13). Interprete as datas com base em hoje ser Quarta-feira, 2026-07-08.

DIRETRIZES DE ESTILO E PERSONALIDADE:
- Seja a Sofia! Use um tom super caloroso, natural, simpático e acolhedor (como se fosse uma secretária de consultório real no WhatsApp, bem espontânea).
- Use emojis relevantes de forma natural e frequente (ex: 😊, 🦷, 📅, ✨, 🌸, 👍, 🥰, 📝, 🚗, ❤️) para deixar o papo amigável e descontraído.
- Evite parágrafos imensos ou frases frias e formais demais. Chame o paciente pelo nome sempre que possível após ele informar.

FORMATO DA RESPOSTA:
Você deve OBRIGATORIAMENTE responder no formato JSON estruturado com os seguintes campos:
- "reply": Mensagem amigável e humana em formato texto para o WhatsApp (em português).
- "action": Um objeto opcional se o paciente confirmou uma ação. Se não houver ação confirmada nesta rodada, deixe como null ou omita.
  - "type": "CONSENT" | "BOOK" | "CANCEL" | "RESCHEDULE"
  - "patientName": Nome informado pelo paciente (necessário para CONSENT e BOOK)
  - "patientPhone": "${patientPhone}"
  - "serviceId": ID do serviço escolhido (necessário para BOOK)
  - "date": Data selecionada (no formato YYYY-MM-DD, ex: "2026-07-09") (necessário para BOOK, CANCEL e RESCHEDULE)
  - "time": Horário selecionado (no formato HH:MM, ex: "14:00") (necessário para BOOK e RESCHEDULE)
  - "oldDate": Para reagendamento, a data antiga que está sendo cancelada.

Seja focado, não faça perguntas repetitivas, aja de forma assertiva e ágil!
`;

  // Try calling actual Gemini API first.
  if (ai) {
    try {
      const chatContents = messages.map(m => {
        return {
          role: m.sender === 'patient' ? 'user' : 'model',
          parts: [{ text: m.text }],
        };
      });

      const generateContentWithRetry = async (params: any, retries = 3): Promise<any> => {
        try {
          return await ai.models.generateContent(params);
        } catch (error: any) {
          if (error?.status === 503 && retries > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return generateContentWithRetry(params, retries - 1);
          }
          throw error;
        }
      };

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: chatContents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: 'Sua resposta de WhatsApp para o paciente.' },
              action: {
                type: Type.OBJECT,
                description: 'Ação de banco de dados correspondente.',
                properties: {
                  type: { type: Type.STRING, description: "Tipo da ação: 'CONSENT' | 'BOOK' | 'CANCEL' | 'RESCHEDULE'" },
                  patientName: { type: Type.STRING },
                  patientPhone: { type: Type.STRING },
                  serviceId: { type: Type.STRING },
                  date: { type: Type.STRING },
                  time: { type: Type.STRING },
                  oldDate: { type: Type.STRING },
                },
                required: ['type'],
              },
            },
            required: ['reply'],
          },
        },
      });

      const resultText = response.text || '{}';
      const parsed = JSON.parse(resultText);

      // Execute action if provided
      let dbUpdated = false;
      if (parsed.action) {
        dbUpdated = executeDatabaseAction(parsed.action, patientPhone);
      }

      return res.json({
        reply: parsed.reply,
        action: parsed.action || null,
        appointments: state.appointments,
        patients: state.patients,
      });

    } catch (error) {
      console.error('Gemini call failed, executing smart fallback rule engine:', error);
    }
  }

  // --- RULE-BASED FALLBACK ENGINE (if Gemini is missing or fails) ---
  const lastMsg = messages[messages.length - 1]?.text?.toLowerCase() || '';
  let reply = '';
  let action: any = null;
  let dbUpdated = false;

  if (!hasConsent) {
    if (lastMsg.includes('sim') || lastMsg.includes('autorizo') || lastMsg.includes('aceito') || lastMsg.length > 10) {
      // Capture name if they gave it, or default
      const capturedName = messages[messages.length - 1]?.text?.replace(/sim|autorizo|aceito|ola|olá/gi, '').trim() || 'Paciente Teste';
      reply = `Excelente, ${capturedName}! 🎉 Consentimento registrado com sucesso. 📝 Como podemos te ajudar hoje? Temos os seguintes serviços incríveis por aqui:\n\n1️⃣ Limpeza e Profilaxia\n2️⃣ Consulta de Avaliação\n3️⃣ Restauração de Resina\n4️⃣ Tratamento de Canal\n5️⃣ Clareamento Dental\n\nQual deles você gostaria de agendar? 🦷✨`;
      action = {
        type: 'CONSENT',
        patientName: capturedName,
        patientPhone,
      };
      dbUpdated = executeDatabaseAction(action, patientPhone);
    } else {
      reply = `Olá! 😊 Aqui é da ${state.settings.clinicName}! Como podemos te ajudar hoje? ✨ Para darmos início ao seu atendimento de forma segura, sob as normas da LGPD, você autoriza o tratamento dos seus dados cadastrais (Nome e WhatsApp)? Se sim, por favor nos informe seu nome completo e digite "Sim, eu autorizo"! 🦷🌸`;
    }
  } else {
    // Patient already consented
    // Let's check if they want to cancel or reschedule first
    const isCancellationIntent = lastMsg.includes('cancelar') || lastMsg.includes('cancela') || lastMsg.includes('desisto');
    const isRescheduleIntent = lastMsg.includes('reagendar') || lastMsg.includes('mudar') || lastMsg.includes('alterar') || lastMsg.includes('trocar') || lastMsg.includes('outro dia') || lastMsg.includes('outro horario') || lastMsg.includes('outro horário');

    if (isCancellationIntent) {
      const activeAppt = state.appointments.find(a => a.patientPhone === patientPhone && (a.status === 'Agendada' || a.status === 'Confirmada'));
      if (activeAppt) {
        reply = `Poxa, que pena! 😢 Você tem uma consulta marcada de **${activeAppt.serviceName}** no dia **${formatDateBR(activeAppt.date)}** às **${activeAppt.time}**. Deseja realmente cancelar esse horário? Se sim, digite "Confirmar cancelamento" para que eu possa liberar a vaga para outra pessoa. 👍📅`;
      } else {
        reply = `Não localizei nenhum agendamento ativo para seu número no momento. 🤔 Gostaria de agendar uma nova consulta? Estou pronta para te ajudar! 🦷✨`;
      }
    } else if (lastMsg.includes('confirmar cancelamento') || lastMsg.includes('quero cancelar')) {
      const activeAppt = state.appointments.find(a => a.patientPhone === patientPhone && (a.status === 'Agendada' || a.status === 'Confirmada'));
      if (activeAppt) {
        reply = `Prontinho! Sua consulta de **${activeAppt.serviceName}** no dia **${formatDateBR(activeAppt.date)}** foi cancelada com sucesso. 😔 O horário já está livre para outros pacientes. Caso decida agendar de novo no futuro, estarei super à disposição! Se cuide! ❤️🦷`;
        action = {
          type: 'CANCEL',
          patientPhone,
          date: activeAppt.date,
        };
        dbUpdated = executeDatabaseAction(action, patientPhone);
      } else {
        reply = `Não encontrei consultas ativas para cancelar por aqui. 🤔 Como posso te ajudar hoje? 😊`;
      }
    } else if (isRescheduleIntent) {
      const activeAppt = state.appointments.find(a => a.patientPhone === patientPhone && (a.status === 'Agendada' || a.status === 'Confirmada'));
      if (activeAppt) {
        reply = `Sem problemas! Vamos mudar seu horário. Atualmente você está agendado para o dia **${formatDateBR(activeAppt.date)} às ${activeAppt.time}**. Para qual novo dia e horário você prefere reagendar? 😊📅`;
      } else {
        reply = `Não encontrei agendamentos ativos para reagendar. Quer marcar uma nova consulta? Temos Limpeza, Avaliação e outros procedimentos! 🦷✨`;
      }
    } else {
      // It's a scheduling or general question.
      // 1. Detect service
      const detectedServiceId = parseService(lastMsg);
      const serviceId = detectedServiceId || inferServiceIdFromHistory(messages);
      const service = state.services.find(s => s.id === serviceId) || state.services[0];

      // 2. Detect Date & Time
      const date = parseDate(lastMsg);
      const time = parseTime(lastMsg);

      if (date && time) {
        // We have both date and time! Let's check availability for this service
        const availableSlots = getAvailableSlots(date, service.id);
        const isAvailable = availableSlots.includes(time);

        if (isAvailable) {
          // Great, let's book it!
          reply = `Perfeito! 😍 Agendamento concluído com sucesso: **${service.name}** com a Dra. Marina Castro para **${formatDateBR(date)} às ${time}**! Seu horário foi reservado com muito carinho. 📅🦷 Te esperamos na clínica!`;
          action = {
            type: 'BOOK',
            patientName: patient ? patient.name : 'Paciente Teste',
            patientPhone,
            serviceId: service.id,
            date,
            time,
          };
          dbUpdated = executeDatabaseAction(action, patientPhone);
        } else {
          // Not available. List available slots for that day
          const slotsStr = availableSlots.length > 0 
            ? availableSlots.slice(0, 5).join(', ') 
            : 'infelizmente todos os horários estão preenchidos para este dia';
          
          reply = `Hum, infelizmente no dia **${formatDateBR(date)} às ${time}** já não temos horários disponíveis para **${service.name}**. 😔 Mas temos esses outros horários livres nesse mesmo dia:\n\n👉 **${slotsStr}**\n\nQual desses fica melhor para você? 😊📅`;
        }
      } else if (date) {
        // Only date specified. List available slots for that date
        const availableSlots = getAvailableSlots(date, service.id);
        const slotsStr = availableSlots.length > 0 
          ? availableSlots.slice(0, 5).join(', ') 
          : null;

        if (slotsStr) {
          reply = `Combinado! Para o dia **${formatDateBR(date)}**, temos os seguintes horários livres para **${service.name}**:\n\n👉 **${slotsStr}**\n\nQual deles você prefere? 📅🦷`;
        } else {
          reply = `Poxa, para o dia **${formatDateBR(date)}** já estamos com a agenda cheia de **${service.name}**. 😔 Teria algum outro dia ou horário que prefere?`;
        }
      } else if (time) {
        // Only time specified. Let's suggest tomorrow or ask for the day
        const tomorrow = '2026-07-09';
        const tomorrowSlots = getAvailableSlots(tomorrow, service.id);
        
        if (tomorrowSlots.includes(time)) {
          reply = `Certo, às **${time}**! Gostaria de agendar para amanhã (**quinta-feira, ${formatDateBR(tomorrow)}**)? Se sim, é só me confirmar! Ou prefere para outro dia? 😊📅`;
        } else {
          reply = `Combinado, às **${time}**! E para qual dia você prefere? Temos esse horário disponível em outros dias da semana. Me diga qual dia fica melhor para você! 📅🌸`;
        }
      } else if (detectedServiceId) {
        // Only service specified. Show the compact availability for this service
        const availability = getCompact7DayAvailability(service.id);
        reply = `Perfeito! A **${service.name}** 🦷 é uma ótima escolha! ✨ Para quando você prefere agendar? Temos estes horários livres para os próximos dias:\n\n${availability}\nQual dia e horário fica melhor para você? 😊📅`;
      } else {
        // Default greeting
        reply = `Olá! 😊 Aqui é da ${state.settings.clinicName}! Como podemos te ajudar hoje? Se quiser agendar uma consulta com a Dra. Marina Castro, me diga qual procedimento você deseja: Limpeza, Avaliação, Restauração, Clareamento ou Tratamento de Canal! 🦷✨`;
      }
    }
  }

  res.json({
    reply,
    action,
    appointments: state.appointments,
    patients: state.patients,
  });
});

// Helper sanitizers to heal and correct AI formatting variations
function sanitizeTime(time: any): string {
  if (!time || typeof time !== 'string') return '09:00';
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }
  return '09:00';
}

function sanitizeDate(date: any): string {
  if (!date || typeof date !== 'string') return '2026-07-09';
  const match = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const matchBR = date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchBR) {
    return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
  }
  return '2026-07-09';
}

function sanitizeServiceId(serviceId: any): string {
  if (!serviceId || typeof serviceId !== 'string') return 's1';
  const cleanId = serviceId.trim().toLowerCase();
  
  const found = state.services.find(s => s.id.toLowerCase() === cleanId);
  if (found) return found.id;

  const matchedService = state.services.find(s => 
    s.name.toLowerCase() === cleanId ||
    s.name.toLowerCase().includes(cleanId) ||
    cleanId.includes(s.name.toLowerCase())
  );
  if (matchedService) return matchedService.id;

  if (cleanId.includes('limpeza') || cleanId.includes('profilaxia')) return 's1';
  if (cleanId.includes('avalia') || cleanId.includes('consulta')) return 's2';
  if (cleanId.includes('restaura') || cleanId.includes('resina')) return 's3';
  if (cleanId.includes('canal') || cleanId.includes('endo')) return 's4';
  if (cleanId.includes('clareamento') || cleanId.includes('laser')) return 's5';
  if (cleanId.includes('aparelho') || cleanId.includes('manuten')) return 's6';

  return 's1';
}

// Helper to execute DB changes requested by AI
function executeDatabaseAction(action: any, phone: string): boolean {
  console.log('Executing database action:', action);
  let updated = false;

  if (!action || typeof action !== 'object' || !action.type) {
    return false;
  }

  if (action.type === 'CONSENT') {
    const existing = state.patients.find(p => p.phone === phone);
    if (!existing) {
      state.patients.push({
        id: 'p_' + Date.now(),
        name: action.patientName || 'Novo Paciente',
        phone: phone,
        consentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      updated = true;
    } else {
      existing.consentDate = new Date().toISOString();
      if (action.patientName) existing.name = action.patientName;
      updated = true;
    }
  } else if (action.type === 'BOOK') {
    const serviceId = sanitizeServiceId(action.serviceId);
    const service = state.services.find(s => s.id === serviceId);
    if (service) {
      let patient = state.patients.find(p => p.phone === phone);
      if (!patient) {
        patient = {
          id: 'p_' + Date.now(),
          name: action.patientName || 'Paciente WhatsApp',
          phone: phone,
          consentDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        state.patients.push(patient);
      }

      const targetDate = sanitizeDate(action.date);
      const targetTime = sanitizeTime(action.time);

      // Check for exact duplicate slot booking to avoid duplicates
      const isDuplicate = state.appointments.some(a => 
        a.patientPhone === phone && 
        a.date === targetDate && 
        a.time === targetTime && 
        a.status !== 'Cancelada'
      );

      if (!isDuplicate) {
        const newAppt = {
          id: 'a_' + Date.now(),
          patientId: patient.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          serviceId: service.id,
          serviceName: service.name,
          date: targetDate,
          time: targetTime,
          duration: service.duration,
          buffer: service.buffer,
          status: 'Agendada',
          source: 'WhatsApp',
          createdAt: new Date().toISOString(),
          price: service.price,
        };
        state.appointments.push(newAppt);
        updated = true;
        // Trigger sync
        syncAppointmentToCalendar(newAppt, 'default_dentist_id').catch(console.error);
      }
    }
  } else if (action.type === 'CANCEL') {
    const targetDate = sanitizeDate(action.date);
    const appt = state.appointments.find(a => a.patientPhone === phone && a.date === targetDate && a.status !== 'Cancelada');
    if (appt) {
      appt.status = 'Cancelada';
      updated = true;
      // Trigger sync
      syncAppointmentToCalendar(appt, 'default_dentist_id').catch(console.error);
    } else {
      // cancel any active appointment as a fallback
      const apptFallback = state.appointments.find(a => a.patientPhone === phone && (a.status === 'Agendada' || a.status === 'Confirmada'));
      if (apptFallback) {
        apptFallback.status = 'Cancelada';
        updated = true;
        // Trigger sync
        syncAppointmentToCalendar(apptFallback, 'default_dentist_id').catch(console.error);
      }
    }
  } else if (action.type === 'RESCHEDULE') {
    const targetDate = sanitizeDate(action.date);
    const targetTime = sanitizeTime(action.time);
    const appt = state.appointments.find(a => a.patientPhone === phone && (a.status === 'Agendada' || a.status === 'Confirmada'));
    if (appt) {
      appt.date = targetDate;
      appt.time = targetTime;
      appt.status = 'Reagendada';
      updated = true;
      // Trigger sync
      syncAppointmentToCalendar(appt, 'default_dentist_id').catch(console.error);
    }
  }

  if (updated) {
    saveState();
  }
  return updated;
}

// --- SMART PARSING HELPERS FOR NATURAL CONVERSATION ---
function getNextWeekdayDate(targetDayName: string): string {
  const today = new Date('2026-07-08');
  const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const name = targetDayName.toLowerCase().replace('-feira', '').trim();
  
  let targetIndex = -1;
  if (name.includes('domingo')) targetIndex = 0;
  else if (name.includes('segunda')) targetIndex = 1;
  else if (name.includes('terça') || name.includes('terca')) targetIndex = 2;
  else if (name.includes('quarta')) targetIndex = 3;
  else if (name.includes('quinta')) targetIndex = 4;
  else if (name.includes('sexta')) targetIndex = 5;
  else if (name.includes('sábado') || name.includes('sabado')) targetIndex = 6;

  if (targetIndex === -1) {
    return '2026-07-09'; // default to tomorrow
  }
  
  const todayIndex = today.getDay(); // Wednesday is 3
  let diff = targetIndex - todayIndex;
  if (diff <= 0) {
    diff += 7; // next week
  }
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toISOString().split('T')[0];
}

function parseDate(text: string): string | null {
  const clean = text.toLowerCase();

  // 1. Check for YYYY-MM-DD
  const matchYYYYMMDD = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchYYYYMMDD) {
    return `${matchYYYYMMDD[1]}-${matchYYYYMMDD[2]}-${matchYYYYMMDD[3]}`;
  }

  // 2. Check for DD/MM/YYYY
  const matchDDMMYYYY = clean.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchDDMMYYYY) {
    return `${matchDDMMYYYY[3]}-${matchDDMMYYYY[2]}-${matchDDMMYYYY[1]}`;
  }

  // 3. Check for DD/MM
  const matchDDMM = clean.match(/(\d{1,2})\/(\d{1,2})/);
  if (matchDDMM) {
    const dd = matchDDMM[1].padStart(2, '0');
    const mm = matchDDMM[2].padStart(2, '0');
    return `2026-${mm}-${dd}`;
  }

  // 4. Relative words
  if (clean.includes('amanhã') || clean.includes('amanha')) {
    return '2026-07-09';
  }
  if (clean.includes('hoje')) {
    return '2026-07-08';
  }
  if (clean.includes('depois de amanhã') || clean.includes('depois de amanha')) {
    return '2026-07-10';
  }

  // 5. Weekdays
  const weekdays = ['segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado', 'domingo'];
  for (const day of weekdays) {
    if (clean.includes(day)) {
      return getNextWeekdayDate(day);
    }
  }

  return null;
}

function parseTime(text: string): string | null {
  const clean = text.toLowerCase();
  
  // 1. Matches "10:30", "10h30", "15:00"
  const matchHHMM = clean.match(/(\d{1,2})\s*[:h]\s*(\d{2})/);
  if (matchHHMM) {
    const hh = matchHHMM[1].padStart(2, '0');
    const mm = matchHHMM[2];
    return `${hh}:${mm}`;
  }
  
  // 2. Matches "9h", "10h", "15 horas"
  const matchH = clean.match(/(\d{1,2})\s*(?:h|hora)/);
  if (matchH) {
    const hh = matchH[1].padStart(2, '0');
    return `${hh}:00`;
  }
  
  // 3. Matches "as 10", "às 10", "as 9"
  const matchAsNum = clean.match(/(?:as|às|ás)\s+(\d{1,2})\b/);
  if (matchAsNum) {
    const hh = matchAsNum[1].padStart(2, '0');
    return `${hh}:00`;
  }

  // 4. Matches "9 e meia" etc.
  if (clean.includes('9 e meia') || clean.includes('nove e meia')) return '09:30';
  if (clean.includes('10 e meia') || clean.includes('dez e meia')) return '10:30';
  if (clean.includes('11 e meia') || clean.includes('onze e meia')) return '11:30';
  if (clean.includes('14 e meia') || clean.includes('duas e meia') || clean.includes('14h30')) return '14:30';
  if (clean.includes('15 e meia') || clean.includes('três e meia') || clean.includes('tres e meia') || clean.includes('15h30')) return '15:30';
  if (clean.includes('16 e meia') || clean.includes('quatro e meia') || clean.includes('16h30')) return '16:30';
  
  // 5. Standalone plausible hours (8 to 18)
  const matchPlausible = clean.match(/\b([89]|1[0-8])\b/);
  if (matchPlausible) {
    const hh = matchPlausible[1].padStart(2, '0');
    return `${hh}:00`;
  }

  return null;
}

function parseService(text: string): string | null {
  const clean = text.toLowerCase();
  if (clean.includes('limpeza') || clean.includes('profilaxia') || clean.includes('1')) return 's1';
  if (clean.includes('avaliação') || clean.includes('avaliacao') || clean.includes('consulta') || clean.includes('2')) return 's2';
  if (clean.includes('restauração') || clean.includes('restauracao') || clean.includes('resina') || clean.includes('3')) return 's3';
  if (clean.includes('canal') || clean.includes('endo') || clean.includes('4')) return 's4';
  if (clean.includes('clareamento') || clean.includes('clarear') || clean.includes('5')) return 's5';
  if (clean.includes('aparelho') || clean.includes('manuten') || clean.includes('6')) return 's6';
  return null;
}

function inferServiceIdFromHistory(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].text.toLowerCase();
    const parsed = parseService(text);
    if (parsed) return parsed;
  }
  return 's1';
}

function formatDateBR(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}


// --- VITE AND SERVER RUNTIME CONFIGURATION ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
