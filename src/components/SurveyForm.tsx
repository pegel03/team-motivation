import React, { useState, useEffect } from 'react';
import { Question, Team, Submission } from '../types';
import { QUESTIONS, saveSubmissions, loadSubmissions } from '../data';
import { addSubmissionDoc } from '../firestoreService';
import { CheckCircle2, AlertCircle, RefreshCw, BarChart, ChevronRight, User } from 'lucide-react';

interface SurveyFormProps {
  currentUserEmail: string;
  userTeam: Team;
  allSubmissions: Submission[];
  onSubmissionSuccess: (updatedSubmissions: Submission[]) => void;
  isGlobalAdmin?: boolean;
}

export default function SurveyForm({ 
  currentUserEmail, 
  userTeam, 
  allSubmissions, 
  onSubmissionSuccess,
  isGlobalAdmin = false
}: SurveyFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSkipped, setIsSkipped] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [myAverage, setMyAverage] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isTeamAdmin = Array.isArray(userTeam.teamAdminEmails) && userTeam.teamAdminEmails.map(ad => ad.toLowerCase()).includes(currentUserEmail.toLowerCase());
  const displayEmail = isGlobalAdmin ? "Systeembeheerder" : currentUserEmail;

  const activeSessionId = userTeam.activeSessionId;
  const activeSession = userTeam.sessions?.find(s => s.id === activeSessionId);

  // Check if user has already submitted on this session
  useEffect(() => {
    if (!activeSessionId) {
      setAnswers({});
      setIsSkipped(false);
      setHasSubmitted(false);
      setMyAverage(null);
      return;
    }

    const existing = allSubmissions.find(
      s => s.teamId === userTeam.id && s.sessionId === activeSessionId && s.userEmail === currentUserEmail
    );
    if (existing) {
      setAnswers(existing.scores);
      setIsSkipped(existing.isSkipped);
      setHasSubmitted(true);
      
      if (!existing.isSkipped) {
        const scoresValues = Object.values(existing.scores) as number[];
        if (scoresValues.length > 0) {
          const sum = scoresValues.reduce((a, b) => a + b, 0);
          setMyAverage(parseFloat((sum / scoresValues.length).toFixed(2)));
        }
      } else {
        setMyAverage(null);
      }
    } else {
      // Clear for new user
      setAnswers({});
      setIsSkipped(false);
      setHasSubmitted(false);
      setMyAverage(null);
    }
  }, [currentUserEmail, userTeam.id, activeSessionId, allSubmissions]);

  const handleSelectScore = (questionId: string, value: number) => {
    if (isSkipped) return; // cannot select scores if skipped
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrorMessage(null);
  };

  const handleToggleSkip = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSkipped(e.target.checked);
    if (e.target.checked) {
      setAnswers({}); // flush values if skipped
    }
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeSessionId) {
      setErrorMessage("Fout: Geen actieve enquête-sessie gevonden.");
      return;
    }

    // Unless skipped, verify all questions have an answer
    if (!isSkipped) {
      const unanswered = QUESTIONS.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        setErrorMessage(`Zorg ervoor dat alle ${QUESTIONS.length} vragen beantwoord zijn voordat u verzendt.`);
        return;
      }
    }

    // Prepare submission object
    const newSubmission: Submission = {
      id: `s-${userTeam.id}-${activeSessionId}-${currentUserEmail.replace(/[@.]/g, '-')}`,
      teamId: userTeam.id,
      sessionId: activeSessionId,
      userEmail: currentUserEmail,
      scores: isSkipped ? {} : answers,
      submittedAt: new Date().toISOString(),
      isSkipped: isSkipped
    };

    // Upsert submission
    const filtered = allSubmissions.filter(
      s => !(s.teamId === userTeam.id && s.sessionId === activeSessionId && s.userEmail === currentUserEmail)
    );
    const nextSubmissions = [...filtered, newSubmission];

    onSubmissionSuccess(nextSubmissions);
    addSubmissionDoc(newSubmission, userTeam).catch(console.error);

    // Calculate score for display
    if (!isSkipped) {
      const scoresValues = Object.values(answers) as number[];
      const sum = scoresValues.reduce((a, b) => a + b, 0);
      setMyAverage(parseFloat((sum / scoresValues.length).toFixed(2)));
    } else {
      setMyAverage(null);
    }
    setHasSubmitted(true);
  };

  const handleRetake = () => {
    setHasSubmitted(false);
    // Keep answers available for easy editing!
  };

  if (!activeSessionId) {
    return (
      <div id="no-active-session-container" className="max-w-3xl mx-auto font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center space-y-4">
          <div className="flex justify-center flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center animate-pulse mb-3">
              <AlertCircle size={28} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Geen Actieve Enquête</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Er is momenteel geen actieve sessie gestart voor dit team. Vraag uw teambeheerder om met de hand een nieuwe enquête-sessie te openen.
            </p>
          </div>
          {isTeamAdmin && (
            <div className="pt-3">
              <p className="text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded-lg px-4 py-2 inline-block font-medium">
                Tip: Als teambeheerder kunt u een nieuwe sessie met de hand starten op het <strong>Dashboard</strong> tabblad.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="survey-form-container" className="max-w-3xl mx-auto font-sans space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Enquête: {userTeam.name}</h2>
            <p className="text-xs text-slate-500">
              Inzendingen registreren voor de sessie van <strong className="text-indigo-600">{activeSession?.startDate || 'Geen datum'}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs font-semibold shrink-0">
            <User size={13} />
            <span className="truncate max-w-[170px]">{displayEmail}</span>
          </div>
        </div>

        {/* Skip toggle for Team Admin */}
        {isTeamAdmin && (
          <div id="team-admin-skip-wrapper" className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold mt-1 shrink-0">
              Team Admin
            </div>
            <div className="flex-1 space-y-1">
              <label className="flex items-center gap-2 font-semibold text-xs text-slate-800 cursor-pointer">
                <input
                  id="skip-questions-checkbox"
                  type="checkbox"
                  checked={isSkipped}
                  onChange={handleToggleSkip}
                  className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <span>Beantwoorden overslaan (niet meetellen in teamgemiddelde)</span>
              </label>
              <p className="text-[11px] text-slate-500 leading-normal">
                Als team-beheerder kunt u ervoor kiezen de vragen over te slaan. Uw scores worden dan uitgesloten van de uiteindelijke berekening van de gemiddelde teamscores.
              </p>
            </div>
          </div>
        )}
      </div>

      {hasSubmitted ? (
        <div id="survey-submitted-card" className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300 text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-slate-900">Bedankt voor uw deelname!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Uw reactie is succesvol opgeslagen en gesynchroniseerd binnen het team.
            </p>
          </div>

          {/* Average representation */}
          {isSkipped ? (
            <div id="average-result-skipped" className="bg-slate-50 border border-slate-200 p-5 rounded-xl max-w-sm mx-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status Deelname</span>
              <p className="text-lg font-bold text-slate-600 mt-1">Vragen Overgeslagen</p>
              <p className="text-xs text-slate-500 mt-1">U heeft als team-admin gekozen om deze ronde over te slaan.</p>
            </div>
          ) : (
            <div id="average-result-score" className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl max-w-sm mx-auto space-y-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Uw Gemiddelde Score</span>
              <div className="flex items-baseline justify-center gap-1 text-slate-800">
                <span className="text-4xl font-extrabold text-indigo-600">{myAverage}</span>
                <span className="text-slate-400 text-base font-semibold">/ 7</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${((myAverage || 0) / 7) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Individual breakdown showing what they submitted */}
          {!isSkipped && (
            <div className="text-left border border-slate-100 rounded-xl p-4 max-w-md mx-auto space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-1.5">
                Uw ingevulde scores per vraag:
              </h4>
              <div className="space-y-2">
                {QUESTIONS.map((q) => (
                  <div key={q.id} className="flex justify-between items-center text-xs text-slate-600">
                    <span className="truncate mr-4">{q.category}</span>
                    <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded">
                      Score: {answers[q.id]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button
              id="retake-survey-btn"
              onClick={handleRetake}
              className="text-xs bg-white text-slate-700 font-semibold border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Antwoorden bewerken</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div id="survey-validation-alert" className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl flex gap-2.5 items-start text-xs animate-in shake duration-200">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* List of Questions */}
          <div className="space-y-4">
            {QUESTIONS.map((question, index) => {
              const selectedValue = answers[question.id] || null;
              
              return (
                <div 
                  id={`question-card-${question.id}`}
                  key={question.id}
                  className={`bg-white border rounded-2xl p-5 md:p-6 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-600/10 ${
                    selectedValue 
                      ? 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/5' 
                      : 'border-slate-200'
                  } ${isSkipped ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Index label */}
                    <div className="h-6 w-6 rounded-full bg-indigo-600 border border-indigo-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {/* Question Text */}
                      <div className="space-y-1">
                        <span className="inline-block text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                          {question.category}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-900 leading-snug">
                          {question.text}
                        </h4>
                      </div>

                      {/* 1-7 horizontal scale selector */}
                      <div className="pt-2">
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-2.5 px-0.5">
                          <span>Helemaal Oneens (1)</span>
                          <span>Neutraal (4)</span>
                          <span>Helemaal Eens (7)</span>
                        </div>
                        
                        <div className="flex justify-between gap-1.5 sm:gap-2">
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                            const isChosen = selectedValue === num;
                            return (
                              <button
                                id={`choice-${question.id}-${num}`}
                                type="button"
                                key={num}
                                disabled={isSkipped}
                                onClick={() => handleSelectScore(question.id, num)}
                                className={`flex-1 aspect-square sm:aspect-auto sm:py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                                  isChosen
                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-md hover:bg-indigo-700'
                                    : isSkipped 
                                      ? 'bg-slate-50 border-slate-100 text-slate-300 pointer-events-none'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-100/70'
                                }`}
                              >
                                <span>{num}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Submit Footer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="text-xs text-slate-500">
              {isSkipped 
                ? 'Geen scores vereist (Overslaan actief)' 
                : `${Object.keys(answers).length} van de ${QUESTIONS.length} vragen beantwoord`}
            </div>

            <button
              id="submit-survey-form-btn"
              type="submit"
              className="bg-indigo-600 border border-indigo-700 text-white font-semibold py-2 px-6 rounded-lg text-sm hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Response opslaan</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
