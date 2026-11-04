# Network interface copy editor

The platform administrator opens a network using Betreiberzugang and selects
**Texte bearbeiten** in the bottom toolbar. Pencils edit rendered interface copy;
the dialog previews the change and offers Save, Cancel and Restore original.
The same toolbar links to the branded login/registration page.

## Storage and isolation

Overrides are plain text in `NetworkRecord.settings.textOverrides`, persisted by
the existing awaited PortalStore persistence interceptor. They do not rewrite
source files at runtime. They survive deployments and restarts. Stable `ui.*`
keys bind text to its UI role, not to user email or DOM order. An override belongs
to exactly one network ID. Reset removes it and restores the source default.

Only authenticated `platform_admin` accounts may read the editor state or write
overrides. A network administrator, moderator, member or visitor cannot write.
Public active-network copy contains no account information. Optimistic revisions
reject lost updates. Each write is audited without recording text content in the
activity log. No notifications or emails are sent by this feature.

## Boundaries

Network shell, navigation, page headings/intros, dashboard, branded access,
profile setup, chat, news, events, recaps and administration expose interface
copy through `NetworkText`. User-authored profiles/posts/messages and actual
dates, results, prices, invoices, accepted legal documents and user identities
are not reinterpreted as editable interface copy. Their existing editors remain
authoritative. HTML is not supported. Editing text does not change routes or
permissions. Input values, placeholders, runtime error messages, email templates
and native select options are not currently inline-editable.

New UI should use `<NetworkText id="ui.stable.semantic.key">Default</NetworkText>`.
Do not wrap whole mixed-content blocks, records or legal/payment facts.
The migration helper only instruments approved component files and literal JSX.
