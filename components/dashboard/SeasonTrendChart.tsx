'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DashboardData, PhaseKey } from '@/lib/dashboardData';

type Metric = 'detectedCount' | 'coloredCount';

export function SeasonTrendChart({ data }: { data: DashboardData }) {
  const t = useTranslations('dashboard.trend');
  const [metric, setMetric] = useState<Metric>('detectedCount');

  const chartData = useMemo(() => {
    return data.trendLastYear.map((lastYearPoint) => {
      const thisYearPoint = data.trendThisYear.find(
        (p) => p.daysSinceBloom === lastYearPoint.daysSinceBloom
      );
      return {
        daysSinceBloom: lastYearPoint.daysSinceBloom,
        thisYear: thisYearPoint ? thisYearPoint[metric] : undefined,
        lastYear: lastYearPoint[metric],
      };
    });
  }, [data, metric]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{t('title')}</CardTitle>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="detectedCount">{t('detected')}</TabsTrigger>
            <TabsTrigger value="coloredCount">{t('colored')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="daysSinceBloom"
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: t('xAxisLabel'), position: 'insideBottom', offset: -16 }}
              />
              <YAxis
                label={{ value: t('yAxisLabel'), angle: -90, position: 'insideLeft' }}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(day) => `${t('xAxisLabel')}: ${day}`}
              />
              <Legend verticalAlign="top" height={24} />
              {data.phases.map((phase) => (
                <ReferenceLine
                  key={phase.key}
                  x={phase.daysSinceBloom}
                  stroke="#a3a3a3"
                  strokeDasharray="2 2"
                  label={{
                    value: t(`phases.${phase.key}` as `phases.${PhaseKey}`),
                    position: 'top',
                    fontSize: 11,
                    fill: '#737373',
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="thisYear"
                name={t('thisYear')}
                stroke="#1e3a8a"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="lastYear"
                name={t('lastYear')}
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
