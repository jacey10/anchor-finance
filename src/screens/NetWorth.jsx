import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getSetting } from '../lib/storage';
import { calculateNetWorth } from '../lib/calculations';
import { formatNaira, formatUSD } from '../lib/format';

export default function NetWorth() {
  const [data, setData] = useState({ total: 0, ngn: 0, usd: 0 });
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    const calc = async () => {
      const [txs, start, rate] = await Promise.all([
        getTransactions(), 
        getSetting('starting_balance'), 
        getSetting('exchange_rate')
      ]);
      
      const calculated = calculateNetWorth(txs, start, rate);
      setData(calculated);
      setExchangeRate(rate || 1);
    };
    calc();
  }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">Net Worth</h1>
      <p className="screen-sub">Your total wealth across all assets.</p>
      
      <div className="networth-cards">
        <div className="networth-card main">
          <div className="networth-label">Total Net Worth</div>
          <div className="networth-value">{formatNaira(data.total)}</div>
        </div>
        
        <div className="networth-card">
          <div className="networth-label">Naira Holdings</div>
          <div className="networth-value">{formatNaira(data.ngn)}</div>
        </div>
        
        <div className="networth-card">
          <div className="networth-label">USD Holdings</div>
          <div className="networth-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span>{formatUSD(data.usd)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 'normal' }}>
              ≈ {formatNaira(data.usd * exchangeRate)}
            </span>
          </div>
        </div>
      </div>

      <div className="chart-wrap" style={{ marginTop: 32 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={[{ month: 'Current', value: data.total }]}>
            <XAxis dataKey="month" stroke="#5A6B7A" tick={{ fill: '#8A98A5' }} axisLine={{ stroke: '#2A3B4D' }} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#16283C', border: '1px solid #2A3B4D', color: '#EDE9E1' }} formatter={(value) => [formatNaira(value), 'Net worth']} />
            <Line type="monotone" dataKey="value" stroke="#B8935F" strokeWidth={2} dot={{ fill: '#B8935F', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}