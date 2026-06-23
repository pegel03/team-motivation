import React, { useState, useEffect } from 'react';
import { Team, Submission } from '../types';
import { 
  Users, Plus, Trash2, Edit3, UserPlus, Link, Copy, Check, Shield, UserCheck, UserMinus, AlertCircle,
  Download, Upload, FileDown, FileUp, Database, RefreshCw
} from 'lucide-react';

import { saveTeamDoc, deleteTeamDoc, deleteUserDoc, addSubmissionDoc } from '../firestoreService';

interface AdminPanelProps {
  teams: Team[];
  onTeamsUpdated: (updatedTeams: Team[]) => void;
  submissions: Submission[];
}

export default function AdminPanel({ teams, onTeamsUpdated, submissions }: AdminPanelProps) {
  // CRUD states
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState<Record<string, string>>({}); // teamId -> text
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Backup & Restore states
  const [selectedBackupTeamId, setSelectedBackupTeamId] = useState<string>('');
  const [restorableBackup, setRestorableBackup] = useState<{
    team: Team;
    submissions: Submission[];
    fileName: string;
  } | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Preset to team-mpygro7b (NotOrious) if found, otherwise first team
  useEffect(() => {
    if (teams.length > 0) {
      const targetTeam = teams.find(t => t.id === 'team-mpygro7b') || teams[0];
      setSelectedBackupTeamId(targetTeam.id);
    }
  }, [teams]);

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
      deleteUserDoc(email).catch(console.error);
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

  const fallbackCopyText = (text: string, teamId: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopiedId(teamId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        console.error("Fallback copy failed.");
      }
    } catch (err) {
      console.error("Fallback copy error: ", err);
    }
  };

  const handleCopyLink = (teamId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?teamId=${teamId}`;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopiedId(teamId);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch((err) => {
          console.warn("Clipboard API blocked or failed, using fallback:", err);
          fallbackCopyText(shareUrl, teamId);
        });
    } else {
      fallbackCopyText(shareUrl, teamId);
    }
  };

  const handleDownloadBackup = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      alert("Kies een geldig team om reresultaten van te back-uppen.");
      return;
    }
    const teamSubmissions = submissions.filter(s => s.teamId === teamId);
    
    const backupData = {
      backupType: 'team_survey_backup_v1',
      backupDate: new Date().toISOString(),
      team: {
        id: team.id,
        name: team.name,
        memberEmails: team.memberEmails || [],
        teamAdminEmails: team.teamAdminEmails || [],
        dashboardActive: team.dashboardActive || false,
        sessions: team.sessions || [],
        activeSessionId: team.activeSessionId || null,
        activeViewSessionId: team.activeViewSessionId || null
      },
      submissions: teamSubmissions
    };
    
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${team.name.replace(/\s+/g, '_')}-${teamId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backup = JSON.parse(content);
        
        if (backup.backupType !== 'team_survey_backup_v1' || !backup.team || !backup.team.id) {
          alert("Fout: Dit bestand is geen geldige team-enquête back-up.");
          return;
        }
        
        setRestorableBackup({
          team: backup.team,
          submissions: backup.submissions || [],
          fileName: file.name
        });
        setRestoreStatus('');
      } catch (err) {
        console.error(err);
        alert("Fout bij het parsen van het back-upbestand.");
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restorableBackup) return;
    setIsRestoring(true);
    setRestoreStatus('Bezig met opslaan van teamgegevens in database...');
    
    try {
      const { team, submissions: subs } = restorableBackup;
      
      // Save Team
      await saveTeamDoc(team);
      
      setRestoreStatus(`Team "${team.name}" succesvol hersteld. Nu bezig met het wegschrijven van ${subs.length} historische antwoorden...`);
      
      // Restore each submission
      let count = 0;
      for (const sub of subs) {
        await addSubmissionDoc(sub, team);
        count++;
        setRestoreStatus(`Bezig met herstellen van antwoorden: ${count} van ${subs.length}...`);
      }
      
      setRestoreStatus(`Gereed! Team "${team.name}" en al haar ${subs.length} historische antwoorden zijn succesvol teruggezet.`);
      setRestorableBackup(null);
      
      // Reset file input
      const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error(err);
      setRestoreStatus(`Fout tijdens herstellen: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
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
            Beheer alle teams, geautoriseerde e-mailadressen en team-beheerders.
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
            placeholder="bv. Project Team Alfa, Project Team Beta..."
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
                                  <span title="Aangewezen Team Admin">
                                    <Shield size={12} className="text-indigo-600 shrink-0" />
                                  </span>
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

      {/* Back-up & Herstel Systeem */}
      <div id="backup-restore-section" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Database size={18} className="text-indigo-600" />
            <span>Back-up & Herstel Enquête-sessies</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Exporteer een team en al haar historische stemresultaten naar een lokaal JSON-bestand, of herstel een eerder gemaakt back-upbestand in de database.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Linker paneel: Back-up exporteren */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileDown size={16} className="text-indigo-600" />
              <span>1. Back-up Exporteren</span>
            </h4>
            
            <div className="space-y-3 bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <label htmlFor="backup-team-select" className="block text-xs font-semibold text-slate-600">Selecteer Team:</label>
              <select
                id="backup-team-select"
                value={selectedBackupTeamId}
                onChange={(e) => setSelectedBackupTeamId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-600 transition-all font-sans"
              >
                {teams.length === 0 ? (
                  <option value="">Geen actieve teams beschikbaar</option>
                ) : (
                  teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (ID: {t.id})
                    </option>
                  ))
                )}
              </select>

              {/* Stats van geselecteerde team */}
              {selectedBackupTeamId && (
                <div className="bg-white border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-500 space-y-1">
                  <div>Leden: <strong className="text-slate-800">{(teams.find(t => t.id === selectedBackupTeamId)?.memberEmails || []).length}</strong></div>
                  <div>Gevonden historische antwoorden: <strong className="text-slate-800">{submissions.filter(s => s.teamId === selectedBackupTeamId).length}</strong></div>
                </div>
              )}

              <button
                id="download-backup-btn"
                disabled={!selectedBackupTeamId}
                onClick={() => handleDownloadBackup(selectedBackupTeamId)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                <span>Download backup als lokaal bestand</span>
              </button>
            </div>
          </div>

          {/* Rechter paneel: Back-up herstellen */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileUp size={16} className="text-indigo-600" />
              <span>2. Back-up Herstellen</span>
            </h4>

            <div className="space-y-4 bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <div className="space-y-1.5">
                <label htmlFor="restore-file-input" className="block text-xs font-semibold text-slate-600">Selecteer Back-upbestand (.json):</label>
                <input
                  id="restore-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFileChange}
                  className="w-full text-xs font-sans text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-value border border-slate-200/60 rounded-lg p-1 bg-white"
                />
              </div>

              {/* Overzicht van de te herstellen back-up */}
              {restorableBackup && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-2 text-xs text-emerald-900">
                  <div className="font-bold flex items-center gap-1">
                    <Check size={14} className="text-emerald-600" />
                    <span>Klaar voor herstel:</span>
                  </div>
                  <div className="pl-4 space-y-1 text-[11px]">
                    <div>Bestand: <span className="font-mono text-slate-600">{restorableBackup.fileName}</span></div>
                    <div>Teamnaam: <strong className="text-slate-800">{restorableBackup.team.name}</strong></div>
                    <div>Team-ID: <span className="font-mono text-slate-600">{restorableBackup.team.id}</span></div>
                    <div>Aantal stemmen / antwoorden: <strong className="text-slate-800">{restorableBackup.submissions.length} stuks</strong></div>
                  </div>

                  <button
                    id="execute-restore-btn"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isRestoring ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>Herstel database nu starten</span>
                  </button>
                </div>
              )}

              {/* Statusrapportage */}
              {restoreStatus && (
                <div id="restore-status-alert" className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg text-[11px] leading-relaxed font-semibold flex gap-2 items-start animate-fade-in">
                  <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full mt-1.5 animate-ping shrink-0" />
                  <p>{restoreStatus}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
