// Formats full Naira amounts (e.g., ₦1,400,000)
export const formatNaira = (n) => {
  // FIX: If n is null, undefined, or NaN, return 0 instead of crashing
  if (!n || isNaN(n)) return '₦0'; 
  if (n === 0) return '₦0';
  return '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 });
};

// Formats compact Naira amounts (e.g., ₦1.4M or ₦50k)
export const formatCompact = (n) => {
  if (n >= 1000000) return '₦' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return '₦' + (n / 1000).toFixed(0) + 'k';
  return '₦' + n;
};

// Formats full USD amounts (e.g., $1,200.00)
export const formatUSD = (n) => {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Formats compact USD amounts (e.g., $1.2k)
export const formatCompactUSD = (n) => {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return '$' + n.toFixed(0);
};