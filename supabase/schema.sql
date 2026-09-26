--
-- PostgreSQL database dump
--

\restrict QzSZZe43C98jRJr4iI9sghckFqLmLAYN4IHNtxmLbq1TTxPZCasamuwMVEBEr7a

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: create_user_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_settings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.settings (user_id, starting_balance, currency)
  VALUES (NEW.id, 0, 'NGN')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'Error creating settings for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: delete_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  -- 1. Delete all user data first (to avoid foreign key errors)
  delete from public.transactions where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.people where user_id = auth.uid();
  delete from public.categories where user_id = auth.uid();
  delete from public.settings where user_id = auth.uid();
  
  -- 2. Delete the user from auth
  delete from auth.users where id = auth.uid();
end;
$$;


--
-- Name: seed_income_sources_for_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_income_sources_for_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.income_sources (user_id, name, default_currency)
  values (new.id, 'Starting Balance', 'NGN');
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    baseline numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    rate numeric NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exchange_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exchange_rates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exchange_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exchange_rates_id_seq OWNED BY public.exchange_rates.id;


--
-- Name: family_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.family_types (
    id bigint NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: family_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.family_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: family_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.family_types_id_seq OWNED BY public.family_types.id;


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    target numeric NOT NULL,
    current numeric DEFAULT 0,
    deadline date,
    created_at timestamp with time zone DEFAULT now(),
    is_paid boolean DEFAULT false
);


--
-- Name: goals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goals_id_seq OWNED BY public.goals.id;


--
-- Name: income_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.income_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    default_currency text DEFAULT 'NGN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    budget numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: people_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.people_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: people_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.people_id_seq OWNED BY public.people.id;


--
-- Name: recurring_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_rules (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    source text,
    category text,
    person text,
    support_type text,
    amount numeric NOT NULL,
    currency text DEFAULT 'NGN'::text,
    day_of_month integer NOT NULL,
    start_date date NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: recurring_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recurring_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recurring_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recurring_rules_id_seq OWNED BY public.recurring_rules.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    source text,
    category text,
    person text,
    support_type text,
    amount numeric NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    note text,
    date date DEFAULT CURRENT_DATE NOT NULL,
    recurring boolean DEFAULT false,
    impulse boolean DEFAULT false,
    goal_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'family_support'::text, 'goal_transfer'::text])))
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    note text,
    status text DEFAULT 'wishing'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: exchange_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates ALTER COLUMN id SET DEFAULT nextval('public.exchange_rates_id_seq'::regclass);


--
-- Name: family_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_types ALTER COLUMN id SET DEFAULT nextval('public.family_types_id_seq'::regclass);


--
-- Name: goals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals ALTER COLUMN id SET DEFAULT nextval('public.goals_id_seq'::regclass);


--
-- Name: people id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people ALTER COLUMN id SET DEFAULT nextval('public.people_id_seq'::regclass);


--
-- Name: recurring_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_rules ALTER COLUMN id SET DEFAULT nextval('public.recurring_rules_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: family_types family_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_types
    ADD CONSTRAINT family_types_name_key UNIQUE (name);


--
-- Name: family_types family_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_types
    ADD CONSTRAINT family_types_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: income_sources income_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: people people_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_user_id_name_key UNIQUE (user_id, name);


--
-- Name: recurring_rules recurring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_rules
    ADD CONSTRAINT recurring_rules_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settings settings_user_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_key_key UNIQUE (user_id, key);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: exchange_rates exchange_rates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: income_sources income_sources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: people people_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recurring_rules recurring_rules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_rules
    ADD CONSTRAINT recurring_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: settings settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: income_sources Users can delete their own income sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own income sources" ON public.income_sources FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: income_sources Users can insert their own income sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own income sources" ON public.income_sources FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notes Users can manage their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own notes" ON public.notes USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlist_items Users can manage their own wishlist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own wishlist items" ON public.wishlist_items USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: income_sources Users can view their own income sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own income sources" ON public.income_sources FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_delete_own ON public.categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: categories categories_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_insert_own ON public.categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories categories_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_own ON public.categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories categories_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_update_own ON public.categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates exchange_rates_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exchange_rates_delete_own ON public.exchange_rates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: exchange_rates exchange_rates_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exchange_rates_insert_own ON public.exchange_rates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exchange_rates exchange_rates_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exchange_rates_select_own ON public.exchange_rates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exchange_rates exchange_rates_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exchange_rates_update_own ON public.exchange_rates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: family_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.family_types ENABLE ROW LEVEL SECURITY;

--
-- Name: family_types family_types_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY family_types_select_authenticated ON public.family_types FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: goals goals_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_delete_own ON public.goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: goals goals_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_insert_own ON public.goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: goals goals_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_select_own ON public.goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: goals goals_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_update_own ON public.goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: income_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: people; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

--
-- Name: people people_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY people_delete_own ON public.people FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: people people_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY people_insert_own ON public.people FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: people people_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY people_select_own ON public.people FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: people people_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY people_update_own ON public.people FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: recurring_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_rules recurring_rules_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recurring_rules_delete_own ON public.recurring_rules FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: recurring_rules recurring_rules_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recurring_rules_insert_own ON public.recurring_rules FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: recurring_rules recurring_rules_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recurring_rules_select_own ON public.recurring_rules FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: recurring_rules recurring_rules_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recurring_rules_update_own ON public.recurring_rules FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: settings settings_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_delete_own ON public.settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: settings settings_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_insert_own ON public.settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: settings settings_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_select_own ON public.settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: settings settings_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_update_own ON public.settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions transactions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_delete_own ON public.transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: transactions transactions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_insert_own ON public.transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions transactions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_select_own ON public.transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions transactions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_update_own ON public.transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: wishlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict QzSZZe43C98jRJr4iI9sghckFqLmLAYN4IHNtxmLbq1TTxPZCasamuwMVEBEr7a

