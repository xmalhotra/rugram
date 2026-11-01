-- Preserve IDs, prices, creator backing and saved references.
UPDATE mobile_catalog
SET data = jsonb_set(jsonb_set(data, '{category}', '"Tech"'::jsonb), '{subcategory}', COALESCE(data->'subcategory', '"Electronics"'::jsonb))
WHERE kind = 'product' AND data->>'category' = 'Electronics';

-- Gear such as bottles is not electronics. Retain records for review, but
-- remove them from publication rather than falsely categorising them as Tech.
UPDATE mobile_catalog SET data = jsonb_set(data, '{status}', '"archived"'::jsonb)
WHERE kind = 'product' AND data->>'category' = 'Gear' AND data->>'status' <> 'archived';
