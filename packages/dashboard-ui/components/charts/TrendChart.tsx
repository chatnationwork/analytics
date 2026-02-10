'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendDataPoint {
  period: string;
  value: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  title: string;
  valueLabel?: string;
  summary?: {
    total?: number;
    percentChange?: number;
    label?: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'amber';
  height?: number;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
}

const colorMap = {
  blue: {
    bar: 'from-blue-500 to-blue-400',
    barHover: 'hover:from-blue-400 hover:to-blue-300',
    text: 'text-blue-500',
  },
  green: {
    bar: 'from-green-500 to-green-400',
    barHover: 'hover:from-green-400 hover:to-green-300',
    text: 'text-green-500',
  },
  purple: {
    bar: 'from-purple-500 to-purple-400',
    barHover: 'hover:from-purple-400 hover:to-purple-300',
    text: 'text-purple-500',
  },
  amber: {
    bar: 'from-amber-500 to-amber-400',
    barHover: 'hover:from-amber-400 hover:to-amber-300',
    text: 'text-amber-500',
  },
};

export function TrendChart({
  data,
  title,
  valueLabel,
  summary,
  color = 'blue',
  height = 48,
  formatValue = (v) => v.toLocaleString(),
  formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
}: TrendChartProps) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">{title}</h3>
        <div 
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ height: `${height * 4}px` }}
        >
          No data available
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value)) || 1;
  const colors = colorMap[color];

  const getTrendIcon = () => {
    if (!summary?.percentChange) return null;
    if (summary.percentChange > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (summary.percentChange < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!summary?.percentChange) return 'text-muted-foreground';
    return summary.percentChange > 0 ? 'text-green-500' : summary.percentChange < 0 ? 'text-red-500' : 'text-muted-foreground';
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          {summary && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {formatValue(summary.total ?? 0)}
              </span>
              {summary.percentChange !== undefined && (
                <span className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                  {getTrendIcon()}
                  {summary.percentChange > 0 ? '+' : ''}
                  {summary.percentChange.toFixed(1)}%
                </span>
              )}
            </div>
          )}
          {summary?.label && (
            <p className="text-xs text-muted-foreground mt-1">{summary.label}</p>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1" style={{ height: `${height * 4}px` }}>
        {data.map((point, i) => {
          const heightPercent = (point.value / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-0 h-full min-h-0 group relative"
            >
              <div
                className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md"
              >
                {formatDate(point.period)}: {formatValue(point.value)} {valueLabel || ''}
              </div>
              <div
                className={`w-full bg-gradient-to-t ${colors.bar} rounded-t ${colors.barHover} transition-colors min-h-[2px] flex-shrink-0`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels (show first, middle, last) */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.period)}</span>
        {data.length > 2 && (
          <span>{formatDate(data[Math.floor(data.length / 2)]?.period)}</span>
        )}
        <span>{formatDate(data[data.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

/**
 * Stacked Area Chart for user growth (new vs returning)
 */
interface StackedDataPoint {
  period: string;
  newUsers: number;
  returningUsers: number;
}

interface StackedTrendChartProps {
  data: StackedDataPoint[];
  title: string;
  summary?: {
    newUsers?: number;
    returningUsers?: number;
    newPercent?: number;
  };
  height?: number;
}

export function StackedTrendChart({
  data,
  title,
  summary,
  height = 48,
}: StackedTrendChartProps) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">{title}</h3>
        <div 
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ height: `${height * 4}px` }}
        >
          No data available
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.newUsers + d.returningUsers)) || 1;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          {summary && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">
                  New: {summary.newUsers?.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Returning: {summary.returningUsers?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
        {summary?.newPercent !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{summary.newPercent}%</div>
            <div className="text-xs text-muted-foreground">new users</div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-1" style={{ height: `${height * 4}px` }}>
        {data.map((point, i) => {
          const totalHeight = ((point.newUsers + point.returningUsers) / max) * 100;
          const newHeight = (point.newUsers / (point.newUsers + point.returningUsers || 1)) * 100;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
            >
              <div
                className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md"
              >
                {formatDate(point.period)}: {point.newUsers} new, {point.returningUsers} returning
              </div>
              <div
                className="w-full rounded-t overflow-hidden flex flex-col-reverse flex-shrink-0 min-h-[2px]"
                style={{ height: `${totalHeight}%` }}
              >
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400"
                  style={{ height: `${100 - newHeight}%` }}
                />
                <div
                  className="w-full bg-gradient-to-t from-green-600 to-green-400"
                  style={{ height: `${newHeight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.period)}</span>
        {data.length > 2 && (
          <span>{formatDate(data[Math.floor(data.length / 2)]?.period)}</span>
        )}
        <span>{formatDate(data[data.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

/**
 * Rate/Percentage Trend Chart (for conversion rates)
 */
interface RateDataPoint {
  period: string;
  rate: number;
  total?: number;
}

interface RateTrendChartProps {
  data: RateDataPoint[];
  title: string;
  summary?: {
    overallRate?: number;
    total?: number;
    label?: string;
  };
  targetRate?: number;
  height?: number;
}

export function RateTrendChart({
  data,
  title,
  summary,
  targetRate,
  height = 48,
}: RateTrendChartProps) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">{title}</h3>
        <div 
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ height: `${height * 4}px` }}
        >
          No data available
        </div>
      </div>
    );
  }

  // For rates, we use 0-100 scale or max rate * 1.2
  const maxRate = Math.max(...data.map((d) => d.rate), targetRate || 0) * 1.2 || 100;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          {summary && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {summary.overallRate?.toFixed(1)}%
              </span>
              {summary.label && (
                <span className="text-sm text-muted-foreground">{summary.label}</span>
              )}
            </div>
          )}
        </div>
        {targetRate && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Target</div>
            <div className="text-lg font-semibold text-green-500">{targetRate}%</div>
          </div>
        )}
      </div>

      <div className="relative flex items-end gap-1" style={{ height: `${height * 4}px` }}>
        {/* Target line */}
        {targetRate && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-green-500/50"
            style={{ bottom: `${(targetRate / maxRate) * 100}%` }}
          />
        )}

        {data.map((point, i) => {
          const heightPercent = (point.rate / maxRate) * 100;
          const isAboveTarget = targetRate ? point.rate >= targetRate : true;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
            >
              <div
                className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md"
              >
                {formatDate(point.period)}: {point.rate.toFixed(1)}%
                {point.total && ` (${point.total.toLocaleString()} sessions)`}
              </div>
              <div
                className={`w-full rounded-t transition-colors min-h-[2px] flex-shrink-0 ${
                  isAboveTarget
                    ? 'bg-gradient-to-t from-green-600 to-green-400 hover:from-green-500 hover:to-green-300'
                    : 'bg-gradient-to-t from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300'
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.period)}</span>
        {data.length > 2 && (
          <span>{formatDate(data[Math.floor(data.length / 2)]?.period)}</span>
        )}
        <span>{formatDate(data[data.length - 1]?.period)}</span>
      </div>
    </div>
  );
}
