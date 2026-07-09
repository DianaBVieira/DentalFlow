/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  buffer: number;   // technical buffer in minutes
  price: number;    // in BRL
  description: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  consentDate?: string; // LGPD consent
  createdAt: string;
  hasBraces?: boolean;
  bracesTreatmentEndDate?: string; // YYYY-MM-DD
}

export type AppointmentStatus =
  | 'Agendada'
  | 'Confirmada'
  | 'Cancelada'
  | 'Reagendada'
  | 'Realizada'
  | 'No-show';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  buffer: number; // minutes
  status: AppointmentStatus;
  source: 'WhatsApp' | 'Manual';
  createdAt: string;
  price: number;
}

export interface Message {
  id: string;
  sender: 'patient' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

export interface ClinicSettings {
  clinicName: string;
  professionalName: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  daysOfWeek: number[]; // 1-5 (Mon-Fri), etc.
  address: string;
  googleMapsUrl: string;
  aiDisplayName: string;
  aiGreeting: string;
  aiSystemInstruction: string;
}

export interface WhatsappConfig {
  apiKey: string;
  phoneNumberId: string;
}

export interface DashboardMetrics {
  totalAppointments: number;
  confirmationRate: number; // %
  noShowRate: number; // %
  estimatedRevenue: number;
  averageBookingTime: string; // e.g. "1.5 min"
}
