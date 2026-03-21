const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatLongDate(value?: string | Date | null): string {
  const date = typeof value === 'string' ? parseDateKey(value) : value ?? null;
  if (!date) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMediumDate(value?: string | Date | null): string {
  const date = typeof value === 'string' ? parseDateKey(value) : value ?? null;
  if (!date) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function isSameDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isDateWithinRange(
  date: Date,
  minDate?: string | null,
  maxDate?: string | null,
): boolean {
  const key = formatDateKey(date);
  if (minDate && key < minDate) {
    return false;
  }
  if (maxDate && key > maxDate) {
    return false;
  }
  return true;
}

export function getCalendarDays(monthDate: Date): Date[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0, 0);
  const weekdayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - weekdayOffset,
    12,
    0,
    0,
    0,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function formatTimeLabel(value?: string | null): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return '';
  }

  const [hourText, minuteText] = value.split(':');
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function combineDateAndTime(dateKey: string, timeKey: string): Date | null {
  const date = parseDateKey(dateKey);
  if (!date || !/^\d{2}:\d{2}$/.test(timeKey)) {
    return null;
  }

  const [hourText, minuteText] = timeKey.split(':');
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date;
}

export function getHalfHourTimeSlots(): string[] {
  const slots: string[] = [];

  for (let hour = 6; hour <= 23; hour += 1) {
    slots.push(`${pad(hour)}:00`);
    slots.push(`${pad(hour)}:30`);
  }

  return slots;
}
