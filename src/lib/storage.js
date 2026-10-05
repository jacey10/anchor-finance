import { supabase } from './supabase.js';

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export const getSetting = async (key) => {
  const userId = await getUserId();
  if (!userId) return 0;
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? parseFloat(data.value) : 0;
};

export const updateSetting = async (key, value) => {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from('settings').upsert({ key, value: String(value), user_id: userId }, { onConflict: 'user_id,key' });
  if (error) throw error;
};

export const getAccounts = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('accounts').select('id, name, currency, starting_balance, starting_balance_date, created_at').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(acc => ({ ...acc, starting_balance: Number(acc.starting_balance) || 0 }));
};

export const addAccount = async (account) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('accounts').insert([{
    user_id: userId, name: account.name, currency: account.currency || 'NGN',
    starting_balance: Number(account.starting_balance) || 0,
    starting_balance_date: account.starting_balance_date || new Date().toISOString().slice(0, 10)
  }]).select().single();
  if (error) throw error;
  return data;
};

export const updateAccount = async (id, updates) => {
  const { error } = await supabase.from('accounts').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteAccount = async (id) => {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
};

export const getTransactions = async (filters = {}) => {
  const userId = await getUserId();
  let query = supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.month) query = query.gte('date', `${filters.month}-01`).lte('date', `${filters.month}-31`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addTransaction = async (tx) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('transactions').insert([{
    user_id: userId, type: tx.type, source: tx.source || null, category: tx.category || null,
    person: tx.person || null, support_type: tx.support_type || null, amount: tx.amount,
    currency: tx.currency || 'NGN', note: tx.note || null, date: tx.date,
    recurring: tx.recurring || false, impulse: tx.impulse || false,
    goal_id: tx.goal_id || null, account_id: tx.account_id || null,
    transfer_to_account_id: tx.transfer_to_account_id || null, fee: Number(tx.fee) || 0,
    is_goal_execution: tx.is_goal_execution || false // V3 UPDATE: Pass through the explicit execution flag
  }]).select().single();
  if (error) throw error;

  // V2 FIX / V3 UPDATE: If transaction is explicitly marked as goal execution, deduct from goal's current balance AND increment execution_total
  if (tx.is_goal_execution === true && tx.goal_id) {
    const { data: goal, error: goalFetchError } = await supabase.from('goals').select('current, execution_total').eq('id', tx.goal_id).single();
    if (goalFetchError && goalFetchError.code !== 'PGRST116') throw goalFetchError;
    if (goal) {
      const newCurrent = Math.max(0, (goal.current || 0) - tx.amount);
      const newExecutionTotal = (goal.execution_total || 0) + tx.amount;
      const { error: goalUpdateError } = await supabase.from('goals').update({ 
        current: newCurrent,
        execution_total: newExecutionTotal
      }).eq('id', tx.goal_id);
      if (goalUpdateError) throw goalUpdateError;
    }
  }

  // V3 UPDATE: Mark goal as funded when first transfer happens (one-time milestone)
  // Also reset attention_dismissed so badge can reappear if drained again
  if (tx.type === 'goal_transfer' && tx.goal_id) {
    const { error: goalUpdateError } = await supabase.from('goals').update({ 
      was_funded: true,
      attention_dismissed: false
    }).eq('id', tx.goal_id);
    if (goalUpdateError) throw goalUpdateError;
  }

  // NOTE: goal_withdrawal is NOT handled here. The Goals.jsx handler owns the goal.current
  // deduction to avoid double-deduction (Pattern A, same as goal_transfer).

  return data;
};

export const updateTransaction = async (id, updates) => {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteTransaction = async (id) => {
  const { data: tx, error: fetchError } = await supabase.from('transactions').select('goal_id, amount, type, is_goal_execution').eq('id', id).single();
  if (fetchError) throw fetchError;

  // V2 FIX / V3 UPDATE: If deleted transaction was explicitly marked as goal execution, ADD the amount back to current AND decrement execution_total
  if (tx && tx.is_goal_execution === true && tx.goal_id) {
    const { data: goal, error: goalFetchError } = await supabase.from('goals').select('current, execution_total').eq('id', tx.goal_id).single();
    if (goalFetchError && goalFetchError.code !== 'PGRST116') throw goalFetchError;
    if (goal) {
      const newCurrent = (goal.current || 0) + tx.amount;
      const newExecutionTotal = Math.max(0, (goal.execution_total || 0) - tx.amount);
      const { error: goalUpdateError } = await supabase.from('goals').update({ 
        current: newCurrent,
        execution_total: newExecutionTotal
      }).eq('id', tx.goal_id);
      if (goalUpdateError) throw goalUpdateError;
    }
  }

  // V2 FIX: If a "Pay towards Goal" transaction is deleted, subtract that amount from the goal
  if (tx && tx.type === 'goal_transfer' && tx.goal_id) {
    const { data: goal, error: goalFetchError } = await supabase.from('goals').select('current').eq('id', tx.goal_id).single();
    if (goalFetchError && goalFetchError.code !== 'PGRST116') throw goalFetchError;
    if (goal) {
      const newCurrent = Math.max(0, (goal.current || 0) - tx.amount);
      const { error: goalUpdateError } = await supabase.from('goals').update({ current: newCurrent }).eq('id', tx.goal_id);
      if (goalUpdateError) throw goalUpdateError;
    }
  }

  // V3 FIX: If a goal withdrawal is deleted, ADD the amount back to the goal
  if (tx && tx.type === 'goal_withdrawal' && tx.goal_id) {
    const { data: goal, error: goalFetchError } = await supabase.from('goals').select('current').eq('id', tx.goal_id).single();
    if (goalFetchError && goalFetchError.code !== 'PGRST116') throw goalFetchError;
    if (goal) {
      const newCurrent = (goal.current || 0) + tx.amount;
      const { error: goalUpdateError } = await supabase.from('goals').update({ current: newCurrent }).eq('id', tx.goal_id);
      if (goalUpdateError) throw goalUpdateError;
    }
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};

export const getGoals = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addGoal = async (goal) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('goals').insert([{ 
    user_id: userId, 
    name: goal.name, 
    target: goal.target, 
    current: 0, 
    deadline: goal.deadline || null,
    was_funded: false,
    execution_total: 0,
    attention_dismissed: false
  }]).select().single();
  if (error) throw error;
  return data;
};

export const updateGoal = async (id, updates) => {
  const { error } = await supabase.from('goals').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteGoal = async (id) => {
  // First, delete all transactions that reference this goal
  const { error: txError } = await supabase.from('transactions').delete().eq('goal_id', id);
  if (txError) throw txError;
  
  // Then delete the goal itself
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
};

// V3 NEW: Dismiss "Action Required" badge for a goal
export const dismissGoalAttention = async (goalId) => {
  const { error } = await supabase.from('goals')
    .update({ attention_dismissed: true })
    .eq('id', goalId);
  if (error) throw error;
};

export const getWishlistItems = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('wishlist_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addWishlistItem = async (item) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('wishlist_items').insert([{ user_id: userId, name: item.name, note: item.note || null, status: 'wishing' }]).select().single();
  if (error) throw error;
  return data;
};

export const updateWishlistItem = async (id, updates) => {
  const { error } = await supabase.from('wishlist_items').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteWishlistItem = async (id) => {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw error;
};

export const getNotes = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addNote = async (content) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('notes').insert([{ user_id: userId, content }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteNote = async (id) => {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
};

export const getCategories = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
};

export const addCategory = async (name) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('categories').insert([{ user_id: userId, name, baseline: 0 }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteCategory = async (id) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};

export const getIncomeSources = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('income_sources').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
};

export const addIncomeSource = async (name, defaultCurrency = 'NGN') => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('income_sources').insert([{ user_id: userId, name, default_currency: defaultCurrency }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteIncomeSource = async (id) => {
  const { error } = await supabase.from('income_sources').delete().eq('id', id);
  if (error) throw error;
};

export const getPeople = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('people').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
};

export const addPerson = async (name, budget = 0) => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('people').insert([{ user_id: userId, name, budget }]).select().single();
  if (error) throw error;
  return data;
};

export const updatePersonBudget = async (id, budget) => {
  const { error } = await supabase.from('people').update({ budget }).eq('id', id);
  if (error) throw error;
};

export const deletePerson = async (id) => {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
};

export const getFamilyTypes = async () => {
  const { data, error } = await supabase.from('family_types').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const addFamilyType = async (name) => {
  const { data, error } = await supabase.from('family_types').insert([{ name }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteFamilyType = async (id) => {
  const { error } = await supabase.from('family_types').delete().eq('id', id);
  if (error) throw error;
};