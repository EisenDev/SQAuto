-- SQAuto comparison sample: PostgreSQL source
-- Same table names as mysql_shop_comparison.sql, with intentional schema and row mismatches.

CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  inventory_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id),
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id),
  product_id INTEGER NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

INSERT INTO public.users (id, email, full_name, phone, status, created_at) VALUES
  (1, 'ana@example.com', 'Ana Reyes', '+63-900-000-0001', 'active', '2026-01-01 08:00:00+08'),
  (2, 'ben@example.com', 'Ben Cruz', '+63-900-000-0002', 'active', '2026-01-02 08:00:00+08'),
  (3, 'carlo@example.com', 'Carlo Santos', '+63-900-000-0003', 'active', '2026-01-03 08:00:00+08'),
  (4, 'dina@example.com', 'Dina Lim', '+63-900-000-0004', 'inactive', '2026-01-04 08:00:00+08'),
  (5, 'ella@example.com', 'Ella Tan', '+63-900-000-0005', 'active', '2026-01-05 08:00:00+08'),
  (6, 'franco@example.com', 'Franco Uy', '+63-900-000-0006', 'active', '2026-01-06 08:00:00+08'),
  (7, 'gina@example.com', 'Gina Co', '+63-900-000-0007', 'active', '2026-01-07 08:00:00+08'),
  (8, 'hugo@example.com', 'Hugo Sy', '+63-900-000-0008', 'inactive', '2026-01-08 08:00:00+08'),
  (9, 'iris@example.com', 'Iris Ong', '+63-900-000-0009', 'active', '2026-01-09 08:00:00+08'),
  (10, 'joel@example.com', 'Joel Dee', '+63-900-000-0010', 'active', '2026-01-10 08:00:00+08');

INSERT INTO public.products (id, sku, name, price, inventory_count, is_active, created_at) VALUES
  (1, 'SKU-001', 'Migration Notebook', 12.50, 25, TRUE, '2026-01-01 09:00:00+08'),
  (2, 'SKU-002', 'Schema Pen', 3.75, 100, TRUE, '2026-01-01 09:10:00+08'),
  (3, 'SKU-003', 'Legacy Mug', 8.20, 40, TRUE, '2026-01-01 09:20:00+08'),
  (4, 'SKU-004', 'ETL Sticker Pack', 2.99, 250, TRUE, '2026-01-01 09:30:00+08'),
  (5, 'SKU-005', 'Data Tape', 5.50, 80, TRUE, '2026-01-01 09:40:00+08'),
  (6, 'SKU-006', 'Archive Box', 15.00, 18, TRUE, '2026-01-01 09:50:00+08'),
  (7, 'SKU-007', 'Mapping Cards', 6.25, 70, TRUE, '2026-01-01 10:00:00+08'),
  (8, 'SKU-008', 'Validation Stamp', 9.99, 30, FALSE, '2026-01-01 10:10:00+08');

INSERT INTO public.orders (id, user_id, order_number, status, total_amount, notes, created_at) VALUES
  (1, 1, 'ORD-1001', 'paid', 16.25, 'baseline paid order', '2026-01-11 10:00:00+08'),
  (2, 2, 'ORD-1002', 'paid', 8.20, 'single mug', '2026-01-11 10:15:00+08'),
  (3, 3, 'ORD-1003', 'pending', 21.49, 'pending review', '2026-01-11 10:30:00+08'),
  (4, 4, 'ORD-1004', 'cancelled', 5.50, 'cancelled before shipping', '2026-01-11 10:45:00+08'),
  (5, 5, 'ORD-1005', 'paid', 30.00, 'bulk archive boxes', '2026-01-11 11:00:00+08'),
  (6, 6, 'ORD-1006', 'paid', 12.50, 'notebook only', '2026-01-11 11:15:00+08'),
  (7, 7, 'ORD-1007', 'pending', 18.74, 'mixed office items', '2026-01-11 11:30:00+08'),
  (8, 8, 'ORD-1008', 'paid', 9.99, 'inactive product audit', '2026-01-11 11:45:00+08'),
  (9, 9, 'ORD-1009', 'paid', 11.75, 'small order', '2026-01-11 12:00:00+08'),
  (10, 10, 'ORD-1010', 'paid', 27.49, 'exists only in postgres sample', '2026-01-11 12:15:00+08');

INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price, discount_amount) VALUES
  (1, 1, 1, 1, 12.50, 0),
  (2, 1, 2, 1, 3.75, 0),
  (3, 2, 3, 1, 8.20, 0),
  (4, 3, 6, 1, 15.00, 0),
  (5, 3, 7, 1, 6.25, 0),
  (6, 3, 4, 1, 2.99, 0),
  (7, 4, 5, 1, 5.50, 0),
  (8, 5, 6, 2, 15.00, 0),
  (9, 6, 1, 1, 12.50, 0),
  (10, 7, 7, 3, 6.25, 0),
  (11, 8, 8, 1, 9.99, 0),
  (12, 9, 2, 1, 3.75, 0),
  (13, 9, 3, 1, 8.20, 0.20),
  (14, 10, 6, 1, 15.00, 0);
