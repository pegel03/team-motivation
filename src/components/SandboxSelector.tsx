import { useState } from 'react';
import { RefreshCw, Shield, User, Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { GLOBAL_ADMIN_EMAIL } from '../data';

interface SandboxSelectorProps {
  currentEmail: string | null;
  onSwitchUser: (email: string | null) => void;
  teams: any[];
}

export default function SandboxSelector({ currentEmail, onSwitchUser, teams }: SandboxSelectorProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Derive some helpful mock personas
  const personas = [
    {
      name: 'Globale Systeem Beheerder',
      email: GLOBAL_ADMIN_EMAIL,
      role: 'Hoofd Beheerder',
      icon: Shield,
      color: 'bg-red-50 text-red-700 border-red-200'
    },
    {
      name: 'Maria (Team Admin)',
      email: 'teamadmin.maria@logius.nl',
      role: 'Team Admin (Burgerzaken)',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      name: 'Sarah (Teamlid)',
      email: 'designer.sarah@logius.nl',
      role: 'Teamlid (Dynamic Cloud)',
      icon: User,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      name: 'Josh (Teamlid)',
      email: 'developer.josh@logius.nl',
      role: 'Teamlid (Dynamic Cloud)',
      icon: User,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      name: 'Nieuw lid (Logius)',
      email: 'nieuw.lid@logius.nl',
      role: 'Onbepaald lid op logius.nl',
      icon: User,
      color: 'bg-slate-50 text-slate-700 border-slate-200'
    }
  ];

  return (
    <div id="sandbox-selector-container" className="fixed bottom-4 right-4 z-50 flex items-end">
      {/* Toggle Button */}
      <button
        id="sandbox-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 bg-slate-900 border border-slate-800 text-white rounded-full shadow-xl hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
        title="Simulatiepaneel openen/sluiten"
      >
        {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {isOpen && (
        <div
          id="sandbox-panel"
          className="ml-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 font-sans animate-in slide-in-from-right-4 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="text-indigo-600 animate-spin-slow" size={16} />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Rol-wisselaar (Testen)
              </h3>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-medium px-1.5 py-0.5 rounded">
              Simulatie
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Klik op een optie hieronder om direct van rol te wisselen. Handig om dashboards en vragenlijsten op logius.nl te testen zonder uit te loggen.
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {personas.map((p) => {
              const IconComp = p.icon;
              const isActive = currentEmail === p.email;

              return (
                <button
                  id={`sandbox-persona-${p.email.replace(/[@.]/g, '-')}`}
                  key={p.email}
                  onClick={() => onSwitchUser(p.email)}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-1 rounded ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <IconComp size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 flex items-center justify-between">
                      <span className="truncate">{p.name}</span>
                      {isActive && <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {p.email === GLOBAL_ADMIN_EMAIL ? 'beheer@logius.nl' : p.email}
                    </div>
                    <div className="text-[9px] font-semibold text-indigo-600 mt-0.5">{p.role}</div>
                  </div>
                </button>
              );
            })}

            <button
              id="sandbox-logout"
              onClick={() => onSwitchUser(null)}
              className={`w-full text-center p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                !currentEmail
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Uitgelogd / Bezoeker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
