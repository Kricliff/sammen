---
name: review-notes
description: Generate App Review Notes for an App Store Connect submission of the Together app, or a reply to an Apple rejection. Use when the user asks for "review notes", "notat til Apple", "svar til Apple", or is preparing a resubmission after a rejection.
---

# App Review Notes generator

Produce English text ready to paste into the App Store Connect "Notes" field
(or the Reply field on a rejection). Ask the user which rejection(s)/changes
this submission addresses if it isn't clear from the conversation, then
assemble from the blocks below. Lead with the section for the CURRENT
rejection; include earlier "(fixed)" sections only when context helps.

## Fixed boilerplate (always first)

```
APP REVIEW NOTES — Together: Men's Mental Health

No login or account is required. The app opens directly to full
functionality — you can start using it immediately without any
credentials. Please leave the demo account fields blank / "Sign-in
not required".
```

## Reusable blocks

**UGC / Guideline 1.2** — gate must be accepted on first Community visit;
automated content filter at posting; Report/Block/Hide under "⋯ More";
report-threshold auto-hide; managed under Profile → Safety & community;
in-app contact together@cliffordcoaching.no; 24-hour moderation commitment;
age rating 18+. Test path: Community tab → accept guidelines → "⋯ More" on
any post.

**Subscription / 2.1(b) + 3.1.2(c)** — single product: Together Pro Monthly,
`com.kricliff.together.pro.monthly`, $4.99/month. Paywall shows price,
billing period, auto-renewal terms, Restore Purchases, Privacy Policy and
Terms of Use (EULA) links. Path: Profile tab → "Go Pro" (or any Pro-locked
padlock).

**Contact block (always last)**
```
=== CONTACT ===

If anything fails to load during review, it is most likely a
temporary network issue with the subscription or community service —
please retry, or contact us at together@cliffordcoaching.no and we
will respond promptly.
```

## Rules

- Contact email is **together@cliffordcoaching.no** — never kricliff@gmail.com.
- Reviewers work in English; write the notes in English even though the
  conversation is Norwegian.
- Any claim in the notes must be true in the submitted build AND in App Store
  Connect settings (e.g. do not claim "age rating 18+" unless it is actually
  set in ASC — warn the user to verify).
- Keep each guideline section scannable: short bullets, exact UI paths
  ("Profile → Go Pro"), product IDs and prices spelled out.
- When replying to a rejection, mirror Apple's own checklist item-by-item so
  the reviewer can tick them off.
