-- Test Users
INSERT INTO users (id, phone, name, user_type, township, is_verified, verification_level) VALUES
(uuid_generate_v4(), '27712345678', 'John Gardener', 'worker', 'Soweto', true, 2),
(uuid_generate_v4(), '27787654321', 'Sarah Client', 'client', 'Soweto', true, 1),
(uuid_generate_v4(), '27711111111', 'Mike Builder', 'worker', 'Alexandra', true, 3);

-- Test Worker Profiles
INSERT INTO worker_profiles (user_id, primary_skill, skills, experience_years, hourly_rate_min, hourly_rate_max) VALUES
((SELECT id FROM users WHERE phone='27712345678'), 'Gardening', ARRAY['Gardening', 'Lawn Care'], 5, 150, 300),
((SELECT id FROM users WHERE phone='27711111111'), 'Building', ARRAY['Building', 'Painting'], 8, 250, 500);

-- Test Jobs
INSERT INTO jobs (job_code, client_id, title, description, category, township, budget_min, budget_max, status) VALUES
('KC240101-0001', (SELECT id FROM users WHERE phone='27787654321'), 'Garden Cleaning', 'Need garden cleaned and grass cut', 'Gardening', 'Soweto', 300, 500, 'posted'),
('KC240101-0002', (SELECT id FROM users WHERE phone='27787654321'), 'Room Painting', 'Paint small bedroom', 'Painting', 'Soweto', 800, 1200, 'posted');

-- Partner Shops
INSERT INTO partner_shops (shop_name, owner_name, shop_phone, address, township, is_active) VALUES
('Mama Nandi Spaza', 'Nandi M.', '27722222222', '123 Orlando West', 'Soweto', true),
('Bheki Hardware', 'Bheki K.', '27733333333', '456 Diepkloof', 'Soweto', true);