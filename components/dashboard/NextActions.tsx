'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { ActionItem, ActionSeverity, DashboardData } from '@/lib/dashboardData';
import { cn } from '@/lib/utils';

const SEVERITY_ICON: Record<ActionSeverity, typeof CheckCircle2> = {
  success: CheckCircle2,
  danger: AlertTriangle,
  neutral: Clock,
};

const SEVERITY_CLASS: Record<ActionSeverity, string> = {
  success: 'text-emerald-600 bg-emerald-50',
  danger: 'text-red-600 bg-red-50',
  neutral: 'text-neutral-500 bg-neutral-100',
};

function areaName(tAreas: ReturnType<typeof useTranslations>, areaId: string): string {
  const num = areaId.split('-')[1];
  return tAreas(`field${num}` as `field${string}`);
}

function actionMessage(
  t: ReturnType<typeof useTranslations>,
  tAreas: ReturnType<typeof useTranslations>,
  action: ActionItem
): string {
  const area = areaName(tAreas, action.areaId);
  switch (action.type) {
    case 'harvest_recommend':
      return t('harvestRecommend', {
        area,
        ratio: Math.round((action.coloredRatio ?? 0) * 100),
      });
    case 'anomaly':
      return t('anomaly', {
        area,
        percent: action.yoyChangePercent ?? 0,
      });
    case 'eta_prediction':
      return t('etaPrediction', {
        area,
        days: action.daysToHarvestEstimate ?? 0,
      });
    default:
      return area;
  }
}

export function NextActions({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard.actions');
  const tAreas = useTranslations('dashboard.areas');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const selectedAreaStat = data.areas.find((a) => a.id === selectedArea) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('empty')}</p>
        ) : (
          <ul className="space-y-3">
            {data.actions.map((action) => {
              const Icon = SEVERITY_ICON[action.severity];
              return (
                <li
                  key={action.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        SEVERITY_CLASS[action.severity]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm truncate">{actionMessage(t, tAreas, action)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedArea(action.areaId)}
                  >
                    {t('detail')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!selectedAreaStat} onOpenChange={(open) => !open && setSelectedArea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAreaStat &&
                t('detailDialogTitle', { area: areaName(tAreas, selectedAreaStat.id) })}
            </DialogTitle>
          </DialogHeader>
          {selectedAreaStat && (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted-foreground">{t('detailDetected')}</dt>
              <dd className="text-right font-medium">
                {selectedAreaStat.detectedThisSeason.toLocaleString()}
              </dd>
              <dt className="text-muted-foreground">{t('detailYoy')}</dt>
              <dd
                className={cn(
                  'text-right font-medium',
                  selectedAreaStat.yoyChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {selectedAreaStat.yoyChangePercent > 0 ? '+' : ''}
                {selectedAreaStat.yoyChangePercent}%
              </dd>
              <dt className="text-muted-foreground">{t('detailColoredRatio')}</dt>
              <dd className="text-right font-medium">
                {Math.round(selectedAreaStat.coloredRatio * 100)}%
              </dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
