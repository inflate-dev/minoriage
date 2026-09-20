// 柿ダッシュボード用のデータ取得。
//
// 現状バックエンドには以下のデータがまだ存在しないため、モックデータを返す実装になっている。
// 実データ連携時にこのファイルをSupabaseクエリ(または新規APIルート)に置き換えること。
//
// 必要になるデータ項目(要確認・未確定):
// - 検出結果ごとの座標・エリア/圃場ID・検出日時
// - 果実サイズ
// - 成熟度・着色度スコア(またはそれに相当する分類ラベル)
// - 検出信頼度
// - 各エリアの開花日(シーズン基準日の算出に必要)
// - 前年分の同項目データ(前年同時期比較のため)

export type PhaseKey = 'bloom' | 'fruitSet' | 'enlargement' | 'coloring' | 'harvest';

export type Phase = {
  key: PhaseKey;
  daysSinceBloom: number;
};

export type TrendPoint = {
  daysSinceBloom: number;
  detectedCount: number;
  coloredCount: number;
  // 拡張: 複数年分データが蓄積された場合の平年線(過去N年平均)用。
  // 現時点ではデータがないため常にundefined。
  normalYearAvg?: number;
};

export type AreaStat = {
  id: string;
  name: string;
  detectedThisSeason: number;
  yoyChangePercent: number;
  coloredRatio: number;
  // 拡張: 適期予測(残り日数)。算出ロジック未実装のためnull。
  daysToHarvestEstimate: number | null;
};

export type ActionType = 'harvest_recommend' | 'anomaly' | 'eta_prediction';
export type ActionSeverity = 'success' | 'danger' | 'neutral';

export type ActionItem = {
  id: string;
  type: ActionType;
  areaId: string;
  areaName: string;
  severity: ActionSeverity;
  coloredRatio?: number;
  yoyChangePercent?: number;
  daysToHarvestEstimate?: number;
};

export type DashboardData = {
  daysSinceBloom: number;
  bloomDate: string;
  totalDetectedThisSeason: number;
  yoyChangePercent: number;
  // 正=昨年より着色ペースが早い、負=遅い
  coloringPaceDeltaDays: number;
  phases: Phase[];
  trendThisYear: TrendPoint[];
  trendLastYear: TrendPoint[];
  areas: AreaStat[];
  actions: ActionItem[];
};

// しきい値(初期実装では仮値。将来的に設定画面から調整可能にする)
export const ACTION_THRESHOLDS = {
  harvestRecommendColoredRatio: 0.8,
  anomalyYoyDropPercent: -30,
};

const PHASES: Phase[] = [
  { key: 'bloom', daysSinceBloom: 0 },
  { key: 'fruitSet', daysSinceBloom: 20 },
  { key: 'enlargement', daysSinceBloom: 60 },
  { key: 'coloring', daysSinceBloom: 110 },
  { key: 'harvest', daysSinceBloom: 150 },
];

const SEASON_LENGTH_DAYS = 160;

function growthCurve(day: number, totalDays: number, capacity: number) {
  const midpoint = totalDays * 0.55;
  const steepness = 0.06;
  return capacity / (1 + Math.exp(-steepness * (day - midpoint)));
}

function buildTrend(
  capacity: number,
  coloringStartDay: number,
  colorPaceShiftDays: number
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let day = 0; day <= SEASON_LENGTH_DAYS; day += 5) {
    const detectedCount = Math.round(growthCurve(day, SEASON_LENGTH_DAYS, capacity));
    const coloredDay = day - coloringStartDay + colorPaceShiftDays;
    const coloredCount = Math.min(
      detectedCount,
      Math.round(growthCurve(coloredDay, SEASON_LENGTH_DAYS - coloringStartDay, capacity * 0.85))
    );
    points.push({ daysSinceBloom: day, detectedCount, coloredCount });
  }
  return points;
}

export function getDashboardData(): DashboardData {
  const daysSinceBloom = 118;
  const bloomDate = '2026-05-24';

  const trendLastYear = buildTrend(4600, 110, -6);
  const trendThisYearFull = buildTrend(5200, 110, 0);
  const trendThisYear = trendThisYearFull.filter((p) => p.daysSinceBloom <= daysSinceBloom);

  const totalDetectedThisSeason =
    trendThisYear[trendThisYear.length - 1]?.detectedCount ?? 0;
  const lastYearAtSameDay =
    trendLastYear.find((p) => p.daysSinceBloom === daysSinceBloom)?.detectedCount ??
    trendLastYear[trendLastYear.length - 1].detectedCount;
  const yoyChangePercent =
    lastYearAtSameDay > 0
      ? Math.round(((totalDetectedThisSeason - lastYearAtSameDay) / lastYearAtSameDay) * 100)
      : 0;

  const coloringPaceDeltaDays = 4;

  const areas: AreaStat[] = [
    { id: 'area-1', name: '第1圃場', detectedThisSeason: 1820, yoyChangePercent: 12, coloredRatio: 0.86, daysToHarvestEstimate: 6 },
    { id: 'area-2', name: '第2圃場', detectedThisSeason: 1340, yoyChangePercent: -34, coloredRatio: 0.52, daysToHarvestEstimate: 21 },
    { id: 'area-3', name: '第3圃場', detectedThisSeason: 1120, yoyChangePercent: 5, coloredRatio: 0.63, daysToHarvestEstimate: 15 },
    { id: 'area-4', name: '第4圃場', detectedThisSeason: 920, yoyChangePercent: -8, coloredRatio: 0.35, daysToHarvestEstimate: 30 },
  ];

  const actions: ActionItem[] = [];
  areas.forEach((area) => {
    if (area.coloredRatio >= ACTION_THRESHOLDS.harvestRecommendColoredRatio) {
      actions.push({
        id: `harvest-${area.id}`,
        type: 'harvest_recommend',
        areaId: area.id,
        areaName: area.name,
        severity: 'success',
        coloredRatio: area.coloredRatio,
      });
    }
    if (area.yoyChangePercent <= ACTION_THRESHOLDS.anomalyYoyDropPercent) {
      actions.push({
        id: `anomaly-${area.id}`,
        type: 'anomaly',
        areaId: area.id,
        areaName: area.name,
        severity: 'danger',
        yoyChangePercent: area.yoyChangePercent,
      });
    }
  });

  return {
    daysSinceBloom,
    bloomDate,
    totalDetectedThisSeason,
    yoyChangePercent,
    coloringPaceDeltaDays,
    phases: PHASES,
    trendThisYear,
    trendLastYear,
    areas,
    actions,
  };
}
