-- One-time operator-authorized change for the existing Unternehmerfreunde NRW
-- network. Preserve prices, memberships, orders and every other network.
DO $$
DECLARE
  matches integer;
  state jsonb;
  encoded boolean;
BEGIN
  SELECT payload, jsonb_typeof(payload) = 'string' INTO state, encoded
  FROM portal_state WHERE id = 'primary' FOR UPDATE;
  IF encoded THEN state := (state #>> '{}')::jsonb; END IF;
  SELECT count(*) INTO matches
  FROM jsonb_array_elements(state->'networks') AS entry
  WHERE entry->1->>'slug' = 'unternehmerfreunde';

  IF matches <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Unternehmerfreunde NRW e.V. network; found %', matches;
  END IF;

  state := jsonb_set(state, '{networks}', (
    SELECT jsonb_agg(
      CASE WHEN entry->1->>'slug' = 'unternehmerfreunde'
      THEN jsonb_set(entry, '{1,settings}',
        coalesce(entry->1->'settings', '{}'::jsonb)
        || jsonb_build_object('memberPaymentModel', 'network'))
      ELSE entry END ORDER BY ordinal
    )
    FROM jsonb_array_elements(state->'networks') WITH ORDINALITY AS items(entry, ordinal)
  ));
  UPDATE portal_state s
  SET payload = CASE WHEN encoded THEN to_jsonb(state::text) ELSE state END,
  revision = s.revision + 1,
  updated_at = now()
  WHERE s.id = 'primary';
END $$;
