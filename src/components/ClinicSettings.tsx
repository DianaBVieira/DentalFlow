/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, MapPin, Sparkles, AlertCircle, RefreshCw, Undo, MessageSquare, HelpCircle, Calendar } from 'lucide-react';
import { ClinicSettings as SettingsType } from '../types';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ClinicSettingsProps {
  settings: SettingsType;
  onSaveSettings: (settings: SettingsType) => Promise<boolean>;
}

export default function ClinicSettings({ settings, onSaveSettings }: ClinicSettingsProps) {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [professionalName, setProfessionalName] = useState(settings.professionalName);
  const [startTime, setStartTime] = useState(settings.startTime);
  const [endTime, setEndTime] = useState(settings.endTime);
  const [address, setAddress] = useState(settings.address);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(settings.googleMapsUrl);
  const [aiDisplayName, setAiDisplayName] = useState(settings.aiDisplayName || settings.clinicName);
  const [aiGreeting, setAiGreeting] = useState(settings.aiGreeting);
  const [aiSystemInstruction, setAiSystemInstruction] = useState(settings.aiSystemInstruction);
  const [whatsappApiKey, setWhatsappApiKey] = useState(settings.whatsappApiKey || '');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(settings.whatsappPhoneNumberId || '');
  const [showHelp, setShowHelp] = useState(false);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

  useEffect(() => {
    const fetchCalendarConfig = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'userCalendarConfigs', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCalendarSyncEnabled(docSnap.data().syncEnabled);
        }
      }
    };
    fetchCalendarConfig();
  }, []);

  const connectCalendar = () => {
    window.location.href = `/api/auth/google?userId=${auth.currentUser?.uid}`;
  };

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleResetAI = () => {
    setAiGreeting(`Olá! Sou a Assistente Virtual da clínica ${clinicName}. Como posso te ajudar hoje?`);
    setAiSystemInstruction(`Você é a Assistente Virtual Inteligente da clínica ${clinicName}, consultório odontológico sob a responsabilidade do profissional ${professionalName}. Seu tom deve ser extremamente profissional, acolhedor, empático e claro.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage('');
    setErrorMessage('');

    const success = await onSaveSettings({
      clinicName,
      professionalName,
      startTime,
      endTime,
      daysOfWeek: settings.daysOfWeek, // Keep default days
      address,
      googleMapsUrl,
      aiDisplayName,
      aiGreeting,
      aiSystemInstruction,
      whatsappApiKey,
      whatsappPhoneNumberId,
    });

    setSaving(false);
    if (success) {
      setSavedMessage('Configurações atualizadas e salvas com sucesso!');
      setTimeout(() => setSavedMessage(''), 3000);
    } else {
      setErrorMessage('Falha ao atualizar as configurações. Verifique o servidor backend.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Settings Header */}
      <div className="bg-white p-4 rounded-2xl border border-brand-sand shadow-xs">
        <h4 className="font-display font-semibold text-brand-dark text-base">Configurações Gerais, IA e WhatsApp</h4>
        <p className="text-xs text-brand-muted">Configure horários, personalize a IA e integre sua API WhatsApp.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Alerts */}
        {savedMessage && (
          <div className="bg-brand-green-light border border-brand-green/20 text-brand-green text-sm p-4 rounded-2xl flex items-center gap-2">
            <span className="font-semibold">{savedMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 text-sm p-4 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clinic & Professional Info */}
          <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex flex-col gap-4">
            <h5 className="font-display font-semibold text-brand-dark text-sm border-b border-brand-light pb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-muted" />
              <span>Dados do Consultório</span>
            </h5>
            {/* ... fields ... */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-muted">Nome da Clínica</label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-muted">Dentista Responsável</label>
              <input
                type="text"
                required
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-muted" />
                  <span>Abertura (Início)</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-muted" />
                  <span>Fechamento (Fim)</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-muted flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-muted" />
                <span>Endereço Completo</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-muted">Link Google Maps (para lembretes 1h)</label>
              <input
                type="url"
                required
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-muted">Nome de Exibição da IA (no WhatsApp)</label>
              <input
                type="text"
                required
                value={aiDisplayName}
                onChange={(e) => setAiDisplayName(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-medium"
              />
            </div>
            
            {/* Google Calendar Sync */}
            <h5 className="font-display font-semibold text-brand-dark text-sm border-b border-brand-light pb-3 mt-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-green" />
              <span>Sincronização Google Agenda</span>
            </h5>
            <div className="flex flex-col gap-2 mt-2 mb-6">
              <label className="flex items-center gap-2 text-sm text-brand-dark">
                <input type="checkbox" checked={calendarSyncEnabled} onChange={(e) => setCalendarSyncEnabled(e.target.checked)} className="rounded border-brand-sand text-brand-green focus:ring-brand-green" />
                Sincronizar consultas automaticamente
              </label>
              <div className="text-xs text-brand-muted ml-6">
                Status mapeados: Confirmado, Cancelado, Reagendado.
              </div>
            </div>

            {/* WhatsApp Credentials */}
            <h5 className="font-display font-semibold text-brand-dark text-sm border-b border-brand-light pb-3 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-muted" />
                <span>WhatsApp Business API</span>
              </div>
              <button type="button" onClick={() => setShowHelp(!showHelp)} className="text-brand-green hover:text-brand-green/80 transition">
                <HelpCircle className="w-5 h-5" />
              </button>
            </h5>

            {showHelp && (
              <div className="bg-brand-light p-3 rounded-lg text-xs text-brand-dark mt-2 border border-brand-green/20">
                <p className="font-semibold mb-1">Como obter as credenciais:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Acesse o <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-brand-green underline">Meta for Developers</a>.</li>
                  <li>Crie ou selecione seu Aplicativo.</li>
                  <li>Na seção WhatsApp, clique em "Configuração".</li>
                  <li>Copie o <b>Phone Number ID</b> e a <b>API Key</b> (Token de Acesso).</li>
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-semibold text-brand-muted">API Key</label>
              <input
                type="password"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-muted">Phone Number ID</label>
              <input
                type="text"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
              />
            </div>
          </div>


          {/* AI Receptionist Prompts Customization */}
          <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-brand-light pb-3">
                <h5 className="font-display font-semibold text-brand-dark text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-green" />
                  <span>Personalidade da Assistente IA</span>
                </h5>
                <button
                  type="button"
                  onClick={handleResetAI}
                  className="flex items-center gap-1 text-[10px] text-brand-muted hover:text-brand-green transition font-mono border border-brand-sand hover:border-brand-green rounded-xl px-2.5 py-1 bg-brand-light"
                >
                  <Undo className="w-3 h-3 mr-1" />
                  Resetar Padrão
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Mensagem de Boas-Vindas</label>
                <input
                  type="text"
                  required
                  value={aiGreeting}
                  onChange={(e) => setAiGreeting(e.target.value)}
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
                />
                <p className="text-[10px] text-brand-muted">Mensagem disparada na primeira interação ou LGPD.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Instruções de Sistema (Prompt NLU)</label>
                <textarea
                  required
                  value={aiSystemInstruction}
                  onChange={(e) => setAiSystemInstruction(e.target.value)}
                  rows={6}
                  className="border border-brand-sand rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white resize-none leading-relaxed font-mono"
                />
                <p className="text-[10px] text-brand-muted leading-relaxed">
                  Esta diretriz molda o tom, as regras de segurança LGPD, a detecção de intenções e a conversão do paciente.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-brand-light">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-xs transition self-end cursor-pointer"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Salvar Configurações</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
