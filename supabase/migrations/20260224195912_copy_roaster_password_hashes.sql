-- Copy existing bcrypt password hashes from partner_roasters into auth.users
-- so roasters can log in with their existing passwords via Supabase Auth.

UPDATE auth.users SET encrypted_password = '$2b$10$DWuth.TkGWvdzIehq3jqeO0SFmwKM70YkLkXKewOQiZFYewk0iiv6' WHERE id = 'e8afc6bf-ce9f-46f9-a680-23088bab66be';
UPDATE auth.users SET encrypted_password = '$2b$10$YsQ9ixCyQ18UOUC/3JL8e.n.p53h5NviAqCmsZwpRew55mBXNAjUS' WHERE id = '1c1507c4-7033-41a4-80fd-91b485a9fc30';
