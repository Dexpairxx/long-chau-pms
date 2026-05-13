-- Reset LC-PMS Database Schema
DROP DATABASE IF EXISTS lc_pms;

-- LC-PMS Database Schema
CREATE DATABASE IF NOT EXISTS lc_pms;
USE lc_pms;

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS users, categories, products, orders, order_items, cart_items, promotions, promotion_recipients;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('customer', 'cashier', 'pharmacist', 'branch_manager') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    requires_prescription BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(255) NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(20) NULL,
    cashier_id INT,
    order_type ENUM('online', 'in_store') NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'prescription_pending', 'prescription_approved', 'prescription_rejected', 'payment_pending', 'paid', 'completed', 'cancelled') DEFAULT 'pending',
    prescription_validated_by INT,
    prescription_validated_at TIMESTAMP NULL,
    prescription_notes TEXT,
    -- Payment fields
    payment_method ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash') NULL,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_reference VARCHAR(100) NULL,
    paid_at TIMESTAMP NULL,
    -- Delivery fields
    delivery_method ENUM('pickup', 'home_delivery', 'express_delivery') NULL,
    delivery_address TEXT NULL,
    delivery_notes TEXT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    final_total DECIMAL(10, 2) NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (prescription_validated_by) REFERENCES users(id)
);

-- Prescriptions table 
CREATE TABLE prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Order Items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Cart table (giỏ hàng)
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Promotions table (khuyến mãi)
CREATE TABLE promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience ENUM('all', 'customers') DEFAULT 'customers',
    status ENUM('draft', 'sent') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Promotion Recipients table (người nhận khuyến mãi)
CREATE TABLE promotion_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    user_id INT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default branch manager account
INSERT INTO users (email, password, full_name, role) VALUES 
('manager@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Branch Manager', 'branch_manager');

-- Insert 20 customers
INSERT INTO users (email, password, full_name, phone, role) VALUES 
('john.smith@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'John Smith', '0412345001', 'customer'),
('mary.johnson@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Mary Johnson', '0412345002', 'customer'),
('david.brown@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'David Brown', '0412345003', 'customer'),
('sarah.davis@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Sarah Davis', '0412345004', 'customer'),
('michael.wilson@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Michael Wilson', '0412345005', 'customer'),
('lisa.garcia@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Lisa Garcia', '0412345006', 'customer'),
('robert.martinez@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Robert Martinez', '0412345007', 'customer'),
('jennifer.anderson@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Jennifer Anderson', '0412345008', 'customer'),
('william.taylor@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'William Taylor', '0412345009', 'customer'),
('jessica.thomas@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Jessica Thomas', '0412345010', 'customer'),
('james.hernandez@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'James Hernandez', '0412345011', 'customer'),
('amanda.moore@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Amanda Moore', '0412345012', 'customer'),
('christopher.martin@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Christopher Martin', '0412345013', 'customer'),
('ashley.jackson@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Ashley Jackson', '0412345014', 'customer'),
('matthew.thompson@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Matthew Thompson', '0412345015', 'customer'),
('brittany.white@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Brittany White', '0412345016', 'customer'),
('joshua.lopez@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Joshua Lopez', '0412345017', 'customer'),
('megan.lee@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Megan Lee', '0412345018', 'customer'),
('daniel.gonzalez@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Daniel Gonzalez', '0412345019', 'customer'),
('nicole.harris@email.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Nicole Harris', '0412345020', 'customer');

-- Insert 5 pharmacists
INSERT INTO users (email, password, full_name, phone, role) VALUES 
('emily.carter@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Dr. Emily Carter', '0423456001', 'pharmacist'),
('alex.rodriguez@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Dr. Alex Rodriguez', '0423456002', 'pharmacist'),
('sophia.kim@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Dr. Sophia Kim', '0423456003', 'pharmacist'),
('ryan.patel@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Dr. Ryan Patel', '0423456004', 'pharmacist'),
('emma.wright@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Dr. Emma Wright', '0423456005', 'pharmacist');

-- Insert 5 cashiers
INSERT INTO users (email, password, full_name, phone, role) VALUES 
('luke.mitchell@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Luke Mitchell', '0434567001', 'cashier'),
('grace.cooper@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Grace Cooper', '0434567002', 'cashier'),
('owen.bailey@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Owen Bailey', '0434567003', 'cashier'),
('chloe.reed@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Chloe Reed', '0434567004', 'cashier'),
('ethan.kelly@longchau.com', '$2b$10$ztU2Iq4OTnIJa1DpkdDlluQ.n813V0ja1A0wj1bc6eNEUO/heCXGu', 'Ethan Kelly', '0434567005', 'cashier');

-- Insert sample categories (translated to English)
INSERT INTO categories (name, description) VALUES 
('Antibiotics', 'Antibiotic medications for treating infections'),
('Pain Relief', 'Pain relief and fever reduction medications'),
('Vitamins & Supplements', 'Vitamins and nutritional supplements'),
('Cardiovascular', 'Medications for heart and cardiovascular conditions'),
('Digestive', 'Medications for digestive support and treatment');

-- Insert sample products with USD prices and image URLs
INSERT INTO products (name, description, category_id, price, stock_quantity, requires_prescription, image_url) VALUES 
('Amoxicillin 500mg', 'Antibiotic for treating bacterial infections', 1, 2.50, 100, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09352_ae155b3fe6.jpg'),
('Paracetamol 500mg', 'Pain relief and fever reduction medication', 2, 1.25, 200, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_05505_4c243a16f9.jpg'),
('Vitamin C 1000mg', 'Vitamin C supplement for immune support', 3, 3.75, 150, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_04874_6c29236c37.jpg'),
('Aspirin 100mg', 'Low-dose aspirin for blood thinning', 4, 2.00, 80, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_05122_588867ef68.jpg'),
('Omeprazole 20mg', 'Proton pump inhibitor for stomach ulcers', 5, 4.50, 60, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_04996_7d25dc3860.jpg'),

-- Additional products for variety
('Ciprofloxacin 250mg', 'Fluoroquinolone antibiotic for urinary tract infections', 1, 3.25, 75, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_05045_e0f976ccc5.jpg'),
('Azithromycin 500mg', 'Macrolide antibiotic for respiratory infections', 1, 4.75, 90, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_05020_ce6da165fb.jpg'),
('Penicillin V 500mg', 'Beta-lactam antibiotic for strep throat', 1, 2.80, 120, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09431_43751644ff.jpg'),
('Doxycycline 100mg', 'Tetracycline antibiotic for acne and infections', 1, 3.50, 85, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_08597_11fd7bb1fe.jpg'),
('Metronidazole 400mg', 'Antiprotozoal and antibacterial medication', 1, 2.95, 95, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_08507_dda074fe01.png'),

('Ibuprofen 400mg', 'Non-steroidal anti-inflammatory drug', 2, 1.85, 180, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_08913_afa4db8279.jpg'),
('Naproxen 250mg', 'Long-acting NSAID for arthritis pain', 2, 2.45, 110, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09985_6ae3f52230.jpg'),
('Acetaminophen 325mg', 'Mild pain reliever and fever reducer', 2, 0.95, 250, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09544_d2a3970fcb.jpg'),
('Diclofenac 50mg', 'Topical anti-inflammatory for joint pain', 2, 3.15, 140, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09365_33ea32b9d1.jpg'),
('Tramadol 50mg', 'Opioid pain medication for moderate pain', 2, 5.25, 65, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09335_24b9811179.jpg'),

('Vitamin D3 2000 IU', 'Vitamin D supplement for bone health', 3, 4.25, 130, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/1_a2daaedb7c.jpg'),
('Omega-3 Fish Oil', 'Essential fatty acids for heart health', 3, 6.50, 100, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/1_f209eff67b.jpg'),
('Multivitamin Complex', 'Complete daily vitamin and mineral supplement', 3, 5.95, 115, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_00115_72e83dcffe.jpg'),
('Iron 65mg', 'Iron supplement for anemia prevention', 3, 2.75, 160, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00503276_vien_uong_ho_tro_tang_cuong_tuan_hoan_nao_natto_gold_3000fu_royal_care_60v_8247_63ed_large_1d74618cb5.jpg'),
('Calcium Carbonate 500mg', 'Calcium supplement for bone strength', 3, 3.45, 125, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_09493_5c9f6d0911.jpg'),

('Lisinopril 10mg', 'ACE inhibitor for high blood pressure', 4, 3.85, 70, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_05147_afc678a00f.png'),
('Metoprolol 50mg', 'Beta-blocker for heart conditions', 4, 4.15, 85, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_00130_14b87ced2e.jpg'),
('Amlodipine 5mg', 'Calcium channel blocker for hypertension', 4, 3.65, 90, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00502520_vien_xuong_khop_triple_strength_glucosamine_1500mg_pharmekal_60v_4042_6356_large_467c9dcdf8.jpg'),
('Simvastatin 20mg', 'Statin for cholesterol management', 4, 4.95, 75, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00502185_vien_uong_giai_doc_gan_good_health_liver_tonic_17500_60v_3731_6335_large_e0fe9b9ba7.jpg'),
('Warfarin 5mg', 'Anticoagulant for blood clot prevention', 4, 5.75, 55, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00501706_vien_uong_bao_ve_gan_pharma_world_milk_thistle_60v_3202_6302_large_c595132390.jpg'),

('Lansoprazole 15mg', 'Proton pump inhibitor for acid reflux', 5, 4.25, 80, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00501623_soki_deli_18_goi_x_4g_4693_62fb_large_29dea8fcc9.jpg'),
('Ranitidine 150mg', 'H2 receptor antagonist for heartburn', 5, 2.85, 110, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00501604_ong_uong_bo_sung_sat_feginic_4x5_ong_5ml_7086_62f9_large_b9aea30e80.jpg'),
('Loperamide 2mg', 'Anti-diarrheal medication', 5, 1.95, 140, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/DSC_03069_de090fdc3c.jpg'),
('Metoclopramide 10mg', 'Prokinetic agent for nausea and vomiting', 5, 3.35, 95, TRUE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00501112_si_liver_naga_super_vesta_60v_7443_6371_large_5c6c7b2847.jpg'),
('Simethicone 40mg', 'Anti-foaming agent for gas relief', 5, 1.75, 170, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00002926_eumovate_5_7215_6061_large_0c73238152.jpg'),
('Bismuth Subsalicylate', 'Antacid and anti-diarrheal medication', 5, 2.45, 120, FALSE, 'https://cdn.nhathuoclongchau.com.vn/unsafe/320x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00033184_vien_uong_giam_nguy_co_bi_tri_byetree_royal_care_60v_7820_62ae_large_12f9df6d9e.jpg');