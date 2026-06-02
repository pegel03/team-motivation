import { useState, useEffect } from 'react';
import { Team, Submission } from './types';
import { 
  loadTeams, 
  loadSubmissions, 
  loadActiveUser, 
  saveActiveUser, 
  saveTeams,
  GLOBAL_ADMIN_EMAIL,
  QUESTIONS,
  isSandboxHidden
} from './data';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  testConnection, 
  seedInitialDataIfEmpty, 
  saveTeamDoc, 
  loginWithEmailSimulated, 
  logoutUser 
} from './firestoreService';
import Navigation from './components/Navigation';
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';
import SurveyForm from './components/SurveyForm';
import TeamDashboard from './components/TeamDashboard';
import SandboxSelector from './components/SandboxSelector';
import { 
  Users, AlertCircle, Sparkles, ChevronRight, CheckCircle2, Shield, Edit3, UserPlus, Trash2, UserCheck, UserMinus, LayoutGrid, Settings, BarChart3
} from 'lucide-react';

export default function App() {
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [urlTeamId, setUrlTeamId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'survey' | 'dashboard' | 'settings'>('survey');

  // Input states for Team Admin Self-CRUD
  const [selfTeamNameInput, setSelfTeamNameInput] = useState('');
  const [selfNewMemberInput, setSelfNewMemberInput] = useState('');

  // Load state on mount
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        setActiveUser(user.email);
        localStorage.setItem('logius_active_user_v2', user.email);
        const normalized = user.email.toLowerCase().trim();
        if (GLOBAL_ADMIN_EMAIL && normalized === GLOBAL_ADMIN_EMAIL.toLowerCase().trim()) {
          seedInitialDataIfEmpty().catch(console.error);
        }
      } else {
        setActiveUser(null);
        localStorage.removeItem('logius_active_user_v2');
      }
    });

    // Parse URL params for specific team shared links
    const params = new URLSearchParams(window.location.search);
    const teamIdParam = params.get('teamId');
    if (teamIdParam) {
      setUrlTeamId(teamIdParam);
      setSelectedTeamId(teamIdParam);
    }

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore real-time updates when logged in
  useEffect(() => {
    if (!activeUser) {
      setTeams([]);
      setSubmissions([]);
      return;
    }

    const normalizedEmail = activeUser.toLowerCase().trim();
    const isUserGlobalAdmin = GLOBAL_ADMIN_EMAIL && normalizedEmail === GLOBAL_ADMIN_EMAIL.toLowerCase().trim();

    let unsubTeams1 = () => {};
    let unsubTeams2 = () => {};
    let unsubSubs1 = () => {};
    let unsubSubs2 = () => {};

    if (isUserGlobalAdmin) {
      // Global admin can read everything
      unsubTeams1 = onSnapshot(collection(db, 'teams'), (snapshot) => {
        const loadedTeams: Team[] = [];
        snapshot.forEach((doc) => {
          loadedTeams.push(doc.data() as Team);
        });
        setTeams(loadedTeams);
      }, (error) => {
        console.error('Teams admin subscription error:', error);
      });

      unsubSubs1 = onSnapshot(collection(db, 'submissions'), (snapshot) => {
        const loadedSubs: Submission[] = [];
        snapshot.forEach((doc) => {
          loadedSubs.push(doc.data() as Submission);
        });
        setSubmissions(loadedSubs);
      }, (error) => {
        console.error('Submissions admin subscription error:', error);
      });
    } else {
      // Regular user queries
      // 1. Teams: Fetch where user is a member OR where user is an admin
      const qMembers = query(collection(db, 'teams'), where('memberEmails', 'array-contains', normalizedEmail));
      const qAdmins = query(collection(db, 'teams'), where('teamAdminEmails', 'array-contains', normalizedEmail));

      let memberTeamsList: Team[] = [];
      let adminTeamsList: Team[] = [];

      const updateTeams = () => {
        const mergedMap = new Map<string, Team>();
        memberTeamsList.forEach(t => mergedMap.set(t.id, t));
        adminTeamsList.forEach(t => mergedMap.set(t.id, t));
        setTeams(Array.from(mergedMap.values()));
      };

      unsubTeams1 = onSnapshot(qMembers, (snapshot) => {
        memberTeamsList = [];
        snapshot.forEach(doc => {
          memberTeamsList.push(doc.data() as Team);
        });
        updateTeams();
      }, (error) => {
        console.error('Teams members subscription error:', error);
      });

      unsubTeams2 = onSnapshot(qAdmins, (snapshot) => {
        adminTeamsList = [];
        snapshot.forEach(doc => {
          adminTeamsList.push(doc.data() as Team);
        });
        updateTeams();
      }, (error) => {
        console.error('Teams admin sub subscription error:', error);
      });

      // 2. Submissions: Fetch where user is allowed to view (e.g. member/admin) OR created by the user
      const qAllowed = query(collection(db, 'submissions'), where('allowedViewerEmails', 'array-contains', normalizedEmail));
      const qSelf = query(collection(db, 'submissions'), where('userEmail', '==', activeUser));

      let allowedSubsList: Submission[] = [];
      let selfSubsList: Submission[] = [];

      const updateSubmissions = () => {
        const mergedMap = new Map<string, Submission>();
        allowedSubsList.forEach(s => mergedMap.set(s.id, s));
        selfSubsList.forEach(s => mergedMap.set(s.id, s));
        setSubmissions(Array.from(mergedMap.values()));
      };

      unsubSubs1 = onSnapshot(qAllowed, (snapshot) => {
        allowedSubsList = [];
        snapshot.forEach(doc => {
          allowedSubsList.push(doc.data() as Submission);
        });
        updateSubmissions();
      }, (error) => {
        console.error('Submissions allowed subscription error:', error);
      });

      unsubSubs2 = onSnapshot(qSelf, (snapshot) => {
        selfSubsList = [];
        snapshot.forEach(doc => {
          selfSubsList.push(doc.data() as Submission);
        });
        updateSubmissions();
      }, (error) => {
        console.error('Submissions self subscription error:', error);
      });
    }

    return () => {
      unsubTeams1();
      unsubTeams2();
      unsubSubs1();
      unsubSubs2();
    };
  }, [activeUser]);

  const handleLogin = (email: string) => {
    loginWithEmailSimulated(email).then(() => {
      setActiveWorkspaceTab('survey');
    }).catch(console.error);
  };

  const handleLogout = () => {
    logoutUser().catch(console.error);
  };

  const handleSwitchUserSandbox = (email: string | null) => {
    if (email) {
      loginWithEmailSimulated(email).then(() => {
        setActiveWorkspaceTab('survey');
      }).catch(console.error);
    } else {
      logoutUser().catch(console.error);
    }
  };

  // Find all teams the logged in active user belongs to
  const memberTeams = activeUser 
    ? teams.filter(team => team.memberEmails.map(m => m.toLowerCase().trim()).includes(activeUser.toLowerCase().trim())) 
    : [];

  // Active Team selection logic: fall back to url param, else first team in memberTeams list
  const activeTeam = memberTeams.find(t => t.id === selectedTeamId) || memberTeams[0] || null;

  // Initialize editing inputs when the team changes
  useEffect(() => {
    if (activeTeam) {
      setSelfTeamNameInput(activeTeam.name);
    }
  }, [activeTeam?.id]);

  const isGlobalAdmin = !!activeUser && !!GLOBAL_ADMIN_EMAIL && activeUser.toLowerCase().trim() === GLOBAL_ADMIN_EMAIL.toLowerCase().trim();
  
  // A teamadmin is someone who is listed in activeTeam.teamAdminEmails
  const isTeamAdmin = activeTeam && Array.isArray(activeTeam.teamAdminEmails) && 
    activeTeam.teamAdminEmails.map(ad => ad.toLowerCase().trim()).includes(activeUser?.toLowerCase().trim() || '');

  // Update active self team callback (updating team name, members, admins from the teamadmin's panel)
  const handleUpdateSelfTeam = (updatedTeam: Team) => {
    saveTeamDoc(updatedTeam).catch(console.error);
  };

  const handleSelfAddMember = () => {
    if (!activeTeam) return;
    const emailToAdd = selfNewMemberInput.trim().toLowerCase();
    if (!emailToAdd) return;

    if (!emailToAdd.includes('@')) {
      alert('Fout: Voer een geldig e-mailadres in.');
      return;
    }

    if (activeTeam.memberEmails.map(e => e.toLowerCase().trim()).includes(emailToAdd)) {
      alert('Dit lid maakt al deel uit van dit team.');
      return;
    }

    const updatedTeam = {
      ...activeTeam,
      memberEmails: [...activeTeam.memberEmails, emailToAdd]
    };

    handleUpdateSelfTeam(updatedTeam);
    setSelfNewMemberInput('');
  };

  const handleSelfRemoveMember = (email: string) => {
    if (!activeTeam) return;
    if (confirm(`Sluit ${email} uit van dit team?`)) {
      const nextMembers = activeTeam.memberEmails.filter(m => m.toLowerCase().trim() !== email.toLowerCase().trim());
      let nextAdmins = activeTeam.teamAdminEmails.filter(m => m.toLowerCase().trim() !== email.toLowerCase().trim());
      
      // Automatically promote first next team member if the last team admin is removed
      if (nextAdmins.length === 0 && nextMembers.length > 0) {
        nextAdmins = [nextMembers[0]];
      }

      const updatedTeam = {
        ...activeTeam,
        memberEmails: nextMembers,
        teamAdminEmails: nextAdmins
      };
      
      handleUpdateSelfTeam(updatedTeam);
    }
  };

  const handleSelfToggleAdmin = (email: string) => {
    if (!activeTeam) return;
    const currentlyAdmin = activeTeam.teamAdminEmails.map(ad => ad.toLowerCase().trim()).includes(email.toLowerCase().trim());
    
    let nextAdmins = [...activeTeam.teamAdminEmails];
    if (currentlyAdmin) {
      nextAdmins = nextAdmins.filter(ad => ad.toLowerCase().trim() !== email.toLowerCase().trim());
      // Automatically promote first next team member if the last team admin steps down
      if (nextAdmins.length === 0 && activeTeam.memberEmails.length > 0) {
        const firstNextMember = activeTeam.memberEmails.find(m => m.toLowerCase().trim() !== email.toLowerCase().trim()) || activeTeam.memberEmails[0];
        if (firstNextMember) {
          nextAdmins = [firstNextMember];
        }
      }
    } else {
      nextAdmins.push(email);
    }

    const updatedTeam = {
      ...activeTeam,
      teamAdminEmails: nextAdmins
    };

    handleUpdateSelfTeam(updatedTeam);
  };

  const handleSelfSaveTeamName = () => {
    if (!activeTeam || !selfTeamNameInput.trim()) return;
    const updatedTeam = {
      ...activeTeam,
      name: selfTeamNameInput.trim()
    };
    handleUpdateSelfTeam(updatedTeam);
    alert('Teamnaam succesvol bijgewerkt!');
  };

  // Safe global update
  const handleTeamUpdate = (updatedTeam: Team) => {
    saveTeamDoc(updatedTeam).catch(console.error);
  };

  const sharedUrlTeam = urlTeamId ? teams.find(t => t.id === urlTeamId) : null;

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Navigation Header */}
      <Navigation 
        currentUserEmail={activeUser} 
        userTeam={activeTeam} 
        onLogout={handleLogout} 
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner for shared invitation links */}
        {sharedUrlTeam && !activeUser && (
          <div id="shared-link-invitation" className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
                <Users size={20} />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                  Teampagina Uitnodiging
                </h4>
                <p className="text-xs text-indigo-700 leading-normal">
                  U bent uitgenodigd om deel te nemen aan het team <strong className="text-indigo-950">{sharedUrlTeam.name}</strong>. Log hieronder in met uw e-mailadres om uw scores door te geven.
                </p>
              </div>
            </div>
            <button
              id="clear-shared-team-btn"
              onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setUrlTeamId(null);
              }}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold uppercase tracking-wider self-end sm:self-center"
            >
              Sluiten
            </button>
          </div>
        )}

        {/* View Router */}
        {!activeUser ? (
          /* Case 1: Guest / Login required */
          <div className="max-w-md mx-auto pt-6">
            <LoginForm onLoginSuccess={handleLogin} />
          </div>
        ) : isGlobalAdmin ? (
          /* Case 2: Global administrator */
          <div className="space-y-4">
            <AdminPanel 
              teams={teams} 
              onTeamsUpdated={setTeams} 
            />
          </div>
        ) : (
          /* Case 3: Logged in user with multiple team supports */
          <div className="space-y-8">
            {memberTeams.length === 0 ? (
              /* Sub-case: Logged in, but is not attached to any team yet */
              <div id="unassigned-user-alert" className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-in zoom-in-95 duration-200">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <AlertCircle size={24} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-900">U bent nog niet ingedeeld</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Uw e-mailadres hoort momenteel niet bij een geconfigureerd team.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl text-left border border-slate-100 text-[11px] text-slate-500 leading-normal">
                  <strong>Wat kunt u doen?</strong>
                  <ul className="list-disc pl-4 mt-1.5 space-y-1">
                    <li>Vraag de <strong className="text-slate-700">systeembeheerder</strong> om u toe te voegen aan een team.</li>
                    <li>Gebruik de <strong className="text-indigo-600">Rol-wisselaar</strong> rechtsonder om een gereedstaand testlid te kiezen.</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Sub-case: User belongs to one or more teams! */
              <div className="space-y-6">
                
                {/* Team Selector & Header Block */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse" />
                      <h2 className="text-base font-bold text-slate-900">Mijn Logius Teams</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      U bent geregistreerd in <strong className="text-indigo-600 font-bold">{memberTeams.length}</strong> {memberTeams.length === 1 ? 'team' : 'teams'}. Wissel hiernaast eenvoudig om uw status per team te beheren.
                    </p>
                  </div>

                  {/* Dynamic Dropdown showing only if they are in multiple teams, or always for convenience */}
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 hidden sm:inline">Actieve Team:</label>
                    <select
                      id="team-switcher"
                      value={activeTeam?.id || ''}
                      onChange={(e) => {
                        setSelectedTeamId(e.target.value);
                        // Reset workspace tab on team switch to avoid empty panels
                        setActiveWorkspaceTab('survey');
                      }}
                      className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 cursor-pointer transition-all"
                    >
                      {memberTeams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.teamAdminEmails.map(ad => ad.toLowerCase()).includes(activeUser?.toLowerCase() || '') ? '(Beheerder)' : '(Lid)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Workspace Navigation (Enquête, Dashboard, settings if TeamAdmin) */}
                <div className="border-b border-slate-200 flex flex-wrap gap-2 md:gap-4 pb-0">
                  <button
                    id="tab-btn-survey"
                    onClick={() => setActiveWorkspaceTab('survey')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 ${
                      activeWorkspaceTab === 'survey'
                        ? 'border-indigo-600 text-indigo-100 bg-indigo-600 text-white px-3 py-1.5 rounded-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span>Enquête Invullen</span>
                  </button>

                  {/* Dashboard Tab - Visible if Team Admin OR if dashboard is active for members */}
                  {(isTeamAdmin || activeTeam.dashboardActive) ? (
                    <button
                      id="tab-btn-dashboard"
                      onClick={() => setActiveWorkspaceTab('dashboard')}
                      className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 ${
                        activeWorkspaceTab === 'dashboard'
                          ? 'border-indigo-600 text-indigo-100 bg-indigo-600 text-white px-3 py-1.5 rounded-lg'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <BarChart3 size={14} />
                      <span>Team Dashboard & Historie</span>
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-400 self-center bg-slate-100 px-2 py-1 rounded border border-slate-200/50 flex items-center gap-1.5 select-none" title="Dashboard wordt vrijgegeven door uw teambeheerder na sluiting">
                      <AlertCircle size={11} />
                      <span>Dashboard niet vrijgegeven</span>
                    </div>
                  )}

                  {/* Self-CRUD settings tab - ONLY for Team Admins */}
                  {isTeamAdmin && (
                    <button
                      id="tab-btn-team-settings"
                      onClick={() => setActiveWorkspaceTab('settings')}
                      className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 ${
                        activeWorkspaceTab === 'settings'
                          ? 'border-indigo-600 text-indigo-100 bg-indigo-600 text-white px-3 py-1.5 rounded-lg'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Settings size={14} />
                      <span>Team Beheer</span>
                    </button>
                  )}
                </div>

                {/* Workspace Output Rendering */}
                {activeWorkspaceTab === 'survey' && (
                  <SurveyForm 
                    currentUserEmail={activeUser}
                    userTeam={activeTeam}
                    allSubmissions={submissions}
                    onSubmissionSuccess={setSubmissions}
                  />
                )}

                {activeWorkspaceTab === 'dashboard' && (
                  <TeamDashboard 
                    currentUserEmail={activeUser}
                    userTeam={activeTeam}
                    allSubmissions={submissions}
                    onTeamUpdate={handleTeamUpdate}
                    teamsList={teams}
                    onAllTeamsUpdate={setTeams}
                  />
                )}

                {activeWorkspaceTab === 'settings' && isTeamAdmin && (
                  /* Team admin Self-CRUD section */
                  <div id="teamadmin-crud-panel" className="space-y-8 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                      
                      {/* Section Header */}
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Settings className="text-indigo-600" size={18} />
                          <span>Mijn Team Bewerken: {activeTeam.name}</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Als team-beheerder kunt u de teamnaam hernoemen en de lijst met teamleden/beheerders beheren.
                        </p>
                      </div>

                      {/* CRUD: Update Team Name */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">Teamnaam Wijzigen</label>
                        <div className="flex gap-3">
                          <input
                            id="self-team-name-input"
                            type="text"
                            value={selfTeamNameInput}
                            onChange={(e) => setSelfTeamNameInput(e.target.value)}
                            placeholder="Nieuwe teamnaam..."
                            className="flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 font-semibold"
                          />
                          <button
                            id="self-save-team-name-btn"
                            onClick={handleSelfSaveTeamName}
                            className="bg-slate-900 text-white border border-slate-800 rounded-lg px-4 py-2 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                          >
                            Naam Opslaan
                          </button>
                        </div>
                      </div>

                      {/* CRUD: Add member */}
                      <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">Lid Toevoegen aan {activeTeam.name}</label>
                          <p className="text-[10px] text-slate-400 mt-0.5">Voer het e-mailadres van uw collega in.</p>
                        </div>
                        <div className="flex gap-3">
                          <input
                            id="self-new-member-input"
                            type="email"
                            value={selfNewMemberInput}
                            onChange={(e) => setSelfNewMemberInput(e.target.value)}
                            placeholder="collega@logius.nl"
                            className="flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 font-semibold"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSelfAddMember();
                              }
                            }}
                          />
                          <button
                            id="self-add-member-btn"
                            onClick={handleSelfAddMember}
                            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-indigo-750 cursor-pointer flex items-center gap-1.5"
                          >
                            <UserPlus size={14} />
                            <span>Lid toevoegen</span>
                          </button>
                        </div>
                      </div>

                      {/* CRUD: Manage Team Members & Roles list */}
                      <div className="space-y-3 pt-4 border-t border-slate-50">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">Leden & Beheerderslijst</label>
                        
                        {/* Privacy: Filter out the global administrator email from lists */}
                        {(() => {
                          const list = activeTeam.memberEmails.filter(
                            (m) =>
                              m.toLowerCase().trim() !== GLOBAL_ADMIN_EMAIL.toLowerCase().trim()
                          );

                          if (list.length === 0) {
                            return <p className="text-xs text-slate-400 italic">Er zijn momenteel geen andere leden in dit team.</p>;
                          }

                          return (
                            <div className="max-w-2xl border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                              {list.map((email) => {
                                const isUserAdminOfTeam = activeTeam.teamAdminEmails.map(ad => ad.toLowerCase().trim()).includes(email.toLowerCase().trim());
                                return (
                                  <div key={email} className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 transition-all text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isUserAdminOfTeam ? (
                                        <Shield size={13} className="text-indigo-600 shrink-0" title="Teambeheerder" />
                                      ) : (
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                      )}
                                      <span className="font-semibold text-slate-800 truncate">{email}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Appoint / remove team admin role button */}
                                      <button
                                        id={`self-toggle-admin-${email.replace(/[@.]/g, '-')}`}
                                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border transition-all ${
                                          isUserAdminOfTeam 
                                            ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                                            : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                        }`}
                                        onClick={() => handleSelfToggleAdmin(email)}
                                        title={isUserAdminOfTeam ? "Onthef van beheerrol" : "Maak mede-beheerder"}
                                      >
                                        {isUserAdminOfTeam ? 'Onthef Admin' : 'Maak Admin'}
                                      </button>

                                      {/* Remove member from team completely */}
                                      <button
                                        id={`self-remove-member-${email.replace(/[@.]/g, '-')}`}
                                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100"
                                        onClick={() => handleSelfRemoveMember(email)}
                                        title="Lid verwijderen"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Interactive Role Sandbox Panel */}
      {!isSandboxHidden() && (
        <SandboxSelector 
          currentEmail={activeUser} 
          onSwitchUser={handleSwitchUserSandbox}
          teams={teams}
        />
      )}
    </div>
  );
}
