// ── Net Worth Engine (V2) ──
export const calculateNetWorth = (transactions, accounts, exchangeRate) => {
  // V2 UPDATE: We now initialize balances from each account's starting_balance.
  const accountBalances = {};
  const safeAccounts = accounts || [];

  safeAccounts.forEach((acc) => {
    accountBalances[acc.id] = {
      id: acc.id,
      name: acc.name,
      currency: acc.currency || 'NGN',
      starting_balance: Number(acc.starting_balance) || 0, // V2 FIX: Include starting_balance so UI can display it
      balance: Number(acc.starting_balance) || 0
    };
  });

  let totalNgn = 0;
  let totalUsd = 0;

  // 2. Apply transactions to the specific accounts
  transactions.forEach((tx) => {
    const amount = tx.amount;

    // V2 UPDATE: Handle Transfers with cross-currency support
    if (tx.type === 'transfer' && tx.account_id && tx.transfer_to_account_id) {
      const fromAcc = accountBalances[tx.account_id];
      const toAcc = accountBalances[tx.transfer_to_account_id];

      if (fromAcc && toAcc) {
        if (fromAcc.currency !== toAcc.currency) {
          if (fromAcc.currency === 'NGN' && toAcc.currency === 'USD') {
            fromAcc.balance -= amount;
            toAcc.balance += (amount / exchangeRate);
          }
          else if (fromAcc.currency === 'USD' && toAcc.currency === 'NGN') {
            fromAcc.balance -= amount;
            toAcc.balance += (amount * exchangeRate);
          }
        } else {
          fromAcc.balance -= amount;
          toAcc.balance += amount;
        }
      }
    }
    // V2 UPDATE: Handle Goal Payments with account deduction
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
    // Fallback for legacy transactions without an account_id.
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

  // 3. Calculate final totals from the computed account balances + legacy totals
  const finalAccountsList = Object.values(accountBalances).map(acc => {
    if (acc.currency === 'USD') {
      totalUsd += acc.balance;
    } else {
      totalNgn += acc.balance;
    }
    return acc; // This now safely includes starting_balance!
  });

  // Convert USD to NGN for the grand total
  const totalNetWorth = totalNgn + (totalUsd * exchangeRate);

  return {
    total: totalNetWorth,
    ngn: totalNgn,
    usd: totalUsd,
    usdInNgn: totalUsd * exchangeRate,
    accounts: finalAccountsList
  };
};

// ── Available to Spend Engine (V2 Addition) ──
export const calculateAvailableToSpend = (netWorthData, goals) => {
  // Total cash across all accounts (NGN + USD converted to NGN)
  const totalCash = netWorthData.ngn + netWorthData.usdInNgn;

  // V2 UPDATE: Only count goals that are NOT yet paid (is_paid = false)
  const totalGoalProgress = goals
    .filter(goal => !goal.is_paid)
    .reduce((sum, goal) => sum + (goal.current || 0), 0);

  return Math.max(0, totalCash - totalGoalProgress);
};

// ── Monthly Summary (Dashboard) ──
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

  Object.keys(baseline).forEach((key) => {
    actuals[key] = 0;
  });

  transactions
    .filter((tx) => tx.date.startsWith(monthKey) && tx.type === typeFilter)
    .forEach((tx) => {
      const key = typeFilter === 'expense' ? tx.category : tx.person;
      if (actuals[key] !== undefined) {
        actuals[key] += tx.amount;
      }
    });

  return Object.keys(baseline).map((key) => ({
    name: key,
    baseline: baseline[key],
    actual: actuals[key],
    remaining: baseline[key] - actuals[key],
    isOver: actuals[key] > baseline[key]
  }));
};

// ─ Historical Trend Calculation ──
export const calculateHistoricalTrend = (allTransactions, accounts, exchangeRate) => {
  const trendData = [];
  const today = new Date();

  // Generate the last 6 months (including current month)
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = targetDate.toLocaleString('default', { month: 'short' });

    // Calculate the last day of this target month
    const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    const lastDayKey = lastDayOfMonth.toISOString().slice(0, 10);

    // Filter transactions up to the end of this month
    const historicalTxs = allTransactions.filter(tx => tx.date <= lastDayKey);

    // Pass accounts to calculateNetWorth
    const snapshot = calculateNetWorth(historicalTxs, accounts || [], exchangeRate);

    trendData.push({
      month: monthName,
      value: snapshot.total
    });
  }

  return trendData;
};