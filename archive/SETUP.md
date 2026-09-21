# Anchor Finance - Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Name: `anchor-finance`
5. Set a strong database password (save it!)
6. Choose region closest to you
7. Wait ~2 minutes for provisioning

## 2. Create Database Tables

In Supabase Dashboard → SQL Editor → New Query, paste this and click **Run**:

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