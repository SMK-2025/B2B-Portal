# Storage and PagePilot release — 2026-11-05

## Storage deployment / recovery

- Migration 008 introduces individual records in `portal_records` and private,
  content-addressed uploads in `portal_media`. No public media URL is introduced.
- On startup an existing version-1 checkpoint is restored and converted in one
  transaction, guarded by the checkpoint revision. Failed conversion rolls back.
- Version-2 `portal_state` contains counts and small billing/promotion headers,
  not complete profiles or images. The promotion reservation transaction retains
  its existing payment-policy checks against those headers.
- Upload checksums and record counts are checked on restore. Missing/corrupted
  uploads fail closed; they are not silently discarded. Shared uploads are
  deleted only when no remaining record references them.
- Take a fresh Railway volume backup before first production conversion.
  **Do not downgrade to a version-1-only application after conversion.** Recovery
  requires restoring the matching volume backup with writes stopped, or a
  forward fix supporting storage version 2. Avoid multiple writable replicas.
- This is not an external object store and not fully stateless horizontal
  scaling: the application still loads operational data into memory and checks
  record fingerprints. Further growth needs bounded repositories/media serving
  and measured production resource sizing, not a promise of unlimited members.

## Verification

- Isolated PostgreSQL/PGlite integration: legacy migration, restart round trip,
  scalar maps, image deduplication, tenant-independent changes, stale-write
  rejection and deletion of unreferenced uploads.
- Synthetic load: 1,000 profiles with unique 8 KiB images plus 100 concurrent
  registrations, no real mail delivery. Approx. 1.5 s for the registration batch
  on the development machine; checkpoint 667 bytes; 1,000 private assets restored.
  This does **not** establish production HTTP throughput or a maximum member count.
- Directory pages cap results at 24; the member UI uses 12 and dashboard 6.
  Hero images, long sections and documents load on a scoped detail request.

## PagePilot AI

- Existing Responses API integration stays server-side (`store:false`). Public
  same-company homepage/subpage research is combined with bounded direct reads.
- Direct readers accept public HTTPS only, validate all resolved addresses and
  every redirect, pin DNS answers to sockets, limit size/time, send no cookies,
  and never execute JavaScript. Logo/hero references come from actual HTML, not
  model-generated asset URLs. Unsafe SVGs are rejected; accepted images are
  rasterized/resized to bounded WebP uploads with Sharp.
- Two simultaneous preparations per process and one attempt per user/minute.
- Fixed navigation: Vorstellung, Leistungen, Persönlich, Angebote, Gesuche,
  Kontakt. Additional content is categorized inside those rubrics.
- Drafts include available texts, logo, hero, observed brand colors and sources.
  Existing fields/images are preserved unless replacement is requested.
- Unavailable facts/images remain missing and visible for review. A 100% factual
  extraction guarantee for arbitrary blocked/incomplete websites is not possible.
  No unsupported uniqueness claim is made. No automatic publication or emails.
- Users can open the editable preview, save the whole page, or explicitly publish.
  Commissioned profiles cannot bypass their separate handover/publication rules.
