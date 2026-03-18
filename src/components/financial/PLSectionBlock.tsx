/**
 * PLSection — Renders a single P&L section with editable rows
 * Double-click to edit, Tab to move between fields, Enter to save
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Calculator, Users, Zap } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PLSection as PLSectionType, LineItem } from '@/config/financialLineItems';
import type { FinancialSummary } from '@/hooks/useFinancialSummary';
import type { FinancialCharge, ChargeCategory } from '@/hooks/useFinancialCharges';

interface PLSectionProps {
  section: PLSectionType;
  summary: FinancialSummary | null;
  charges: FinancialCharge[];
  isLocked: boolean;
  isLoading: boolean;
  onSaveMonthlyField: (field: string, value: number) => Promise<void>;
  onCreateCharge: (values: { charge_type: string; category: ChargeCategory; amount: number }) => Promise<any>;
  onUpdateCharge: (params: { charge_id: string; new_amount: number; new_start_month: string }) => Promise<any>;
  year: number;
  month: number;
  defaultCollapsed?: boolean;
  autoValues?: Record<string, number>;
}

function getSourceIcon(source_type: string, autoSource?: string) {
  if (autoSource === 'statia') return <Zap className="h-3 w-3 text-blue-500" />;
  if (autoSource === 'collaborators') return <Users className="h-3 w-3 text-primary" />;
  if (autoSource) return <Users className="h-3 w-3 text-primary" />;
  switch (source_type) {
    case 'manual_monthly': return <Keyboard className="h-3 w-3 text-amber-500" />;
    case 'manual_fixed': return <Keyboard className="h-3 w-3 text-green-500" />;
    case 'manual_variable': return <Keyboard className="h-3 w-3 text-orange-500" />;
    case 'calculated': return <Calculator className="h-3 w-3 text-muted-foreground" />;
    default: return null;
  }
}

function getSourceBadge(source_type: string, autoSource?: string, hasAutoValue?: boolean) {
  if (autoSource === 'statia' && hasAutoValue) return <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-blue-600 border-blue-200">StatIA</Badge>;
  if (autoSource === 'collaborators' && hasAutoValue) return <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-primary border-primary/30">RH</Badge>;
  if (autoSource && hasAutoValue) return <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-primary border-primary/30">Auto</Badge>;
  switch (source_type) {
    case 'manual_fixed': return <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-green-600 border-green-200">Fixe</Badge>;
    case 'manual_variable': return <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-orange-600 border-orange-200">Variable</Badge>;
    default: return null;
  }
}

export function PLSectionBlock({
  section,
  summary,
  charges,
  isLocked,
  isLoading,
  onSaveMonthlyField,
  onCreateCharge,
  onUpdateCharge,
  year,
  month,
  defaultCollapsed = false,
  autoValues = {},
}: PLSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // List of editable item keys in order for Tab navigation
  const editableKeys = useMemo(() =>
    section.items
      .filter(item => {
        if (isLocked || item.displayOnly) return false;
        return item.source_type === 'manual_monthly' || item.source_type === 'manual_fixed' || item.source_type === 'manual_variable';
      })
      .map(item => item.key),
    [section.items, isLocked]
  );

  function getValue(item: LineItem): number {
    if (item.displayOnly) {
      return autoValues[item.key] ?? 0;
    }
    if (item.month_field && summary) {
      const summaryVal = (summary as any)[item.month_field];
      if (summaryVal != null && summaryVal !== 0) return summaryVal;
    }
    const autoKey = item.month_field || item.key;
    if (autoValues[autoKey] != null) {
      const summaryVal = summary && item.month_field ? (summary as any)[item.month_field] : null;
      if (!summaryVal) return autoValues[autoKey];
    }
    if (item.month_field && summary) {
      return (summary as any)[item.month_field] ?? 0;
    }
    if (item.charge_key) {
      const charge = charges.find(c => c.charge_type === item.charge_key);
      return charge?.amount ?? 0;
    }
    if (item.source_type === 'calculated' && summary) {
      return (summary as any)[item.key] ?? 0;
    }
    return 0;
  }

  function formatValue(item: LineItem, val: number): string {
    if (item.isPercent) return formatPercent(val);
    if (section.key === 'activite') {
      if (item.key.includes('heures') || item.key === 'ca_par_heure') return `${val.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;
      if (item.key === 'panier_moyen') return formatCurrency(val);
      return val.toLocaleString('fr-FR');
    }
    return formatCurrency(val);
  }

  function isEditable(item: LineItem): boolean {
    if (isLocked || item.displayOnly) return false;
    return item.source_type === 'manual_monthly' || item.source_type === 'manual_fixed' || item.source_type === 'manual_variable';
  }

  function startEdit(item: LineItem) {
    setEditingKey(item.key);
    setEditValue(String(getValue(item) || ''));
  }

  const findItemByKey = useCallback((key: string) => section.items.find(i => i.key === key), [section.items]);

  async function saveAndMoveNext(item: LineItem, moveToNext: boolean) {
    const newVal = parseFloat(editValue) || 0;
    setSaving(true);
    try {
      if (item.month_field && item.source_type === 'manual_monthly') {
        await onSaveMonthlyField(item.month_field, newVal);
      } else if (item.charge_key) {
        const existing = charges.find(c => c.charge_type === item.charge_key);
        if (existing) {
          await onUpdateCharge({
            charge_id: existing.id,
            new_amount: newVal,
            new_start_month: monthDate,
          });
        } else {
          const category: ChargeCategory = item.source_type === 'manual_fixed' ? 'FIXE' : 'VARIABLE';
          await onCreateCharge({
            charge_type: item.charge_key,
            category,
            amount: newVal,
          });
        }
      }
    } finally {
      setSaving(false);
      if (moveToNext) {
        const idx = editableKeys.indexOf(item.key);
        if (idx >= 0 && idx < editableKeys.length - 1) {
          const nextKey = editableKeys[idx + 1];
          const nextItem = findItemByKey(nextKey);
          if (nextItem) {
            setEditingKey(nextKey);
            setEditValue(String(getValue(nextItem) || ''));
            return;
          }
        }
      }
      setEditingKey(null);
      setEditValue('');
    }
  }

  function colorForValue(val: number, item: LineItem): string {
    if (item.isSubtotal || item.bold) {
      if (item.key.includes('resultat') || item.key === 'marge_brute' || item.key === 'marge_sur_achats') {
        return val >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
      }
    }
    return 'text-foreground';
  }

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {collapsed ? '▸' : '▾'} {section.title}
          </CardTitle>
          {section.key !== 'activite' && section.key !== 'resultat' && (
            <span className="text-[10px] text-muted-foreground">
              {section.items.filter(i => i.charge_key).length > 0 && `${charges.filter(c => section.items.some(i => i.charge_key === c.charge_type && c.amount > 0)).length}/${section.items.filter(i => i.charge_key).length} renseignés`}
            </span>
          )}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="h-20 animate-pulse bg-muted rounded" />
          ) : (
            <div className="space-y-0.5">
              {section.items.map(item => {
                const val = getValue(item);
                const editing = editingKey === item.key;
                const editable = isEditable(item);

                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between py-1 ${
                      item.isSubtotal ? 'border-t border-border mt-1 pt-1.5' : ''
                    } ${editable && !editing ? 'cursor-pointer hover:bg-muted/50 rounded-sm -mx-1 px-1 transition-colors' : ''}`}
                    style={{ paddingLeft: (item.indent ?? 0) * 16 }}
                    onDoubleClick={() => {
                      if (editable && !editing) startEdit(item);
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {getSourceIcon(item.source_type, item.autoSource)}
                      <span className={`text-xs truncate ${item.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                      {getSourceBadge(item.source_type, item.autoSource, !!(autoValues[item.month_field || item.key]))}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {editing ? (
                        <Input
                          ref={inputRef}
                          type="number"
                          step={item.key.includes('nb_') || item.key.includes('salaries') ? 1 : 0.01}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-28 h-6 text-xs tabular-nums text-right"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              saveAndMoveNext(item, true);
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveAndMoveNext(item, false);
                            }
                            if (e.key === 'Escape') {
                              setEditingKey(null);
                              setEditValue('');
                            }
                          }}
                          onBlur={() => {
                            // Save on blur (clicking away)
                            if (editingKey === item.key) {
                              saveAndMoveNext(item, false);
                            }
                          }}
                        />
                      ) : (
                        <span className={`text-xs tabular-nums font-medium ${colorForValue(val, item)} ${item.bold ? 'font-semibold' : ''}`}>
                          {formatValue(item, val)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
