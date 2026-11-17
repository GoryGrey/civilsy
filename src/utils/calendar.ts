export interface CalendarEventInput {
  title: string;
  description: string;
  location: string;
  startIso: string; // ISO string computed dynamically or explicit
  durationMinutes?: number;
}

export function getTimeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getNextMonthlyNthWeekday(
  nthOccurrences: number[],
  weekday: number, // 0 = Sun, 1 = Mon, ... 6 = Sat
  hour: number,
  minute: number,
  now: Date = new Date()
): Date {
  for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekdayOffset = (weekday - firstOfMonth.getDay() + 7) % 7;

    for (const nth of nthOccurrences) {
      const dayOfMonth = 1 + firstWeekdayOffset + (nth - 1) * 7;
      const candidate = new Date(year, month, dayOfMonth, hour, minute, 0, 0);
      // Confirm still in target month
      if (candidate.getMonth() !== new Date(year, month, 1).getMonth()) continue;
      if (candidate.getTime() > now.getTime()) {
        return candidate;
      }
    }
  }
  return new Date(now.getTime() + 7 * 86400000);
}

export function getNextWeeklyDay(
  weekdays: number[],
  hour: number,
  minute: number,
  now: Date = new Date()
): Date {
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      hour,
      minute,
      0,
      0
    );
    if (weekdays.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }
  return new Date(now.getTime() + 86400000);
}

export function getNextOffsetDateAtTime(
  daysAhead: number,
  hour: number,
  minute: number,
  now: Date = new Date()
): Date {
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysAhead,
    hour,
    minute,
    0,
    0
  );
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

export function getNextCouncilMeetingDate(now: Date = new Date()): Date {
  // Ashtabula City Council meets 1st & 3rd Monday at 6:00 PM
  return getNextMonthlyNthWeekday([1, 3], 1, 18, 0, now);
}

export function formatRelativeDaysAgo(daysAgo: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - daysAgo * 86400000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMeetingDateShort(target: Date, now: Date = new Date()): string {
  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate();

  const timeStr = target.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay) return `Today · ${timeStr}`;
  if (isTomorrow) return `Tomorrow · ${timeStr}`;
  const dayLabel = target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${dayLabel} · ${timeStr}`;
}

export function formatClosingCountdown(
  target: Date,
  contextLabel: string,
  now: Date = new Date()
): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return `${contextLabel} · Next session schedule updated`;
  }

  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);

  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();

  const timeStr = target.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dayStr = target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (hours < 1) {
    return `Closes in ${totalMinutes} min · ${sameDay ? `Today at ${timeStr}` : `${dayStr} at ${timeStr}`}`;
  }
  if (hours < 24) {
    const durationPart = minutes > 0 && hours < 12 ? `${hours}h ${minutes}m` : `${hours} hours`;
    return `Closes in ${durationPart} · ${sameDay ? `Today at ${timeStr}` : `${dayStr} at ${timeStr}`} (${contextLabel})`;
  }
  if (hours < 48) {
    return `Closes in ${hours} hours · ${dayStr} at ${timeStr} (${contextLabel})`;
  }
  return `Closes in ${days} days · ${dayStr} at ${timeStr} (${contextLabel})`;
}

function toIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function downloadCivicCalendarEvent(input: CalendarEventInput): void {
  const start = new Date(input.startIso);
  const validStart = Number.isNaN(start.getTime()) ? getNextCouncilMeetingDate() : start;
  const end = new Date(validStart.getTime() + (input.durationMinutes || 90) * 60000);
  const now = new Date();

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CIVILSY//Ashtabula Civic Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:civilsy-${validStart.getTime()}-${Math.random().toString(36).slice(2, 8)}@civilsy.org`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(validStart)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `LOCATION:${escapeIcsText(input.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeSlug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  anchor.href = url;
  anchor.download = `${safeSlug || 'civilsy-meeting'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
