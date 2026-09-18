import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Income from './screens/Income.jsx';
import Expenses from './screens/Expenses.jsx';
import Family from './screens/Family.jsx';
import Goals from './screens/Goals.jsx';
import NetWorth from './screens/NetWorth.jsx';
import Settings from './screens/Settings.jsx';

export default function App() {
  const [activeScreen, setScreen] = useState('dashboard');

  return (
    <div className="app">
      <Sidebar activeScreen={activeScreen} setScreen={setScreen} />
      
      <main className="main">
        {activeScreen === 'dashboard' && <Dashboard />}
        {activeScreen === 'income' && <Income />}
        {activeScreen === 'expenses' && <Expenses />}
        {activeScreen === 'family' && <Family />}
        {activeScreen === 'goals' && <Goals />}
        {activeScreen === 'networth' && <NetWorth />}
        {activeScreen === 'settings' && <Settings />}
      </main>
    </div>
  );
}