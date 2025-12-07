/**
 * Types pour le Dashboard personnalisable
 */

export type WidgetType = 'kpi' | 'chart' | 'list' | 'table' | 'custom' | 'alerts';
export type WidgetState = 'normal' | 'minimized' | 'maximized';

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string | null;
  type: WidgetType;
  module_source: string;
  icon: string;
  min_width: number;
  min_height: number;
  default_width: number;
  default_height: number;
  min_global_role: number;
  required_modules: string[];
  default_params: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWidget {
  id: string;
  template_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  state: WidgetState;
  user_params: Record<string, unknown>;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  template?: WidgetTemplate;
}

export interface UserDashboardSettings {
  id: string;
  user_id: string;
  grid_cols: number;
  grid_rows: number;
  auto_arrange: boolean;
  theme_variant: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  widgets: UserWidget[];
  settings: UserDashboardSettings | null;
}
