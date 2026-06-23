import { LogOut, Shield, Users, User, Compass } from 'lucide-react';
import { Team } from '../types';

interface NavigationProps {
  currentUserEmail: string | null;
  userTeam: Team | null;
  onLogout: () => void;
  isGlobalAdmin: boolean;
}

export default function Navigation({ currentUserEmail, userTeam, onLogout, isGlobalAdmin }: NavigationProps) {
  // Workaround to avoid reference error if teamAdminEmails is checked but it's on userTeam
  const teamAdminEmails = userTeam?.teamAdminEmails || [];
  const isTeamAdmin = userTeam && Array.isArray(teamAdminEmails) && teamAdminEmails.map(ad => ad.toLowerCase()).includes(currentUserEmail ? currentUserEmail.toLowerCase() : '');
  const displayEmail = isGlobalAdmin ? "Systeembeheerder" : currentUserEmail;

  return (
    <header id="main-nav-header" className="bg-white border-b border-slate-200 sticky top-0 z-40 font-sans shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Brand Logo & Identifier */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-900 border border-slate-800 text-white rounded-lg flex items-center justify-center font-bold tracking-tight text-base shadow-sm shrink-0 font-mono">
              T
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm text-slate-900 leading-none tracking-tight flex items-center gap-1.5">
                <span>TEAM PORTAAL</span>
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
              </h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                Enquête & Dashboard
              </span>
            </div>
          </div>

          {/* User Session Indicators */}
          {currentUserEmail ? (
            <div className="flex items-center gap-3">
              {/* Badge for role */}
              <div className="hidden md:flex items-center gap-1.5">
                {isGlobalAdmin && (
                  <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md border border-red-100 flex items-center gap-1">
                    <Shield size={12} />
                    <span>Hoofd Beheerder</span>
                  </span>
                )}
                {isTeamAdmin && !isGlobalAdmin && (
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1">
                    <Shield size={12} />
                    <span>Team Admin</span>
                  </span>
                )}
                {!isGlobalAdmin && !isTeamAdmin && userTeam && (
                  <span className="bg-slate-50 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1">
                    <User size={12} />
                    <span>Teamlid: {userTeam.name}</span>
                  </span>
                )}
              </div>

              {/* Display email summary */}
              <div className="text-right flex flex-col justify-center min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[150px] sm:max-w-none">
                  {displayEmail}
                </span>
                {userTeam && (
                  <span className="text-[9px] text-slate-400 font-semibold truncate uppercase">
                    {userTeam.name}
                  </span>
                )}
              </div>

              {/* Logout button */}
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-red-100"
                title="Uitloggen"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-rose-500 rounded-full animate-ping" />
              <span className="text-xs text-slate-500 font-medium font-sans">
                Niet ingelogd
              </span>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
