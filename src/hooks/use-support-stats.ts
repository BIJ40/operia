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
  // P3#2 AI Classification stats
  autoClassifiedCount: number;
  autoClassifiedRate: number;
  incompleteCount: number;
  incompleteRate: number;
  ticketsByAICategory: Record<string, number>;
  avgAIConfidence: number;
  aiCorrectionRate: number;
  isLoading: boolean;
}

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
    // P3#2 AI stats
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

        // Fetch all tickets
        const { data: allTickets, error: ticketsError } = await supabase
          .from('support_tickets')
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

        // Resolution time (only resolved tickets)
        const resolvedTickets = tickets.filter(t => t.resolved_at && t.created_at);
        let avgResolutionTimeHours = 0;
        if (resolvedTickets.length > 0) {
          const totalHours = resolvedTickets.reduce((sum, t) => {
            return sum + differenceInHours(parseISO(t.resolved_at!), parseISO(t.created_at));
          }, 0);
          avgResolutionTimeHours = Math.round(totalHours / resolvedTickets.length);
        }

        // Resolution rate
        const closedStatuses = ['resolved', 'closed'];
        const closedTickets = tickets.filter(t => closedStatuses.includes(t.status));
        const resolutionRate = tickets.length > 0 
          ? Math.round((closedTickets.length / tickets.length) * 100) 
          : 0;

        // Active agents (unique assigned_to values)
        const uniqueAgents = new Set(tickets.filter(t => t.assigned_to).map(t => t.assigned_to));
        const activeAgents = uniqueAgents.size;

        // Rating stats
        const ratedTickets = tickets.filter(t => t.rating !== null && t.rating !== undefined);
        const avgRating = ratedTickets.length > 0
          ? ratedTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTickets.length
          : 0;

        // Tickets by status
        const ticketsByStatus: Record<string, number> = {};
        tickets.forEach(t => {
          ticketsByStatus[t.status] = (ticketsByStatus[t.status] || 0) + 1;
        });

        // Tickets by priority
        const ticketsByPriority: Record<string, number> = {};
        tickets.forEach(t => {
          ticketsByPriority[t.priority] = (ticketsByPriority[t.priority] || 0) + 1;
        });

        // SLA stats - tickets ouverts seulement
        const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status));
        const ticketsBySLA: Record<string, number> = { ok: 0, warning: 0, late: 0 };
        openTickets.forEach(t => {
          const slaStatus = t.sla_status || 'ok';
          ticketsBySLA[slaStatus] = (ticketsBySLA[slaStatus] || 0) + 1;
        });

        // SLA compliance rate (tickets résolus dans les délais)
        const resolvedWithSLA = tickets.filter(t => 
          ['resolved', 'closed'].includes(t.status) && t.due_at && t.resolved_at
        );
        const compliantTickets = resolvedWithSLA.filter(t => 
          new Date(t.resolved_at!) <= new Date(t.due_at!)
        );
        const slaComplianceRate = resolvedWithSLA.length > 0
          ? Math.round((compliantTickets.length / resolvedWithSLA.length) * 100)
          : 100;

        // P3#2 AI Classification stats
        const autoClassifiedTickets = tickets.filter(t => t.auto_classified === true);
        const autoClassifiedCount = autoClassifiedTickets.length;
        const autoClassifiedRate = tickets.length > 0
          ? Math.round((autoClassifiedCount / tickets.length) * 100)
          : 0;

        const incompleteTickets = tickets.filter(t => t.ai_is_incomplete === true);
        const incompleteCount = incompleteTickets.length;
        const incompleteRate = tickets.length > 0
          ? Math.round((incompleteCount / tickets.length) * 100)
          : 0;

        // Tickets by AI category
        const ticketsByAICategory: Record<string, number> = {};
        autoClassifiedTickets.forEach(t => {
          const cat = t.ai_category || 'autre';
          ticketsByAICategory[cat] = (ticketsByAICategory[cat] || 0) + 1;
        });

        // Average AI confidence
        const ticketsWithConfidence = autoClassifiedTickets.filter(t => t.ai_confidence != null);
        const avgAIConfidence = ticketsWithConfidence.length > 0
          ? ticketsWithConfidence.reduce((sum, t) => sum + (t.ai_confidence || 0), 0) / ticketsWithConfidence.length
          : 0;

        // AI correction rate (tickets where manual category differs from AI category)
        const ticketsWithBothCategories = autoClassifiedTickets.filter(t => 
          t.ai_category && t.category && t.ai_category !== t.category
        );
        const aiCorrectionRate = autoClassifiedCount > 0
          ? Math.round((ticketsWithBothCategories.length / autoClassifiedCount) * 100)
          : 0;

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

        setStats({
          ticketsThisMonth,
          ticketsLastMonth,
          avgResolutionTimeHours,
          resolutionRate,
          activeAgents,
          avgRating: Math.round(avgRating * 10) / 10,
          totalRatings: ratedTickets.length,
          ticketsByStatus,
          ticketsByPriority,
          ticketsBySLA,
          slaComplianceRate,
          monthlyEvolution,
          // P3#2 AI stats
          autoClassifiedCount,
          autoClassifiedRate,
          incompleteCount,
          incompleteRate,
          ticketsByAICategory,
          avgAIConfidence: Math.round(avgAIConfidence * 100),
          aiCorrectionRate,
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
