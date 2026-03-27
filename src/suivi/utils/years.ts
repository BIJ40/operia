/**
 * Year utilities for date calculations
 */

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getYearsList(startYear?: number, endYear?: number): number[] {
  const currentYear = getCurrentYear();
  const start = startYear || currentYear - 5;
  const end = endYear || currentYear + 1;
  
  const years: number[] = [];
  for (let year = start; year <= end; year++) {
    years.push(year);
  }
  
  return years;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}
