// Page principale du module RT - Liste des interventions du technicien

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TechPlanningList } from '../components/TechPlanningList';
import { InterventionDetail } from '../components/InterventionDetail';
import { InterventionModeChoice } from '../components/InterventionModeChoice';
import { TechIntervention, InterventionMode } from '../types';
import { useTechPlanning } from '../hooks/useTechPlanning';

type ViewState = 
  | { screen: 'list' }
  | { screen: 'detail'; intervention: TechIntervention }
  | { screen: 'mode_choice'; intervention: TechIntervention };

export function TechInterventionsPage() {
  const navigate = useNavigate();
  const { updateRtStatus } = useTechPlanning();
  const [viewState, setViewState] = useState<ViewState>({ screen: 'list' });

  const handleSelectIntervention = (intervention: TechIntervention) => {
    setViewState({ screen: 'detail', intervention });
  };

  const handleBack = () => {
    if (viewState.screen === 'mode_choice') {
      setViewState({ screen: 'detail', intervention: (viewState as any).intervention });
    } else {
      setViewState({ screen: 'list' });
    }
  };

  const handleStartRt = () => {
    if (viewState.screen !== 'detail') return;
    const { intervention } = viewState;
    
    // If already in progress, go directly to runner
    if (intervention.rtStatus === 'in_progress') {
      navigate(`/hc-agency/tech-interventions/rt/${intervention.id}`);
      return;
    }
    
    // Otherwise show mode choice
    setViewState({ screen: 'mode_choice', intervention });
  };

  const handleSelectMode = (mode: InterventionMode) => {
    if (viewState.screen !== 'mode_choice') return;
    const { intervention } = viewState;
    
    if (mode === 'rt') {
      // Update status and navigate to runner
      updateRtStatus(intervention.id, 'in_progress');
      navigate(`/hc-agency/tech-interventions/rt/${intervention.id}?mode=${mode}`);
    } else {
      // Dépannage mode not implemented yet
    }
  };

  // Render based on view state
  switch (viewState.screen) {
    case 'list':
      return (
        <TechPlanningList 
          onSelectIntervention={handleSelectIntervention} 
        />
      );
    
    case 'detail':
      return (
        <InterventionDetail
          intervention={viewState.intervention}
          onBack={handleBack}
          onStartRt={handleStartRt}
        />
      );
    
    case 'mode_choice':
      return (
        <InterventionModeChoice
          intervention={viewState.intervention}
          onBack={handleBack}
          onSelectMode={handleSelectMode}
        />
      );
  }
}

export default TechInterventionsPage;
