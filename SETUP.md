# Anchor Finance - Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Name: `anchor-finance`
5. Set a strong database password (save it!)
6. Choose region closest to you
7. Wait ~2 minutes for provisioning

## 2. Database Schema (current, as of live Supabase project)

> This reflects the actual schema pulled via `pg_dump --schema-only` — it has drifted from the original single-user seed script below (multi-user with `user_id` + per-row RLS now, plus a few new tables).

### Tables

```sql
-- Categories (expense categories, per user)
CREATE TABLE public.categories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  baseline NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Exchange rate history (per user)
CREATE TABLE public.exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rate NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family support types (shared reference table, not per-user)
CREATE TABLE public.family_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings goals (per user)
CREATE TABLE public.goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC DEFAULT 0,
  deadline DATE,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income sources (per user)
CREATE TABLE public.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Free-text notes (per user)
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- People / family members (per user)
CREATE TABLE public.people (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Recurring transaction rules (per user)
CREATE TABLE public.recurring_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  source TEXT,
  category TEXT,
  person TEXT,
  support_type TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  day_of_month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key/value settings (per user)
CREATE TABLE public.settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, key)
);

-- Transactions (per user)
CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'family_support', 'goal_transfer')),
  source TEXT,
  category TEXT,
  person TEXT,
  support_type TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT FALSE,
  impulse BOOLEAN DEFAULT FALSE,
  goal_id BIGINT REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist items (per user)
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'wishing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Functions & Triggers

```sql
-- Auto-creates a default settings row when a new user signs up
CREATE FUNCTION public.create_user_settings() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.settings (user_id, starting_balance, currency)
  VALUES (NEW.id, 0, 'NGN')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating settings for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Auto-creates a default income source ("Starting Balance") for a new user
CREATE FUNCTION public.seed_income_sources_for_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.income_sources (user_id, name, default_currency)
  VALUES (NEW.id, 'Starting Balance', 'NGN');
  RETURN NEW;
END;
$$;

-- Lets a user fully delete their own account + all associated data
CREATE FUNCTION public.delete_user() RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.transactions WHERE user_id = auth.uid();
  DELETE FROM public.goals WHERE user_id = auth.uid();
  DELETE FROM public.people WHERE user_id = auth.uid();
  DELETE FROM public.categories WHERE user_id = auth.uid();
  DELETE FROM public.settings WHERE user_id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
```

> **Note:** `create_user_settings` and `seed_income_sources_for_new_user` are designed to run as triggers on `auth.users` (e.g. `AFTER INSERT`), but no trigger definitions attaching them were found in the dump — worth double-checking these are actually wired up in the dashboard (Database → Triggers), or add them:
> ```sql
> CREATE TRIGGER on_auth_user_created_settings
>   AFTER INSERT ON auth.users
>   FOR EACH ROW EXECUTE FUNCTION public.create_user_settings();
>
> CREATE TRIGGER on_auth_user_created_income_source
>   AFTER INSERT ON auth.users
>   FOR EACH ROW EXECUTE FUNCTION public.seed_income_sources_for_new_user();
> ```

### Row Level Security (RLS)

All tables have RLS enabled. Policy pattern is consistent across most tables — one policy per operation (select/insert/update/delete), scoped to `auth.uid() = user_id`:

```sql
-- Example pattern, repeated for: categories, exchange_rates, goals,
-- people, recurring_rules, settings, transactions
CREATE POLICY <table>_select_own ON public.<table> FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY <table>_insert_own ON public.<table> FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY <table>_update_own ON public.<table> FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY <table>_delete_own ON public.<table> FOR DELETE USING (auth.uid() = user_id);
```

**Exceptions to the pattern:**
- `family_types` — shared reference data, read-only for any authenticated user (no per-user ownership):
  ```sql
  CREATE POLICY family_types_select_authenticated ON public.family_types
    FOR SELECT USING (auth.role() = 'authenticated');
  ```
- `income_sources` — split into separate named policies (select/insert/delete), same `auth.uid() = user_id` logic. No UPDATE policy — **intentional**: income sources are a fixed dropdown in the app's income screen, delete-and-recreate only, no in-place editing.
- `notes` and `wishlist_items` — single combined policy covering all operations:
  ```sql
  CREATE POLICY "Users can manage their own notes" ON public.notes
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  ```

### Known gaps / things to verify
- No trigger definitions found for the two `SECURITY DEFINER` functions above — confirm they're actually attached somewhere (dashboard-created triggers won't show in a `--schema=public` dump if they're on `auth.users`, which lives in a different schema).

### Resolved
- ~~`transactions.goal_id` had no foreign key constraint to `goals.id`~~ — **fixed**: added `FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL`. Deleting a goal now automatically nulls `goal_id` on its linked transactions instead of leaving a dangling reference — matches the app's existing "keep transaction history, only remove the goal tracker" behavior in `deleteGoal()`.

> This section is out of date compared to the live database (kept below for historical reference — the schema evolved to be multi-user with per-row RLS instead of the original single-user "allow all" version).

<details>
<summary>Original single-user seed script (superseded — kept for history)</summary>

```sql
-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Starting balance (default: ₦90,000)
INSERT INTO settings (key, value) VALUES ('starting_balance', '90000');

-- Exchange rate (default: 1400 NGN/USD)
INSERT INTO settings (key, value) VALUES ('exchange_rate', '1400');

-- Transactions table
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'family_support', 'goal_transfer')),
  source TEXT,
  category TEXT,
  person TEXT,
  support_type TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT FALSE,
  impulse BOOLEAN DEFAULT FALSE,
  goal_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (for expenses)
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- People table (for family support)
CREATE TABLE people (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  budget NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family types table
CREATE TABLE family_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring rules table
CREATE TABLE recurring_rules (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT,
  category TEXT,
  person TEXT,
  support_type TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  day_of_month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange rate history
CREATE TABLE exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  rate NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default data
INSERT INTO categories (name) VALUES 
  ('Food'), ('Transport'), ('Phone/data'), ('School'), ('Personal essentials');

INSERT INTO people (name, budget) VALUES 
  ('Mom', 20000), ('Dad', 15000), ('Siblings', 8000);

INSERT INTO family_types (name) VALUES 
  ('Medical'), ('Food'), ('Other');

INSERT INTO goals (name, target, current, deadline) VALUES
  ('Emergency fund', 1000000, 0, NULL),
  ('Grad school fund', 10000000, 0, NULL),
  ('School fees', 140000, 0, '2027-10-01'),
  ('Rent renewal', 120000, 0, '2027-05-01');

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for personal app)
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_goals" ON goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_people" ON people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_family_types" ON family_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_recurring_rules" ON recurring_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_exchange_rates" ON exchange_rates FOR ALL USING (true) WITH CHECK (true);
```

</details>
