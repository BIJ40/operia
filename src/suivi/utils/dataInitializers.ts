/**
 * Data initialization utilities
 */

export function initializeMonthlyData(year: number) {
  const monthlyData: { [month: number]: any } = {};
  
  for (let month = 0; month < 12; month++) {
    monthlyData[month] = {
      initialized: true,
      data: [],
    };
  }
  
  return monthlyData;
}

export function initializeYearlyData(startYear: number, endYear: number) {
  const yearlyData: { [year: number]: any } = {};
  
  for (let year = startYear; year <= endYear; year++) {
    yearlyData[year] = initializeMonthlyData(year);
  }
  
  return yearlyData;
}

export function resetData() {
  return {
    projects: [],
    clients: [],
    users: [],
    interventions: [],
    devis: [],
    factures: [],
  };
}
