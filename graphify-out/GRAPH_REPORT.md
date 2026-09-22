# Graph Report - sammen  (2026-09-22)

## Corpus Check
- 148 files · ~140,673 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 37 file(s) not represented in the graph (top: .xml 10, (none) 9, .plist 3)

## Summary
- 321 nodes · 364 edges · 42 communities (19 shown, 23 thin omitted)
- Extraction: 88% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.87)
- Token cost: 261,454 input · 0 output

## Community Hubs (Navigation)
- graphify Skill Reference Docs
- package.json Dependencies
- iOS Capacitor + Firebase Bridge
- Repo Setup and Environment Traps
- CI-fix Skill: Apple Rejections & Build Errors
- App Store Listing & Screenshots
- Firebase/RevenueCat Backend & Data Safety
- iOS AppDelegate Lifecycle
- Android FirebaseAnalyticsPlugin
- Community Reply Threads & Moderation
- Codemagic CI Workflows
- Android Test Boilerplate
- Sammen Visual Identity & Brand
- serve.js Static Server
- Coach Contact & Support
- Android MainActivity
- Local Notifications Scheduling
- gradlew Script
- Snu Tanken / Trygt Sted Scripts
- Fysisk Aktivering Script Pair
- Jording Script Pair
- iOS CocoaPods vs SPM
- Package.swift
- sw.js Service Worker
- sw.js Service Worker (duplicate)
- graphify Usage Rules
- blockUser / confirmBlock
- CRISIS_PATTERNS regex
- FREE_EXERCISE_IDS
- hidePost function

## God Nodes (most connected - your core abstractions)
1. `graphify Skill` - 12 edges
2. `CI-fix Skill` - 11 edges
3. `AppDelegate` - 10 edges
4. `FirebaseAnalyticsPlugin` - 9 edges
5. `FirebaseAnalyticsPlugin` - 9 edges
6. `ICloudSyncPlugin` - 9 edges
7. `Privacy Policy page` - 9 edges
8. `UGC moderation (Apple guideline 1.2)` - 7 edges
9. `Community reply threads feature` - 7 edges
10. `state / loadState / save (localStorage app state)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `App Store description text (1.0.2, English)` --semantically_similar_to--> `Google Play Store listing (English)`  [INFERRED] [semantically similar]
  appstore-description-1.0.2.txt → playstore-listing-en.txt
- `Health data (mood/journal/exercise) stored only on-device, never uploaded` --semantically_similar_to--> `Privacy Policy page`  [INFERRED] [semantically similar]
  playstore-data-safety.md → privacy.html
- `App Store screenshot generator (Norwegian)` --semantically_similar_to--> `App Store screenshot generator (English, html2canvas)`  [INFERRED] [semantically similar]
  appstore-screenshots-no.html → appstore-screenshots.html
- `Sammen PWA prototype (README)` --semantically_similar_to--> `Together: Men's Mental Health (project)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Community reply threads feature` --conceptually_related_to--> `1.0.3 reply-thread moderation (filter + Report/Block/Hide)`  [INFERRED]
  CLAUDE.md → review-notes-1.0.3.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Together App CI/Release Workflow** — _claude_skills_ci_fix_skill, _claude_skills_review_notes_skill, _claude_skills_ship_skill [INFERRED 0.85]
- **graphify Self-improving Query Feedback Loop** — _claude_skills_graphify_references_query_save_result, _claude_skills_graphify_references_query_reflect_lessons, _claude_skills_graphify_references_hooks_post_commit [INFERRED 0.80]
- **Sammen Guided Audio Exercise Program (5 Scripts)** — assets_scripts_01_aktivering, assets_scripts_02_jording, assets_scripts_03_pust, assets_scripts_04_snu_tanken, assets_scripts_05_trygt_sted [EXTRACTED 1.00]
- **Community UGC moderation flow (guidelines gate, filter, report/hide, threshold)** — www_index_html_communityguidelinesgate, www_index_html_objectionable_patterns, www_index_html_reportpost, www_index_html_hidepost, www_index_html_report_hide_threshold, www_index_html_blockuser [EXTRACTED 0.90]
- **Community reply-thread flow (submit, report, notify)** — www_index_html_renderreplythread, www_index_html_submitreply, www_index_html_reportreply, www_index_html_submitreplyreport, www_index_html_checknewreplies, www_index_html_hiddenreplies_state, www_index_html_seenreplycounts_state [EXTRACTED 0.90]
- **Store listing text variants (App Store / Play Store, EN/NO)** — appstore_description_1_0_2_en, appstore_listing_no_1_0_3, playstore_listing_en, playstore_listing_no [INFERRED 0.85]

## Communities (42 total, 23 thin omitted)

### Community 0 - "graphify Skill Reference Docs"
Cohesion: 0.06
Nodes (35): graphify CLAUDE.md Pointer, graphify add / --watch Reference, ingest() Function, graphify.watch Background Watcher, graphify Exports Reference, Token Reduction Benchmark, FalkorDB Export, graphify MCP stdio Server (+27 more)

### Community 1 - "package.json Dependencies"
Cohesion: 0.06
Nodes (31): author, bugs, url, dependencies, @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/haptics (+23 more)

### Community 2 - "iOS Capacitor + Firebase Bridge"
Cohesion: 0.10
Nodes (14): Capacitor, CAPBridgedPlugin, CAPPlugin, FirebaseAnalytics, FirebaseCore, Foundation, FirebaseAnalyticsPlugin, CAPPluginCall (+6 more)

### Community 3 - "Repo Setup and Environment Traps"
Cohesion: 0.10
Nodes (22): Active local repo: Projects\sammen, Kristian Clifford (coach and mental trainer), preview_start folder-resolution trap, Stale local clone: OneDrive App folder, Together: Men's Mental Health (project), en.html GitHub Pages demo app (always Pro), IS_PRO = true (demo always Pro), IS_PRO = false (prototype free-tier demo) (+14 more)

### Community 4 - "CI-fix Skill: Apple Rejections & Build Errors"
Cohesion: 0.12
Nodes (20): CI-fix Skill, Apple Rejection 1.2 UGC, Apple Rejection 2.1(b), Apple Rejection 3.1.2(c), App Store Connect API Key Misconfiguration, cap sync ios Podfile Bug, codemagic.yaml Validation, git push Rejected (fetch first) (+12 more)

### Community 5 - "App Store Listing & Screenshots"
Cohesion: 0.14
Nodes (19): App Store description text (1.0.2, English), Norwegian App Store listing draft (name, subtitle, keywords, description, what's new), App Information fields locked until new ASC version created, App Store screenshot generator (English, html2canvas), App Store screenshot generator (Norwegian), App Store rejection history (2.1(b), 3.1.2(c), 1.2 UGC), App Store Connect pre-release train closes once Ready for Distribution, UGC moderation (Apple guideline 1.2) (+11 more)

### Community 6 - "Firebase/RevenueCat Backend & Data Safety"
Cohesion: 0.14
Nodes (19): Android setup status (pending Google Play verification), Anonymous auth UID does not survive iOS reinstall, Firebase Firestore + Anonymous Auth (Community + cloud backup), RevenueCat subscription integration, 18+ rating mirrored from App Store due to anonymous UGC, Data type: Community posts/replies (app activity), Data type: purchase history / subscription status via RevenueCat, Data type: Firebase anonymous auth UID (device identifier) (+11 more)

### Community 7 - "iOS AppDelegate Lifecycle"
Cohesion: 0.15
Nodes (11): Any, Bool, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIResponder, UIUserActivityRestoring (+3 more)

### Community 8 - "Android FirebaseAnalyticsPlugin"
Cohesion: 0.24
Nodes (9): FirebaseAnalyticsPlugin, Override, com.getcapacitor.annotation.CapacitorPlugin, com.getcapacitor.Plugin, com.getcapacitor.PluginCall, com.getcapacitor.PluginMethod, com.google.firebase.analytics.FirebaseAnalytics, iterator (+1 more)

### Community 9 - "Community Reply Threads & Moderation"
Cohesion: 0.19
Nodes (14): Firestore hasOnly() update-field allowlist, Community reply threads feature, checkNewReplies function, state.hiddenReplies list, OBJECTIONABLE_PATTERNS regex filter, renderReplyThread function, REPORT_HIDE_THRESHOLD constant, reportPost function (+6 more)

### Community 10 - "Codemagic CI Workflows"
Cohesion: 0.17
Nodes (13): Codemagic android-workflow, Use npx cap copy ios, never cap sync ios, Always git pull --rebase --autostash before push, Codemagic ios-workflow, Podfile post_install forces IPHONEOS_DEPLOYMENT_TARGET 15.0, xcode: latest required for iOS 26 SDK upload, codemagic.yaml android-workflow definition, Capacitor copy build step (npx cap copy ios) (+5 more)

### Community 11 - "Android Test Boilerplate"
Cohesion: 0.24
Nodes (8): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, assert, context, instrumentationregistry, org.junit.runner.RunWith, org.junit.Test

### Community 12 - "Sammen Visual Identity & Brand"
Cohesion: 0.25
Nodes (9): Sammen Visual Identity v1, Sammen Color Palette, 2+ Heavy Weeks Suggestion Tone Rule, Møtet Symbol (Two Overlapping Circles), Soft Suggestion Tone Rules, Outfit + System Font Typography, Pusteøvelse Audio Script, Sammen Visual Identity v1 (www copy) (+1 more)

### Community 13 - "serve.js Static Server"
Cohesion: 0.25
Nodes (7): ref_fs, ref_http, ref_path, fs, http, MIME, path

### Community 14 - "Coach Contact & Support"
Cohesion: 0.33
Nodes (7): Coach contact form (Norwegian-only), Support page, communityGuidelinesGate / acceptGuidelines functions, detectCrisisInfo / openSOS functions, L() language getter function, showCoachContactModal / submitCoachContact functions, SUPPORT_EMAIL constant

### Community 15 - "Android MainActivity"
Cohesion: 0.47
Nodes (4): Override, MainActivity, android.os.Bundle, com.getcapacitor.BridgeActivity

### Community 16 - "Local Notifications Scheduling"
Cohesion: 0.60
Nodes (6): LN.getPending() vs nonexistent getPendingNotifications() bug, Local notifications scheduling (daily + weekly reflection), daily-reminder Android notification channel, LN.getPending() local-notifications call, toggleNotif function (daily reminder scheduling), toggleWeeklyReflectionNotif function

### Community 17 - "gradlew Script"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 18 - "Snu Tanken / Trygt Sted Scripts"
Cohesion: 0.50
Nodes (4): Snu Tanken Audio Script, Trygt Sted Audio Script, Snu Tanken Audio Script (www copy), Trygt Sted Audio Script (www copy)

## Ambiguous Edges - Review These
- `Use npx cap copy ios, never cap sync ios` → `Capacitor sync build step (npx cap sync android)`  [AMBIGUOUS]
  codemagic.yaml · relation: conceptually_related_to

## Knowledge Gaps
- **89 isolated node(s):** `FirebaseAnalytics`, `UIKit`, `FirebaseCore`, `PackageDescription`, `name` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 147 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Use npx cap copy ios, never cap sync ios` and `Capacitor sync build step (npx cap sync android)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Android setup status (pending Google Play verification)` connect `Firebase/RevenueCat Backend & Data Safety` to `Codemagic CI Workflows`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `UGC moderation (Apple guideline 1.2)` connect `App Store Listing & Screenshots` to `Community Reply Threads & Moderation`, `Coach Contact & Support`, `Firebase/RevenueCat Backend & Data Safety`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `together_keystore signing integration` connect `Codemagic CI Workflows` to `Firebase/RevenueCat Backend & Data Safety`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `FirebaseAnalytics`, `UIKit`, `FirebaseCore` to the rest of the system?**
  _89 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `graphify Skill Reference Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.06218487394957983 - nodes in this community are weakly interconnected._
- **Should `package.json Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._