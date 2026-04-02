import type { Sport } from '../lib/types';

interface Props {
  sport: Sport;
  className?: string;
}

const icons: Record<Sport, string> = {
  PADEL: '🏓',
  TENNIS: '🎾',
  SQUASH: '🟡',
};

export default function SportIcon({ sport, className }: Props) {
  return <span className={className}>{icons[sport]}</span>;
}
