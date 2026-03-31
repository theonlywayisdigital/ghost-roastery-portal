-- Grant admin role to primary user account
INSERT INTO user_roles (user_id, role_id)
VALUES ('1410d6fd-a9b7-4bcc-89a9-09387192bf50', 'admin')
ON CONFLICT DO NOTHING;
