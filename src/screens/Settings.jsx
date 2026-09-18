import React from 'react';

export default function Settings() {
  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>
      <p className="screen-sub">Manage your app preferences.</p>
      <div className="list-wrap">
        <div className="list-row">
          <div className="list-row-content">
            <div className="list-row-title">Exchange Rate</div>
            <div className="list-row-meta">1 USD = 1,400 NGN</div>
          </div>
        </div>
        <div className="list-row">
          <div className="list-row-content">
            <div className="list-row-title">Export Data</div>
            <div className="list-row-meta">Download all transactions as CSV</div>
          </div>
          <button className="btn btn-outline">Export</button>
        </div>
      </div>
    </div>
  );
}