// hasAccount is a device-local flag, separate from the session itself.
// Session tells us "are they logged in right now" — this tells us
// "has this browser/device ever successfully authenticated here".
// It must survive logout (logout only clears the session, never this),
// and only gets cleared if the account itself is deleted.

const KEY = 'hasAccount';

export function setHasAccount() {
  localStorage.setItem(KEY, 'true');
}

export function getHasAccount() {
  return localStorage.getItem(KEY) === 'true';
}

export function clearHasAccount() {
  localStorage.removeItem(KEY);
}