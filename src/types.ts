export interface Session {
  id: string;
  startDate: string; // YYYY-MM-DD representation
  endDate?: string; // YYYY-MM-DD representation when closed
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  memberEmails: string[]; // List of email addresses allowed in the team
  teamAdminEmails: string[]; // Emails of the designated team administrators
  dashboardActive: boolean; // Whether the team dashboard is forced active for members
  sessions?: Session[]; // All sessions associated with this team
  activeSessionId?: string | null; // Currently active/open session ID (null if closed)
  activeViewSessionId?: string | null; // The session the admin is actively showing/syncing
}

export interface Submission {
  id: string;
  teamId: string;
  userEmail: string;
  scores: Record<string, number>; // e.g., { q1: 5, q2: 7, q3: 4 }
  submittedAt: string; // ISO String timestamp
  isSkipped: boolean; // If true, this submission (e.g., from a team admin) is excluded from average calculations
  sessionId?: string; // UUID or key referencing the Session
}

export interface Question {
  id: string;
  text: string;
  category: string;
}

export interface AppUser {
  email: string;
  name: string;
  role: 'admin' | 'team_admin' | 'member';
  teamId?: string; // Designated team if member/team_admin
}
