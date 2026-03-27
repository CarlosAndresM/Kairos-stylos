import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval,
  format
} from 'date-fns';
import { es } from 'date-fns/locale';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Returns the payment period range for a given date and worker role.
 * - Technicians: Sunday to Saturday (Weekly)
 * - Administrators: 1-15 or 16-End (Bi-weekly)
 */
export const getPeriodRange = (dateInput: Date | string, role: string): PeriodRange => {
  const date = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  
  if (role === 'ADMINISTRADOR_PUNTO' || role === 'ADMINISTRADOR_TOTAL' || role === 'ADMINISTRADOR') {
    const day = date.getDate();
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const midPoint = new Date(date.getFullYear(), date.getMonth(), 15);
    const secondHalfStart = new Date(date.getFullYear(), date.getMonth(), 16);

    return day <= 15
      ? { start: monthStart, end: midPoint, label: 'Quincena (1-15)' }
      : { start: secondHalfStart, end: monthEnd, label: 'Quincena (16-Fin)' };
  }

  // Weeks start on Sunday (0) to match the user's description (Domingos a Sabados)
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
    label: 'Semana'
  };
};

/**
 * Formats a period range as a human-readable string.
 */
export const formatPeriodRange = (range: PeriodRange): string => {
  return `${range.label}: ${format(range.start, 'dd/MM')} - ${format(range.end, 'dd/MM')}`;
};
