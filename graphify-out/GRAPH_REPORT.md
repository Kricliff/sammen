# Graph Report - .  (2026-07-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 107 nodes · 99 edges · 26 communities (21 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dfdd361c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- dependencies
- ICloudSyncPlugin
- AppDelegate
- .application
- ExampleInstrumentedTest.java
- AppDelegate.swift
- serve.js
- ExampleUnitTest.java
- gradlew
- MainActivity.java
- Package.swift
- sw.js
- www/sw.js

## God Nodes (most connected - your core abstractions)
1. `AppDelegate` - 10 edges
2. `ICloudSyncPlugin` - 9 edges
3. `ExampleInstrumentedTest` - 3 edges
4. `repository` - 3 edges
5. `MainActivity` - 2 edges
6. `ExampleUnitTest` - 2 edges
7. `Capacitor` - 2 edges
8. `scripts` - 2 edges
9. `bugs` - 2 edges
10. `@capacitor/android` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (26 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.12
Nodes (16): author, bugs, url, description, homepage, keywords, license, main (+8 more)

### Community 1 - "dependencies"
Cohesion: 0.13
Nodes (15): @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/local-notifications, dependencies, @capacitor/android (+7 more)

### Community 2 - "ICloudSyncPlugin"
Cohesion: 0.24
Nodes (6): CAPBridgedPlugin, CAPPlugin, CAPPluginCall, CAPPluginMethod, ICloudSyncPlugin, Notification

### Community 3 - "AppDelegate"
Cohesion: 0.29
Nodes (5): AppDelegate, UIApplication, UIApplicationDelegate, UIResponder, UIWindow

### Community 4 - ".application"
Cohesion: 0.29
Nodes (6): Any, Bool, NSUserActivity, UIUserActivityRestoring, URL, Void

### Community 5 - "ExampleInstrumentedTest.java"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 6 - "AppDelegate.swift"
Cohesion: 0.40
Nodes (3): Capacitor, Foundation, UIKit

### Community 7 - "serve.js"
Cohesion: 0.40
Nodes (4): fs, http, MIME, path

### Community 9 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **29 isolated node(s):** `UIKit`, `Foundation`, `PackageDescription`, `name`, `version` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `AppDelegate` connect `AppDelegate` to `.application`, `AppDelegate.swift`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ICloudSyncPlugin` connect `ICloudSyncPlugin` to `AppDelegate.swift`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `UIKit`, `Foundation`, `PackageDescription` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._