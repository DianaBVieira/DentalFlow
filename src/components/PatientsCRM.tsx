/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Phone, Mail, FileText, MessageSquare, ShieldCheck, Heart, X, 
  Clock, Calendar as CalendarIcon, Sparkles, Send, CheckCircle, Play, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, Appointment } from '../types';

interface PatientsCRMProps {
  patients: Patient[];
  appointments: Appointment[];
  onSelectPatientChat: (phone: string) => void;
  onUpdatePatient?: (id: string, updatedFields: Partial<Patient>) => Promise<boolean>;
}

// Helper functions for date formatting in Portuguese
function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDateTimeBR(isoString?: string): string {
  if (!isoString) return 'Pendente';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
}

export default function PatientsCRM({ 
  patients, 
  appointments, 
  onSelectPatientChat,
  onUpdatePatient
}: PatientsCRMProps) {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'campaign'>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Campaign State
  const [campaignType, setCampaignType] = useState<'inactive' | 'braces'>('inactive');
  const [selectedTemplate, setSelectedTemplate] = useState<'limpeza' | 'avaliacao' | 'aparelho' | 'custom'>('limpeza');
  const [customMessage, setCustomMessage] = useState(
    'Olá, [Nome]! 😊 Aqui é da DentalFlow Odontologia. Passando para dizer que estamos com saudades e que preparamos uma condição especial de retorno para você este mês! Que tal agendarmos sua consulta preventiva com a Dra. Marina Castro? Como podemos te ajudar hoje? 🦷✨'
  );
  const [selectedCampaignPatients, setSelectedCampaignPatients] = useState<string[]>([]);
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0, activeName: '' });

  // Local braces editing states
  const [editHasBraces, setEditHasBraces] = useState<boolean>(false);
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [savingBraces, setSavingBraces] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (selectedPatient) {
      setEditHasBraces(!!selectedPatient.hasBraces);
      setEditEndDate(selectedPatient.bracesTreatmentEndDate || '');
      setSaveSuccess(false);
    }
  }, [selectedPatient?.id]);

  // Scan and identify inactive patients (last visit > 6 months ago, no upcoming appointments)
  const getInactivePatients = () => {
    const currentDate = new Date('2026-07-08');
    
    return patients.filter(patient => {
      // Find all appointments for this patient
      const patientAppts = appointments.filter(a => a.patientPhone === patient.phone);
      
      // 1. If they have any upcoming appointments, they are NOT inactive
      const hasUpcoming = patientAppts.some(a => {
        const apptDate = new Date(`${a.date}T00:00:00`);
        return apptDate.getTime() >= currentDate.getTime() && (a.status === 'Agendada' || a.status === 'Confirmada');
      });
      if (hasUpcoming) return false;

      // 2. Find their latest completed appointment
      const completedAppts = patientAppts.filter(a => a.status === 'Realizada');
      if (completedAppts.length === 0) {
        // Fallback: If no completed appointments but created > 6 months ago
        const createdAtDate = new Date(patient.createdAt);
        const diffTime = currentDate.getTime() - createdAtDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 180;
      }

      // Sort and get the most recent completed
      completedAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestCompleted = completedAppts[0];
      
      const latestDate = new Date(`${latestCompleted.date}T00:00:00`);
      const diffTime = currentDate.getTime() - latestDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // More than 180 days is over 6 months
      return diffDays > 180;
    });
  };

  const getBracesPatientsDue = () => {
    const currentDate = new Date('2026-07-08');
    
    return patients.filter(patient => {
      // Must have active braces treatment
      if (!patient.hasBraces) return false;

      // If treatment end date is specified and has already passed, they are done
      if (patient.bracesTreatmentEndDate) {
        const endDate = new Date(`${patient.bracesTreatmentEndDate}T00:00:00`);
        if (endDate.getTime() < currentDate.getTime()) return false;
      }

      const patientAppts = appointments.filter(a => a.patientPhone === patient.phone);

      // Check if they have an upcoming appointment
      const hasUpcoming = patientAppts.some(a => {
        const apptDate = new Date(`${a.date}T00:00:00`);
        return apptDate.getTime() >= currentDate.getTime() && (a.status === 'Agendada' || a.status === 'Confirmada');
      });
      if (hasUpcoming) return false;

      // Find their latest completed maintenance appointment
      const maintenanceAppts = patientAppts.filter(a => 
        a.status === 'Realizada' && 
        (a.serviceId === 's6' || a.serviceName?.toLowerCase().includes('aparelho') || a.serviceName?.toLowerCase().includes('manutenção') || a.serviceName?.toLowerCase().includes('manutencao'))
      );

      if (maintenanceAppts.length === 0) {
        // If they have never done a maintenance, but have braces active, they are due!
        return true;
      }

      // Sort and get the most recent completed maintenance
      maintenanceAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestMaintenance = maintenanceAppts[0];
      
      const latestDate = new Date(`${latestMaintenance.date}T00:00:00`);
      const diffTime = currentDate.getTime() - latestDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // It's been roughly 1 month (28 days or more)
      return diffDays >= 28;
    });
  };

  const inactivePatients = getInactivePatients();
  const bracesPatients = getBracesPatientsDue();
  const currentEligiblePatients = campaignType === 'inactive' ? inactivePatients : bracesPatients;

  // Initialize selected patients for the campaign on mount or campaignType change
  useEffect(() => {
    setSelectedCampaignPatients(currentEligiblePatients.map(p => p.id));
    if (campaignType === 'braces') {
      setSelectedTemplate('aparelho');
    } else {
      setSelectedTemplate('limpeza');
    }
  }, [campaignType, patients, appointments]);

  const getElapsedString = (patientPhone: string) => {
    const currentDate = new Date('2026-07-08');
    const patientAppts = appointments.filter(a => a.patientPhone === patientPhone && a.status === 'Realizada');
    
    if (patientAppts.length === 0) {
      // Find patient object to check createdAt
      const p = patients.find(pat => pat.phone === patientPhone);
      if (p) {
        const createdDate = new Date(p.createdAt);
        const diffTime = currentDate.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const months = Math.floor(diffDays / 30);
        return `Nenhuma consulta realizada (Cadastrado há ${months} meses)`;
      }
      return 'Sem histórico';
    }

    patientAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = patientAppts[0];
    const latestDate = new Date(`${latest.date}T00:00:00`);
    const diffTime = currentDate.getTime() - latestDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const months = Math.floor(diffDays / 30);
    if (months >= 12) {
      const years = (months / 12).toFixed(1);
      return `Última consulta há ${years} anos (${latest.serviceName})`;
    }
    return `Última consulta há ${months} meses (${latest.serviceName})`;
  };

  const getBracesElapsedString = (patientPhone: string) => {
    const currentDate = new Date('2026-07-08');
    const patientAppts = appointments.filter(a => 
      a.patientPhone === patientPhone && 
      a.status === 'Realizada' &&
      (a.serviceId === 's6' || a.serviceName?.toLowerCase().includes('aparelho') || a.serviceName?.toLowerCase().includes('manutenção') || a.serviceName?.toLowerCase().includes('manutencao'))
    );
    
    if (patientAppts.length === 0) {
      return "Sem manutenções de aparelho registradas anteriormente";
    }
    
    // Sort and get the most recent completed maintenance
    patientAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = patientAppts[0];
    const latestDate = new Date(`${latest.date}T00:00:00`);
    const diffTime = currentDate.getTime() - latestDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `Última manutenção realizada há ${diffDays} dias (${formatDateBR(latest.date)})`;
  };

  // Get templates copy
  const getTemplateText = (patientName: string) => {
    const cleanName = patientName.split(' ')[0]; // Use first name
    switch (selectedTemplate) {
      case 'limpeza':
        return `Olá, ${cleanName}! 😊 Aqui é da DentalFlow Odontologia. Faz mais de 6 meses que você realizou sua última limpeza e profilaxia preventiva com a Dra. Marina Castro! 🦷 O cuidado preventivo evita tártaro, cáries e problemas futuros. Que tal agendar um horário para esta semana? Como podemos te ajudar hoje? ✨`;
      case 'avaliacao':
        return `Olá, ${cleanName}! 😊 Tudo bem? Aqui é da DentalFlow Odontologia. Passando para lembrar que já faz mais de 6 meses desde sua última consulta de avaliação! 📅 É muito importante fazer um check-up clínico periódico para manter seu sorriso saudável e forte. Vamos agendar seu retorno? Como podemos te ajudar hoje? 🦷🌸`;
      case 'aparelho':
        return `Olá, ${cleanName}! 😊 Passando para te lembrar que já está fazendo quase 30 dias desde a sua última manutenção do seu aparelho ortodôntico com a Dra. Marina Castro! 🦷 Vamos agendar a sua manutenção este mês para manter seu tratamento em dia e evoluindo super bem? Me diz qual o melhor dia e horário para você! ✨📅`;
      case 'custom':
        return customMessage.replace(/\[Nome\]/g, cleanName);
      default:
        return '';
    }
  };

  // Stats for the selected patient
  const getPatientStatsAndTimeline = (phone: string) => {
    const patientAppts = appointments.filter(a => a.patientPhone === phone)
      .sort((a, b) => {
        return new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime();
      });

    const totalCount = patientAppts.length;
    const completedCount = patientAppts.filter(a => a.status === 'Realizada').length;
    const pendingCount = patientAppts.filter(a => a.status === 'Agendada' || a.status === 'Confirmada').length;
    const missedCount = patientAppts.filter(a => a.status === 'No-show').length;
    const cancelledCount = patientAppts.filter(a => a.status === 'Cancelada').length;
    
    const totalSpent = patientAppts
      .filter(a => a.status === 'Realizada')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    return {
      patientAppts,
      totalCount,
      completedCount,
      pendingCount,
      missedCount,
      cancelledCount,
      totalSpent
    };
  };

  const handleToggleSelectPatient = (id: string) => {
    if (selectedCampaignPatients.includes(id)) {
      setSelectedCampaignPatients(prev => prev.filter(pId => pId !== id));
    } else {
      setSelectedCampaignPatients(prev => [...prev, id]);
    }
  };

  const handleSelectAllCampaign = () => {
    if (selectedCampaignPatients.length === currentEligiblePatients.length) {
      setSelectedCampaignPatients([]);
    } else {
      setSelectedCampaignPatients(currentEligiblePatients.map(p => p.id));
    }
  };

  // Execute sending bulk campaigns
  const triggerCampaignSending = async () => {
    const targetPatients = currentEligiblePatients.filter(p => selectedCampaignPatients.includes(p.id));
    if (targetPatients.length === 0) return;

    setSendingState('sending');
    setSendingProgress({ current: 0, total: targetPatients.length, activeName: targetPatients[0].name });

    // Read current local storage messages
    const saved = localStorage.getItem('df_whatsapp_messages');
    let messagesMap: Record<string, any[]> = {};
    if (saved) {
      try {
        messagesMap = JSON.parse(saved);
      } catch (e) {}
    }

    // Process each patient with simulated delay
    for (let i = 0; i < targetPatients.length; i++) {
      const patient = targetPatients[i];
      setSendingProgress({ current: i + 1, total: targetPatients.length, activeName: patient.name });
      
      // Construct customized message text
      const msgText = getTemplateText(patient.name);
      
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const campaignMsg = {
        id: 'campaign_' + Date.now() + '_' + Math.random(),
        sender: 'assistant',
        text: msgText,
        timestamp,
      };

      // Ensure patient list starts with initial greeting if no history exists
      if (!messagesMap[patient.phone]) {
        messagesMap[patient.phone] = [
          {
            id: 'init_' + patient.phone,
            sender: 'assistant',
            text: 'Olá! Sou a Assistente Virtual da DentalFlow. Como posso te ajudar hoje?',
            timestamp: '16:11',
          }
        ];
      }

      // Push campaign message to patient history
      messagesMap[patient.phone].push(campaignMsg);

      // Persist to localStorage
      localStorage.setItem('df_whatsapp_messages', JSON.stringify(messagesMap));

      // Simulate network delay for effect
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setSendingState('completed');
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Tab Navigation Header */}
      <div className="bg-white p-4 rounded-2xl border border-brand-sand shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-display font-semibold text-brand-dark text-base">Banco de Dados & Campanhas</h4>
          <p className="text-xs text-brand-muted">Gerencie a retenção de pacientes e dispare campanhas automáticas inteligentes em massa.</p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-brand-light p-1 rounded-xl border border-brand-sand self-start md:self-center">
          <button
            onClick={() => {
              setActiveSubTab('list');
              setSendingState('idle');
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeSubTab === 'list'
                ? 'bg-brand-green text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-dark'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Fichas Clínicas</span>
          </button>
          <button
            onClick={() => setActiveSubTab('campaign')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition relative ${
              activeSubTab === 'campaign'
                ? 'bg-brand-green text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-dark'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Campanha de Retorno (Massa)</span>
            {inactivePatients.length > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                {inactivePatients.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB: LIST OF PATIENTS */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-2xl border border-brand-sand shadow-xs overflow-hidden">
          <div className="p-4 bg-brand-light text-brand-dark text-xs font-mono uppercase tracking-wider border-b border-brand-sand flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-muted" />
              <span>Fichas Médicas de Atendimento</span>
            </div>
            <span className="bg-white text-brand-dark px-2.5 py-0.5 rounded-full border border-brand-sand text-[10px] font-bold font-mono">
              Total: {patients.length} Pacientes
            </span>
          </div>

          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-sand bg-brand-light/50 text-brand-muted text-[10px] font-mono uppercase tracking-wider">
                    <th className="px-6 py-3 font-bold">Paciente</th>
                    <th className="px-6 py-3 font-bold">Contato</th>
                    <th className="px-6 py-3 font-bold">Consentimento LGPD</th>
                    <th className="px-6 py-3 font-bold">Última Visita / Próxima</th>
                    <th className="px-6 py-3 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-light">
                  {patients.map((patient) => {
                    const patientAppts = appointments.filter(
                      a => a.patientPhone === patient.phone
                    );

                    const nextAppt = patientAppts.find(
                      a => a.status === 'Agendada' || a.status === 'Confirmada'
                    );

                    const completedAppts = patientAppts.filter(a => a.status === 'Realizada');
                    completedAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const lastCompleted = completedAppts[0];

                    const pastCount = completedAppts.length;
                    const noShowCount = patientAppts.filter(a => a.status === 'No-show').length;

                    return (
                      <tr 
                        key={patient.id} 
                        className="hover:bg-brand-light/40 transition cursor-pointer"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        {/* Name / Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-light border border-brand-sand text-brand-dark flex items-center justify-center font-display font-bold text-sm shrink-0">
                              {patient.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-display font-bold text-brand-dark text-sm hover:text-brand-green transition">
                                {patient.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-brand-muted font-mono">
                                  ID: {patient.id}
                                </span>
                                {patient.hasBraces && (
                                  <span className="bg-brand-green-light text-brand-green text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-brand-green/10 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5 shrink-0" /> Aparelho
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="flex items-center gap-1 text-brand-dark font-mono font-medium">
                              <Phone className="w-3.5 h-3.5 text-brand-muted" />
                              {patient.phone}
                            </span>
                            {patient.email && (
                              <span className="flex items-center gap-1 text-brand-muted">
                                <Mail className="w-3.5 h-3.5 text-brand-muted/70" />
                                {patient.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Consent status */}
                        <td className="px-6 py-4">
                          {patient.consentDate ? (
                            <div className="flex items-center gap-1 text-brand-green bg-brand-green-light border border-brand-green/20 rounded-full px-2.5 py-1 text-[11px] font-medium w-fit">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Autorizado</span>
                            </div>
                          ) : (
                            <div className="text-brand-muted text-xs italic">
                              Aguardando Aceite
                            </div>
                          )}
                        </td>

                        {/* Consultation History summary */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            {nextAppt ? (
                              <span className="text-brand-green font-semibold flex items-center gap-1 text-[11px]">
                                <CalendarIcon className="w-3 h-3" /> Próxima: {formatDateBR(nextAppt.date)} às {nextAppt.time}
                              </span>
                            ) : (
                              <span className="text-brand-muted text-[11px] italic">Sem agendamentos futuros</span>
                            )}
                            
                            {lastCompleted ? (
                              <span className="text-brand-muted text-[10px] font-mono">
                                Última consulta: {formatDateBR(lastCompleted.date)} ({lastCompleted.serviceName})
                              </span>
                            ) : (
                              <span className="text-brand-muted text-[10px] italic">Nenhuma consulta realizada</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedPatient(patient)}
                              className="inline-flex items-center gap-1.5 bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-brand-sand rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs transition"
                              title="Ver Ficha e Histórico"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Histórico</span>
                            </button>
                            <button
                              onClick={() => onSelectPatientChat(patient.phone)}
                              className="inline-flex items-center gap-1.5 bg-brand-light hover:bg-brand-green hover:text-white text-brand-dark border border-brand-sand rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs transition"
                              title="Iniciar conversa"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-brand-muted font-mono text-xs">
              Nenhum paciente cadastrado no banco de dados.
            </div>
          )}
        </div>
      )}

      {/* RENDER ACTIVE TAB: BULK CAMPAIGN */}
      {activeSubTab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          {/* Campaign Explain Box & List - Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Campaign Selection Tabs */}
            <div className="flex bg-brand-light p-1 rounded-2xl border border-brand-sand gap-1">
              <button
                onClick={() => {
                  setCampaignType('inactive');
                  setSendingState('idle');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  campaignType === 'inactive'
                    ? 'bg-white text-brand-dark shadow-xs border border-brand-sand/50 font-bold'
                    : 'text-brand-muted hover:text-brand-dark'
                }`}
                disabled={sendingState === 'sending'}
              >
                <Users className="w-4 h-4 text-brand-green" />
                Retorno Geral (&gt; 6 meses)
              </button>
              <button
                onClick={() => {
                  setCampaignType('braces');
                  setSendingState('idle');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  campaignType === 'braces'
                    ? 'bg-white text-brand-dark shadow-xs border border-brand-sand/50 font-bold'
                    : 'text-brand-muted hover:text-brand-dark'
                }`}
                disabled={sendingState === 'sending'}
              >
                <Sparkles className="w-4 h-4 text-brand-green animate-pulse" />
                Manutenção de Aparelho (~30 dias)
              </button>
            </div>

            {campaignType === 'inactive' ? (
              <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-brand-green font-semibold">
                  <AlertCircle className="w-5 h-5 text-brand-green" />
                  <h5 className="font-display font-bold text-sm text-brand-dark">Filtro Inteligente: Sem visita há mais de 6 meses</h5>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed">
                  O DentalFlow vasculhou o banco de dados e encontrou pacientes que já realizaram consultas no consultório, mas <strong>não retornam há mais de 6 meses</strong> (desde antes de janeiro de 2026), e que também <strong>não possuem consultas agendadas</strong> para os próximos dias.
                </p>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-brand-green font-semibold">
                  <Sparkles className="w-5 h-5 text-brand-green" />
                  <h5 className="font-display font-bold text-sm text-brand-dark">Filtro Ortodôntico: Manutenção de Aparelho (~30 dias)</h5>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed">
                  O DentalFlow identificou pacientes que estão em <strong>tratamento ativo de aparelho ortodôntico</strong> e cuja última manutenção registrada ocorreu <strong>há mais de 28 dias</strong> (ou que nunca realizaram), sem nenhum agendamento de manutenção pendente ou futuro para os próximos dias.
                </p>
              </div>
            )}

            {/* Eligible Patients List */}
            <div className="bg-white rounded-2xl border border-brand-sand shadow-xs overflow-hidden">
              <div className="p-4 bg-brand-light border-b border-brand-sand flex justify-between items-center text-xs">
                <button
                  onClick={handleSelectAllCampaign}
                  className="text-brand-green font-bold hover:underline font-mono uppercase text-[10px]"
                  disabled={sendingState === 'sending'}
                >
                  {selectedCampaignPatients.length === currentEligiblePatients.length 
                    ? '✖ Desmarcar Todos' 
                    : '✔ Selecionar Todos'}
                </button>
                <span className="font-mono text-brand-muted uppercase text-[10px] font-bold">
                  Elegíveis encontrados: {currentEligiblePatients.length}
                </span>
              </div>

              {currentEligiblePatients.length > 0 ? (
                <div className="divide-y divide-brand-light max-h-[420px] overflow-y-auto">
                  {currentEligiblePatients.map((patient) => {
                    const isSelected = selectedCampaignPatients.includes(patient.id);
                    const elapsed = campaignType === 'braces' ? getBracesElapsedString(patient.phone) : getElapsedString(patient.phone);
                    
                    return (
                      <div 
                        key={patient.id} 
                        className={`p-4 flex items-center justify-between transition gap-4 ${isSelected ? 'bg-brand-light/30' : 'hover:bg-brand-light/10'}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectPatient(patient.id)}
                            disabled={sendingState === 'sending'}
                            className="w-4.5 h-4.5 accent-brand-green rounded-md cursor-pointer border-brand-sand focus:ring-brand-green"
                          />
                          <div className="flex flex-col">
                            <span className="font-display font-bold text-xs text-brand-dark">{patient.name}</span>
                            <span className="text-[10px] font-mono text-brand-muted flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 shrink-0" /> {patient.phone}
                            </span>
                            <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium mt-1.5 w-fit border ${
                              campaignType === 'braces' 
                                ? 'text-brand-green bg-brand-green-light/40 border-brand-green/20' 
                                : 'text-amber-600 bg-amber-50 border border-amber-200/40'
                            }`}>
                              {elapsed}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onSelectPatientChat(patient.phone)}
                          className="bg-white hover:bg-brand-light text-brand-dark p-2 rounded-xl border border-brand-sand text-xs shrink-0 transition"
                          title="Falar individualmente"
                          disabled={sendingState === 'sending'}
                        >
                          <MessageSquare className="w-4 h-4 text-brand-muted hover:text-brand-green" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-brand-muted font-mono text-xs italic">
                  Nenhum paciente elegível detectado para esta campanha atualmente!
                </div>
              )}
            </div>
          </div>

          {/* Campaign Builder / Trigger - Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Sending status view */}
            {sendingState === 'sending' && (
              <div className="bg-white p-6 rounded-2xl border border-brand-sand shadow-sm text-center space-y-4">
                <div className="flex justify-center">
                  <RefreshCw className="w-10 h-10 text-brand-green animate-spin" />
                </div>
                <h5 className="font-display font-bold text-sm text-brand-dark">Enviando Campanha em Massa...</h5>
                <div className="w-full bg-brand-light h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-green h-full transition-all duration-300"
                    style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-brand-muted font-mono">
                  Enviando para: <strong className="text-brand-dark">{sendingProgress.activeName}</strong> ({sendingProgress.current}/{sendingProgress.total})
                </p>
              </div>
            )}

            {sendingState === 'completed' && (
              <div className="bg-white p-6 rounded-2xl border border-brand-sand shadow-sm text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-12 h-12 text-brand-green" />
                </div>
                <h5 className="font-display font-bold text-base text-brand-dark">Campanha Disparada! 🎉</h5>
                <p className="text-xs text-brand-muted leading-relaxed">
                  As {sendingProgress.total} mensagens foram integradas e enviadas no simulador de WhatsApp.
                </p>
                <div className="bg-brand-light/40 border border-brand-sand p-3.5 rounded-xl text-left text-xs text-brand-dark space-y-1">
                  <strong>Instruções de teste:</strong>
                  <p className="text-[11px] text-brand-muted leading-relaxed">
                    Selecione um dos pacientes inativos (como <strong>Luciana Gomes Souza</strong>) no seletor do simulador do WhatsApp na coluna direita. Você verá a mensagem da campanha no chat! Escreva uma resposta como <em>"sim, gostaria de marcar"</em> para ver a IA responder e agendar o retorno dele dinamicamente! 🦷✨
                  </p>
                </div>
                <button
                  onClick={() => setSendingState('idle')}
                  className="w-full bg-brand-dark hover:bg-brand-green text-white rounded-xl py-2 text-xs font-bold transition shadow-xs"
                >
                  Nova Campanha
                </button>
              </div>
            )}

            {sendingState === 'idle' && (
              <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs space-y-4">
                <h5 className="font-display font-bold text-xs text-brand-muted uppercase tracking-wider font-mono">Configurar Disparo</h5>
                
                {/* Pre-written options */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold text-brand-dark font-mono block">Escolher Modelo de Mensagem:</label>
                  
                  {campaignType === 'braces' ? (
                    <div 
                      onClick={() => setSelectedTemplate('aparelho')}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${selectedTemplate === 'aparelho' ? 'bg-brand-light/40 border-brand-green/40' : 'bg-white hover:bg-brand-light/10 border-brand-sand'}`}
                    >
                      <input
                        type="radio"
                        checked={selectedTemplate === 'aparelho'}
                        onChange={() => setSelectedTemplate('aparelho')}
                        className="accent-brand-green mt-0.5"
                      />
                      <div className="text-left">
                        <strong className="text-xs text-brand-dark block">Lembrete de Manutenção de Aparelho</strong>
                        <span className="text-[10px] text-brand-muted line-clamp-1 mt-0.5">Lembra do vencimento de 30 dias da manutenção.</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        onClick={() => setSelectedTemplate('limpeza')}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${selectedTemplate === 'limpeza' ? 'bg-brand-light/40 border-brand-green/40' : 'bg-white hover:bg-brand-light/10 border-brand-sand'}`}
                      >
                        <input
                          type="radio"
                          checked={selectedTemplate === 'limpeza'}
                          onChange={() => setSelectedTemplate('limpeza')}
                          className="accent-brand-green mt-0.5"
                        />
                        <div className="text-left">
                          <strong className="text-xs text-brand-dark block">Prevenção e Limpeza Semestral</strong>
                          <span className="text-[10px] text-brand-muted line-clamp-1 mt-0.5">Foca na limpeza preventiva regular a cada 6 meses.</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setSelectedTemplate('avaliacao')}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${selectedTemplate === 'avaliacao' ? 'bg-brand-light/40 border-brand-green/40' : 'bg-white hover:bg-brand-light/10 border-brand-sand'}`}
                      >
                        <input
                          type="radio"
                          checked={selectedTemplate === 'avaliacao'}
                          onChange={() => setSelectedTemplate('avaliacao')}
                          className="accent-brand-green mt-0.5"
                        />
                        <div className="text-left">
                          <strong className="text-xs text-brand-dark block">Check-up Geral Periódico</strong>
                          <span className="text-[10px] text-brand-muted line-clamp-1 mt-0.5">Aborda a importância do check-up clínico regular.</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div 
                    onClick={() => setSelectedTemplate('custom')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${selectedTemplate === 'custom' ? 'bg-brand-light/40 border-brand-green/40' : 'bg-white hover:bg-brand-light/10 border-brand-sand'}`}
                  >
                    <input
                      type="radio"
                      checked={selectedTemplate === 'custom'}
                      onChange={() => setSelectedTemplate('custom')}
                      className="accent-brand-green mt-0.5"
                    />
                    <div className="text-left">
                      <strong className="text-xs text-brand-dark block">Escrever Mensagem Personalizada</strong>
                      <span className="text-[10px] text-brand-muted line-clamp-1 mt-0.5">Use [Nome] para substituir o nome do paciente.</span>
                    </div>
                  </div>
                </div>

                {/* Custom message field */}
                {selectedTemplate === 'custom' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-bold text-brand-muted font-mono uppercase block">Mensagem Customizada:</label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full h-24 bg-brand-light border border-brand-sand rounded-xl p-3 text-xs text-brand-dark focus:outline-brand-green"
                      placeholder="Use [Nome] para personalizar o texto..."
                    />
                  </div>
                )}

                {/* Preview Box */}
                <div className="space-y-1.5 bg-brand-light/30 border border-brand-sand rounded-2xl p-4">
                  <label className="text-[10px] font-bold text-brand-muted font-mono uppercase block">Prévia do WhatsApp:</label>
                  <div className="bg-white border border-brand-sand rounded-xl p-3 text-xs text-brand-dark leading-relaxed relative">
                    <div className="absolute right-2 top-2 text-[8px] font-mono text-brand-muted">Preview</div>
                    <p className="whitespace-pre-line text-brand-dark font-sans leading-relaxed">
                      {getTemplateText(currentEligiblePatients.find(p => selectedCampaignPatients.includes(p.id))?.name || (currentEligiblePatients[0]?.name || 'Luciana Gomes Souza'))}
                    </p>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={triggerCampaignSending}
                  disabled={selectedCampaignPatients.length === 0}
                  className={`w-full font-display font-semibold text-xs tracking-wider uppercase py-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition ${
                    selectedCampaignPatients.length > 0 
                      ? 'bg-brand-green hover:bg-brand-dark text-white shadow-brand-green/20' 
                      : 'bg-brand-light text-brand-muted border border-brand-sand cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Disparar para {selectedCampaignPatients.length} Pacientes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CRM RETENTION BRAND SLIDER */}
      <div className="bg-brand-dark rounded-3xl p-6 text-brand-cream flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-brand-sand shadow-md">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-brand-sand font-mono text-xs font-bold uppercase tracking-wider">
            <Heart className="w-4 h-4 text-brand-green" />
            <span>Fidelização e Retenção de Clientes</span>
          </div>
          <h4 className="font-display font-semibold text-brand-cream text-lg sm:text-xl">Como o DentalFlow evita No-shows?</h4>
          <p className="text-sm text-brand-light/90 max-w-xl leading-relaxed">
            O assistente automatiza lembretes antes por WhatsApp. Pacientes confirmam ou pedem reagendamento conversando naturalmente. O sistema calcula a disponibilidade em frações de segundos e libera horários cancelados instantaneamente!
          </p>
        </div>
        <div className="flex flex-col gap-3 shrink-0">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-brand-sand/20 text-center">
            <span className="text-2xl font-display font-bold block text-brand-green">&gt; 30%</span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-sand">Redução de No-shows</span>
          </div>
        </div>
      </div>

      {/* PATIENT CLINICAL FILE / DRAWER (SLIDE OVER) */}
      <AnimatePresence>
        {selectedPatient && (() => {
          const stats = getPatientStatsAndTimeline(selectedPatient.phone);
          return (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPatient(null)}
                className="fixed inset-0 bg-brand-dark z-50 cursor-pointer"
              />

              {/* Side Drawer Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 max-w-md w-full bg-brand-cream border-l border-brand-sand shadow-2xl z-50 flex flex-col h-full overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="p-5 bg-white border-b border-brand-sand flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-green" />
                    <h3 className="font-display font-semibold text-brand-dark text-base">Ficha Clínica do Paciente</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="p-1.5 rounded-lg hover:bg-brand-light text-brand-muted hover:text-brand-dark transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Patient Profile Card */}
                  <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-brand-light border-2 border-brand-sand text-brand-dark flex items-center justify-center font-display font-bold text-2xl mb-3 shadow-2xs">
                      {selectedPatient.name.charAt(0)}
                    </div>
                    <h4 className="font-display font-bold text-brand-dark text-lg leading-tight">{selectedPatient.name}</h4>
                    <span className="text-[10px] text-brand-muted font-mono mt-1">ID: {selectedPatient.id}</span>
                    
                    <div className="w-full border-t border-brand-light my-4" />
                    
                    <div className="w-full text-left space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-brand-muted font-mono">WhatsApp:</span>
                        <span className="font-mono font-semibold text-brand-dark">{selectedPatient.phone}</span>
                      </div>
                      {selectedPatient.email && (
                        <div className="flex justify-between items-center">
                          <span className="text-brand-muted font-mono">E-mail:</span>
                          <span className="font-semibold text-brand-dark truncate max-w-[200px]">{selectedPatient.email}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-brand-muted font-mono">Membro desde:</span>
                        <span className="font-semibold text-brand-dark">{formatDateTimeBR(selectedPatient.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* LGPD Compliance Status */}
                  <div className="bg-white p-4 rounded-2xl border border-brand-sand shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${selectedPatient.consentDate ? 'bg-brand-green-light text-brand-green' : 'bg-amber-50 text-amber-600'}`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-bold text-brand-dark uppercase tracking-wider font-mono">Conformidade LGPD</h5>
                        {selectedPatient.consentDate ? (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-brand-green block">✔ Termo de Dados Autorizado</span>
                            <p className="text-[11px] text-brand-muted leading-relaxed">
                               O paciente aceitou formalmente as políticas de agendamento por WhatsApp em: <strong className="text-brand-dark font-mono text-[10px]">{formatDateTimeBR(selectedPatient.consentDate)}</strong>.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-amber-600 block">⚠ Consentimento Pendente</span>
                            <p className="text-[11px] text-brand-muted leading-relaxed">
                               O paciente está em atendimento inicial e ainda não realizou o aceite formal dos termos da LGPD.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Orthodontic Braces Treatment Card */}
                  <div className="bg-white p-4 rounded-2xl border border-brand-sand shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-light pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-green animate-pulse" />
                        <h5 className="text-[10px] font-bold text-brand-dark uppercase tracking-wider font-mono">Tratamento de Aparelho</h5>
                      </div>
                      {selectedPatient.hasBraces && (
                        <span className="bg-brand-green-light text-brand-green text-[9px] font-bold px-2 py-0.5 rounded-full border border-brand-green/15 animate-fadeIn">
                          Ativo
                        </span>
                      )}
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Checkbox Toggle */}
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editHasBraces}
                          onChange={(e) => {
                            setEditHasBraces(e.target.checked);
                            setSaveSuccess(false);
                          }}
                          className="w-4.5 h-4.5 rounded-md accent-brand-green border-brand-sand cursor-pointer focus:ring-brand-green"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-brand-dark">Em Tratamento de Aparelho</span>
                          <span className="text-[10px] text-brand-muted">Habilita monitoramento de manutenção mensal.</span>
                        </div>
                      </label>

                      {/* End Date Input (Only shown if has braces is checked) */}
                      {editHasBraces && (
                        <div className="space-y-1.5 pl-7 animate-slideDown">
                          <label className="text-[10px] font-bold text-brand-muted font-mono uppercase block">
                            Previsão Fim do Tratamento:
                          </label>
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => {
                              setEditEndDate(e.target.value);
                              setSaveSuccess(false);
                            }}
                            className="w-full bg-brand-light border border-brand-sand rounded-xl px-3 py-2 text-xs font-mono text-brand-dark focus:outline-brand-green focus:ring-0"
                          />
                          <p className="text-[9px] text-brand-muted">
                            Coloque a data estimada ou deixe em branco se não estiver definida.
                          </p>
                        </div>
                      )}

                      {/* Save Status and Button */}
                      <div className="flex items-center justify-between pt-1 pl-7">
                        {saveSuccess ? (
                          <span className="text-[10px] font-bold text-brand-green flex items-center gap-1 font-mono uppercase animate-fadeIn">
                            ✔ Salvo!
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          onClick={async () => {
                            setSavingBraces(true);
                            setSaveSuccess(false);
                            if (onUpdatePatient) {
                              const ok = await onUpdatePatient(selectedPatient.id, {
                                hasBraces: editHasBraces,
                                bracesTreatmentEndDate: editHasBraces ? (editEndDate || '') : '',
                              });
                              if (ok) {
                                setSaveSuccess(true);
                                // Update selectedPatient locally so UI reflects it immediately
                                selectedPatient.hasBraces = editHasBraces;
                                selectedPatient.bracesTreatmentEndDate = editHasBraces ? editEndDate : '';
                              }
                            }
                            setSavingBraces(false);
                          }}
                          disabled={savingBraces}
                          className="bg-brand-dark hover:bg-brand-green text-white text-[11px] font-bold px-4 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5"
                        >
                          {savingBraces ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Salvando...</span>
                            </>
                          ) : (
                            <span>Salvar Ficha</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Loyalty Indicators / Quick Stats */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider font-mono px-1">Indicadores e Métricas</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-brand-sand text-center shadow-2xs">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-brand-muted block mb-0.5">Consultas</span>
                        <span className="text-lg font-display font-bold text-brand-dark">{stats.totalCount}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-brand-sand text-center shadow-2xs">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-brand-muted block mb-0.5">Presenças</span>
                        <span className="text-lg font-display font-bold text-brand-green">{stats.completedCount}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-brand-sand text-center shadow-2xs">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-brand-muted block mb-0.5">Desistências</span>
                        <span className="text-lg font-display font-bold text-red-500">{stats.missedCount + stats.cancelledCount}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-brand-sand text-center shadow-2xs">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-brand-muted block mb-0.5">Valor Pago</span>
                        <span className="text-sm font-display font-bold text-brand-dark mt-0.5 block">R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Consultation Timeline */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider font-mono px-1">Histórico de Consultas</h5>
                    
                    {stats.patientAppts.length > 0 ? (
                      <div className="space-y-4 relative before:absolute before:inset-y-1 before:left-3 before:w-0.5 before:bg-brand-sand">
                        {stats.patientAppts.map((appt) => {
                          let badgeColor = '';
                          let dotColor = '';
                          switch(appt.status) {
                            case 'Confirmada':
                              badgeColor = 'bg-brand-green-light text-brand-green border-brand-green/20';
                              dotColor = 'bg-brand-green';
                              break;
                            case 'Agendada':
                              badgeColor = 'bg-blue-50 text-blue-600 border-blue-200';
                              dotColor = 'bg-blue-500';
                              break;
                            case 'Realizada':
                              badgeColor = 'bg-gray-100 text-gray-600 border-gray-200';
                              dotColor = 'bg-gray-400';
                              break;
                            case 'Cancelada':
                              badgeColor = 'bg-red-50 text-red-600 border-red-200';
                              dotColor = 'bg-red-500';
                              break;
                            case 'No-show':
                              badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                              dotColor = 'bg-amber-500';
                              break;
                            default:
                              badgeColor = 'bg-brand-light text-brand-muted border-brand-sand';
                              dotColor = 'bg-brand-muted';
                          }

                          return (
                            <div key={appt.id} className="flex gap-3 items-start relative pl-7">
                              <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute left-[7px] top-1.5 shadow-xs z-10 ${dotColor}`} />
                              
                              <div className="bg-white p-3.5 rounded-xl border border-brand-sand shadow-2xs flex-1 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-display font-bold text-xs text-brand-dark">
                                    {appt.serviceName}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${badgeColor}`}>
                                    {appt.status}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1 text-[11px] text-brand-muted font-mono">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3 text-brand-muted/70" />
                                    {formatDateBR(appt.date)} às {appt.time}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-brand-muted/70" />
                                    {appt.duration} min (Buffer: {appt.buffer} min)
                                  </span>
                                  {appt.price > 0 && (
                                    <span className="font-semibold text-brand-dark flex items-center">
                                      Valor: R$ {appt.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-brand-muted/70 border-t border-brand-light pt-2 mt-1">
                                  <span>Origem: <strong className="font-medium text-brand-muted">{appt.source}</strong></span>
                                  <span>Data: {formatDateBR(appt.createdAt.split('T')[0])}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-2xl border border-brand-sand text-center text-xs text-brand-muted italic">
                        Nenhuma consulta registrada para este paciente.
                      </div>
                    )}
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 bg-white border-t border-brand-sand flex gap-3 shadow-md">
                  <button
                    onClick={() => {
                      onSelectPatientChat(selectedPatient.phone);
                      setSelectedPatient(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-dark hover:text-white text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ver no WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="bg-white hover:bg-brand-light text-brand-dark border border-brand-sand rounded-xl px-4 py-2.5 text-xs font-bold transition"
                  >
                    <span>Fechar</span>
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
