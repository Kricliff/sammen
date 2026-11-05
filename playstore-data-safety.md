GOOGLE PLAY DATA SAFETY FORM: prep answers
Based on what the app actually does in www/index.html as of 1.0.7 (November 2026).
Fill this in under Play Console → App content → Data safety when the app exists there.

=== DOES YOUR APP COLLECT OR SHARE ANY OF THE REQUIRED USER DATA TYPES? ===
Yes.

=== DATA TYPES COLLECTED ===

1. App activity → Community posts and replies
   - Collected: Yes (anonymous post/reply text, submitted voluntarily by the user)
   - Shared with third parties: No
   - Processed ephemerally: No (stored in Firestore)
   - Required or optional: Optional (only if the user chooses to post)
   - Purpose: App functionality (Community feature)

2. App activity → App interactions (Firebase Analytics)
   - Collected: Yes (screen views and events such as programme started/completed,
     not linked to a name, email or advertising ID)
   - Shared with third parties: No (Google is the processor)
   - Required or optional: Required (no in-app opt-out today)
   - Purpose: Analytics

3. Health and fitness → Health info (cloud backup)
   - Collected: Yes. The automatic cloud backup uploads the app state to Firestore
     (backups/{uid}): mood check-ins and notes, sleep/energy logs, journal entries,
     reflections and weekly reviews. Linked only to the anonymous Firebase UID.
   - Shared with third parties: No (Google/Firebase is the processor)
   - Required or optional: Optional (on by default; Profile → Your data →
     Automatic cloud backup turns it off and deletes the copy)
   - Purpose: App functionality (backup so the user doesn't lose data)

4. Device or other identifiers → Firebase anonymous auth UID
   - Collected: Yes (a random anonymous ID, not tied to name/email/phone)
   - Shared with third parties: No (Google/Firebase is the processor, not a third party
     for this disclosure: Firebase acts as the backend, same as Apple's disclosure)
   - Purpose: App functionality (associates a device with its own posts/replies/backup
     so the user can manage or delete them; no cross-app or cross-site tracking)

5. Financial info → none. The app is free with no purchases; RevenueCat is not
   initialised (initRevenueCat() is never called), so nothing is collected.

6. Translation (MyMemory): only the text of a Community post the user chooses to
   translate is sent. That post text is already covered by item 1, so Google's
   form usually does not need a separate entry, but mention it if asked about
   sharing: the text is shared with MyMemory when the user taps Translate.

=== DATA NOT COLLECTED ===
- Name, email address, phone number, physical address
- Precise or approximate location
- Photos, videos, audio, contacts, calendar
- Web browsing history
- Advertising ID (no ad SDK is present)

=== SECURITY PRACTICES ===
- Data is encrypted in transit: Yes (HTTPS/Firestore TLS)
- Users can request data deletion: Yes: Community posts/replies can be deleted by
  the user from the app ("⋯ More" → Delete on their own posts), and the anonymous
  Firebase backup is deleted by turning off Profile → Your data → Automatic
  cloud backup. Add the support email
  (together@cliffordcoaching.no) as the contact for deletion requests Google can't
  self-serve.
- Committed to following the Play Families Policy: N/A (app is not designed for
  children: confirm age rating below)

=== TARGET AUDIENCE / CONTENT RATING NOTES ===
- This mirrors the App Store's 18+ rating, which was set specifically because of
  anonymous user-generated content in Community. Answer the Play Console content
  rating questionnaire (IARC) consistently: user-generated content = yes, unmoderated
  chat = no (it IS moderated: filter + report/hide + 24h review, same as iOS), and
  do not target the "Designed for Families" program.

=== THINGS TO DOUBLE-CHECK BEFORE SUBMITTING ===
- This file was written from reading the code, not from Play Console's live form -
  the exact wording of Google's categories drifts over time, so treat this as a
  first draft to cross-check against the actual form, not a copy-paste final answer.
