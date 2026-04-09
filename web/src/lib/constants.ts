import type { Sport, TournamentStatus } from './types';

export const SPORTS: Sport[] = ['PADEL', 'TENNIS', 'SQUASH'];
export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'REGISTRATION_OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
};

export const TOURNAMENT_FORMAT_SHORT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
};

export const TOURNAMENT_STATUS_MAP: Record<string, { label: string; shortLabel: string; color: string }> = {
  REGISTRATION_OPEN: { label: 'Registration Open', shortLabel: 'Open', color: 'text-[#8a6838]' },
  IN_PROGRESS:       { label: 'In Progress',        shortLabel: 'In Progress', color: 'text-yellow-600' },
  COMPLETED:         { label: 'Completed',           shortLabel: 'Completed',   color: 'text-[#6d6358]' },
  CANCELLED:         { label: 'Cancelled',           shortLabel: 'Cancelled',   color: 'text-red-600'   },
};
