import React, { useState } from 'react';
import { Team } from '../types';
import { 
  Users, Plus, Trash2, Edit3, UserPlus, Link, Copy, Check, Shield, UserCheck, UserMinus, AlertCircle, Database, RefreshCw
} from 'lucide-react';
import { isDemoDisabled, setDemoDisabledFlag, isSandboxHidden, setSandboxHiddenFlag } from '../data';
import { saveTeamDoc, deleteTeamDoc } from '../firestoreService';

interface AdminPanelProps {
  teams: Team[];
  onTeamsUpdated: (updatedTeams: Team[]) => void;
}

export default function AdminPanel({ teams, onTeamsUpdated }: AdminPanelProps) {
  // CRUD states
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState<Record<string, string>>({}); // teamId -> text
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sandboxHidden, setSandboxHidden] = useState(isSandboxHidden());

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeamId = `team-${Date.now().toString(36)}`;
    const newTeam: Team = {
      id: newTeamId,
      name: newTeamName.trim(),
      memberEmails: [],
      teamAdminEmails: [],
      dashboardActive: false
    };

    saveTeamDoc(newTeam).catch(console.error);
    setNewTeamName('');
  };

  const handleDeleteTeam = (id: string) => {
    if (confirm('Weet u zeker dat u dit team wilt verwijderen?')) {
      deleteTeamDoc(id).catch(console.error);
    }
  };

  const handleStartEditName = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const handleSaveEditName = (id: string) => {
    if (!editingTeamName.trim()) return;
    const team = teams.find(t => t.id === id);
    if (!team) return;
    const updatedTeam = { ...team, name: editingTeamName.trim() };
    saveTeamDoc(updatedTeam).catch(console.error);
    setEditingTeamId(null);
  };

  const handleAddMember = (teamId: string) => {
    const email = (newMemberEmail[teamId] || '').trim().toLowerCase();
    if (!email) return;

    // Direct domain validation
    if (!email.includes('@')) {
      alert('Fout: Voer een geldig e-mailadres in met een @-teken.');
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    if (team.memberEmails.map(m => m.toLowerCase()).includes(email)) {
      alert('Dit lid is al toegevoegd aan dit team.');
      return;
    }

    // If there are no admins yet, designate this user as the first team admin
    const noAdminsYet = team.teamAdminEmails.length === 0;
    const updatedTeam = {
      ...team,
      memberEmails: [...team.memberEmails, email],
      teamAdminEmails: noAdminsYet ? [email] : team.teamAdminEmails
    };

    saveTeamDoc(updatedTeam).catch(console.error);
    setNewMemberEmail({ ...newMemberEmail, [teamId]: '' });
  };

  const handleRemoveMember = (teamId: string, email: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    if (confirm(`Sluit ${email} uit van dit team?`)) {
      const nextMembers = team.memberEmails.filter(m => m.toLowerCase() !== email.toLowerCase());
      let nextAdmins = team.teamAdminEmails.filter(m => m.toLowerCase() !== email.toLowerCase());
      
      // Automatically promote the first next team member if the last team admin is removed
      if (nextAdmins.length === 0 && nextMembers.length > 0) {
        nextAdmins = [nextMembers[0]];
      }

      const updatedTeam = {
        ...team,
        memberEmails: nextMembers,
        teamAdminEmails: nextAdmins
      };
      saveTeamDoc(updatedTeam).catch(console.error);
    }
  };

  const handleToggleTeamAdmin = (teamId: string, email: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const isCurrentlyAdmin = team.teamAdminEmails.map(ad => ad.toLowerCase()).includes(email.toLowerCase());
    let nextAdmins = isCurrentlyAdmin
      ? team.teamAdminEmails.filter(ad => ad.toLowerCase() !== email.toLowerCase())
      : [...team.teamAdminEmails, email];

    // Automatically promote the first next team member if the last team admin steps down
    if (nextAdmins.length === 0 && team.memberEmails.length > 0) {
      const firstNextMember = team.memberEmails.find(m => m.toLowerCase() !== email.toLowerCase()) || team.memberEmails[0];
      if (firstNextMember) {
        nextAdmins = [firstNextMember];
      }
    }

    const updatedTeam = { ...team, teamAdminEmails: nextAdmins };
    saveTeamDoc(updatedTeam).catch(console.error);
  };

  const handleCopyLink = (teamId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?teamId=${teamId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(teamId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div id="admin-panel-container" className="space-y-8 font-sans">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">Beheerderspaneel</h2>
          </div>
          <p className="text-xs text-slate-500">
            Beheer alle teams, geautoriseerde e-mailadressen en team-beheerders binnen Logius.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs font-semibold">
          <Shield size={14} />
          <span>Systeem Beheerder</span>
        </div>
      </div>

      {/* Create Team Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus size={18} className="text-indigo-600" />
          <span>Nieuw Team Aanmaken</span>
        </h3>
        <form onSubmit={handleCreateTeam} className="flex gap-3">
          <input
            id="admin-new-team-input"
            type="text"
            placeholder="bv. Logius Burgerportaal, Project Team Beta..."
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
            required
          />
          <button
            id="admin-create-team-btn"
            type="submit"
            className="bg-slate-900 border border-slate-800 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-slate-800 shadow-sm cursor-pointer transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Team toevoegen</span>
          </button>
        </form>
      </div>

      {/* Teams List */}
      <div className="space-y-6">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
          <Users size={18} className="text-indigo-600" />
          <span>Actieve Teams ({teams.length})</span>
        </h3>

        {teams.length === 0 ? (
          <div className="text-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl py-12 px-4">
            <Users size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">Geen teams geconfigureerd</p>
            <p className="text-xs text-slate-400 mt-1">Vul hierboven een teamnaam in om direct een team te starten.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.map((team) => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?teamId=${team.id}`;
              
              const visibleMembers = team.memberEmails;

              return (
                <div 
                  id={`team-card-${team.id}`}
                  key={team.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all divide-y divide-slate-100 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      {editingTeamId === team.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            id={`edit-name-input-${team.id}`}
                            type="text"
                            value={editingTeamName}
                            onChange={(e) => setEditingTeamName(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded pl-2 pr-2 py-1 text-sm font-semibold outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 flex-1"
                          />
                          <button
                            id={`save-name-btn-${team.id}`}
                            onClick={() => handleSaveEditName(team.id)}
                            className="text-xs bg-emerald-600 text-white font-semibold px-2 py-1.5 rounded hover:bg-emerald-700 cursor-pointer"
                          >
                            Opslaan
                          </button>
                          <button
                            id={`cancel-name-btn-${team.id}`}
                            onClick={() => setEditingTeamId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium px-1"
                          >
                            Annuleer
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-800 leading-tight">
                              {team.name}
                            </h4>
                            <button
                              id={`edit-team-name-trigger-${team.id}`}
                              onClick={() => handleStartEditName(team)}
                              title="Teamnaam bewerken"
                              className="text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                          <span className="inline-block text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {team.id}
                          </span>
                        </div>
                      )}

                      <button
                        id={`delete-team-btn-${team.id}`}
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer shrink-0"
                        title="Team verwijderen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Shared link widget */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500 truncate font-mono">
                          {shareUrl}
                        </span>
                      </div>
                      <button
                        id={`copy-team-link-${team.id}`}
                        onClick={() => handleCopyLink(team.id)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all ${
                          copiedId === team.id 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="Teampagina uitnodigingslink kopiëren"
                      >
                        {copiedId === team.id ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === team.id ? 'Gekopieerd!' : 'Kopieer'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Members management */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Teamleden ({visibleMembers.length})
                      </span>
                    </div>

                    {/* Add Member Email */}
                    <div className="flex gap-2">
                      <input
                        id={`add-member-input-${team.id}`}
                        type="email"
                        placeholder="collega@mail.com"
                        value={newMemberEmail[team.id] || ''}
                        onChange={(e) => setNewMemberEmail({ ...newMemberEmail, [team.id]: e.target.value })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-600 transition-all font-sans"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMember(team.id);
                          }
                        }}
                      />
                      <button
                        id={`add-member-btn-${team.id}`}
                        onClick={() => handleAddMember(team.id)}
                        className="bg-indigo-600 text-white rounded-lg p-1.5 hover:bg-indigo-700 cursor-pointer text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <UserPlus size={14} />
                        <span>Voeg toe</span>
                      </button>
                    </div>

                    {visibleMembers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Nog geen teamleden geconfigureerd.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {visibleMembers.map((email) => {
                          const isAdminOfTeam = team.teamAdminEmails.map(ad => ad.toLowerCase()).includes(email.toLowerCase());
                          return (
                            <li 
                              id={`member-item-${team.id}-${email.replace(/[@.]/g, '-')}`}
                              key={email}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                isAdminOfTeam 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-medium' 
                                  : 'bg-slate-50 border-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isAdminOfTeam ? (
                                  <Shield size={12} className="text-indigo-600 shrink-0" title="Aangewezen Team Admin" />
                                ) : (
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                )}
                                <span className="truncate">{email}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <button
                                  id={`toggle-admin-${team.id}-${email.replace(/[@.]/g, '-')}`}
                                  onClick={() => handleToggleTeamAdmin(team.id, email)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                                    isAdminOfTeam
                                      ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                                      : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                  }`}
                                  title={isAdminOfTeam ? "Verwijder admin status" : "Stel in als Team Admin"}
                                >
                                  {isAdminOfTeam ? <UserMinus size={10} /> : <UserCheck size={10} />}
                                  <span>{isAdminOfTeam ? 'Onthef Admin' : 'Maak Admin'}</span>
                                </button>

                                <button
                                  id={`remove-member-${team.id}-${email.replace(/[@.]/g, '-')}`}
                                  onClick={() => handleRemoveMember(team.id, email)}
                                  className="text-slate-400 hover:text-red-600 p-0.5 shrink-0"
                                  title="Verwijderen uit team"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Maintenance & Demo settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          <span>Systeemonderhoud & Demo-modus</span>
        </h3>
        
        <p className="text-xs text-slate-600 leading-relaxed">
          Als globale systeembeheerder kunt u de demomodus beheren. Dit bepaalt of er standaard testteams en antwoorden worden getoond op een vers geladen systeem.
        </p>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Huidige status:</span>
            {isDemoDisabled() ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold">
                Lege Website Actief (Geen Testdata)
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold">
                Demomodus Actief (Met Testdata & Gebruikers)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60">
            <span className="font-semibold text-slate-700">Rol-wisselaar (Simulatiepaneel r.o.):</span>
            <button
              id="btn-toggle-sandbox"
              onClick={() => {
                const nextHidden = !sandboxHidden;
                setSandboxHiddenFlag(nextHidden);
                setSandboxHidden(nextHidden);
                window.dispatchEvent(new Event('storage'));
              }}
              className={`px-2.5 py-1 text-xs border font-bold rounded-lg transition-all cursor-pointer ${
                sandboxHidden
                  ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                  : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'
              }`}
            >
              {sandboxHidden ? 'Uitgezet / Verborgen' : 'Aan / Zichtbaar'}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              id="btn-wipe-demo-data"
              onClick={() => {
                if (confirm('Weet u zeker dat u ALLE testgegevens (inclusief testteams en testantwoorden) wilt wissen en met een volledig lege website wilt beginnen? Dit is onomkeerbaar.')) {
                  setDemoDisabledFlag(true);
                  localStorage.removeItem('logius_teams_data_v2');
                  localStorage.removeItem('logius_submissions_data_v2');
                  window.location.reload();
                }
              }}
              className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Schoon begin: wis alle testdata</span>
            </button>

            {isDemoDisabled() && (
              <button
                id="btn-restore-demo-data"
                onClick={() => {
                  if (confirm('Wilt u de standaard testdata en testgebruikers herstellen? Uw huidige gegevens worden overschreven.')) {
                    setDemoDisabledFlag(false);
                    localStorage.removeItem('logius_teams_data_v2');
                    localStorage.removeItem('logius_submissions_data_v2');
                    window.location.reload();
                  }
                }}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Herstel demomodus (met testdata)</span>
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 bg-indigo-50/50 p-3 rounded-xl border border-indigo-50">
          <p className="font-semibold text-indigo-950 mb-1">💡 Productie-tip voor GitHub Pages deployment:</p>
          Om de website <strong>automatisch direct leeg</strong> te bouwen en te publiceren via GitHub Actions (of bij lokaal bouwen), kunt u de omgevingsvariabele <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-700 font-mono">VITE_NO_MOCK_DATA=true</code> meegeven tijdens het bouwproces. In de workflow staat dit al voor u voorbereid in de <code className="bg-white px-1 py-0.5 rounded border border-indigo-100 text-[10px] font-mono">.github/workflows/deploy.yml</code>.
        </div>
      </div>
    </div>
  );
}
