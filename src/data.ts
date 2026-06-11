import { Question, Team, Submission } from './types';

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'Enthousiasme',
    text: 'Ik ben enthousiast over het werk dat ik doe voor mijn team'
  },
  {
    id: 'q2',
    category: 'Zingeving',
    text: 'Ik vind het werk dat ik voor mijn team doe zinvol en doelgericht'
  },
  {
    id: 'q3',
    category: 'Trots',
    text: 'Ik ben trots op het werk dat ik doe voor mijn team'
  },
  {
    id: 'q4',
    category: 'Uitdaging',
    text: 'Voor mij is het werk dat ik voor mijn team doe uitdagend'
  },
  {
    id: 'q5',
    category: 'Energie',
    text: 'In mijn team voel ik me boordevol energie'
  },
  {
    id: 'q6',
    category: 'Fitheid',
    text: 'In mijn team voel ik me fit en sterk'
  },
  {
    id: 'q7',
    category: 'Veerkracht',
    text: 'In mijn team herstel ik snel van tegenslagen'
  },
  {
    id: 'q8',
    category: 'Uithoudingsvermogen',
    text: 'In mijn team kan ik een lange tijd doorgaan'
  }
];

// Initial mock data to seed local storage on first load
export const INITIAL_TEAMS: Team[] = [
  {
    id: 't-it-beheer',
    name: 'Logius Dynamic Cloud',
    memberEmails: [
      'admin@logius.nl',
      'developer.josh@logius.nl',
      'designer.sarah@logius.nl',
      'analyst.kim@logius.nl',
      'tester.rob@logius.nl'
    ],
    teamAdminEmails: ['admin@logius.nl', 'designer.sarah@logius.nl'], // Multiple admins!
    dashboardActive: false
  },
  {
    id: 't-civiel',
    name: 'Logius Portaal & Burgerzaken',
    memberEmails: [
      'teamadmin.maria@logius.nl',
      'developer.bob@logius.nl',
      'support.elise@logius.nl'
    ],
    teamAdminEmails: ['teamadmin.maria@logius.nl'],
    dashboardActive: true // Default active to showcase immediate state
  }
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  // Round 1 (Historical) - 1 month ago
  {
    id: 's-hist-1',
    teamId: 't-it-beheer',
    userEmail: 'developer.josh@logius.nl',
    scores: { q1: 5, q2: 4, q3: 5, q4: 3, q5: 6, q6: 5, q7: 4, q8: 5 },
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSkipped: false
  },
  {
    id: 's-hist-2',
    teamId: 't-it-beheer',
    userEmail: 'designer.sarah@logius.nl',
    scores: { q1: 4, q2: 5, q3: 4, q4: 4, q5: 5, q6: 4, q7: 5, q8: 4 },
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSkipped: false
  },
  {
    id: 's-hist-3',
    teamId: 't-it-beheer',
    userEmail: 'analyst.kim@logius.nl',
    scores: { q1: 6, q2: 6, q3: 5, q4: 2, q5: 7, q6: 6, q7: 6, q8: 5 },
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSkipped: false
  },
  // Round 2 (Current) - Just now
  {
    id: 's-curr-1',
    teamId: 't-it-beheer',
    userEmail: 'developer.josh@logius.nl',
    scores: { q1: 6, q2: 6, q3: 6, q4: 4, q5: 7, q6: 5, q7: 6, q8: 6 },
    submittedAt: new Date().toISOString(),
    isSkipped: false
  },
  {
    id: 's-curr-2',
    teamId: 't-it-beheer',
    userEmail: 'designer.sarah@logius.nl',
    scores: { q1: 5, q2: 6, q3: 5, q4: 5, q5: 6, q6: 6, q7: 5, q8: 6 },
    submittedAt: new Date().toISOString(),
    isSkipped: false
  },
  {
    id: 's-curr-3',
    teamId: 't-it-beheer',
    userEmail: 'analyst.kim@logius.nl',
    scores: { q1: 7, q2: 7, q3: 6, q4: 3, q5: 7, q6: 7, q7: 6, q8: 7 },
    submittedAt: new Date().toISOString(),
    isSkipped: false
  },
  {
    id: 's-curr-4',
    teamId: 't-it-beheer',
    userEmail: 'admin@logius.nl',
    scores: { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5, q6: 5, q7: 5, q8: 5 },
    submittedAt: new Date().toISOString(),
    isSkipped: true // Team admin chose to skip answering! Does not count in average scores.
  }
];

// Local storage keys
const TEAMS_KEY = 'logius_teams_data_v2'; // Bumped storage key so the new questionnaire questions apply immediately!
const SUBMISSIONS_KEY = 'logius_submissions_data_v2';
const ACTIVE_USER_KEY = 'logius_active_user_v2';
const DEMO_DISABLED_KEY = 'logius_demo_disabled';
const HIDE_SANDBOX_KEY = 'logius_hide_sandbox';

export const isDemoDisabled = (): boolean => {
  // Check both Vite environment variable and localStorage flag
  const isEnvDisabled = (import.meta as any).env.VITE_NO_MOCK_DATA === 'true';
  const isLocalDisabled = localStorage.getItem(DEMO_DISABLED_KEY) === 'true';
  return isEnvDisabled || isLocalDisabled;
};

export const setDemoDisabledFlag = (disabled: boolean): void => {
  if (disabled) {
    localStorage.setItem(DEMO_DISABLED_KEY, 'true');
  } else {
    localStorage.removeItem(DEMO_DISABLED_KEY);
  }
};

export const isSandboxHidden = (): boolean => {
  const isEnvHidden = (import.meta as any).env.VITE_HIDE_SANDBOX === 'true';
  const isLocalHidden = localStorage.getItem(HIDE_SANDBOX_KEY) === 'true';
  return isEnvHidden || isLocalHidden || isDemoDisabled();
};

export const setSandboxHiddenFlag = (hidden: boolean): void => {
  if (hidden) {
    localStorage.setItem(HIDE_SANDBOX_KEY, 'true');
  } else {
    localStorage.removeItem(HIDE_SANDBOX_KEY);
  }
};

export const loadTeams = (): Team[] => {
  const teamsJson = localStorage.getItem(TEAMS_KEY);
  if (!teamsJson) {
    if (isDemoDisabled()) {
      localStorage.setItem(TEAMS_KEY, JSON.stringify([]));
      return [];
    }
    localStorage.setItem(TEAMS_KEY, JSON.stringify(INITIAL_TEAMS));
    return INITIAL_TEAMS;
  }
  try {
    const parsed = JSON.parse(teamsJson);
    // Backwards compatibility mapper
    return parsed.map((t: any) => {
      let teamAdminEmails = t.teamAdminEmails;
      if (!Array.isArray(teamAdminEmails)) {
        teamAdminEmails = t.teamAdminEmail ? [t.teamAdminEmail] : [];
      }
      return {
        ...t,
        teamAdminEmails
      };
    });
  } catch {
    return isDemoDisabled() ? [] : INITIAL_TEAMS;
  }
};

export const saveTeams = (teams: Team[]): void => {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  // Dispatch active event to synchronize other tabs in real-time
  window.dispatchEvent(new Event('storage'));
};

export const loadSubmissions = (): Submission[] => {
  const subJson = localStorage.getItem(SUBMISSIONS_KEY);
  if (!subJson) {
    if (isDemoDisabled()) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
      return [];
    }
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  }
  try {
    return JSON.parse(subJson);
  } catch {
    return isDemoDisabled() ? [] : INITIAL_SUBMISSIONS;
  }
};

export const saveSubmissions = (submissions: Submission[]): void => {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  window.dispatchEvent(new Event('storage'));
};

export const loadActiveUser = (): string | null => {
  return localStorage.getItem(ACTIVE_USER_KEY);
};

export const saveActiveUser = (email: string | null): void => {
  if (email) {
    localStorage.setItem(ACTIVE_USER_KEY, email);
  } else {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};
