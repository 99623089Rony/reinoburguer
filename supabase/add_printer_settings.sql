-- Add printer_settings column to store_config table if it doesn't exist
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS printer_settings JSONB DEFAULT '{"type": "usb", "autoPrint": false, "paperSize": "58mm", "copies": 1}'::jsonb;

-- Update RLS policies (optional, but good practice to ensure update is allowed)
-- Assuming existing policies allow update, but just in case specific columns were restricted (unlikely in default setup)
