import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getSetting, updateSetting } from '../lib/storage';
import { calculateNetWorth } from '../lib/calculations';
import { formatNaira, formatUSD } from '../lib/format';

export default function NetWorth() {
  const [data, setData] = useState({ total: 0, ngn: 0, usd: 0, usdHoldings: 0 });
  const [isEditingUSD, setIsEditingUSD] = useState(false);
  const [draftUSD, setDraftUSD] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1400);

  useEffect(() => {
    const calc = async () => {
      const [txs, start, rate, usdHoldings] = await Promise.all([
        getTransactions(), 
        getSetting('starting_balance'), 
        getSetting('exchange_rate'),
        getSetting('usd_holdings')
      ]);
      
      const calculated = calculateNetWorth(txs, start, rate, usdHoldings || 0);
      setData({ ...calculated, usdHoldings: usdHoldings || 0 });
      setExchangeRate(rate);
      setDraftUSD(String(usdHoldings || 0));
    };
    calc();
  }, []);

  const handleUpdateUSD = async (e) => {
    e.preventDefault();
    const value = Number(draftUSD);
    if (value >= 0) {
      await updateSetting('usd_holdings', value);
      const [txs, start, rate] = await Promise.all([
        getTransactions(), getSetting('starting_balance'), getSetting('exchange_rate'),
      ]);
      const recalculated = calculateNetWorth(txs, start, rate, value);
      setData({ ...recalculated, usdHoldings: value });
      setIsEditingUSD(false);
    }
  };

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
          <div className="networth-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEditingUSD ? (
              <form onSubmit={handleUpdateUSD} style={{ display: 'flex', gap: 8, width: '100%' }}>
                <input 
                  type="number" 
                  value={draftUSD} 
                  onChange={(e) => setDraftUSD(e.target.value)} 
                  className="form-input" 
                  style={{ width: 100, padding: 4 }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12 }}>Save</button>
              </form>
            ) : (
              <span onClick={() => setIsEditingUSD(true)} style={{ cursor: 'pointer', width: '100%' }}>
                {formatUSD(data.usdHoldings)} 
                <span style={{ color: 'var(--text-muted)', fontSize: 14, marginLeft: 8 }}>≈ {formatNaira(data.usdHoldings * exchangeRate)}</span>
              </span>
            )}
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