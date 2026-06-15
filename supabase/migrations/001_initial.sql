-- ============================================
-- Cafe POS System - Initial Migration
-- ============================================

-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'cashier' check (role in ('admin','manager','cashier')),
  full_name text not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins and managers can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 'cashier');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- PRODUCTS TABLE
-- ============================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  cost numeric(10,2) not null,
  category text not null,
  is_active boolean default true,
  stock_quantity int default 100,
  low_stock_threshold int default 10,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

-- Products RLS
create policy "Authenticated users can view active products"
  on public.products for select
  using (auth.role() = 'authenticated');

create policy "Admins and managers can insert products"
  on public.products for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "Admins and managers can update products"
  on public.products for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "Admins and managers can delete products"
  on public.products for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

-- ============================================
-- ORDERS TABLE
-- ============================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','refunded','completed')),
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null,
  tax numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_type text not null default 'cash' check (payment_type in ('cash', 'credit')),
  payment_ref text,
  amount_received numeric(10,2) default 0,
  change_amount numeric(10,2) default 0,
  cashier_id uuid references public.profiles(id),
  table_number int,
  created_at timestamptz default now(),
  paid_at timestamptz,
  completed_at timestamptz
);

alter table public.orders enable row level security;

-- Orders RLS
create policy "Cashiers can insert orders"
  on public.orders for insert
  with check (auth.uid() = cashier_id);

create policy "Cashiers can view own orders"
  on public.orders for select
  using (auth.uid() = cashier_id);

create policy "Admins can view all orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "Admins can update orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "Cashiers can update own pending orders"
  on public.orders for update
  using (auth.uid() = cashier_id and status = 'pending');

-- Kitchen staff can view paid orders (all authenticated users can view for kitchen)
create policy "Authenticated users can view paid orders for kitchen"
  on public.orders for select
  using (
    auth.role() = 'authenticated' and status in ('paid', 'completed')
  );

-- ============================================
-- SETTINGS TABLE
-- ============================================
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

create policy "Authenticated users can view settings"
  on public.settings for select
  using (auth.role() = 'authenticated');

create policy "Admins can update settings"
  on public.settings for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can insert settings"
  on public.settings for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================
-- SEED DATA
-- ============================================

-- Default tax rate (10%)
insert into public.settings (key, value) values ('tax_rate', '10');

-- Seed 12 products
insert into public.products (name, price, cost, category, stock_quantity) values
  ('Espresso',    3.00,  0.90, 'Coffee',      100),
  ('Americano',   3.50,  1.05, 'Coffee',      100),
  ('Latte',       4.50,  1.35, 'Coffee',      100),
  ('Cappuccino',  4.50,  1.35, 'Coffee',      100),
  ('Mocha',       5.00,  1.50, 'Coffee',      100),
  ('Green Tea',   3.00,  0.90, 'Tea',         100),
  ('Chai Latte',  4.00,  1.20, 'Tea',         100),
  ('Croissant',   3.50,  1.05, 'Pastry',      50),
  ('Muffin',      3.00,  0.90, 'Pastry',      50),
  ('Bagel',       3.50,  1.05, 'Pastry',      50),
  ('Iced Coffee', 4.00,  1.20, 'Cold Drinks', 100),
  ('Smoothie',    5.50,  1.65, 'Cold Drinks', 100);

-- ============================================
-- REFUNDS TABLE
-- ============================================
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  amount numeric(10,2) not null,
  method text not null check (method in ('cash', 'credit')),
  restore_inventory boolean not null default false,
  reason text,
  cashier_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.refunds enable row level security;

create policy "Admins can insert refunds"
  on public.refunds for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

create policy "Admins can view refunds"
  on public.refunds for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Generate daily sequential order number
create or replace function public.generate_order_number()
returns trigger as $$
declare
  today_start timestamptz;
  next_num int;
begin
  today_start := date_trunc('day', now());
  select coalesce(max(order_number), 0) + 1
    into next_num
    from public.orders
    where created_at >= today_start;
  new.order_number := next_num;
  return new;
end;
$$ language plpgsql security definer;

create trigger set_order_number
  before insert on public.orders
  for each row execute function public.generate_order_number();

-- Stock management
create or replace function public.decrement_stock(p_id uuid, qty int)
returns void as $$
begin
  update public.products
  set stock_quantity = greatest(0, stock_quantity - qty)
  where id = p_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_stock(p_id uuid, qty int)
returns void as $$
begin
  update public.products
  set stock_quantity = stock_quantity + qty
  where id = p_id;
end;
$$ language plpgsql security definer;
