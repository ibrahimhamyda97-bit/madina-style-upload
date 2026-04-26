
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'courier';

DO $$ BEGIN
  CREATE TYPE public.delivery_status AS ENUM (
    'unassigned', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
