import { useState } from 'react';

type Period = 'daily' | 'monthly';

const mockMonthlyData = {
  cost: [
    { label: '1月', value: 12000 }, { label: '2月', value: 15000 },
    { label: '3月', value: 11500 }, { label: '4月', value: 18000 },
    { label: '5月', value: 22000 }, { label: '6月', value: 19500 },
  ],
  usage: [
    { label: '1月', value: 320 }, { label: '2月', value: 410 },
    { label: '3月', value: 380 }, { label: '4月', value: 520 },
    { label: '5月', value: 610 }, { label: '6月', value: 550 },
  ],
  laborSaving: [
    { label: '1月', value: 45 }, { label: '2月', value: 52 },
    { label: '3月', value: 48 }, { label: '4月', value: 67 },
    { label: '5月', value: 78 }, { label: '6月', value: 72 },
  ],
};

const mockDailyData = {
  cost: [
    { label: '6/10', value: 650 }, { label: '6/11', value: 720 },
    { label: '6/12', value: 580 }, { label: '6/13', value: 810 },
    { label: '6/14', value: 690 }, { label: '6/15', value: 540 },
  ],
  usage: [
    { label: '6/10', value: 18 }, { label: '6/11', value: 22 },
    { label: '6/12', value: 16 }, { label: '6/13', value: 25 },
    { label: '6/14', value: 20 }, { label: '6/15', value: 15 },
  ],
  laborSaving: [
    { label: '6/10', value: 2.5 }, { label: '6/11', value: 3.1 },
    { label: '6/12', value: 2.2 }, { label: '6/13', value: 3.8 },
    { label: '6/14', value: 2.9 }, { label: '6/15', value: 2.0 },
  ],
};

function BarChart({ data, unit, color }: { data: { label: string; value: number }[]; unit: string; color: string }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="chart-container">
      <div className="chart-bars">
        {data.map((d) => (
          <div key={d.label} className="chart-bar-group">
            <div className="chart-bar-wrapper">
              <div className="chart-bar" style={{ height: `${(d.value / max) * 100}%`, background: color }} />
            </div>
            <span className="chart-label">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="chart-unit">単位: {unit}</div>
    </div>
  );
}

function StatCard({ title, value, unit, trend }: { title: string; value: string; unit: string; trend: string }) {
  return (
    <div className="stat-card">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-value">{value} <span className="stat-unit">{unit}</span></div>
      <div className={`stat-trend ${trend.startsWith('+') ? 'positive' : 'negative'}`}>{trend}</div>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('monthly');
  const data = period === 'monthly' ? mockMonthlyData : mockDailyData;

  return (
    <div className="page dashboard">
      <div className="page-header">
        <h2>ダッシュボード</h2>
        <div className="period-toggle">
          <button className={`toggle-btn${period === 'daily' ? ' active' : ''}`} onClick={() => setPeriod('daily')}>日次</button>
          <button className={`toggle-btn${period === 'monthly' ? ' active' : ''}`} onClick={() => setPeriod('monthly')}>月次</button>
        </div>
      </div>
      <div className="stat-cards">
        <StatCard title="AIコスト試算" value={period === 'monthly' ? '19,500' : '690'} unit="円" trend={period === 'monthly' ? '+11.4%' : '-4.2%'} />
        <StatCard title="AI利用量" value={period === 'monthly' ? '550' : '20'} unit="回" trend={period === 'monthly' ? '+5.8%' : '-9.1%'} />
        <StatCard title="労働時間削減" value={period === 'monthly' ? '72' : '2.9'} unit="時間" trend={period === 'monthly' ? '+7.5%' : '+3.4%'} />
      </div>
      <div className="charts-grid">
        <div className="chart-card"><h3>AIコスト推移</h3><BarChart data={data.cost} unit="円" color="#6366f1" /></div>
        <div className="chart-card"><h3>利用量推移</h3><BarChart data={data.usage} unit="回" color="#06b6d4" /></div>
        <div className="chart-card"><h3>労働時間削減推移</h3><BarChart data={data.laborSaving} unit="時間" color="#10b981" /></div>
      </div>
    </div>
  );
}
