import { Navigate } from 'react-router-dom';

export default function TechDashboard() {
  // Redirect to planning by default
  return <Navigate to="/t/planning" replace />;
}
