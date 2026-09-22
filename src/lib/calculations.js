// ── Net Worth Engine ──
export const calculateNetWorth = (transactions, startingBalance, exchangeRate, usdHoldings = 0) => {
  let ngnTotal = startingBalance;
  let usdTotal = usdHoldings;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      if (tx.currency === 'USD') usdTotal += tx.amount;
      else ngnTotal += tx.amount;
    } else if (tx.type === 'expense' || tx.type === 'family_support') {
      if (tx.currency === 'USD') usdTotal -= tx.amount;
      else ngnTotal -= tx.amount;
    }
  });

  // Convert USD to NGN for the grand total
  const totalNetWorth = ngnTotal + (usdTotal * exchangeRate);
  
  return {
    total: totalNetWorth,
    ngn: ngnTotal,
    usd: usdTotal,
    usdInNgn: usdTotal * exchangeRate
  };
};

// ── Monthly Summary (Dashboard) ──
export const calculateMonthlySummary = (transactions, monthKey, exchangeRate = 1) => {
  let income = 0;
  let expenses = 0;
  let familySupport = 0;
  let impulseTotal = 0;

  const filtered = transactions.filter((tx) => tx.date.startsWith(monthKey));

  filtered.forEach((tx) => {
    // Convert to NGN for summary if it's USD
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
  
  // Initialize with 0
  Object.keys(baseline).forEach((key) => {
    actuals[key] = 0;
  });

  // Sum up transactions
  transactions
    .filter((tx) => tx.date.startsWith(monthKey) && tx.type === typeFilter)
    .forEach((tx) => {
      const key = typeFilter === 'expense' ? tx.category : tx.person;
      if (actuals[key] !== undefined) {
        actuals[key] += tx.amount;
      }
    });

  // Calculate deltas
  return Object.keys(baseline).map((key) => ({
    name: key,
    baseline: baseline[key],
    actual: actuals[key],
    remaining: baseline[key] - actuals[key],
    isOver: actuals[key] > baseline[key]
  }));
};