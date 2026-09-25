// Church Service & Rehearsal Rules
// Regras oficiais da igreja:
// 1. Dias de culto fixos: Quarta-feira, Sexta-feira e Domingo.
// 2. Domingo possui dois cultos: EBD (Escola Bíblica Dominical) pela manhã e Culto à noite.
// 3. O Culto de Santa Ceia é celebrado no domingo pela manhã.
// 4. Ensaio: É previsto APENAS para os cultos de Domingo e quando houver Santa Ceia.
// 5. Autonomia: O Líder e o Ministrante decidem se haverá ensaio ou não para cada culto/escala.

export interface ServicePreset {
  id: string;
  title: string;
  service_type: string;
  dayOfWeek: number; // 0 = Domingo, 3 = Quarta, 5 = Sexta
  timeOfDay: 'morning' | 'night';
  defaultStartTime: string;
  defaultLocation: string;
  suggestsRehearsal: boolean;
  defaultRehearsalNote?: string;
  badge: string;
  description: string;
}

export const FIXED_SERVICE_PRESETS: ServicePreset[] = [
  {
    id: 'domingo-noite',
    title: 'Culto da Noite',
    service_type: 'Culto da Noite',
    dayOfWeek: 0,
    timeOfDay: 'night',
    defaultStartTime: '18:00',
    defaultLocation: 'Templo Principal',
    suggestsRehearsal: true,
    defaultRehearsalNote: 'O ensaio será na quinta-feira às 19:30',
    badge: '🌟 Culto da Noite (18:00)',
    description: 'Domingo à noite às 18:00 (Culto noturno principal com ensaio)',
  },
  {
    id: 'domingo-ebd',
    title: 'EBD — Escola Bíblica Dominical',
    service_type: 'EBD',
    dayOfWeek: 0,
    timeOfDay: 'morning',
    defaultStartTime: '09:00',
    defaultLocation: 'Templo Principal',
    suggestsRehearsal: false,
    badge: '📖 EBD (09:00)',
    description: 'Domingo pela manhã às 09:00 (Escola Bíblica Dominical)',
  },
  {
    id: 'domingo-ceia',
    title: 'Culto de Ceia',
    service_type: 'Culto de Ceia',
    dayOfWeek: 0,
    timeOfDay: 'morning',
    defaultStartTime: '09:00',
    defaultLocation: 'Templo Principal',
    suggestsRehearsal: true,
    defaultRehearsalNote: 'O ensaio será na quinta-feira às 19:30',
    badge: '🍞 Culto de Ceia (09:00)',
    description: 'Domingo pela manhã às 09:00 (Santa Ceia com ensaio)',
  },
  {
    id: 'quarta-feira',
    title: 'Culto de Quarta-feira',
    service_type: 'Culto de Quarta',
    dayOfWeek: 3,
    timeOfDay: 'night',
    defaultStartTime: '19:30',
    defaultLocation: 'Templo Principal',
    suggestsRehearsal: false,
    badge: '🔵 Quarta-feira (19:30)',
    description: 'Culto fixo às quartas 19:30 — sem ensaio programado por padrão',
  },
  {
    id: 'sexta-feira',
    title: 'Culto de Sexta-feira',
    service_type: 'Culto de Sexta',
    dayOfWeek: 5,
    timeOfDay: 'night',
    defaultStartTime: '19:30',
    defaultLocation: 'Templo Principal',
    suggestsRehearsal: false,
    badge: '🟢 Sexta-feira (19:30)',
    description: 'Culto fixo às sextas 19:30 — sem ensaio programado por padrão',
  },
];

export function getPresetById(id: string): ServicePreset | undefined {
  return FIXED_SERVICE_PRESETS.find((p) => p.id === id);
}

export function detectPresetByTitleOrType(titleOrType?: string): ServicePreset | undefined {
  if (!titleOrType) return undefined;
  const lower = titleOrType.toLowerCase();
  if (lower.includes('noite') || lower.includes('familia') || lower.includes('família')) {
    return getPresetById('domingo-noite');
  }
  if (lower.includes('ebd') || lower.includes('bíblica') || lower.includes('biblica')) {
    return getPresetById('domingo-ebd');
  }
  if (lower.includes('ceia')) {
    return getPresetById('domingo-ceia');
  }
  if (lower.includes('quarta')) {
    return getPresetById('quarta-feira');
  }
  if (lower.includes('sexta')) {
    return getPresetById('sexta-feira');
  }
  return undefined;
}

/**
 * Calculates the next date (YYYY-MM-DD) for a given target day of the week (0 = Sunday, 3 = Wed, 5 = Fri).
 */
export function getNextDateForDayOfWeek(targetDay: number): string {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  // If targetDay is today, schedule for next week if late or today if morning
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7;
  }
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + daysUntilTarget);
  return targetDate.toISOString().slice(0, 10);
}

/**
 * Checks whether a service or schedule is eligible / suggested for rehearsal.
 * Rule: Only Sunday services and Communion (Santa Ceia).
 * Wednesday and Friday do NOT suggest rehearsal by default.
 */
export function isRehearsalSuggestedForService(service?: {
  title?: string;
  date?: string;
  service_type?: string;
}): boolean {
  if (!service) return false;
  const title = (service.title || '').toLowerCase();
  const type = (service.service_type || '').toLowerCase();

  // Santa Ceia always qualifies
  if (title.includes('ceia') || type.includes('ceia')) return true;

  // Sunday by title/type
  if (title.includes('domingo') || type.includes('domingo')) return true;

  // Check date day of week
  if (service.date) {
    const parts = service.date.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (d.getDay() === 0) return true; // Sunday
    }
  }

  return false;
}

/**
 * Quick observation chips for leader and ministrante to choose
 */
export const REHEARSAL_SUGGESTIONS = [
  'O ensaio será na quinta-feira às 19:30',
  'ENSAIO QUINTA FEIRA',
  'Ensaio domingo às 08:00 (Santa Ceia / EBD)',
  'Ensaio sábado às 18:00',
  'Passagem de som 30 minutos antes do culto',
  'Chegar com 20 minutos de antecedência para oração',
  'Sem ensaio previsto para este culto',
];
