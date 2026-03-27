// Mock data fallback for development when API is unavailable
export const MOCK_DATA = {
  projects: [],
  clients: [],
  users: [],
  devis: [],
  interventions: [],
  factures: [],
  groups: [],
  creneaux: [],
  histories: []
};

export function useMockData(endpoint: string): any {
  console.log(`Using mock data for ${endpoint}`);
  const endpointName = endpoint.split('/').pop();
  
  if (endpointName) {
    switch (endpointName) {
      case 'apiGetProjects':
        return MOCK_DATA.projects;
      case 'apiGetClients':
        return MOCK_DATA.clients;
      case 'apiGetUsers':
        return MOCK_DATA.users;
      case 'apiGetDevis':
        return MOCK_DATA.devis;
      case 'apiGetInterventions':
        return MOCK_DATA.interventions;
      case 'apiGetFactures':
        return MOCK_DATA.factures;
      case 'apiGetGroups':
        return MOCK_DATA.groups;
      case 'getInterventionsCreneaux':
        return MOCK_DATA.creneaux;
      case 'apiGetHistories':
        return MOCK_DATA.histories;
      default:
        return [];
    }
  }
  return [];
}
