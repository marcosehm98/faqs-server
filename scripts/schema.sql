-- Referencia de tablas. El servidor también las crea al arrancar.
-- mysql -u usuario -p nombre_db < scripts/schema.sql

CREATE TABLE IF NOT EXISTS faq_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(20) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  INDEX idx_cat_parent (parent_id),
  INDEX idx_cat_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  category_id INT NULL,
  group_id INT NULL,
  sort_order INT NOT NULL DEFAULT 999,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags JSON NOT NULL,
  attachments JSON NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NULL,
  deleted_at BIGINT NULL,
  INDEX idx_category (category),
  INDEX idx_group_id (group_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY,
  brand_name VARCHAR(120) NOT NULL DEFAULT 'Centro de Ayuda',
  logo_url VARCHAR(500) NULL,
  font_family VARCHAR(50) NOT NULL DEFAULT 'dm-sans',
  updated_at BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestion TEXT NOT NULL,
  name VARCHAR(100) NULL,
  email VARCHAR(255) NULL,
  status ENUM('pending', 'reviewed') NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  reviewed_at BIGINT NULL,
  INDEX idx_suggestion_status (status),
  INDEX idx_suggestion_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Administrador',
  role ENUM('admin', 'editor') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NULL,
  last_login_at BIGINT NULL,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
