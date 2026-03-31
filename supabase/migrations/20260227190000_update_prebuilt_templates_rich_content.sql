-- Update pre-built email templates with rich visual content for the new WYSIWYG editor
-- Uses Unsplash placeholder images and proper multi-section layouts

-- 1. Welcome
UPDATE public.email_templates SET content = '[
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=300&fit=crop","alt":"Welcome coffee banner","align":"center","width":"full","borderRadius":0}},
  {"id":"sp1","type":"spacer","data":{"height":24}},
  {"id":"h1","type":"header","data":{"text":"Welcome to {{business_name}}","level":1,"align":"center"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We are thrilled to have you join our community of coffee lovers. Every cup we roast is crafted with care, from sourcing the finest beans to perfecting the roast.</p>","align":"center"}},
  {"id":"sp2","type":"spacer","data":{"height":8}},
  {"id":"b1","type":"button","data":{"text":"Browse Our Collection","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp3","type":"spacer","data":{"height":16}},
  {"id":"d1","type":"divider","data":{"width":"half","color":"#e2e8f0"}},
  {"id":"sp4","type":"spacer","data":{"height":16}},
  {"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">Not sure where to start? Reply to this email and we will help you find your perfect blend.</p>","align":"center"}},
  {"id":"soc1","type":"social","data":{"instagram":"https://instagram.com","facebook":"https://facebook.com","website":"{{storefront_url}}","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}} — Crafted with care.","align":"center"}}
]'::jsonb
WHERE name = 'Welcome' AND is_prebuilt = true;

-- 2. Product Launch
UPDATE public.email_templates SET content = '[
  {"id":"h1","type":"header","data":{"text":"Something New Is Here","level":1,"align":"center"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We have been working on something special, and it is finally ready to share with you.</p>","align":"center"}},
  {"id":"sp1","type":"spacer","data":{"height":8}},
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=600&h=400&fit=crop","alt":"New coffee product","align":"center","width":"full","borderRadius":12}},
  {"id":"sp2","type":"spacer","data":{"height":16}},
  {"id":"h2","type":"header","data":{"text":"Introducing Our Latest Blend","level":2,"align":"center"}},
  {"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Rich notes of dark chocolate and cherry, with a smooth caramel finish. Single-origin, ethically sourced, and roasted to perfection in small batches.</p>","align":"center"}},
  {"id":"sp3","type":"spacer","data":{"height":8}},
  {"id":"b1","type":"button","data":{"text":"Shop Now","url":"","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp4","type":"spacer","data":{"height":16}},
  {"id":"d1","type":"divider","data":{"width":"half","color":"#e2e8f0"}},
  {"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;font-size:14px;\">Limited batch — only while stocks last.</p>","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Product Launch' AND is_prebuilt = true;

-- 3. Newsletter
UPDATE public.email_templates SET content = '[
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=250&fit=crop","alt":"Newsletter header","align":"center","width":"full","borderRadius":0}},
  {"id":"sp1","type":"spacer","data":{"height":24}},
  {"id":"h1","type":"header","data":{"text":"{{business_name}} Monthly Update","level":1,"align":"center"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">Your monthly dose of coffee news, stories, and what is brewing behind the scenes.</p>","align":"center"}},
  {"id":"d1","type":"divider","data":{"width":"half","color":"#e2e8f0"}},
  {"id":"sp2","type":"spacer","data":{"height":16}},
  {"id":"h2","type":"header","data":{"text":"This Month","level":2,"align":"left"}},
  {"id":"t2","type":"text","data":{"html":"<p>Share your latest updates, stories, and behind-the-scenes news here. What has been happening at the roastery? Any new sourcing trips, team members, or milestones?</p>"}},
  {"id":"sp3","type":"spacer","data":{"height":8}},
  {"id":"d2","type":"divider","data":{"width":"full","color":"#f1f5f9"}},
  {"id":"sp4","type":"spacer","data":{"height":8}},
  {"id":"h3","type":"header","data":{"text":"Featured This Month","level":2,"align":"left"}},
  {"id":"img2","type":"image","data":{"src":"https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=300&fit=crop","alt":"Featured coffee","align":"center","borderRadius":8}},
  {"id":"t3","type":"text","data":{"html":"<p>Highlight any products, events, or special offerings for this month.</p>"}},
  {"id":"sp5","type":"spacer","data":{"height":8}},
  {"id":"b1","type":"button","data":{"text":"Visit Our Store","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp6","type":"spacer","data":{"height":16}},
  {"id":"soc1","type":"social","data":{"instagram":"https://instagram.com","facebook":"https://facebook.com","website":"{{storefront_url}}","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Newsletter' AND is_prebuilt = true;

-- 4. Seasonal Promo
UPDATE public.email_templates SET content = '[
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=300&fit=crop","alt":"Seasonal coffee promo","align":"center","width":"full","borderRadius":0}},
  {"id":"sp1","type":"spacer","data":{"height":24}},
  {"id":"h1","type":"header","data":{"text":"Seasonal Special","level":1,"align":"center"}},
  {"id":"sp2","type":"spacer","data":{"height":8}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;font-size:18px;\">Enjoy <strong>15% off</strong> your next order</p>","align":"center"}},
  {"id":"sp3","type":"spacer","data":{"height":16}},
  {"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;font-size:28px;font-weight:bold;letter-spacing:3px;padding:20px;background:#f8fafc;border-radius:12px;color:#0f172a;\">SEASON15</p>","align":"center"}},
  {"id":"sp4","type":"spacer","data":{"height":16}},
  {"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">Use code at checkout. Offer ends Sunday.</p>","align":"center"}},
  {"id":"sp5","type":"spacer","data":{"height":8}},
  {"id":"b1","type":"button","data":{"text":"Shop Now","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp6","type":"spacer","data":{"height":24}},
  {"id":"d1","type":"divider","data":{"width":"half","color":"#e2e8f0"}},
  {"id":"t4","type":"text","data":{"html":"<p style=\"text-align:center;color:#94a3b8;font-size:13px;\">Cannot be combined with other offers. One use per customer.</p>","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Seasonal Promo' AND is_prebuilt = true;

-- 5. Event Invitation
UPDATE public.email_templates SET content = '[
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&h=300&fit=crop","alt":"Coffee tasting event","align":"center","width":"full","borderRadius":0}},
  {"id":"sp1","type":"spacer","data":{"height":24}},
  {"id":"h1","type":"header","data":{"text":"You are Invited","level":1,"align":"center"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Join us for an exclusive coffee tasting experience.</p>","align":"center"}},
  {"id":"sp2","type":"spacer","data":{"height":16}},
  {"id":"t2","type":"text","data":{"html":"<div style=\"background:#f8fafc;border-radius:12px;padding:24px;text-align:center;\"><p style=\"margin:0 0 8px;\"><strong>Date:</strong> Saturday, March 15th</p><p style=\"margin:0 0 8px;\"><strong>Time:</strong> 10:00 AM – 1:00 PM</p><p style=\"margin:0;\"><strong>Location:</strong> Our Roastery</p></div>","align":"center"}},
  {"id":"sp3","type":"spacer","data":{"height":16}},
  {"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;\">Sample our newest single-origin coffees, meet the team, and learn about our roasting process. Spaces are limited — reserve yours today.</p>","align":"center"}},
  {"id":"sp4","type":"spacer","data":{"height":8}},
  {"id":"b1","type":"button","data":{"text":"RSVP Now","url":"","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp5","type":"spacer","data":{"height":24}},
  {"id":"soc1","type":"social","data":{"instagram":"https://instagram.com","facebook":"https://facebook.com","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Event Invitation' AND is_prebuilt = true;

-- 6. Flash Sale
UPDATE public.email_templates SET content = '[
  {"id":"h1","type":"header","data":{"text":"Flash Sale","level":1,"align":"center","color":"#dc2626"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#dc2626;\">24 Hours Only</p>","align":"center"}},
  {"id":"sp1","type":"spacer","data":{"height":8}},
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=600&h=300&fit=crop","alt":"Flash sale coffee","align":"center","width":"full","borderRadius":12}},
  {"id":"sp2","type":"spacer","data":{"height":16}},
  {"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;font-size:32px;font-weight:bold;color:#0f172a;\">20% Off Everything</p>","align":"center"}},
  {"id":"sp3","type":"spacer","data":{"height":8}},
  {"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">Do not miss out. This deal ends at midnight tonight.</p>","align":"center"}},
  {"id":"sp4","type":"spacer","data":{"height":16}},
  {"id":"b1","type":"button","data":{"text":"Shop the Sale","url":"{{storefront_url}}","align":"center","style":"filled","backgroundColor":"#dc2626","borderRadius":8}},
  {"id":"sp5","type":"spacer","data":{"height":24}},
  {"id":"d1","type":"divider","data":{"width":"half","color":"#e2e8f0"}},
  {"id":"t4","type":"text","data":{"html":"<p style=\"text-align:center;font-size:13px;color:#94a3b8;\">Discount applied automatically at checkout.</p>","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Flash Sale' AND is_prebuilt = true;

-- 7. Thank You
UPDATE public.email_templates SET content = '[
  {"id":"sp1","type":"spacer","data":{"height":16}},
  {"id":"h1","type":"header","data":{"text":"Thank You!","level":1,"align":"center"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Thanks for your recent order. We hope you love every sip.</p>","align":"center"}},
  {"id":"sp2","type":"spacer","data":{"height":8}},
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&h=300&fit=crop","alt":"Thank you coffee","align":"center","borderRadius":12}},
  {"id":"sp3","type":"spacer","data":{"height":16}},
  {"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">If you have a moment, we would really appreciate a review. It helps other coffee lovers discover us and keeps us doing what we love.</p>","align":"center"}},
  {"id":"sp4","type":"spacer","data":{"height":8}},
  {"id":"b1","type":"button","data":{"text":"Leave a Review","url":"","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp5","type":"spacer","data":{"height":24}},
  {"id":"d1","type":"divider","data":{"width":"half","color":"#e2e8f0"}},
  {"id":"sp6","type":"spacer","data":{"height":8}},
  {"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">Got questions or feedback? Just reply to this email — we read every message.</p>","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Thank You' AND is_prebuilt = true;

-- 8. Re-engagement
UPDATE public.email_templates SET content = '[
  {"id":"sp1","type":"spacer","data":{"height":16}},
  {"id":"h1","type":"header","data":{"text":"We Miss You!","level":1,"align":"center"}},
  {"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">It has been a while since your last order. We have been busy roasting some exciting new blends and we think you will love them.</p>","align":"center"}},
  {"id":"sp2","type":"spacer","data":{"height":8}},
  {"id":"img1","type":"image","data":{"src":"https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&h=300&fit=crop","alt":"Coffee comeback","align":"center","borderRadius":12}},
  {"id":"sp3","type":"spacer","data":{"height":16}},
  {"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Here is <strong>10% off</strong> to welcome you back:</p>","align":"center"}},
  {"id":"sp4","type":"spacer","data":{"height":8}},
  {"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;font-size:28px;font-weight:bold;letter-spacing:3px;padding:20px;background:#f8fafc;border-radius:12px;color:#0f172a;\">COMEBACK10</p>","align":"center"}},
  {"id":"sp5","type":"spacer","data":{"height":16}},
  {"id":"b1","type":"button","data":{"text":"Browse New Arrivals","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},
  {"id":"sp6","type":"spacer","data":{"height":24}},
  {"id":"soc1","type":"social","data":{"instagram":"https://instagram.com","facebook":"https://facebook.com","website":"{{storefront_url}}","align":"center"}},
  {"id":"f1","type":"footer","data":{"text":"{{business_name}}","align":"center"}}
]'::jsonb
WHERE name = 'Re-engagement' AND is_prebuilt = true;
