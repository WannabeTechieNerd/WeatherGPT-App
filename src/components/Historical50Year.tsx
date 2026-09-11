import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Flame,
  Snowflake,
  Droplets,
  ArrowRight,
  Info,
  Sliders,
  History,
} from 'lucide-react';
import { Historical50YearData, Language, TemperatureUnit } from '../types';
import { translations } from '../data/translations';
import { formatTemp } from '../utils/weatherApi';
import { playChime } from '../utils/audio';

interface Historical50YearProps {
  data: Historical50YearData;
  language: Language;
  tempUnit: TemperatureUnit;
}

export function Historical50Year({ data, language, tempUnit }: Historical50YearProps) {
  const t = translations[language];

  // Year comparison state (e.g. 1976 vs 2025)
  const [yearA, setYearA] = useState<number>(1976);
  const [yearB, setYearB] = useState<number>(2025);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const recordA = useMemo(
    () => data.annualRecords.find((r) => r.year === yearA) || data.annualRecords[0],
    [data.annualRecords, yearA]
  );

  const recordB = useMemo(
    () => data.annualRecords.find((r) => r.year === yearB) || data.annualRecords[data.annualRecords.length - 1],
    [data.annualRecords, yearB]
  );

  // SVG Chart math for 50-year trend
  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 45;
  const paddingY = 30;

  const temps = data.annualRecords.map((r) => r.avgTemp);
  const minTemp = Math.min(...temps) - 0.5;
  const maxTemp = Math.max(...temps) + 0.5;
  const tempRange = maxTemp - minTemp || 1;

  const points = data.annualRecords.map((rec, i) => {
    const x = paddingX + (i / (data.annualRecords.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((rec.avgTemp - minTemp) / tempRange) * (chartHeight - paddingY * 2);
    return { x, y, record: rec };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Selected hovered record for chart tooltip
  const activeTooltipRecord = hoveredYear
    ? data.annualRecords.find((r) => r.year === hoveredYear)
    : null;

  // Comparison differences
  const diffAvg = (recordB.avgTemp - recordA.avgTemp).toFixed(2);
  const diffMax = (recordB.maxTemp - recordA.maxTemp).toFixed(1);
  const diffHeat = recordB.heatwaveDays - recordA.heatwaveDays;
  const diffPrecip = recordB.totalPrecipitation - recordA.totalPrecipitation;

  return (
    <div className="w-full space-y-6">
      
      {/* Title & Subtitle Banner */}
      <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-semibold text-indigo-300">
              <History className="w-3.5 h-3.5" />
              <span>{t.historical.spanYears}</span>
              <span className="text-slate-500">|</span>
              <span>1975 – 2026</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {data.cityName} {t.historical.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {t.historical.subtitle}
            </p>
          </div>

          {/* Quick Anomaly Highlight Badge */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-center sm:text-right">
            <div className="text-xs text-slate-400">{t.historical.overallAnomaly}</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">
              +{data.overallWarmingAnomaly}°C
            </div>
            <div className="text-[11px] text-slate-400">vs 1975 Baseline</div>
          </div>
        </div>
      </div>

      {/* Top 3 Stat Cards: Warming Trend, Record High, Record Low */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Warming Anomaly */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 hover:border-white/25 transition-all flex flex-col justify-between shadow-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.historical.warmingTrend}</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2 text-3xl font-extrabold text-white">
            +{data.overallWarmingAnomaly}°C
          </div>
          <div className="text-xs text-slate-400">
            {t.historical.chartAnomalyNote}
          </div>
        </div>

        {/* 50-Year Record High */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 hover:border-white/25 transition-all flex flex-col justify-between shadow-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.historical.recordHigh}</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2 text-3xl font-extrabold text-rose-400">
            {formatTemp(data.recordMax.temp, tempUnit)}
          </div>
          <div className="text-xs text-slate-400">
            Recorded in summer of <span className="font-bold text-slate-200">{data.recordMax.year}</span>
          </div>
        </div>

        {/* 50-Year Record Low */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 hover:border-white/25 transition-all flex flex-col justify-between shadow-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.historical.recordLow}</span>
            <Snowflake className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2 text-3xl font-extrabold text-cyan-400">
            {formatTemp(data.recordMin.temp, tempUnit)}
          </div>
          <div className="text-xs text-slate-400">
            Recorded in winter of <span className="font-bold text-slate-200">{data.recordMin.year}</span>
          </div>
        </div>

      </div>

      {/* 50-Year Interactive Temperature Curve Chart */}
      <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-6 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {t.historical.chartTitle}
            </h3>
            <p className="text-xs text-slate-400">
              Interactive 50-year annual mean temperature graph. Hover or tap points to inspect individual years.
            </p>
          </div>

          {/* Active Hover Badge */}
          {activeTooltipRecord && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 font-mono font-bold self-start sm:self-auto">
              Year {activeTooltipRecord.year}: {formatTemp(activeTooltipRecord.avgTemp, tempUnit)} ({activeTooltipRecord.tempAnomaly > 0 ? `+${activeTooltipRecord.tempAnomaly}` : activeTooltipRecord.tempAnomaly}°C anomaly)
            </div>
          )}
        </div>

        {/* Responsive SVG Canvas Container */}
        <div className="w-full overflow-x-auto no-scrollbar pt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 sm:h-56 min-w-[560px] overflow-visible"
          >
            <defs>
              <linearGradient id="climateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#334155" strokeDasharray="3 3" opacity="0.5" />
            <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.5" />
            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#334155" opacity="0.7" />

            {/* Area Fill */}
            <path d={areaD} fill="url(#climateGrad)" />

            {/* Smooth Trajectory Line */}
            <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

            {/* Data Points */}
            {points.map((pt) => {
              const isSelected = hoveredYear === pt.record.year;
              return (
                <circle
                  key={pt.record.year}
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 3}
                  className="cursor-pointer transition-all duration-200"
                  fill={isSelected ? '#fbbf24' : '#38bdf8'}
                  stroke="#0f172a"
                  strokeWidth={isSelected ? 2.5 : 1}
                  onMouseEnter={() => setHoveredYear(pt.record.year)}
                  onClick={() => {
                    playChime('toggle');
                    setHoveredYear(pt.record.year);
                    setYearB(pt.record.year);
                  }}
                />
              );
            })}

            {/* X-Axis Decade Labels */}
            <text x={paddingX} y={chartHeight - 8} fill="#94a3b8" fontSize="11" fontFamily="monospace">1975</text>
            <text x={paddingX + (chartWidth - paddingX * 2) * 0.2} y={chartHeight - 8} fill="#94a3b8" fontSize="11" fontFamily="monospace">1985</text>
            <text x={paddingX + (chartWidth - paddingX * 2) * 0.4} y={chartHeight - 8} fill="#94a3b8" fontSize="11" fontFamily="monospace">1995</text>
            <text x={paddingX + (chartWidth - paddingX * 2) * 0.6} y={chartHeight - 8} fill="#94a3b8" fontSize="11" fontFamily="monospace">2005</text>
            <text x={paddingX + (chartWidth - paddingX * 2) * 0.8} y={chartHeight - 8} fill="#94a3b8" fontSize="11" fontFamily="monospace">2015</text>
            <text x={chartWidth - paddingX} y={chartHeight - 8} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="monospace">2026</text>
          </svg>
        </div>
      </div>

      {/* Interactive Year Comparison Tool (Select Any Two Years) */}
      <div className="rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-5 sm:p-7 shadow-xl space-y-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            {t.historical.compareTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.historical.compareSubtitle}
          </p>
        </div>

        {/* Year Selector Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Year A (Baseline) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              {t.historical.selectYearA}
            </label>
            <select
              value={yearA}
              onChange={(e) => {
                playChime('toggle');
                setYearA(Number(e.target.value));
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
            >
              {data.annualRecords.map((r) => (
                <option key={`a-${r.year}`} value={r.year}>
                  {r.year} (Avg: {formatTemp(r.avgTemp, tempUnit)})
                </option>
              ))}
            </select>
          </div>

          {/* Year B (Comparison) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              {t.historical.selectYearB}
            </label>
            <select
              value={yearB}
              onChange={(e) => {
                playChime('toggle');
                setYearB(Number(e.target.value));
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
            >
              {data.annualRecords.map((r) => (
                <option key={`b-${r.year}`} value={r.year}>
                  {r.year} (Avg: {formatTemp(r.avgTemp, tempUnit)})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Comparison Result Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Mean Temp Comparison */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs text-slate-400">{t.historical.compareMetricAvg}</div>
            <div className="flex items-center justify-between my-2">
              <span className="font-mono text-sm text-slate-300">{yearA}: <strong className="text-white">{formatTemp(recordA.avgTemp, tempUnit)}</strong></span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-sm text-slate-300">{yearB}: <strong className="text-white">{formatTemp(recordB.avgTemp, tempUnit)}</strong></span>
            </div>
            <div className={`text-xs font-bold ${Number(diffAvg) > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
              {Number(diffAvg) > 0 ? `+${diffAvg}°C Shift` : `${diffAvg}°C Shift`}
            </div>
          </div>

          {/* Summer Peak */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs text-slate-400">{t.historical.compareMetricMax}</div>
            <div className="flex items-center justify-between my-2">
              <span className="font-mono text-sm text-slate-300">{yearA}: <strong className="text-white">{formatTemp(recordA.maxTemp, tempUnit)}</strong></span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-sm text-slate-300">{yearB}: <strong className="text-white">{formatTemp(recordB.maxTemp, tempUnit)}</strong></span>
            </div>
            <div className={`text-xs font-bold ${Number(diffMax) > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
              {Number(diffMax) > 0 ? `+${diffMax}°C Summer High` : `${diffMax}°C`}
            </div>
          </div>

          {/* Extreme Heat Days */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs text-slate-400">{t.historical.compareMetricHeat}</div>
            <div className="flex items-center justify-between my-2">
              <span className="font-mono text-sm text-slate-300">{yearA}: <strong className="text-white">{recordA.heatwaveDays}d</strong></span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-sm text-slate-300">{yearB}: <strong className="text-white">{recordB.heatwaveDays}d</strong></span>
            </div>
            <div className={`text-xs font-bold ${diffHeat > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {diffHeat > 0 ? `+${diffHeat} Extreme Days` : `${diffHeat} Days`}
            </div>
          </div>

          {/* Annual Rainfall Total */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs text-slate-400">{t.historical.compareMetricPrecip}</div>
            <div className="flex items-center justify-between my-2">
              <span className="font-mono text-sm text-slate-300">{yearA}: <strong className="text-white">{recordA.totalPrecipitation}mm</strong></span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-sm text-slate-300">{yearB}: <strong className="text-white">{recordB.totalPrecipitation}mm</strong></span>
            </div>
            <div className="text-xs font-bold text-cyan-400">
              {diffPrecip > 0 ? `+${diffPrecip} mm` : `${diffPrecip} mm`}
            </div>
          </div>

        </div>
      </div>

      {/* Decade-by-Decade Breakdown Cards */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          {t.historical.decadesTitle}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.decades.map((dec) => (
            <div
              key={dec.decade}
              className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {dec.decade}
                </span>
                <div className="text-lg font-extrabold text-white mt-1">
                  {formatTemp(dec.avgTemp, tempUnit)}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Anomaly:</span>
                  <span className={`font-bold ${dec.tempAnomaly > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {dec.tempAnomaly > 0 ? `+${dec.tempAnomaly}` : dec.tempAnomaly}°C
                  </span>
                </div>
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Heat Days:</span>
                  <span className="text-slate-200 font-semibold">{dec.extremeHeatDaysAvg}d</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Verification footnote */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
          <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>{t.historical.climateShiftNotice}</span>
        </div>
      </div>

    </div>
  );
}
