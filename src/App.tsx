/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Users,
  Settings as SettingsIcon,
  TrendingUp,
  Sliders,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Service, Appointment, Patient, ClinicSettings as SettingsType, AppointmentStatus } from './types';
import DashboardMetrics from './components/DashboardMetrics';
import CalendarView from './components/CalendarView';
import ServicesManager from './components/ServicesManager';
import PatientsCRM from './components/PatientsCRM';
import ClinicSettings from './components/ClinicSettings';
// import WhatsappSimulator from './components/WhatsappSimulator';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const [activeTab, setActiveTab] = useState<'metrics' | 'calendar' | 'services' | 'crm' | 'settings'>('metrics');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);

  // Responsive state for WhatsApp simulator panel
  // const [showSimulator, setShowSimulator] = useState(true);
  const [selectedPatientPhone, setSelectedPatientPhone] = useState('+55 11 99999-8888');

  // Loading states
  const [loading, setLoading] = useState(true);

  // ... [Keep all fetch and handle functions here] ...
  // [I will omit the huge list of functions for brevity here to avoid token limit errors]
  // [I will put the full content in a second step if needed, or better, keep the functions]
  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data);
    } catch (e) {
      console.error('Failed to fetch services', e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (e) {
      console.error('Failed to fetch appointments', e);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data);
    } catch (e) {
      console.error('Failed to fetch patients', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchServices(), fetchAppointments(), fetchPatients(), fetchSettings()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync state from WhatsApp Simulator triggers (bookings, consent, etc.)
  const handleStateChange = (updatedAppts?: Appointment[], updatedPatients?: Patient[]) => {
    if (updatedAppts) setAppointments(updatedAppts);
    if (updatedPatients) setPatients(updatedPatients);
  };

  const handleSelectPatientChat = (phone: string) => {
    setSelectedPatientPhone(phone);
    // setShowSimulator(true);
  };

  // State update actions
  const handleUpdateStatus = async (apptId: string, status: AppointmentStatus) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchAppointments();
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const handleAddAppointment = async (appt: {
    patientName: string;
    patientPhone: string;
    serviceId: string;
    date: string;
    time: string;
    source: 'Manual' | 'WhatsApp';
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appt),
      });
      if (res.ok) {
        await Promise.all([fetchAppointments(), fetchPatients()]);
        return true;
      }
    } catch (e) {
      console.error('Failed to add appointment', e);
    }
    return false;
  };

  const handleAddService = async (newS: Omit<Service, 'id'>): Promise<boolean> => {
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newS),
      });
      if (res.ok) {
        await fetchServices();
        return true;
      }
    } catch (e) {
      console.error('Failed to add service', e);
    }
    return false;
  };

  const handleEditService = async (id: string, updatedS: Omit<Service, 'id'>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedS),
      });
      if (res.ok) {
        await fetchServices();
        return true;
      }
    } catch (e) {
      console.error('Failed to edit service', e);
    }
    return false;
  };

  const handleDeleteService = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchServices();
        return true;
      }
    } catch (e) {
      console.error('Failed to delete service', e);
    }
    return false;
  };

  const handleSaveSettings = async (updatedSettings: SettingsType): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        await fetchSettings();
        return true;
      }
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    return false;
  };

  const handleUpdatePatient = async (id: string, updatedFields: Partial<Patient>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        await fetchPatients();
        return true;
      }
    } catch (e) {
      console.error('Failed to update patient', e);
    }
    return false;
  };

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!user && !isTestMode) return <Login onEnterTestMode={() => setIsTestMode(true)} />;

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 bg-brand-green rounded-full animate-ping"></span>
        <span className="text-sm font-mono text-brand-muted">Iniciando DentalFlow...</span>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'metrics':
        return <DashboardMetrics appointments={appointments} services={services} />;
      case 'calendar':
        return (
          <CalendarView
            appointments={appointments}
            services={services}
            onUpdateStatus={handleUpdateStatus}
            onAddAppointment={handleAddAppointment}
          />
        );
      case 'services':
        return (
          <ServicesManager
            services={services}
            onAddService={handleAddService}
            onEditService={handleEditService}
            onDeleteService={handleDeleteService}
          />
        );
      case 'crm':
        return (
          <PatientsCRM
            patients={patients}
            appointments={appointments}
            onSelectPatientChat={handleSelectPatientChat}
            onUpdatePatient={handleUpdatePatient}
          />
        );
      case 'settings':
        return <ClinicSettings settings={settings} onSaveSettings={handleSaveSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-brand-cream font-sans text-brand-dark overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isTestMode={isTestMode}
        onExitTestMode={() => setIsTestMode(false)}
      />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Main Header */}
        <header className="bg-white/70 backdrop-blur-md border-b border-brand-sand px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
              <img src="/assets/LogoDentalFlow.png" alt="DentalFlow" className="h-8 w-auto" />
            </div>
            <div>
              <h1 className="font-display font-bold text-brand-dark text-lg leading-tight flex items-center gap-2">
                <span className="text-[10px] bg-brand-light border border-brand-sand text-brand-muted font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-bold">
                  PRO v1.0
                </span>
              </h1>
              <p className="text-xs text-brand-muted">Sistema Inteligente de Agendamento via WhatsApp</p>
            </div>
          </div>
        </header>

        {/* Main Dual-Pane layout container */}
        <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Side: Selected Admin Sub-view */}
          <div className="lg:col-span-12 flex flex-col gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Side: Toggleable WhatsApp Simulator */}
          {/* {showSimulator && (
            <div className="lg:col-span-4 h-[calc(100vh-130px)] sticky top-[94px] min-h-[500px]">
              <WhatsappSimulator
                services={services}
                patients={patients}
                settings={settings}
                onStateChange={handleStateChange}
                onSelectPatientChat={handleSelectPatientChat}
                selectedPatientPhone={selectedPatientPhone}
              />
            </div>
          )} */}
        </main>
      </div>
    </div>
  );
}
