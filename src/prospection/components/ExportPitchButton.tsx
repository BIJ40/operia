/**
 * ExportPitchButton - Génère un PDF "Pitch" pour un apporteur
 * Page 1 : Synthèse KPIs + points forts + axes progression
 * Page 2 : Mix univers + tendances + opportunités
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
// jsPDF loaded dynamically to reduce bundle
import type { AggregatedKPIs, UniversAggregated } from '../engine/aggregators';
import type { Insight } from '../engine/insights';

interface ExportPitchButtonProps {
  apporteurName: string;
  kpis: AggregatedKPIs;
  universData: UniversAggregated[];
  monthlyTrend: Array<{ month: string; dossiers: number; ca_ht: number; taux_transfo: number | null }>;
  insights: Insight[];
  dateRange: string;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const fmtEuro = (n: number) => `${fmt(n)} €`;
const fmtPct = (n: number | null) => n != null ? `${n.toFixed(1)}%` : '—';
const fmtDays = (n: number | null) => n != null ? `${n.toFixed(1)}j` : '—';

export function ExportPitchButton({ apporteurName, kpis, universData, monthlyTrend, insights, dateRange }: ExportPitchButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = 210;
      const MARGIN = 18;
      const CW = W - 2 * MARGIN;
      let y = 0;

      // ── HELPERS ──
      const drawLine = (yPos: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, yPos, W - MARGIN, yPos);
      };

      const sectionTitle = (title: string, yPos: number) => {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(title, MARGIN, yPos);
        return yPos + 8;
      };

      const kpiRow = (label: string, value: string, yPos: number) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(label, MARGIN + 4, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(value, MARGIN + CW - 4, yPos, { align: 'right' });
        return yPos + 6;
      };

      // ══════════════════════ PAGE 1 ══════════════════════
      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, W, 38, 'F');
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Bilan Performance', MARGIN, 18);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(apporteurName, MARGIN, 28);
      doc.setFontSize(9);
      doc.text(dateRange, W - MARGIN, 28, { align: 'right' });

      y = 50;

      // KPIs Section
      y = sectionTitle('Indicateurs clés', y);

      y = kpiRow('Dossiers reçus', String(kpis.dossiers_received), y);
      y = kpiRow('Dossiers clôturés', String(kpis.dossiers_closed), y);
      y = kpiRow('Devis émis', String(kpis.devis_total), y);
      y = kpiRow('Devis signés', String(kpis.devis_signed), y);
      y = kpiRow('Factures', String(kpis.factures), y);
      y = kpiRow('CA HT', fmtEuro(kpis.ca_ht), y);
      y = kpiRow('Panier moyen', kpis.panier_moyen ? fmtEuro(kpis.panier_moyen) : '—', y);
      y = kpiRow('Taux transfo devis', fmtPct(kpis.taux_transfo_devis), y);
      y = kpiRow('Taux transfo dossier', fmtPct(kpis.taux_transfo_dossier), y);

      y += 4;
      drawLine(y);
      y += 8;

      // Délais
      y = sectionTitle('Délais moyens', y);
      y = kpiRow('Dossier → Devis', fmtDays(kpis.delai_dossier_devis_avg), y);
      y = kpiRow('Devis → Signature', fmtDays(kpis.delai_devis_signature_avg), y);
      y = kpiRow('Signature → Facture', fmtDays(kpis.delai_signature_facture_avg), y);

      y += 4;
      drawLine(y);
      y += 8;

      // Points forts / Axes
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (kpis.taux_transfo_devis && kpis.taux_transfo_devis > 60) strengths.push('Excellent taux de transformation');
      if (kpis.panier_moyen && kpis.panier_moyen > 1500) strengths.push('Panier moyen élevé');
      if (kpis.dossiers_received > 20) strengths.push('Volume de dossiers important');
      if (kpis.devis_non_signes > kpis.devis_signed) weaknesses.push('Devis non signés > signés');
      if (kpis.dossiers_sans_devis > 3) weaknesses.push('Dossiers sans devis à traiter');
      if (kpis.delai_dossier_devis_avg && kpis.delai_dossier_devis_avg > 7) weaknesses.push('Délai dossier→devis à réduire');

      if (strengths.length > 0) {
        y = sectionTitle('✅ Points forts', y);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(34, 120, 60);
        for (const s of strengths) {
          doc.text(`• ${s}`, MARGIN + 4, y);
          y += 6;
        }
        y += 4;
      }

      if (weaknesses.length > 0) {
        y = sectionTitle('⚠️ Axes de progression', y);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 80, 20);
        for (const w of weaknesses) {
          doc.text(`• ${w}`, MARGIN + 4, y);
          y += 6;
        }
        y += 4;
      }

      // ══════════════════════ PAGE 2 ══════════════════════
      doc.addPage();
      y = 20;

      // Mix univers
      y = sectionTitle('Mix Univers', y);
      if (universData.length > 0) {
        // Table header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('Univers', MARGIN + 4, y);
        doc.text('Dossiers', MARGIN + 60, y, { align: 'right' });
        doc.text('Devis', MARGIN + 90, y, { align: 'right' });
        doc.text('CA HT', MARGIN + CW - 4, y, { align: 'right' });
        y += 4;
        drawLine(y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        for (const u of universData.slice(0, 10)) {
          doc.text(u.univers_code || 'Non classé', MARGIN + 4, y);
          doc.text(String(u.dossiers), MARGIN + 60, y, { align: 'right' });
          doc.text(String(u.devis), MARGIN + 90, y, { align: 'right' });
          doc.text(fmtEuro(u.ca_ht), MARGIN + CW - 4, y, { align: 'right' });
          y += 6;
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('Aucune donnée univers disponible', MARGIN + 4, y);
        y += 8;
      }

      y += 4;
      drawLine(y);
      y += 8;

      // Tendance 12 mois
      y = sectionTitle('Tendance mensuelle', y);
      if (monthlyTrend.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('Mois', MARGIN + 4, y);
        doc.text('Dossiers', MARGIN + 50, y, { align: 'right' });
        doc.text('CA HT', MARGIN + 90, y, { align: 'right' });
        doc.text('Transfo', MARGIN + CW - 4, y, { align: 'right' });
        y += 4;
        drawLine(y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        for (const m of monthlyTrend.slice(-12)) {
          doc.text(m.month, MARGIN + 4, y);
          doc.text(String(m.dossiers), MARGIN + 50, y, { align: 'right' });
          doc.text(fmtEuro(m.ca_ht), MARGIN + 90, y, { align: 'right' });
          doc.text(fmtPct(m.taux_transfo), MARGIN + CW - 4, y, { align: 'right' });
          y += 6;
          if (y > 270) { doc.addPage(); y = 20; }
        }
      }

      y += 4;
      drawLine(y);
      y += 8;

      // Opportunités / insights
      if (insights.length > 0) {
        y = sectionTitle('Opportunités & Recommandations', y);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        for (const insight of insights.slice(0, 8)) {
          const color = insight.level === 'danger' ? [180, 40, 40] : insight.level === 'warning' ? [180, 120, 20] : [34, 120, 60];
          doc.setTextColor(color[0], color[1], color[2]);
          const lines = doc.splitTextToSize(`• ${insight.title} — ${insight.description}`, CW - 8);
          doc.text(lines, MARGIN + 4, y);
          y += lines.length * 5 + 2;
          if (y > 270) { doc.addPage(); y = 20; }
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — HelpConfort`, MARGIN, 290);

      doc.save(`pitch-${apporteurName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Export PDF
    </Button>
  );
}
