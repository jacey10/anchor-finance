// ── Net Worth Engine (V2) ──
// V2 UPDATE: Added 'goals' parameter to include virtual goal buckets in Total Net Worth
export const calculateNetWorth = (transactions, accounts, exchangeRate, asOfDate = null, goals = []) => {
  const accountBalances = {};
  const safeAccounts = accounts || [];

  safeAccounts.forEach((acc) => {
    let initialBalance = Number(acc.starting_balance) || 0;
    
    // V2 FIX: If calculating a historical snapshot, check if the account existed yet
    if (asOfDate && acc.starting_balance_date) {
      const snapshotDate = new Date(asOfDate);
      const accountOpenDate = new Date(acc.starting_balance_date);
      
      // If the snapshot date is before the account was opened, starting balance is 0
      if (snapshotDate < accountOpenDate) {
        initialBalance = 0;
      }
    }

    accountBalances[acc.id] = {
      id: acc.id,
      name: acc.name,
      currency: acc.currency || 'NGN',
      starting_balance: Number(acc.starting_balance) || 0, // Keep original for UI display
      balance: initialBalance // Use adjusted balance for math
    };
  });

  let totalNgn = 0;
  let totalUsd = 0;

  transactions.forEach((tx) => {
    const amount = tx.amount;
    const fee = Number(tx.fee) || 0;

    // V2 UPDATE: Handle Transfers with cross-currency support AND transfer fees
    if (tx.type === 'transfer' && tx.account_id && tx.transfer_to_account_id) {
      const fromAcc = accountBalances[tx.account_id];
      const toAcc = accountBalances[tx.transfer_to_account_id];

      if (fromAcc && toAcc) {
        if (fromAcc.currency !== toAcc.currency) {
          if (fromAcc.currency === 'NGN' && toAcc.currency === 'USD') {
            fromAcc.balance -= (amount + fee);
            toAcc.balance += (amount / exchangeRate);
          } else if (fromAcc.currency === 'USD' && toAcc.currency === 'NGN') {
            fromAcc.balance -= (amount + fee);
            toAcc.balance += (amount * exchangeRate);
          }
        } else {
          fromAcc.balance -= (amount + fee);
          toAcc.balance += amount;
        }
      }
    }
    // V2 UPDATE: Handle standalone Bank Fees (SMS, maintenance, etc.)
    else if (tx.type === 'bank_fee' && tx.account_id && accountBalances[tx.account_id]) {
      accountBalances[tx.account_id].balance -= amount;
    }
    // Handle Goal Payments with account deduction
    else if (tx.type === 'goal_transfer' && tx.account_id && accountBalances[tx.account_id]) {
      accountBalances[tx.account_id].balance -= amount;
    }
    // Handle Income, Expenses, Family Support linked to a specific account
    else if (tx.account_id && accountBalances[tx.account_id]) {
      if (tx.type === 'income') {
        accountBalances[tx.account_id].balance += amount;
      } else if (tx.type === 'expense' || tx.type === 'family_support') {
        accountBalances[tx.account_id].balance -= amount;
      }
    }
    // Fallback for legacy transactions without an account_id
    else {
      if (tx.type === 'income') {
        if (tx.currency === 'USD') totalUsd += amount;
        else totalNgn += amount;
      } else if (tx.type === 'expense' || tx.type === 'family_support' || tx.type === 'goal_transfer') {
        if (tx.currency === 'USD') totalUsd -= amount;
        else totalNgn -= amount;
      }
    }
  });

  const finalAccountsList = Object.values(accountBalances).map(acc => {
    if (acc.currency === 'USD') {
      totalUsd += acc.balance;
    } else {
      totalNgn += acc.balance;
    }
    return acc;
  });

  // V2 UPDATE: Calculate Virtual Goal Balances (The "Virtual Asset" Fix)
  let totalGoalBalance = 0;
  if (goals && goals.length > 0) {
    if (!asOfDate) {
      // Live calculation: use the current balances from the database
      totalGoalBalance = goals.reduce((sum, goal) => sum + (Number(goal.current) || 0), 0);
    } else {
      // Historical calculation: sum of goal funding transactions up to that date
      totalGoalBalance = transactions
        .filter(tx => tx.type === 'goal_transfer' && tx.date <= asOfDate)
        .reduce((sum, tx) => sum + tx.amount, 0);
    }
  }

  // V2 UPDATE: Final Net Worth = Real Accounts + Virtual Goals
  const totalNetWorth = totalNgn + (totalUsd * exchangeRate) + totalGoalBalance;

  return {
    total: totalNetWorth,
    ngn: totalNgn,
    usd: totalUsd,
    usdInNgn: totalUsd * exchangeRate,
    goalBalance: totalGoalBalance, // Exposed for UI if needed
    accounts: finalAccountsList
  };
};

// ── Available to Spend Engine (V2 FIX - Liquid Cash Model) ──
// V2 UPDATE: Simplified to strictly return liquid cash in real accounts.
export const calculateAvailableToSpend = (netWorthData) => {
  return netWorthData.ngn + netWorthData.usdInNgn;
};

// ── Monthly Summary (Dashboard) ─
export const calculateMonthlySummary = (transactions, monthKey, exchangeRate = 1) => {
  let income = 0;
  let expenses = 0;
  let familySupport = 0;
  let impulseTotal = 0;

  const filtered = transactions.filter((tx) => tx.date.startsWith(monthKey));

  filtered.forEach((tx) => {
    const amount = tx.currency === 'USD' ? tx.amount * exchangeRate : tx.amount;

    if (tx.type === 'income') income += amount;
    if (tx.type === 'expense') {
      expenses += amount;
      if (tx.impulse) impulseTotal += amount;
    }
    if (tx.type === 'family_support') familySupport += amount;
    // NOTE: 'bank_fee' is intentionally excluded here to keep lifestyle outflow clean
  });

  return {
    income,
    expenses,
    familySupport,
    totalOutflow: expenses + familySupport,
    impulseTotal,
    impulsePercentage: expenses > 0 ? (impulseTotal / expenses) * 100 : 0
  };
};

// ── Baseline vs Actual (Expenses & Family) ──
export const calculateBaselineVsActual = (baseline, transactions, monthKey, typeFilter) => {
  const actuals = {};
  Object.keys(baseline).forEach((key) => { actuals[key] = 0; });

  transactions
    .filter((tx) => tx.date.startsWith(monthKey) && tx.type === typeFilter)
    .forEach((tx) => {
      const key = typeFilter === 'expense' ? tx.category : tx.person;
      if (actuals[key] !== undefined) actuals[key] += tx.amount;
    });

  return Object.keys(baseline).map((key) => ({
    name: key,
    baseline: baseline[key],
    actual: actuals[key],
    remaining: baseline[key] - actuals[key],
    isOver: actuals[key] > baseline[key]
  }));
};

// ── Historical Trend Calculation ─
// V2 UPDATE: Added 'goals' parameter so historical net worth includes virtual goal assets
// ── Historical Trend Calculation ──
export const calculateHistoricalTrend = (allTransactions, accounts, exchangeRate, goals = []) => {
  const trendData = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = targetDate.toLocaleString('default', { month: 'short' });
    
    // FIX: Calculate the last day of the month
    const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    // FIX: Format the date manually to avoid UTC timezone shifting
    const year = lastDayOfMonth.getFullYear();
    const month = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(lastDayOfMonth.getDate()).padStart(2, '0');
    const lastDayKey = `${year}-${month}-${day}`;
    
    const historicalTxs = allTransactions.filter(tx => tx.date <= lastDayKey);
    
    // Pass the historical date and goals into the math engine
    const snapshot = calculateNetWorth(historicalTxs, accounts || [], exchangeRate, lastDayKey, goals);

    trendData.push({ month: monthName, value: snapshot.total });
  }

  return trendData;
};