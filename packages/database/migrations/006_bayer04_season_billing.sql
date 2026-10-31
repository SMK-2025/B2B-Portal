-- Operator-authorized initial policy. Never alter existing accepted orders.
DO $$
DECLARE state jsonb; encoded boolean;
BEGIN
 SELECT payload,jsonb_typeof(payload)='string' INTO state,encoded FROM portal_state WHERE id='primary' FOR UPDATE;
 IF state IS NULL THEN RETURN; END IF;
 IF encoded THEN state := (state #>> '{}')::jsonb; END IF;
 state := jsonb_set(state,'{networks}',(
   SELECT coalesce(jsonb_agg(CASE WHEN entry->1->>'slug'='bayer04leverkusen'
    THEN jsonb_set(entry,'{1,settings}',coalesce(entry->1->'settings','{}'::jsonb) || jsonb_build_object('memberBilling',jsonb_build_object(
      'months',5,'freeUntil','2027-01-31','paidFrom','2027-02-01','paidThrough','2027-06-30',
      'autoRenew',true,'renewalMonths',12,'automaticInvoices',true,'version','b04-season-2026-2027-v1'
    ))) ELSE entry END ORDER BY ordinal),'[]'::jsonb)
   FROM jsonb_array_elements(state->'networks') WITH ORDINALITY AS rows(entry,ordinal)
 ));
 UPDATE portal_state SET payload=CASE WHEN encoded THEN to_jsonb(state::text) ELSE state END,revision=revision+1,updated_at=now() WHERE id='primary';
END $$;
