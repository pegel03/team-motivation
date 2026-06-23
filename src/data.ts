import { Question, Team, Submission } from './types';
import { safeLocalStorage } from './utils/safeStorage';

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
export const INITIAL_TEAMS: Team[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

// Local storage keys
const TEAMS_KEY = 'teams_data_v2'; // Bumped storage key so the new questionnaire questions apply immediately!
const SUBMISSIONS_KEY = 'submissions_data_v2';
const ACTIVE_USER_KEY = 'active_user_v2';
const DEMO_DISABLED_KEY = 'demo_disabled';
const HIDE_SANDBOX_KEY = 'hide_sandbox';

export const isDemoDisabled = (): boolean => {
  return true;
};

export const setDemoDisabledFlag = (disabled: boolean): void => {
  safeLocalStorage.setItem(DEMO_DISABLED_KEY, 'true');
};

export const isSandboxHidden = (): boolean => {
  return true;
};

export const setSandboxHiddenFlag = (hidden: boolean): void => {
  safeLocalStorage.setItem(HIDE_SANDBOX_KEY, 'true');
};

export const loadTeams = (): Team[] => {
  const teamsJson = safeLocalStorage.getItem(TEAMS_KEY);
  if (!teamsJson) {
    if (isDemoDisabled()) {
      safeLocalStorage.setItem(TEAMS_KEY, JSON.stringify([]));
      return [];
    }
    safeLocalStorage.setItem(TEAMS_KEY, JSON.stringify(INITIAL_TEAMS));
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
  safeLocalStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  // Dispatch active event to synchronize other tabs in real-time
  window.dispatchEvent(new Event('storage'));
};

export const loadSubmissions = (): Submission[] => {
  const subJson = safeLocalStorage.getItem(SUBMISSIONS_KEY);
  if (!subJson) {
    if (isDemoDisabled()) {
      safeLocalStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
      return [];
    }
    safeLocalStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  }
  try {
    return JSON.parse(subJson);
  } catch {
    return isDemoDisabled() ? [] : INITIAL_SUBMISSIONS;
  }
};

export const saveSubmissions = (submissions: Submission[]): void => {
  safeLocalStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  window.dispatchEvent(new Event('storage'));
};

export const loadActiveUser = (): string | null => {
  return safeLocalStorage.getItem(ACTIVE_USER_KEY);
};

export const saveActiveUser = (email: string | null): void => {
  if (email) {
    safeLocalStorage.setItem(ACTIVE_USER_KEY, email);
  } else {
    safeLocalStorage.removeItem(ACTIVE_USER_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};

