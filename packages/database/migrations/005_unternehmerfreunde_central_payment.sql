-- One-time operator-authorized change for the existing Unternehmerfreunde NRW
-- network. Preserve prices, memberships, orders and every other network.
DO $$
DECLARE
  matches integer;
BEGIN
  SELECT count(*) INTO matches
  FROM portal_state s,
       jsonb_array_elements(s.payload->'networks') AS entry
  WHERE s.id = 'primary'
    AND entry->1->>'slug' = 'unternehmerfreunde';

  IF matches <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Unternehmerfreunde NRW e.V. network; found %', matches;
  END IF;

  UPDATE portal_state s
  SET payload = jsonb_set(s.payload, '{networks}', (
    SELECT jsonb_agg(
      CASE WHEN entry->1->>'slug' = 'unternehmerfreunde'
      THEN jsonb_set(entry, '{1,settings}',
        coalesce(entry->1->'settings', '{}'::jsonb)
        || jsonb_build_object('memberPaymentModel', 'network'))
      ELSE entry END ORDER BY ordinal
    )
    FROM jsonb_array_elements(s.payload->'networks') WITH ORDINALITY AS items(entry, ordinal)
  )),
  revision = s.revision + 1,
  updated_at = now()
  WHERE s.id = 'primary';
END $$;
