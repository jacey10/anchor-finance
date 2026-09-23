// Formats full Naira amounts (e.g., ₦1,400,000)
export const formatNaira = (n) => {
  if (n === null || n === undefined) return '';
  if (n === 0) return '₦0';

  return '₦' + Number(n).toLocaleString('en-NG', {
    minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2,
    maximumFractionDigits: 2
  });
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