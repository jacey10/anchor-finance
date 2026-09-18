import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getSetting } from '../lib/storage';
import { calculateNetWorth } from '../lib/calculations';
import { formatNaira } from '../lib/format';

export default function NetWorth() {
  const [netWorth, setNetWorth] = useState(0);

  useEffect(() => {
    const calc = async () => {
      const [txs, start, rate] = await Promise.all([getTransactions(), getSetting('starting_balance'), getSetting('exchange_rate')]);
      const data = calculateNetWorth(txs, start, rate);
      setNetWorth(data.total);
    };
    calc();
  }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">Net Worth</h1>
      <p className="screen-sub">Currently {formatNaira(netWorth)}.</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={[{ month: 'Current', value: netWorth }]}>
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