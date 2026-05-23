import { useState } from 'react';
import { Team, Submission, Question } from '../types';
import { QUESTIONS, saveTeams } from '../data';
import { 
  BarChart, Calendar, Award, Star, History, ArrowUpRight, ToggleLeft, ToggleRight, ShieldAlert, AlertCircle 
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
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const isTeamAdmin = Array.isArray(userTeam.teamAdminEmails) && userTeam.teamAdminEmails.map(ad => ad.toLowerCase()).includes(currentUserEmail.toLowerCase());

  // Filter submissions for this specific team
  const teamSubmissions = allSubmissions.filter(s => s.teamId === userTeam.id);

  // Divide submissions into Current Round (this week) vs Historical Rounds (older than 7 days)
  const isHistorical = (isoStr: string) => {
    const date = new Date(isoStr);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return date.getTime() < sevenDaysAgo;
  };

  const currentSubmissions = teamSubmissions.filter(s => !isHistorical(s.submittedAt) && !s.isSkipped);
  const historicalSubmissions = teamSubmissions.filter(s => isHistorical(s.submittedAt) && !s.isSkipped);

  // Calculate scores for Current
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

  const currentAverages = calculateAverages(currentSubmissions);
  const historicalAverages = calculateAverages(historicalSubmissions);

  const handleToggleDashboardActive = () => {
    if (!isTeamAdmin) return;
    
    const nextState = !userTeam.dashboardActive;
    const updatedTeam = { ...userTeam, dashboardActive: nextState };
    
    // Update local state and cascade to parent
    onTeamUpdate(updatedTeam);
    
    const updatedList = teamsList.map(t => t.id === userTeam.id ? updatedTeam : t);
    onAllTeamsUpdate(updatedList);
    saveTeams(updatedList);
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

  return (
    <div id="team-dashboard-root" className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Team Admin Dashboard Controller Widget */}
      {isTeamAdmin && (
        <div id="team-admin-controller" className="bg-white border-2 border-indigo-600 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <span>Teambeheerder Controlepaneel</span>
            </h3>
            <p className="text-xs text-slate-500">
              Activeer het teamdashboard om de enquête te sluiten en het groepsgemiddelde live te pushen naar alle ingelogde leden.
            </p>
          </div>
          <button
            id="toggle-dashboard-active-btn"
            onClick={handleToggleDashboardActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer border ${
              userTeam.dashboardActive
                ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'
                : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'
            }`}
          >
            {userTeam.dashboardActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            <span>
              {userTeam.dashboardActive ? 'Dashboard Gepubliceerd (AAN)' : 'Dashboard Privé (UIT)'}
            </span>
          </button>
        </div>
      )}

      {/* Dashboard Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">{userTeam.name} Dashboard</h2>
          <p className="text-xs text-slate-500 leading-normal">
            Resultaten gebaseerd op <strong className="text-indigo-600">{currentSubmissions.length} geldige inzendingen</strong> van ingelogde leden in het logius.nl domein.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 rounded-lg p-1 flex">
          <button
            id="tab-current"
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              activeTab === 'current' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart size={14} />
            <span>Actuele Score</span>
          </button>
          
          <button
            id="tab-history"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={14} />
            <span>Historie</span>
          </button>
        </div>
      </div>

      {activeTab === 'current' ? (
        <div id="tab-current-view" className="space-y-6">
          {/* Big Score Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Real Overall Average */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between md:col-span-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Totale Gemiddelde Teamscore
                </span>
                <p className="text-xs text-slate-500">
                  De gecumuleerde gemiddelde score van alle teamleden over de 5 kernvragen.
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

            {/* Participation Quick Summary card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Deelname ratio</span>
                <h4 className="text-xl font-bold text-slate-800 mt-2">
                  {currentSubmissions.length} / {userTeam.memberEmails.length}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Leden in het logius.nl domein die hun mening hebben doorgegeven.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <Calendar size={12} />
                <span>Ronde: Mei 2026</span>
              </div>
            </div>
          </div>

          {/* Detailed Question Scores list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">
              Gemiddelde score per vraag
            </h3>

            {currentSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
                <p className="text-sm font-medium text-slate-600">Nog geen ingelogde teamleden hebben gereageerd.</p>
                <p className="text-xs text-slate-400 mt-0.5">Laat teamleden inloggen met een logius.nl adres om scores te verzamelen.</p>
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

                      {/* Custom Horizontal Progress Bar */}
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
        </div>
      ) : (
        /* History of scores view */
        <div id="tab-history-view" className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Vergelijking en Score-Historie per Vraag
              </h3>
              <p className="text-xs text-slate-500">
                Bekijk de historische scores per meet-moment en zie hoe het team zich door de tijd heen heeft ontwikkeld.
              </p>
            </div>

            {teamSubmissions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 italic">Geen historische metingen beschikbaar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2.5 font-bold text-slate-800">Meting (Groepering)</th>
                      <th className="py-2.5 font-bold text-slate-800 text-center">Geldige Inzendingen</th>
                      {QUESTIONS.map(q => (
                        <th key={q.id} className="py-2.5 font-bold text-slate-800 text-center truncate max-w-[110px]" title={q.text}>
                          {q.category}
                        </th>
                      ))}
                      <th className="py-2.5 font-bold text-slate-900 text-center">Totaal Gemiddelde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    
                    {/* Active Meetronde Row */}
                    <tr className="hover:bg-indigo-50/20 font-medium">
                      <td className="py-3 flex items-center gap-1.5 font-semibold text-indigo-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        <span>Actuele Ronde (Mei 2026)</span>
                      </td>
                      <td className="py-3 text-center text-slate-600 font-mono">
                        {currentSubmissions.length}
                      </td>
                      {QUESTIONS.map(q => {
                        const score = currentAverages.perQuestion[q.id] || 0;
                        return (
                          <td key={q.id} className="py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded font-bold font-mono text-[11px] ${getScoreTextColor(score)} ${getScoreBgColor(score)}`}>
                              {score || '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 text-center">
                        <span className="text-xs font-extrabold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {currentAverages.overall || '-'}
                        </span>
                      </td>
                    </tr>

                    {/* Historical Ronde Row */}
                    {historicalSubmissions.length > 0 && (
                      <tr className="hover:bg-slate-50 text-slate-500">
                        <td className="py-3 font-semibold text-slate-700 flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          <span>Vorige Ronde (1 Maand Geleden)</span>
                        </td>
                        <td className="py-3 text-center font-mono">
                          {historicalSubmissions.length}
                        </td>
                        {QUESTIONS.map(q => {
                          const score = historicalAverages.perQuestion[q.id] || 0;
                          return (
                            <td key={q.id} className="py-3 text-center font-mono">
                              <span className={score ? 'font-semibold' : ''}>
                                {score || '-'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-3 text-center">
                          <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {historicalAverages.overall || '-'}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical submissions feed - keeping it anonymous to align with 'zonder de eigen scores' */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Recente Submissie-stroom (Geanonimiseerd)
            </h4>
            <p className="text-xs text-slate-500">
              Inzendingen van individuele teamleden in de huidige enquête-ronde om de scores transparant te verifiëren.
            </p>

            <div className="space-y-2 mt-4">
              {teamSubmissions.map((sub, idx) => {
                const subAverage = sub.isSkipped 
                  ? 0 
                  : (Object.values(sub.scores).reduce((a, b) => a + b, 0) / Object.values(sub.scores).length).toFixed(1);
                  
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-slate-900 border border-slate-800 text-white rounded h-5 w-5 flex items-center justify-center shrink-0 text-[10px]/none font-semibold">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800">
                          {sub.isSkipped ? 'Overgeslagen (Door Team Admin)' : `Inzending ingevuld`}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Ingezonden op {new Date(sub.submittedAt).toLocaleDateString()} om {new Date(sub.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>

                    {!sub.isSkipped && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Gemiddelde:</span>
                        <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
                          {subAverage} / 7
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
