'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grape, TrendingUp, Palette, AlertTriangle } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboardData';
import { cn } from '@/lib/utils';

function changeToneClass(value: number, neutralBand = 3) {
  if (value > neutralBand) return 'text-emerald-600';
  if (value < -neutralBand) return 'text-red-600';
  return 'text-neutral-500';
}

export function SummaryCards({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard.summary');

  const yoyTone = changeToneClass(data.yoyChangePercent);
  const paceTone =
    data.coloringPaceDeltaDays > 0
      ? 'text-emerald-600'
      : data.coloringPaceDeltaDays < 0
        ? 'text-red-600'
        : 'text-neutral-500';
  const alertTone = data.actions.length > 0 ? 'text-red-600' : 'text-neutral-500';

  const paceLabel =
    data.coloringPaceDeltaDays > 0
      ? t('coloringPaceAhead', { days: data.coloringPaceDeltaDays })
      : data.coloringPaceDeltaDays < 0
        ? t('coloringPaceBehind', { days: Math.abs(data.coloringPaceDeltaDays) })
        : t('coloringPaceSame');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('totalDetected')}</CardTitle>
          <Grape className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.totalDetectedThisSeason.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {t('totalDetectedUnit')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('seasonLabel', { days: data.daysSinceBloom })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('yoyChange')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', yoyTone)}>
            {data.yoyChangePercent > 0 ? '+' : ''}
            {data.yoyChangePercent}%
          </div>
          <p className="text-xs text-muted-foreground">{t('yoyChangeHint')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('coloringPace')}</CardTitle>
          <Palette className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', paceTone)}>{paceLabel}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('alertCount')}</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', alertTone)}>
            {data.actions.length}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {t('alertCountUnit')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
