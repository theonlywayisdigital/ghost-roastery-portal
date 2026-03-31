-- Migration: create_ghost_roaster_applications

CREATE TABLE IF NOT EXISTS public.ghost_roaster_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid REFERENCES public.partner_roasters(id) NOT NULL,
  business_name text NOT NULL,
  website text,
  years_roasting text,
  monthly_capacity text,
  equipment text,
  has_colour_label_printer boolean DEFAULT false,
  physical_address text,
  video_tour_url text,
  additional_notes text,
  status text DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.ghost_roaster_applications ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
