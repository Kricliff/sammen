GOOGLE PLAY DATA SAFETY FORM — prep answers
Based on what the app actually does in www/index.html as of the 1.0.3 batch.
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

2. App info and performance → none (no crash/analytics SDK in the app)
   - Not collected

3. Device or other identifiers → Firebase anonymous auth UID
   - Collected: Yes (a random anonymous ID, not tied to name/email/phone)
   - Shared with third parties: No (Google/Firebase is the processor, not a third party
     for this disclosure — Firebase acts as the backend, same as Apple's disclosure)
   - Purpose: App functionality (associates a device with its own posts/replies/backup
     so the user can manage or delete them; no cross-app or cross-site tracking)

4. Financial info → purchase history (subscription status)
   - Collected: Yes, via RevenueCat/Google Play Billing
   - Shared with third parties: Yes (RevenueCat, to manage the subscription; standard
     payment-processor disclosure)
   - Purpose: App functionality (unlocking Pro features)

=== DATA NOT COLLECTED ===
- Name, email address, phone number, physical address
- Precise or approximate location
- Photos, videos, audio, contacts, calendar
- Health data (mood/journal/exercise entries are stored ONLY on-device in
  localStorage, never uploaded — do not mark these as "collected")
- Web browsing history
- Advertising ID (no ad SDK is present)

=== SECURITY PRACTICES ===
- Data is encrypted in transit: Yes (HTTPS/Firestore TLS)
- Users can request data deletion: Yes — Community posts/replies can be deleted by
  the user from the app (Report/Block/Hide flow + "⋯ More"), and the anonymous
  Firebase backup can be cleared from Profile → Your data. Add the support email
  (together@cliffordcoaching.no) as the contact for deletion requests Google can't
  self-serve.
- Committed to following the Play Families Policy: N/A (app is not designed for
  children — confirm age rating below)

=== TARGET AUDIENCE / CONTENT RATING NOTES ===
- This mirrors the App Store's 18+ rating, which was set specifically because of
  anonymous user-generated content in Community. Answer the Play Console content
  rating questionnaire (IARC) consistently: user-generated content = yes, unmoderated
  chat = no (it IS moderated: filter + report/hide + 24h review, same as iOS), and
  do not target the "Designed for Families" program.

=== THINGS TO DOUBLE-CHECK BEFORE SUBMITTING ===
- This file was written from reading the code, not from Play Console's live form —
  the exact wording of Google's categories drifts over time, so treat this as a
  first draft to cross-check against the actual form, not a copy-paste final answer.
