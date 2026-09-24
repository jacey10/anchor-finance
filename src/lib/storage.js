import { supabase } from './supabase.js';

// Helper to get the current logged-in user's ID
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// ── Settings (Starting Balance & Exchange Rate) ─
export const getSetting = async (key) => {
  const userId = await getUserId();
  if (!userId) return 0;
  
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .eq('user_id', userId)
    .single();
    
  // PGRST116 is the error code for "no rows found". We return 0 instead of crashing.
  if (error && error.code !== 'PGRST116') throw error;
  return data ? parseFloat(data.value) : 0;
};

export const updateSetting = async (key, value) => {
  const userId = await getUserId();
  if (!userId) return;
  
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value), user_id: userId }, { onConflict: 'user_id,key' });
    
  if (error) throw error;
};

// ── Transactions (Income, Expenses, Family Support) ──
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
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId, // CRITICAL FIX
      type: tx.type,
      source: tx.source || null,
      category: tx.category || null,
      person: tx.person || null,
      support_type: tx.support_type || null,
      amount: tx.amount,
      currency: tx.currency || 'NGN',
      note: tx.note || null,
      date: tx.date,
      recurring: tx.recurring || false,
      impulse: tx.impulse || false,
      goal_id: tx.goal_id || null
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateTransaction = async (id, updates) => {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteTransaction = async (id) => {
  // FIX: If this transaction is a Goal Payment (has a goal_id), we need to
  // reverse its effect on that goal's progress before deleting it. Otherwise
  // the goal's progress bar stays overstated after the payment is gone.
  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('goal_id, amount')
    .eq('id', id)
    .single();
    
  if (fetchError) throw fetchError;
  
  if (tx && tx.goal_id) {
    const { data: goal, error: goalFetchError } = await supabase
      .from('goals')
      .select('current')
      .eq('id', tx.goal_id)
      .single();
      
    // PGRST116 = goal already deleted separately; nothing to reverse in that case.
    if (goalFetchError && goalFetchError.code !== 'PGRST116') throw goalFetchError;
    
    if (goal) {
      // Don't let progress go below 0 (e.g. if current was reset to 0 on a
      // fully-paid goal and an older partial payment is deleted afterward).
      const newCurrent = Math.max(0, goal.current - tx.amount);
      
      const { error: goalUpdateError } = await supabase
        .from('goals')
        .update({ current: newCurrent })
        .eq('id', tx.goal_id);
        
      if (goalUpdateError) throw goalUpdateError;
    }
  }
  
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};

// ── Goals ──
export const getGoals = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addGoal = async (goal) => {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('goals')
    .insert([{ 
      user_id: userId, 
      name: goal.name, 
      target: goal.target, 
      current: 0, 
      deadline: goal.deadline || null 
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateGoal = async (id, updates) => {
  const { error } = await supabase.from('goals').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteGoal = async (id) => {
  // FIX: Removed the cascading delete of transactions.
  // We want to preserve the financial history of goal payments.
  // Deleting a goal only removes the tracker, not the historical money movement.
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
};

// ── Wishlist ──
export const getWishlistItems = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('wishlist_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addWishlistItem = async (item) => {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('wishlist_items')
    .insert([{ 
      user_id: userId, 
      name: item.name, 
      note: item.note || null,
      status: 'wishing'
    }])
    .select()
    .single();
    
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

// ── Notes ──
export const getNotes = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addNote = async (content) => {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('notes')
    .insert([{ user_id: userId, content }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteNote = async (id) => {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
};

// ── Categories (Expenses) ──
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

// ── Income Sources ──
export const getIncomeSources = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('income_sources').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
};

export const addIncomeSource = async (name, defaultCurrency = 'NGN') => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('income_sources')
    .insert([{ user_id: userId, name, default_currency: defaultCurrency }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteIncomeSource = async (id) => {
  const { error } = await supabase.from('income_sources').delete().eq('id', id);
  if (error) throw error;
};

// ─ People (Family Support) ──
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

// ── Family Types ──
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