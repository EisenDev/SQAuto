-- SQAuto comparison sample: MySQL source
-- Same table names as postgres_shop_comparison.sql, with intentional schema and row mismatches.

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `full_name` VARCHAR(180) NOT NULL,
  `status` ENUM('active','inactive','blocked') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `inventory_count` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `orders` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `order_number` VARCHAR(80) NOT NULL UNIQUE,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_items` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `line_total` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`id`, `email`, `full_name`, `status`, `created_at`) VALUES
  (1, 'ana@example.com', 'Ana Reyes', 'active', '2026-01-01 08:00:00'),
  (2, 'ben@example.com', 'Benjamin Cruz', 'active', '2026-01-02 08:00:00'),
  (3, 'carlo.new@example.com', 'Carlo Santos', 'blocked', '2026-01-03 08:00:00'),
  (4, 'dina@example.com', 'Dina Lim', 'inactive', '2026-01-04 08:00:00'),
  (5, 'ella@example.com', 'Ella Tan', 'active', '2026-01-05 08:00:00'),
  (6, 'franco@example.com', 'Franco Uy', 'active', '2026-01-06 08:00:00'),
  (7, 'gina@example.com', 'Gina Co', 'active', '2026-01-07 08:00:00'),
  (8, 'hugo@example.com', 'Hugo Sy', 'inactive', '2026-01-08 08:00:00'),
  (9, 'iris@example.com', 'Iris Ong', 'active', '2026-01-09 08:00:00'),
  (10, 'joel@example.com', 'Joel Dee', 'active', '2026-01-10 08:00:00'),
  (11, 'kaye.mysql@example.com', 'Kaye Mysql Only', 'active', '2026-01-10 09:00:00');

INSERT INTO `products` (`id`, `sku`, `name`, `price`, `inventory_count`, `is_active`, `created_at`) VALUES
  (1, 'SKU-001', 'Migration Notebook', 12.50, 25, 1, '2026-01-01 09:00:00'),
  (2, 'SKU-002', 'Schema Pen', 4.00, 97, 1, '2026-01-01 09:10:00'),
  (3, 'SKU-003', 'Legacy Mug', 8.20, 40, 1, '2026-01-01 09:20:00'),
  (4, 'SKU-004', 'ETL Sticker Pack', 2.99, 250, 1, '2026-01-01 09:30:00'),
  (5, 'SKU-005', 'Data Tape', 5.50, 80, 1, '2026-01-01 09:40:00'),
  (6, 'SKU-006', 'Archive Box', 15.00, 20, 1, '2026-01-01 09:50:00'),
  (7, 'SKU-007', 'Mapping Cards', 6.25, 70, 1, '2026-01-01 10:00:00'),
  (8, 'SKU-008', 'Validation Stamp', 9.99, 30, 1, '2026-01-01 10:10:00');

INSERT INTO `orders` (`id`, `user_id`, `order_number`, `status`, `total_amount`, `created_at`) VALUES
  (1, 1, 'ORD-1001', 'paid', 16.50, '2026-01-11 10:00:00'),
  (2, 2, 'ORD-1002', 'paid', 8.20, '2026-01-11 10:15:00'),
  (3, 3, 'ORD-1003', 'processing', 21.49, '2026-01-11 10:30:00'),
  (4, 4, 'ORD-1004', 'cancelled', 5.50, '2026-01-11 10:45:00'),
  (5, 5, 'ORD-1005', 'paid', 30.00, '2026-01-11 11:00:00'),
  (6, 6, 'ORD-1006', 'paid', 12.50, '2026-01-11 11:15:00'),
  (7, 7, 'ORD-1007', 'pending', 18.75, '2026-01-11 11:30:00'),
  (8, 8, 'ORD-1008', 'paid', 9.99, '2026-01-11 11:45:00'),
  (9, 9, 'ORD-1009', 'paid', 12.20, '2026-01-11 12:00:00'),
  (11, 2, 'ORD-1011', 'paid', 4.00, '2026-01-11 12:30:00'),
  (12, 11, 'ORD-1012', 'paid', 20.50, '2026-01-11 12:45:00');

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `unit_price`, `line_total`) VALUES
  (1, 1, 1, 1, 12.50, 12.50),
  (2, 1, 2, 1, 4.00, 4.00),
  (3, 2, 3, 1, 8.20, 8.20),
  (4, 3, 6, 1, 15.00, 15.00),
  (5, 3, 7, 1, 6.25, 6.25),
  (6, 3, 4, 1, 2.99, 2.99),
  (7, 4, 5, 1, 5.50, 5.50),
  (8, 5, 6, 2, 15.00, 30.00),
  (9, 6, 1, 1, 12.50, 12.50),
  (10, 7, 7, 3, 6.25, 18.75),
  (11, 8, 8, 1, 9.99, 9.99),
  (12, 9, 2, 1, 4.00, 4.00),
  (13, 9, 3, 1, 8.20, 8.20),
  (15, 11, 2, 1, 4.00, 4.00),
  (16, 12, 1, 1, 12.50, 12.50),
  (17, 12, 3, 1, 8.00, 8.00);
