# Mailing measurement contract

New deliveries always include our first-party image pixel and the three
first-party click destinations (homepage, landing page, registration), in HTML
and plain text where applicable. `assertInstrumented` checks the rendered payload
before every provider handover. Failure must never send uninstrumented mail.
Manual batches and automatic jobs share this path.

`trackingIncluded` is the immutable technical sending snapshot. Legacy
`lead.tracking` metadata is not the enable switch for new deliveries. Never
fabricate consent evidence or rewrite historical snapshots. Suppression and
unsubscribe continue to stop sending and future personal measurement.

SendGrid's additional click/open rewriting remains disabled intentionally:
first-party links and pixel measure interactions; signed SendGrid webhooks record
delivery, bounce and rejection. A second measurement system would require explicit
event reconciliation and must not instrument unrelated account messages.

Test messages use the same renderer and assertion and are stored separately in
`campaign.trackingTest`, never in campaign recipient counts. Signed test provider
events must match the campaign, reserved test lead ID and test token. Loading
the sent-HTML copy can generate a test image signal; that is not evidence that
a human opened the delivered email. Test unsubscribe must not suppress the real
operator address.

Click, image and page-view endpoints persist before acknowledging the event.
Pixel and redirect responses are non-cacheable. Bots remain separate and
registrations require matching email and network. The 180-day measurement
window starts at delivery, not campaign creation.

Regression coverage lives in `apps/api/src/mailings/mailings.spec.ts` and runs
in the quality workflow. Preserve automatic instrumentation, restart, old-campaign,
historical-snapshot, payload-assertion, opt-out, signed-webhook and separate-test
checks when modifying mail rendering or imports.

Image blocking prevents signals; privacy proxies can generate them without a
human reading. Delivery means receiving-server acceptance, not inbox placement.
Missing historical measurements cannot be reconstructed by changing settings.
