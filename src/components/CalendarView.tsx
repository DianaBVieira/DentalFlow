/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Check, X, Clock, HelpCircle, Phone, User, Settings, Info } from 'lucide-react';
import { Appointment, Service, AppointmentStatus } from '../types';

interface CalendarViewProps {
  appointments: Appointment[];
  services: Service[];
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onAddAppointment: (appt: {
    patientName: string;
    patientPhone: string;
    serviceId: string;
    date: string;
    time: string;
    source: 'Manual' | 'WhatsApp';
  }) => Promise<boolean>;
}

export default function CalendarView({
  appointments,
  services,
  onUpdateStatus,
  onAddAppointment,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState('2026-07-08'); // Default to 2026-07-08
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for manual booking
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle date shifts
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const getDayLabel = () => {
    if (selectedDate === '2026-07-08') return 'Hoje (Quarta-feira)';
    if (selectedDate === '2026-07-09') return 'Amanhã (Quinta-feira)';
    const d = new Date(selectedDate);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Filter appointments for this date
  const dayAppointments = appointments.filter(
    a => a.date === selectedDate && a.status !== 'Cancelada'
  );

  // Time grid generation from 08:00 to 18:00
  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!patientName.trim() || !patientPhone.trim() || !serviceId || !bookingTime) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const success = await onAddAppointment({
      patientName,
      patientPhone,
      serviceId,
      date: selectedDate,
      time: bookingTime,
      source: 'Manual',
    });

    if (success) {
      setIsModalOpen(false);
      setPatientName('');
      setPatientPhone('');
      setServiceId('');
      setBookingTime('09:00');
    } else {
      setErrorMsg('Horário indisponível devido a conflito na agenda ou restrição técnica.');
    }
  };

  const getStatusStyle = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmada':
        return 'bg-brand-green-light border-brand-green/35 text-brand-dark';
      case 'Agendada':
        return 'bg-white border-brand-sand text-brand-dark';
      case 'No-show':
        return 'bg-brand-light/70 border-brand-sand/80 text-brand-muted';
      case 'Realizada':
        return 'bg-brand-light border-brand-sand text-brand-dark';
      case 'Reagendada':
        return 'bg-brand-green-light/40 border-brand-green/20 text-brand-muted italic';
      default:
        return 'bg-white border-brand-sand text-brand-dark';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-brand-sand shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 hover:bg-brand-light rounded-lg border border-brand-sand transition text-brand-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-green" />
            <span className="font-display font-semibold text-brand-dark text-base sm:text-lg min-w-48 text-center sm:text-left">
              {getDayLabel()}
            </span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="p-2 hover:bg-brand-light rounded-lg border border-brand-sand transition text-brand-muted"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button & Date input */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-brand-sand rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium text-sm px-4 py-2 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Manual
          </button>
        </div>
      </div>

      {/* Hour Grid visualizer */}
      <div className="bg-white rounded-2xl border border-brand-sand shadow-xs overflow-hidden">
        <div className="p-4 bg-brand-light text-brand-dark text-xs font-mono uppercase tracking-wider border-b border-brand-sand flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-muted" />
          <span>Agenda Horária • Dra. Marina Castro</span>
        </div>

        <div className="divide-y divide-brand-light">
          {hours.map((hour) => {
            // Find if there's any appointment starting within this hour block
            const matchedAppts = dayAppointments.filter(
              a => a.time.startsWith(hour.split(':')[0])
            );

            return (
              <div key={hour} className="flex min-h-24 md:min-h-16">
                {/* Time Indicator column */}
                <div className="w-20 md:w-24 px-4 py-3 bg-brand-light/30 flex flex-col justify-start items-center border-r border-brand-sand shrink-0 select-none">
                  <span className="font-display font-bold text-brand-dark text-base">{hour}</span>
                  <span className="text-[10px] text-brand-muted font-mono">Disponível</span>
                </div>

                {/* Content block column */}
                <div className="flex-1 p-3 flex flex-col gap-2 bg-white justify-center">
                  {matchedAppts.length > 0 ? (
                    matchedAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className={`border rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs transition hover:shadow-sm ${getStatusStyle(
                          appt.status
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-light/80 border border-brand-sand/50 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-brand-muted" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-display font-bold text-sm text-brand-dark">
                                {appt.patientName}
                              </h5>
                              <span className="text-[10px] bg-white border border-brand-sand text-brand-muted rounded px-1.5 font-mono">
                                {appt.time}
                              </span>
                              <span className="text-[10px] font-bold bg-brand-light border border-brand-sand text-brand-muted px-1.5 rounded uppercase tracking-wide">
                                {appt.source}
                              </span>
                            </div>
                            <p className="text-xs text-brand-muted mt-0.5">
                              Procedimento: <span className="font-medium text-brand-dark">{appt.serviceName}</span> • Duração: {appt.duration}min (+{appt.buffer}min buffer)
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-brand-muted mt-1">
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3 text-brand-muted" />
                                {appt.patientPhone}
                              </span>
                              <span className="font-bold text-brand-dark">R$ {appt.price}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status update controls */}
                        <div className="flex items-center gap-2 flex-wrap bg-white/60 p-1.5 rounded-lg border border-brand-sand self-end md:self-auto">
                          <label className="text-[10px] text-brand-muted font-mono font-bold uppercase mr-1">Status:</label>
                          <select
                            value={appt.status}
                            onChange={(e) => onUpdateStatus(appt.id, e.target.value as AppointmentStatus)}
                            className="text-xs bg-white border border-brand-sand rounded px-1.5 py-0.5 font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-green"
                          >
                            <option value="Agendada">Agendada</option>
                            <option value="Confirmada">Confirmada</option>
                            <option value="Realizada">Realizada</option>
                            <option value="Reagendada">Reagendada</option>
                            <option value="No-show">No-show</option>
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="text-brand-muted text-xs italic">Nenhum agendamento para este horário.</span>
                      <button
                        onClick={() => {
                          setBookingTime(hour);
                          setIsModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-brand-dark bg-brand-light hover:bg-brand-sand px-2 py-1 rounded transition border border-brand-sand"
                      >
                        <Plus className="w-3 h-3 text-brand-muted" />
                        Agendar aqui
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-[#FAF9F6] rounded-3xl max-w-md w-full border border-brand-sand shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-brand-light border-b border-brand-sand flex justify-between items-center">
              <h4 className="font-display font-semibold text-brand-dark text-base">Agendamento Manual</h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-brand-dark hover:bg-brand-sand/50 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleManualSubmit} className="p-5 flex flex-col gap-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Nome do Paciente *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome completo do paciente"
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Celular / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="Ex: +55 11 98888-1111"
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Procedimento *</label>
                <select
                  required
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
                >
                  <option value="">Selecione um procedimento</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min) - R$ {s.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-brand-muted">Data de Atendimento</label>
                  <input
                    type="text"
                    disabled
                    value={selectedDate}
                    className="border border-brand-sand/50 rounded-lg px-3 py-2 text-sm text-brand-muted bg-brand-light font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-brand-muted">Horário *</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-brand-sand">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-brand-sand text-brand-muted hover:bg-brand-light font-medium text-xs px-4 py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-green hover:bg-brand-green-hover text-white font-medium text-xs px-4 py-2 rounded-lg shadow-sm transition"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
