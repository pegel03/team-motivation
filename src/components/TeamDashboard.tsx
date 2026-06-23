import { useState, useEffect } from 'react';
import { Team, Submission, Question, Session } from '../types';
import { QUESTIONS, saveTeams } from '../data';
import { 
  BarChart, Calendar, Award, Star, History, ArrowUpRight, 
  ToggleLeft, ToggleRight, ShieldAlert, AlertCircle, 
  Clock, CheckCircle2, Play, Radio, Users, Eye, HelpCircle
} from 'lucide-react';

interface TeamDashboardProps {
  currentUserEmail: string;
  userTeam: Team;
  allSubmissions: Submission[];
  onTeamUpdate: (updatedTeam: Team) => void;
  teamsList: Team[];
  onAllTeamsUpdate: (updatedTeams: Team[]) => void;
}

export default function TeamDashboard({
  currentUserEmail,
  userTeam,
  allSubmissions,
  onTeamUpdate,
  teamsList,
  onAllTeamsUpdate
}: TeamDashboardProps) {
  const isTeamAdmin = Array.isArray(userTeam.teamAdminEmails) && 
    userTeam.teamAdminEmails.map(ad => ad.toLowerCase()).includes(currentUserEmail.toLowerCase());

  // Available sessions List
  const sessions = userTeam.sessions || [];
  const activeSessionId = userTeam.activeSessionId || null;

  // Primitive identifier of sessions to stabilize useEffect dependency tracking
  const sessionsKey = sessions.map(s => `${s.id}-${s.isActive}`).join(',');

  // Filter submissions for this specific team
  const teamSubmissions = allSubmissions.filter(s => s.teamId === userTeam.id);
  const hasLegacySubmissions = teamSubmissions.some(s => !s.sessionId);

  // Determine latest completed/closed session
  const latestCompletedSession = [...sessions].reverse().find(s => !s.isActive);

  // Decide the default session ID to show
  const defaultSessionId = userTeam.activeViewSessionId || 
                           (latestCompletedSession ? latestCompletedSession.id : 
                           (activeSessionId ? activeSessionId : (hasLegacySubmissions ? 'legacy' : '')));

  // Local state
  const [selectedSessionId, setSelectedSessionId] = useState<string>(defaultSessionId);
  const [isCoupledToAdmin, setIsCoupledToAdmin] = useState<boolean>(!isTeamAdmin);
  const [newSessionDate, setNewSessionDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Synchronise selected session with activeViewSessionId if coupled and not admin
  useEffect(() => {
    if (!isTeamAdmin && isCoupledToAdmin && userTeam.activeViewSessionId) {
      setSelectedSessionId(userTeam.activeViewSessionId);
    }
  }, [userTeam.activeViewSessionId, isCoupledToAdmin, isTeamAdmin]);

  // Keep selected tab updated or fallback if session list modifies
  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSessionId(defaultSessionId);
    } else if (selectedSessionId !== 'legacy' && selectedSessionId !== 'all' && !sessions.some(s => s.id === selectedSessionId)) {
      setSelectedSessionId(defaultSessionId);
    }
  }, [sessionsKey, defaultSessionId, selectedSessionId]);

  // Submissions associated with the selected session
  const currentSubmissions = teamSubmissions.filter(s => {
    if (s.isSkipped) return false;
    if (selectedSessionId === 'legacy') {
      return !s.sessionId;
    }
    return s.sessionId === selectedSessionId;
  });

  // Calculate scores for a set of submissions
  const calculateAverages = (subs: Submission[]) => {
    if (subs.length === 0) return { overall: 0, perQuestion: {} as Record<string, number> };

    const qSums: Record<string, number> = {};
    const qCounts: Record<string, number> = {};

    QUESTIONS.forEach(q => {
      qSums[q.id] = 0;
      qCounts[q.id] = 0;
    });

    subs.forEach(sub => {
      Object.entries(sub.scores).forEach(([qId, score]) => {
        if (qSums[qId] !== undefined) {
          qSums[qId] += score;
          qCounts[qId] += 1;
        }
      });
    });

    const perQuestion: Record<string, number> = {};
    let totalSum = 0;
    let totalQuestionsAnswered = 0;

    QUESTIONS.forEach(q => {
      const avg = qCounts[q.id] > 0 ? parseFloat((qSums[q.id] / qCounts[q.id]).toFixed(1)) : 0;
      perQuestion[q.id] = avg;
      totalSum += qSums[q.id];
      totalQuestionsAnswered += qCounts[q.id];
    });

    const overall = totalQuestionsAnswered > 0 
      ? parseFloat((totalSum / totalQuestionsAnswered).toFixed(2)) 
      : 0;

    return { overall, perQuestion };
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const isViewingOpenActiveSession = selectedSession?.isActive;
  // If viewing an open active session, only see scores if admin, or if currently broadcasted by admin
  const isAuthorizedToSeeScores = isTeamAdmin || !isViewingOpenActiveSession || 
    (isCoupledToAdmin && userTeam.activeViewSessionId === selectedSessionId);

  const currentAverages = calculateAverages(currentSubmissions);

  // Administrative handlers
  const handleStartSession = () => {
    if (activeSessionId) {
      alert("Er is al een actieve enquête-sessie open. Sluit deze eerst af.");
      return;
    }

    if (!newSessionDate) {
      alert("Kies een geldige startdatum.");
      return;
    }

    const newSessId = `sess-${Date.now()}`;
    const newSess: Session = {
      id: newSessId,
      startDate: newSessionDate,
      isActive: true
    };

    const updatedSessions = [...sessions, newSess];
    const updatedTeam: Team = {
      ...userTeam,
      sessions: updatedSessions,
      activeSessionId: newSessId,
      activeViewSessionId: newSessId // Focus admin's view on this new session
    };

    onTeamUpdate(updatedTeam);
    const updatedList = teamsList.map(t => t.id === userTeam.id ? updatedTeam : t);
    onAllTeamsUpdate(updatedList);
    saveTeams(updatedList);

    setSelectedSessionId(newSessId);
    alert(`Enquête-sessie gestart op datum: ${newSess.startDate}`);
  };

  const handleCloseSession = () => {
    if (!activeSessionId) return;

    if (!confirm("Weet u zeker dat u de huidige enquête-sessie handmatig wilt sluiten en publiceren? Teamleden kunnen dan niet meer stemmen en de resultaten worden direct gepubliceerd.")) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          isActive: false,
          endDate: todayStr
        };
      }
      return s;
    });

    const updatedTeam: Team = {
      ...userTeam,
      sessions: updatedSessions,
      activeSessionId: null,
      activeViewSessionId: activeSessionId, // Make this newly closed session the active presentation session
      dashboardActive: true
    };

    onTeamUpdate(updatedTeam);
    const updatedList = teamsList.map(t => t.id === userTeam.id ? updatedTeam : t);
    onAllTeamsUpdate(updatedList);
    saveTeams(updatedList);

    setSelectedSessionId(activeSessionId);
    alert("De sessie is succesvol afgesloten en gepubliceerd als hoofdsessie.");
  };

  // Change selected viewing session manually
  const handleSelectSessionManually = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    
    if (isTeamAdmin) {
      // If admin, this view selection is pushed/synced to all coupled team members
      const updatedTeam = {
        ...userTeam,
        activeViewSessionId: sessionId
      };
      onTeamUpdate(updatedTeam);
      const updatedList = teamsList.map(t => t.id === userTeam.id ? updatedTeam : t);
      onAllTeamsUpdate(updatedList);
      saveTeams(updatedList);
    } else {
      // If member, change decouples them from live admin sync
      setIsCoupledToAdmin(false);
    }
  };

  const handleToggleCoupling = () => {
    const nextCoupled = !isCoupledToAdmin;
    setIsCoupledToAdmin(nextCoupled);
    if (nextCoupled && userTeam.activeViewSessionId) {
      setSelectedSessionId(userTeam.activeViewSessionId);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 5.5) return 'bg-emerald-600';
    if (score >= 4.0) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 5.5) return 'text-emerald-700';
    if (score >= 4.0) return 'text-amber-700';
    return 'text-rose-700';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 5.5) return 'bg-emerald-50';
    if (score >= 4.0) return 'bg-amber-50';
    return 'bg-rose-50';
  };

  // Fetch all unique sessions options
  const sortedSessions = [...sessions].reverse();

  return (
    <div id="team-dashboard-root" className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Team Admin Controller panel */}
      {isTeamAdmin && (
        <div id="team-admin-controller" className="bg-white border-2 border-indigo-600 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-700">
              Teambeheerder Controlepaneel: Enquête-sessies
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Left side: Active session status */}
            <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-[10px] uppercase font-extrabold tracking-wide text-slate-400 block">Lopende Enquête Statussen</span>
              {activeSessionId ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Sessie is geopend op {sessions.find(s => s.id === activeSessionId)?.startDate}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Leden kunnen nu antwoorden insturen. Er zijn op dit moment <strong>{currentSubmissions.length} stemmen</strong> geactiveerd van de {userTeam.memberEmails.length} teamleden.
                  </p>
                  <button
                    id="btn-close-session"
                    onClick={handleCloseSession}
                    className="w-full text-center bg-slate-900 border border-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 size={13} />
                    <span>Sessie handmatig sluiten & publiceren</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  <div className="text-slate-500 font-medium text-xs flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <span>Geen actieve enquête geopend.</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Start handmatig een nieuwe sessie met een datum om teamleden in staat te stellen scores in te dienen.
                  </p>
                </div>
              )}
            </div>

            {/* Right side: Start new session manually */}
            <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-[10px] uppercase font-extrabold tracking-wide text-slate-400 block">Nieuwe Enquête Handmatig Starten</span>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Kies de startdatum (Geen naam nodig):</label>
                  <input
                    id="new-session-date-picker"
                    type="date"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/15"
                  />
                </div>
                <button
                  id="btn-start-session"
                  onClick={handleStartSession}
                  disabled={!!activeSessionId}
                  className={`w-full text-center py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs border ${
                    activeSessionId
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 cursor-pointer'
                  }`}
                >
                  <Play size={13} />
                  <span>Sessie starten</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Selector and Synchronization controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{userTeam.name} Dashboard</h2>
            <p className="text-xs text-slate-500">
              Sessiebeheer & visualisaties voor het team.
            </p>
          </div>

          {/* Selector view and Live sync control */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor="session-select" className="text-xs font-semibold text-slate-500">Geselecteerde Sessie:</label>
              <select
                id="session-select"
                value={selectedSessionId}
                onChange={(e) => handleSelectSessionManually(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600/10 cursor-pointer"
              >
                <option value="" disabled>-- Selecteer een optie --</option>
                {activeSessionId && (
                  <option value={activeSessionId} className="text-emerald-700 font-bold">
                    🟢 Actuele Open Sessie ({sessions.find(s => s.id === activeSessionId)?.startDate})
                  </option>
                )}
                {sessions.filter(s => !s.isActive).map(s => (
                  <option key={s.id} value={s.id}>
                    Ronde: {s.startDate} {s.endDate ? `t/m ${s.endDate}` : ''}
                  </option>
                ))}
                {hasLegacySubmissions && (
                  <option value="legacy" className="text-slate-400">
                    Oudere metingen (Legacysysteem)
                  </option>
                )}
              </select>
            </div>

            {/* Sync control button for team members */}
            {!isTeamAdmin && userTeam.activeViewSessionId && (
              <button
                id="btn-live-sync-toggle"
                onClick={handleToggleCoupling}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                  isCoupledToAdmin
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100'
                }`}
                title="De teambeheerder kan de lopende of specifieke afgesloten sessie op ieders scherm projecteren. Klik hier om live-sync te regelen."
              >
                <Radio size={12} className={isCoupledToAdmin ? "text-emerald-600 animate-pulse" : "text-amber-500"} />
                <span>
                  {isCoupledToAdmin ? "Gekoppeld aan Beheerder" : "Zelfstandig Bladeren"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sync notification bar for regular members */}
        {!isTeamAdmin && userTeam.activeViewSessionId && isCoupledToAdmin && (
          <div className="bg-indigo-50 border border-indigo-100/60 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-indigo-800 animate-fade-in">
            <span className="font-semibold flex items-center gap-1.5">
              <Users size={13} className="shrink-0 text-indigo-600" />
              <span>Uw scherm synchroniseert live met de sessie die uw beheerder momenteel bekijkt.</span>
            </span>
            <button
              id="decouple-admin-btn"
              onClick={() => setIsCoupledToAdmin(false)}
              className="text-[10px] font-extrabold underline text-indigo-600 uppercase tracking-wider hover:text-indigo-800"
            >
              Loskoppelen
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="border-t border-slate-100 pt-3 flex justify-between items-center bg-white">
          <div className="bg-slate-100 rounded-lg p-0.5 flex">
            <button
              id="tab-current"
              onClick={() => setActiveTab('current')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                activeTab === 'current' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart size={14} />
              <span>Resultaten van Sessie</span>
            </button>
            
            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History size={14} />
              <span>Vergelijkingsgrid (Historie)</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'current' ? (
        <div id="tab-current-view" className="space-y-6">
          
          {/* Authorization Filter Notification */}
          {!isAuthorizedToSeeScores ? (
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-8 text-center space-y-3 max-w-xl mx-auto">
              <ShieldAlert className="text-amber-600 mx-auto" size={36} />
              <h3 className="font-bold text-slate-800 text-sm">Dashboard is nog niet vrijgegeven</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                De geselecteerde enquête is momenteel nog **actief bezig**. Om onbevooroordeelde antwoorden te garanderen, worden de resultaten voor teamleden pas onthuld nadat de teambeheerder deze sessie handmatig sluit en dus publiceert.
              </p>
              {activeSessionId === selectedSessionId && (
                <div className="bg-white border border-amber-100 p-3 rounded-xl max-w-sm mx-auto text-xs font-semibold text-amber-700">
                  Stemmen ingediend: {currentSubmissions.length} / {userTeam.memberEmails.length}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Overall metric blocks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Aggregate average */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between md:col-span-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Totale Gemiddelde Teamscore ({selectedSessionId === 'legacy' ? 'Vóór sessies' : (selectedSession?.startDate || 'Resultaten')})
                    </span>
                    <p className="text-xs text-slate-500">
                      De gecombineerde gemiddelde motivatiescore van alle teamleden over de vragenlijst.
                    </p>
                  </div>

                  <div className="flex items-center gap-6 mt-4 md:mt-0">
                    <div className="flex items-baseline gap-1 bg-indigo-50 border border-indigo-100 px-5 py-3 rounded-xl">
                      <span className="text-4xl font-extrabold text-indigo-600">
                        {currentAverages.overall || 'N/A'}
                      </span>
                      <span className="text-slate-400 text-sm font-semibold">/ 7</span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Team Alignment Level</span>
                        <span>{Math.round((currentAverages.overall / 7) * 100) || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                          style={{ width: `${(currentAverages.overall / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Participation info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Deelname ratio</span>
                    <h4 className="text-xl font-bold text-slate-800 mt-2">
                      {currentSubmissions.length} / {userTeam.memberEmails.length}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-normal">
                      Geldige unieke inzendingen van teamleden geregistreerd in dit meet-moment.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <Calendar size={12} />
                    <span>Sessie: {selectedSessionId === 'legacy' ? 'Legacy Historie' : (selectedSession?.startDate || 'Onbekend')}</span>
                  </div>
                </div>
              </div>

              {/* Detailed questions list */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">
                  Gemiddelde score per vraag
                </h3>

                {currentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
                    <p className="text-sm font-medium text-slate-600">Nog geen ingezonden gegevens voor deze geselecteerde optie.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Vraag teamleden om hun survey in te vullen.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {QUESTIONS.map((question) => {
                      const qAvg = currentAverages.perQuestion[question.id] || 0;
                      return (
                        <div id={`dashboard-q-${question.id}`} key={question.id} className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                            <div className="space-y-0.5 min-w-0">
                              <span className="inline-block text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-1 py-0.2 uppercase">
                                {question.category}
                              </span>
                              <p className="text-slate-800 font-medium truncate sm:max-w-xl">
                                {question.text}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded font-bold ${getScoreTextColor(qAvg)} ${getScoreBgColor(qAvg)} font-mono text-xs`}>
                                 {qAvg} / 7
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${getScoreColor(qAvg)}`}
                              style={{ width: `${(qAvg / 7) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Anonymous stream feed for verification */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Sessie Submissie-stroom (Geanonimiseerd)
                </h4>
                <p className="text-xs text-slate-500">
                  Gedetailleerde lijst met individuele anonieme inzendingen die hebben bijgedragen aan de score voor deze specifieke sessie.
                </p>

                <div className="space-y-2 mt-4">
                  {currentSubmissions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Geen inzendingen.</p>
                  ) : (
                    currentSubmissions.map((sub, idx) => {
                      const subAverage = sub.isSkipped 
                        ? 0 
                        : (Object.values(sub.scores).reduce((a, b) => a + b, 0) / Object.values(sub.scores).length).toFixed(1);
                        
                      return (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-slate-900 border border-slate-800 text-white rounded h-5 w-5 flex items-center justify-center shrink-0 text-[10px]/none font-semibold">
                              #{idx + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-800">
                                {sub.isSkipped ? 'Inzending Overgeslagen (Beheerderstype)' : `Ingevulde teamresponse`}
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Geregistreerd op {new Date(sub.submittedAt).toLocaleDateString()} om {new Date(sub.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>

                          {!sub.isSkipped && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-medium">Gemiddelde:</span>
                              <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
                                {subAverage} / 7
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Dynamic Comparison Grid Table of all historical completed sessions */
        <div id="tab-history-view" className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Vergelijking en Score-Historie per Enquête-ronde
              </h3>
              <p className="text-xs text-slate-500">
                Lijst van alle afgeronde, gearchiveerde sessies met hun desbetreffende gemiddelde scores per categorie.
              </p>
            </div>

            {sessions.filter(s => !s.isActive).length === 0 && !hasLegacySubmissions ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Er zijn nog geen eerdere sessies afgerond voor dit team.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-700">
                      <th className="py-3 px-4">Sessie Datum</th>
                      <th className="py-3 px-2 text-center">Inzendingen</th>
                      {QUESTIONS.map(q => (
                        <th key={q.id} className="py-3 px-2 text-center tracking-tight truncate max-w-[100px]" title={q.text}>
                          {q.category}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center text-slate-900 bg-slate-100/50">Totaal Gemiddelde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {/* Render completed sessions */}
                    {sessions.filter(s => !s.isActive).map(s => {
                      const sessSubs = teamSubmissions.filter(sub => sub.sessionId === s.id && !sub.isSkipped);
                      const avgs = calculateAverages(sessSubs);
                      
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            Ronde: {s.startDate} {s.endDate ? `t/m ${s.endDate}` : ''}
                          </td>
                          <td className="py-3 px-2 text-center text-slate-500 font-mono">
                            {sessSubs.length}
                          </td>
                          {QUESTIONS.map(q => {
                            const score = avgs.perQuestion[q.id] || 0;
                            return (
                              <td key={q.id} className="py-3 px-2 text-center font-mono">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getScoreTextColor(score)} ${getScoreBgColor(score)}`}>
                                  {score || '-'}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-center bg-slate-50/20">
                            <span className="text-xs font-extrabold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {avgs.overall || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Render legacy submissions if they exist */}
                    {hasLegacySubmissions && (() => {
                      const legacySubs = teamSubmissions.filter(sub => !sub.sessionId && !sub.isSkipped);
                      const avgs = calculateAverages(legacySubs);
                      return (
                        <tr className="hover:bg-slate-50/50 text-slate-400">
                          <td className="py-3 px-4 font-medium italic">
                            Oudere metingen (Legacysysteem)
                          </td>
                          <td className="py-3 px-2 text-center font-mono">
                            {legacySubs.length}
                          </td>
                          {QUESTIONS.map(q => {
                            const score = avgs.perQuestion[q.id] || 0;
                            return (
                              <td key={q.id} className="py-3 px-2 text-center font-mono">
                                <span className="opacity-80">
                                  {score || '-'}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-center">
                            <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                              {avgs.overall || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
