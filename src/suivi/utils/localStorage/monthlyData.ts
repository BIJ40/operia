/**
 * Monthly data management for localStorage
 */

import { loadData, saveData } from './core';

const MONTHLY_DATA_KEY = 'monthlyData';

export interface MonthlyData {
  [year: number]: {
    [month: number]: any;
  };
}

export function getMonthlyData(): MonthlyData {
  return loadData(MONTHLY_DATA_KEY) || {};
}

export function setMonthlyData(data: MonthlyData): void {
  saveData(MONTHLY_DATA_KEY, data);
}

export function getMonthData(year: number, month: number): any {
  const monthlyData = getMonthlyData();
  return monthlyData[year]?.[month] || null;
}

export function setMonthData(year: number, month: number, data: any): void {
  const monthlyData = getMonthlyData();
  
  if (!monthlyData[year]) {
    monthlyData[year] = {};
  }
  
  monthlyData[year][month] = data;
  setMonthlyData(monthlyData);
}
