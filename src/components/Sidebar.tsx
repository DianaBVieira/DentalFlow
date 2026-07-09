import React from 'react';
import {
  Calendar as CalendarIcon,
  Users,
  Settings as SettingsIcon,
  TrendingUp,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

type Tab = 'metrics' | 'calendar' | 'services' | 'crm' | 'settings';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isTestMode: boolean;
  onExitTestMode: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, isTestMode, onExitTestMode }: SidebarProps) {
  const menuItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'metrics', label: 'Métricas', icon: TrendingUp },
    { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
    { id: 'services', label: 'Serviços', icon: Sliders },
    { id: 'crm', label: 'CRM Pacientes', icon: Users },
    { id: 'settings', label: 'Configuração', icon: SettingsIcon },
  ];

  return (
    <div className={`bg-brand-green h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} text-white shadow-xl`}>
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && <img src="/assets/LogoDentalFlow.png" alt="DentalFlow" className="h-8 w-auto" />}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-full hover:bg-white/20">
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      <nav className="flex-1 mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 p-4 transition ${
              activeTab === item.id ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <item.icon className="w-6 h-6 shrink-0" />
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <button onClick={() => isTestMode ? onExitTestMode() : signOut(auth)} className="p-4 flex items-center gap-4 hover:bg-white/10">
        <LogOut className="w-6 h-6" />
        {!isCollapsed && <span>{isTestMode ? 'Sair do modo teste' : 'Sair'}</span>}
      </button>
    </div>
  );
}
