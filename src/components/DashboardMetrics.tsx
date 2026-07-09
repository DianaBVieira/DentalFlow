/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, Users, Calendar, DollarSign, Ban, Percent, CheckCircle, AlertTriangle } from 'lucide-react';
import { Appointment, Service } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

interface DashboardMetricsProps {
  appointments: Appointment[];
  services: Service[];
}

export default function DashboardMetrics({ appointments, services }: DashboardMetricsProps) {
  // Compute analytics
  const total = appointments.length;
  const activeAppts = appointments.filter(a => a.status !== 'Cancelada');

  const confirmed = appointments.filter(a => a.status === 'Confirmada').length;
  const realized = appointments.filter(a => a.status === 'Realizada').length;
  const noShow = appointments.filter(a => a.status === 'No-show').length;
  const cancelled = appointments.filter(a => a.status === 'Cancelada').length;
  const rescheduled = appointments.filter(a => a.status === 'Reagendada').length;
  const pending = appointments.filter(a => a.status === 'Agendada').length;

  // Confirmation Rate = (Confirmed + Realized) / (Confirmed + Realized + No-Show + Pending)
  const totalExpectedAttendance = confirmed + realized + noShow + pending;
  const confirmationRate = totalExpectedAttendance > 0 
    ? Math.round(((confirmed + realized) / totalExpectedAttendance) * 100) 
    : 0;

  // No-Show Rate = No-Show / (Realized + No-Show)
  const totalEnded = realized + noShow;
  const noShowRate = totalEnded > 0 
    ? Math.round((noShow / totalEnded) * 100) 
    : 0;

  // Calculate revenue
  const realizedRevenue = appointments
    .filter(a => a.status === 'Realizada')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  const pendingRevenue = appointments
    .filter(a => a.status === 'Confirmada' || a.status === 'Agendada' || a.status === 'Reagendada')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  // Status Distribution for Pie Chart
  const statusData = [
    { name: 'Realizada', value: realized, color: '#96A68B' }, // Sage Green
    { name: 'Confirmada', value: confirmed, color: '#7A8275' }, // Muted Sage
    { name: 'Agendada', value: pending + rescheduled, color: '#E5DFD3' }, // Sand
    { name: 'No-show', value: noShow, color: '#3D4439' }, // Dark Olive
    { name: 'Cancelada', value: cancelled, color: '#D35400' }, // Rust Orange
  ].filter(d => d.value > 0);

  // Appointments per Service for Bar Chart
  const serviceCountMap = appointments.reduce((acc, curr) => {
    acc[curr.serviceName] = (acc[curr.serviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const serviceData = Object.keys(serviceCountMap).map(name => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    Consultas: serviceCountMap[name],
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Integration Control */}
      <div className="bg-white p-5 rounded-2xl border border-brand-green/30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-green-light rounded-xl">
             <Calendar className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h4 className="font-semibold text-brand-dark">Integração Google Agenda</h4>
            <p className="text-xs text-brand-muted">Consultas sincronizadas automaticamente.</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-brand-green text-white text-xs font-semibold rounded-full">
           Ativo
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-brand-muted uppercase tracking-wider">Consultas Totais</span>
            <span className="text-3xl font-display font-bold text-brand-dark">{total}</span>
            <span className="text-[10px] text-brand-muted">Histórico acumulado</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center border border-brand-sand/50">
            <Calendar className="w-6 h-6 text-brand-muted" />
          </div>
        </div>

        {/* Confirmation Rate */}
        <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-brand-muted uppercase tracking-wider">Taxa de Confirmação</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-brand-dark">{confirmationRate}%</span>
              <span className="text-[10px] font-semibold text-brand-green">Meta: &gt;85%</span>
            </div>
            <span className="text-[10px] text-brand-muted">Consultas ativas e realizadas</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${confirmationRate >= 85 ? 'bg-brand-green-light text-brand-green border-brand-green/20' : 'bg-brand-light text-brand-muted border-brand-sand'}`}>
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* No-show Rate */}
        <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-brand-muted uppercase tracking-wider">Taxa de No-Show</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-brand-dark">{noShowRate}%</span>
              <span className="text-[10px] font-semibold text-brand-green">Meta: &lt;10%</span>
            </div>
            <span className="text-[10px] text-brand-muted">Faltas sobre finalizadas</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${noShowRate <= 10 ? 'bg-brand-green-light text-brand-green border-brand-green/20' : 'bg-brand-light text-brand-muted border-brand-sand'}`}>
            <Ban className="w-6 h-6" />
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-brand-sand shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-brand-muted uppercase tracking-wider">Faturamento</span>
            <div className="flex flex-col">
              <span className="text-lg font-display font-bold text-brand-dark">R$ {realizedRevenue.toLocaleString('pt-BR')} <span className="text-xs font-normal text-brand-muted">realizado</span></span>
              <span className="text-xs text-brand-muted">R$ {pendingRevenue.toLocaleString('pt-BR')} <span className="text-[10px] text-brand-muted">projetado</span></span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-green-light border border-brand-green/20 text-brand-green flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Target Status Bar Comparison & Alert Row */}
      <div className="bg-brand-light border border-brand-sand rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white text-brand-green flex items-center justify-center border border-brand-sand shadow-xs">
            <img src="/assets/LogoDentalFlow.png" alt="DentalFlow" className="h-6 w-auto" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-brand-dark text-sm">Status das Metas do MVP</h4>
            <p className="text-xs text-brand-muted">Avaliação baseada no PRD oficial e dados de agendamentos reais e simulados.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-white border border-brand-sand rounded-full px-3 py-1 shadow-xs">
            <span className="w-2.5 h-2.5 bg-brand-green rounded-full"></span>
            <span className="font-semibold text-brand-dark">Confirmações: {confirmationRate >= 85 ? 'Dentro da Meta' : 'Abaixo da Meta'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-white border border-brand-sand rounded-full px-3 py-1 shadow-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${noShowRate <= 10 ? 'bg-brand-green' : 'bg-brand-muted'}`}></span>
            <span className="font-semibold text-brand-dark">No-show: {noShowRate <= 10 ? 'Excelente' : 'Atenção Requerida'}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-3xl border border-brand-sand shadow-xs flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-brand-light pb-3">
            <h4 className="font-display font-semibold text-brand-dark text-sm">Distribuição de Status</h4>
            <span className="text-[10px] font-mono text-brand-muted">Total de {total} registros</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} consultas`, 'Quantidade']} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-brand-muted text-xs font-mono">Sem consultas registradas para gerar gráfico.</span>
            )}
          </div>
        </div>

        {/* Services Demand Bar Chart */}
        <div className="bg-white p-5 rounded-3xl border border-brand-sand shadow-xs flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-brand-light pb-3">
            <h4 className="font-display font-semibold text-brand-dark text-sm">Demanda por Procedimento</h4>
            <span className="text-[10px] font-mono text-brand-muted">Consultas por serviço</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {serviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#7A8275" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#7A8275" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Consultas" fill="#96A68B" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-brand-muted text-xs font-mono">Sem dados para comparar demanda de procedimentos.</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Minimalista de Desenvolvimento */}
      <footer className="pt-8 pb-2 text-center border-t border-brand-sand/25 mt-8" id="dashboard-footer">
        <p className="text-[10px] text-brand-muted/60 tracking-wider font-mono">
          Desenvolvedor: <img src="/assets/utopia.png" alt="Utopia" className="h-4 w-auto inline-block align-middle mr-1" /> <span className="font-semibold text-brand-muted/80">Utopia Desenvolvimentos</span>
        </p>
      </footer>
    </div>
  );
}
