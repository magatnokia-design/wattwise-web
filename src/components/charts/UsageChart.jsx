import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../constants/colors';
import { formatCurrency } from '../../screens/BudgetTracking/utils/budgetHelpers';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/Feedback';
import styles from './UsageChart.module.css';

/**
 * Daily energy, stacked by outlet.
 *
 * Stacked rather than grouped because the question is "how much did the day
 * cost, and which outlet drove it" — the total has to be readable as one bar.
 *
 * Single y-axis by design. Cost is a second measure on a completely different
 * scale, so it lives in the tooltip and the stat tiles rather than on a second
 * axis, which would let the two lines be made to cross anywhere.
 *
 * CHART_COLORS.series is fixed order — outlet 1 always takes slot 0. A filter or
 * an empty series must never repaint the other outlet. That pair is validated
 * for colour-blind separation (ΔE 18.9 deutan); series[1] sits under 3:1 against
 * white, which is why the legend, the axis labels and the table view below are
 * not optional.
 */

const CustomTooltip = ({ active, payload, label, effectiveRate, outlet1Name, outlet2Name }) => {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  const total = Number(row.total) || 0;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{row.fullLabel || label}</p>
      <dl className={styles.tooltipList}>
        <div className={styles.tooltipRow}>
          <dt>
            <span className={styles.swatch} style={{ background: CHART_COLORS.series[0] }} />
            {outlet1Name}
          </dt>
          <dd className="ww-num">{Number(row.outlet1).toFixed(3)} kWh</dd>
        </div>
        <div className={styles.tooltipRow}>
          <dt>
            <span className={styles.swatch} style={{ background: CHART_COLORS.series[1] }} />
            {outlet2Name}
          </dt>
          <dd className="ww-num">{Number(row.outlet2).toFixed(3)} kWh</dd>
        </div>
        <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}>
          <dt>Total</dt>
          <dd className="ww-num">{total.toFixed(3)} kWh</dd>
        </div>
        {effectiveRate > 0 ? (
          <div className={styles.tooltipRow}>
            <dt>Approx. cost</dt>
            <dd className="ww-num">{formatCurrency(total * effectiveRate)}</dd>
          </div>
        ) : null}
      </dl>
      {row.isLive ? <p className={styles.tooltipNote}>Measured so far today</p> : null}
    </div>
  );
};

export const UsageChart = ({ series = [], outlet1Name, outlet2Name, effectiveRate = 0 }) => {
  const [view, setView] = useState('chart');

  const hasData = series.some((point) => Number(point.total) > 0);

  if (!hasData) {
    return (
      <EmptyState icon="📊" title="No usage recorded for this period">
        Charts fill in once the ESP32 reports energy. Nothing is estimated in the meantime.
      </EmptyState>
    );
  }

  return (
    <div>
      <div className={styles.viewToggle}>
        <button
          type="button"
          className={`${styles.viewButton} ${view === 'chart' ? styles.viewActive : ''}`}
          onClick={() => setView('chart')}
        >
          Chart
        </button>
        <button
          type="button"
          className={`${styles.viewButton} ${view === 'table' ? styles.viewActive : ''}`}
          onClick={() => setView('table')}
        >
          Table
        </button>
      </div>

      {view === 'chart' ? (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.track }}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                width={52}
                unit=" kWh"
              />
              <Tooltip
                cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }}
                content={
                  <CustomTooltip
                    effectiveRate={effectiveRate}
                    outlet1Name={outlet1Name}
                    outlet2Name={outlet2Name}
                  />
                }
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={30}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingBottom: 4 }}
              />
              {/* 2px white stroke puts a surface gap between the two stacked
                  fills, so the boundary reads rather than blending. */}
              <Bar
                dataKey="outlet1"
                name={outlet1Name}
                stackId="kwh"
                fill={CHART_COLORS.series[0]}
                stroke="#FFFFFF"
                strokeWidth={2}
                maxBarSize={44}
              />
              <Bar
                dataKey="outlet2"
                name={outlet2Name}
                stackId="kwh"
                fill={CHART_COLORS.series[1]}
                stroke="#FFFFFF"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DataTable
          rowKey={(row) => row.key}
          defaultSort={null}
          columns={[
            { key: 'fullLabel', header: 'Day', render: (row) => row.fullLabel || row.label },
            {
              key: 'outlet1',
              header: outlet1Name,
              align: 'right',
              sortable: true,
              render: (row) => <span className="ww-num">{Number(row.outlet1).toFixed(3)}</span>,
            },
            {
              key: 'outlet2',
              header: outlet2Name,
              align: 'right',
              sortable: true,
              render: (row) => <span className="ww-num">{Number(row.outlet2).toFixed(3)}</span>,
            },
            {
              key: 'total',
              header: 'Total kWh',
              align: 'right',
              sortable: true,
              render: (row) => (
                <strong className="ww-num">{Number(row.total).toFixed(3)}</strong>
              ),
            },
          ]}
          rows={series}
        />
      )}
    </div>
  );
};

export default UsageChart;
