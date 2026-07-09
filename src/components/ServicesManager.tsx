/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Clock, HelpCircle, DollarSign, Sparkles, Sliders } from 'lucide-react';
import { Service } from '../types';

interface ServicesManagerProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id'>) => Promise<boolean>;
  onEditService: (id: string, service: Omit<Service, 'id'>) => Promise<boolean>;
  onDeleteService: (id: string) => Promise<boolean>;
}

export default function ServicesManager({
  services,
  onAddService,
  onEditService,
  onDeleteService,
}: ServicesManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(45);
  const [buffer, setBuffer] = useState(15);
  const [price, setPrice] = useState(200);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDuration(45);
    setBuffer(15);
    setPrice(200);
    setDescription('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingId(s.id);
    setName(s.name);
    setDuration(s.duration);
    setBuffer(s.buffer);
    setPrice(s.price);
    setDescription(s.description);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('O nome do procedimento é obrigatório.');
      return;
    }

    let success = false;
    const payload = {
      name,
      duration: Number(duration),
      buffer: Number(buffer),
      price: Number(price),
      description,
    };

    if (editingId) {
      success = await onEditService(editingId, payload);
    } else {
      success = await onAddService(payload);
    }

    if (success) {
      setIsFormOpen(false);
    } else {
      setErrorMsg('Ocorreu um erro ao salvar o procedimento. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Services Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-brand-sand shadow-xs">
        <div>
          <h4 className="font-display font-semibold text-brand-dark text-base">Procedimentos Clínicos</h4>
          <p className="text-xs text-brand-muted">Configure os serviços, durações e intervalos de segurança técnica.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium text-sm px-4 py-2 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </button>
      </div>

      {/* Services List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-2xl border border-brand-sand p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition"
          >
            <div>
              <div className="flex justify-between items-start gap-2">
                <h5 className="font-display font-bold text-brand-dark text-base">{service.name}</h5>
                <span className="text-sm font-bold font-mono text-brand-green shrink-0">
                  R$ {service.price}
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-2 leading-relaxed h-12 overflow-hidden text-ellipsis">
                {service.description || 'Nenhuma descrição informada.'}
              </p>

              {/* Specs Badge */}
              <div className="flex items-center justify-between mt-4 text-xs font-mono text-brand-muted bg-brand-light p-3 rounded-xl border border-brand-sand/50">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-brand-muted/70">Atendimento</span>
                  <span className="text-brand-dark font-bold">{service.duration} min</span>
                </div>
                <div className="w-px h-6 bg-brand-sand"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-brand-muted/70">Intervalo (Buffer)</span>
                  <span className="text-brand-dark font-bold">{service.buffer} min</span>
                </div>
                <div className="w-px h-6 bg-brand-sand"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-brand-muted/70">Bloqueio Total</span>
                  <span className="text-brand-green font-bold">{service.duration + service.buffer} min</span>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-brand-light">
              <button
                onClick={() => handleOpenEdit(service)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-brand-green hover:bg-brand-light transition border border-transparent hover:border-brand-sand"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteService(service.id)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Slide Modal or Dialog Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-[#FAF9F6] rounded-3xl max-w-md w-full border border-brand-sand shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-brand-light border-b border-brand-sand flex justify-between items-center">
              <h4 className="font-display font-semibold text-brand-dark text-base">
                {editingId ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-brand-dark hover:bg-brand-sand/50 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Nome do Procedimento *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Limpeza, Restauração de Resina, etc."
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-brand-muted">Duração (minutos) *</label>
                  <input
                    type="number"
                    required
                    min={15}
                    max={240}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-brand-muted">Buffer Técnico (minutos) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={120}
                    step={5}
                    value={buffer}
                    onChange={(e) => setBuffer(Number(e.target.value))}
                    className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Preço Cobrado (BRL) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-brand-muted" />
                  </div>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="border border-brand-sand rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green w-full text-brand-dark bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-muted">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o procedimento e o que está incluso..."
                  rows={3}
                  className="border border-brand-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green text-brand-dark bg-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-brand-sand">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="border border-brand-sand text-brand-muted hover:bg-brand-light font-medium text-xs px-4 py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-green hover:bg-brand-green-hover text-white font-medium text-xs px-4 py-2 rounded-lg shadow-sm transition"
                >
                  Salvar Procedimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
