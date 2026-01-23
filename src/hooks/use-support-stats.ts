import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours, startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import { logError } from '@/lib/logger';

interface SupportStats {
  ticketsThisMonth: number;
  ticketsLastMonth: number;
  avgResolutionTimeHours: number;
  resolutionRate: number;
  activeAgents: number;
  avgRating: number;
  totalRatings: number;
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  ticketsBySLA: Record<string, number>;
  slaComplianceRate: number;
  monthlyEvolution: { month: string; count: number }[];
  autoClassifiedCount: number;
  autoClassifiedRate: number;
  incompleteCount: number;
  incompleteRate: number;
  ticketsByAICategory: Record<string, number>;
  avgAIConfidence: number;
  aiCorrectionRate: number;
  isLoading: boolean;
}

// Statuts finaux dans apogee_tickets
const FINAL_STATUSES = ['DONE', 'CLOS', 'SUPPORT_RESOLU'];

export function useSupportStats(): SupportStats {
  const [stats, setStats] = useState<SupportStats>({
    ticketsThisMonth: 0,
    ticketsLastMonth: 0,
    avgResolutionTimeHours: 0,
    resolutionRate: 0,
    activeAgents: 0,
    avgRating: 0,
    totalRatings: 0,
    ticketsByStatus: {},
    ticketsByPriority: {},
    ticketsBySLA: {},
    slaComplianceRate: 0,
    monthlyEvolution: [],
    autoClassifiedCount: 0,
    autoClassifiedRate: 0,
    incompleteCount: 0,
    incompleteRate: 0,
    ticketsByAICategory: {},
    avgAIConfidence: 0,
    aiCorrectionRate: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        // V3: Utilise apogee_tickets avec is_urgent_support ou tous les tickets projet
        const { data: allTickets, error: ticketsError } = await supabase
          .from('apogee_tickets')
          .select('*');

        if (ticketsError) throw ticketsError;

        const tickets = allTickets || [];

        // Tickets this month
        const ticketsThisMonth = tickets.filter(t => {
          const created = parseISO(t.created_at);
          return created >= thisMonthStart && created <= thisMonthEnd;
        }).length;

        // Tickets last month
        const ticketsLastMonth = tickets.filter(t => {
          const created = parseISO(t.created_at);
          return created >= lastMonthStart && created <= lastMonthEnd;
        }).length;

        // Resolution time (tickets with final status)
        const resolvedTickets = tickets.filter(t => 
          FINAL_STATUSES.includes(t.kanban_status) && t.created_at && t.updated_at
        );
        let avgResolutionTimeHours = 0;
        if (resolvedTickets.length > 0) {
          const totalHours = resolvedTickets.reduce((sum, t) => {
            return sum + differenceInHours(parseISO(t.updated_at), parseISO(t.created_at));
          }, 0);
          avgResolutionTimeHours = Math.round(totalHours / resolvedTickets.length);
        }

        // Resolution rate
        const closedTickets = tickets.filter(t => FINAL_STATUSES.includes(t.kanban_status));
        const resolutionRate = tickets.length > 0 
          ? Math.round((closedTickets.length / tickets.length) * 100) 
          : 0;

        // Active agents (unique created_by_user_id values)
        const uniqueAgents = new Set(tickets.filter(t => t.created_by_user_id).map(t => t.created_by_user_id));
        const activeAgents = uniqueAgents.size;

        // Tickets by status (kanban_status)
        const ticketsByStatus: Record<string, number> = {};
        tickets.forEach(t => {
          ticketsByStatus[t.kanban_status] = (ticketsByStatus[t.kanban_status] || 0) + 1;
        });

        // Tickets by heat priority (grouped by ranges)
        const ticketsByPriority: Record<string, number> = {
          'Faible (0-3)': 0,
          'Moyen (4-7)': 0,
          'Élevé (8-10)': 0,
          'Critique (11-12)': 0,
        };
        tickets.forEach(t => {
          const heat = t.heat_priority ?? 6;
          if (heat <= 3) ticketsByPriority['Faible (0-3)']++;
          else if (heat <= 7) ticketsByPriority['Moyen (4-7)']++;
          else if (heat <= 10) ticketsByPriority['Élevé (8-10)']++;
          else ticketsByPriority['Critique (11-12)']++;
        });

        // Monthly evolution (last 6 months)
        const monthlyEvolution: { month: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const count = tickets.filter(t => {
            const created = parseISO(t.created_at);
            return created >= monthStart && created <= monthEnd;
          }).length;
          monthlyEvolution.push({
            month: format(monthDate, 'MMM yyyy'),
            count,
          });
        }

        // AI stats - tickets created from support with needs_completion
        const incompleteTickets = tickets.filter(t => t.needs_completion === true);
        const incompleteCount = incompleteTickets.length;
        const incompleteRate = tickets.length > 0
          ? Math.round((incompleteCount / tickets.length) * 100)
          : 0;

        // Tickets by module (instead of AI category)
        const ticketsByAICategory: Record<string, number> = {};
        tickets.forEach(t => {
          const cat = t.module || 'non_classé';
          ticketsByAICategory[cat] = (ticketsByAICategory[cat] || 0) + 1;
        });

        setStats({
          ticketsThisMonth,
          ticketsLastMonth,
          avgResolutionTimeHours,
          resolutionRate,
          activeAgents,
          avgRating: 0, // Not applicable in V3
          totalRatings: 0,
          ticketsByStatus,
          ticketsByPriority,
          ticketsBySLA: { ok: 0, warning: 0, late: 0 },
          slaComplianceRate: 100,
          monthlyEvolution,
          autoClassifiedCount: 0, // Not applicable in V3
          autoClassifiedRate: 0,
          incompleteCount,
          incompleteRate,
          ticketsByAICategory,
          avgAIConfidence: 0,
          aiCorrectionRate: 0,
          isLoading: false,
        });
      } catch (error) {
        logError('SUPPORT_STATS', 'Erreur chargement statistiques support', { error });
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}
