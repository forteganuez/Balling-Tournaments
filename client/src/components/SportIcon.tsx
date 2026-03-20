import type { Sport } from '../lib/types';

const sportEmojis: Record<Sport, string> = {
  PADEL: '\u{1F3D3}',   // 🏓
  TENNIS: '\u{1F3BE}',  // 🎾
  SQUASH: '\u{1F3F8}',  // 🏸
};

interface Props {
  sport: Sport;
  className?: string;
}

export default function SportIcon({ sport, className = '' }: Props) {
  return (
    <span className={className} role="img" aria-label={sport.toLowerCase()}>
      {sportEmojis[sport] ?? '🏅'}
    </span>
  );
}
