/**
 * P2: Export CSV des tickets support
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportTicket } from '@/hooks/use-admin-support';
import { TICKET_STATUS_LABELS, TICKET_SERVICE_LABELS } from '@/services/supportService';
import { getHeatPriorityLabel } from '@/utils/heatPriority';
import { successToast, errorToast } from '@/lib/toastHelpers';

interface TicketExportCSVProps {
  tickets: SupportTicket[];
  filename?: string;
}

export function TicketExportCSV({ tickets, filename = 'tickets-support' }: TicketExportCSVProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    if (tickets.length === 0) {
      errorToast('Aucun ticket à exporter');
      return;
    }

    setExporting(true);

    try {
      // Headers CSV
      const headers = [
        'ID',
        'Sujet',
        'Statut',
        'Priorité',
        'Service',
        'Catégorie',
        'Niveau Support',
        'Créé le',
        'Résolu le',
        'Note',
        'SLA Status',
      ];

      // Data rows
      const rows = tickets.map(ticket => [
        ticket.id.slice(0, 8),
        `"${(ticket.subject || '').replace(/"/g, '""')}"`,
        TICKET_STATUS_LABELS[ticket.status] || ticket.status,
        `${ticket.heat_priority} - ${getHeatPriorityLabel(ticket.heat_priority)}`,
        ticket.service ? (TICKET_SERVICE_LABELS[ticket.service] || ticket.service) : '',
        ticket.category || '',
        ticket.support_level || 1,
        format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
        ticket.resolved_at ? format(new Date(ticket.resolved_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '',
        ticket.rating || '',
        ticket.sla_status || '',
      ]);

      // Build CSV content
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Add BOM for Excel compatibility with UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      successToast(`${tickets.length} tickets exportés`);
    } catch (error) {
      errorToast('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToCSV}
      variant="outline"
      size="sm"
      disabled={exporting || tickets.length === 0}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Export CSV
      {tickets.length > 0 && (
        <span className="text-xs text-muted-foreground">({tickets.length})</span>
      )}
    </Button>
  );
}
