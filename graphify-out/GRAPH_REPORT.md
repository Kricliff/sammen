# Graph Report - sammen  (2026-10-23)

## Corpus Check
- 64 files · ~143,520 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 268 nodes · 246 edges · 59 communities (39 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2778f26`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- dependencies
- FirebaseAnalyticsPlugin
- AppDelegate
- What You Must Do When Invoked
- ExampleInstrumentedTest.java
- FirebaseAnalyticsPlugin.swift
- serve.js
- ExampleUnitTest.java
- gradlew
- MainActivity.java
- Package.swift
- sw.js
- www/sw.js
- Together: Men's Mental Health — Claude Code Context
- FirebaseAnalyticsPlugin
- /graphify
- graphify reference: extra exports and benchmark
- Sammen — visuell identitet (v1)
- Sammen — visuell identitet (v1)
- graphify reference: query, path, explain
- CI-fix: known-error catalog for Together iOS builds
- App Review Notes generator
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Ship: safe publish to origin/main
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Sammen — mental trening for menn
- assets/scripts/01-aktivering.md
- assets/scripts/02-jording.md
- assets/scripts/03-pust.md
- assets/scripts/04-snu-tanken.md
- assets/scripts/05-trygt-sted.md
- .claude/CLAUDE.md
- extraction-spec.md
- CapApp-SPM/README.md
- www/assets/scripts/01-aktivering.md
- www/assets/scripts/02-jording.md
- www/assets/scripts/03-pust.md
- www/assets/scripts/04-snu-tanken.md
- www/assets/scripts/05-trygt-sted.md

## God Nodes (most connected - your core abstractions)
1. `Together: Men's Mental Health — Claude Code Context` - 13 edges
2. `What You Must Do When Invoked` - 12 edges
3. `AppDelegate` - 10 edges
4. `/graphify` - 10 edges
5. `FirebaseAnalyticsPlugin` - 9 edges
6. `ICloudSyncPlugin` - 9 edges
7. `FirebaseAnalyticsPlugin` - 8 edges
8. `graphify reference: extra exports and benchmark` - 8 edges
9. `Sammen — visuell identitet (v1)` - 7 edges
10. `Sammen — visuell identitet (v1)` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (59 total, 20 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.12
Nodes (16): author, bugs, url, description, homepage, keywords, license, main (+8 more)

### Community 1 - "dependencies"
Cohesion: 0.13
Nodes (15): @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/local-notifications, dependencies, @capacitor/android (+7 more)

### Community 2 - "FirebaseAnalyticsPlugin"
Cohesion: 0.15
Nodes (9): CAPBridgedPlugin, CAPPlugin, FirebaseAnalyticsPlugin, CAPPluginCall, CAPPluginMethod, ICloudSyncPlugin, CAPPluginCall, CAPPluginMethod (+1 more)

### Community 3 - "AppDelegate"
Cohesion: 0.15
Nodes (11): Any, Bool, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIResponder, UIUserActivityRestoring (+3 more)

### Community 4 - "What You Must Do When Invoked"
Cohesion: 0.13
Nodes (15): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships (+7 more)

### Community 5 - "ExampleInstrumentedTest.java"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 6 - "FirebaseAnalyticsPlugin.swift"
Cohesion: 0.29
Nodes (5): Capacitor, FirebaseAnalytics, FirebaseCore, Foundation, UIKit

### Community 7 - "serve.js"
Cohesion: 0.40
Nodes (4): fs, http, MIME, path

### Community 9 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 10 - "MainActivity.java"
Cohesion: 0.47
Nodes (4): Override, MainActivity, BridgeActivity, Bundle

### Community 26 - "Together: Men's Mental Health — Claude Code Context"
Cohesion: 0.14
Nodes (13): Android (under oppsett), App-arkitektur, App Store, Build-lærdommer (dyrekjøpte — ikke gjenta feilene), Codemagic, Filstruktur, graphify, ⚠️ KRITISK: To lokale kopier av dette repoet (+5 more)

### Community 27 - "FirebaseAnalyticsPlugin"
Cohesion: 0.32
Nodes (6): FirebaseAnalyticsPlugin, Override, CapacitorPlugin, Plugin, PluginCall, PluginMethod

### Community 28 - "/graphify"
Cohesion: 0.20
Nodes (9): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Usage (+1 more)

### Community 29 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 30 - "Sammen — visuell identitet (v1)"
Cohesion: 0.25
Nodes (7): Farger, Logofiler, Sammen — visuell identitet (v1), Symbol: «Møtet», Tone, Tonestemme i de myke forslagene (Hjem), Typografi

### Community 31 - "Sammen — visuell identitet (v1)"
Cohesion: 0.25
Nodes (7): Farger, Logofiler, Sammen — visuell identitet (v1), Symbol: «Møtet», Tone, Tonestemme i de myke forslagene (Hjem), Typografi

### Community 32 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 33 - "CI-fix: known-error catalog for Together iOS builds"
Cohesion: 0.40
Nodes (4): After fixing, CI-fix: known-error catalog for Together iOS builds, Error catalog, Project constants (for checking configs)

### Community 34 - "App Review Notes generator"
Cohesion: 0.40
Nodes (4): App Review Notes generator, Fixed boilerplate (always first), Reusable blocks, Rules

### Community 35 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 36 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 37 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 38 - "Ship: safe publish to origin/main"
Cohesion: 0.50
Nodes (3): Failure handling, Ship: safe publish to origin/main, Steps

## Knowledge Gaps
- **116 isolated node(s):** `FirebaseAnalytics`, `UIKit`, `FirebaseCore`, `PackageDescription`, `name` (+111 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppDelegate` connect `AppDelegate` to `FirebaseAnalyticsPlugin.swift`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `ICloudSyncPlugin` connect `FirebaseAnalyticsPlugin` to `FirebaseAnalyticsPlugin.swift`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `FirebaseAnalytics`, `UIKit`, `FirebaseCore` to the rest of the system?**
  _116 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Together: Men's Mental Health — Claude Code Context` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._