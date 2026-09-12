import React from 'react';
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const PALETTE = ['#8B6CFF', '#5CE1C6', '#F5B84F', '#FF6B7A', '#7FA9FF', '#E28CFF', '#4ADE9A', '#FFB3C6', '#A0A0D0', '#6FE0C0', '#D0A0FF'];
const AXIS_OPTS = { ticks: { color: '#8E8EB0' }, grid: { color: '#26264A' } };
const AXIS_NOGRID = { ticks: { color: '#8E8EB0' }, grid: { display: false } };

export function DonutChart({ labels, data, height = 220 }) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={{ labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 0 }] }}
        options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#8E8EB0', boxWidth: 10, font: { size: 11 } } } } }}
      />
    </div>
  );
}

export function GroupedBarChart({ labels, datasets, height = 220, horizontal = false }) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: datasets.map((d, i) => ({ ...d, backgroundColor: d.backgroundColor || PALETTE[i % PALETTE.length], borderRadius: 6 })) }}
        options={{
          indexAxis: horizontal ? 'y' : 'x',
          maintainAspectRatio: false,
          plugins: { legend: { display: datasets.length > 1, labels: { color: '#8E8EB0' } } },
          scales: horizontal ? { x: AXIS_OPTS, y: AXIS_NOGRID } : { x: AXIS_NOGRID, y: AXIS_OPTS },
        }}
      />
    </div>
  );
}

export function TrendLineChart({ labels, data, height = 220, fill = true, color = '#5CE1C6' }) {
  return (
    <div style={{ height }}>
      <Line
        data={{ labels, datasets: [{ data, borderColor: color, backgroundColor: color + '20', fill, tension: 0.3, pointRadius: 0 }] }}
        options={{
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { ticks: { color: '#8E8EB0', maxTicksLimit: 8 }, grid: { display: false } }, y: AXIS_OPTS },
        }}
      />
    </div>
  );
}

export { PALETTE };
