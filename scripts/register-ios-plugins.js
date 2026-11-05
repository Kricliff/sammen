#!/usr/bin/env node
/**
 * Registers the app's own hand-written iOS plugins with Capacitor.
 *
 * Run right after `npx cap copy ios` (Codemagic does this, and so does
 * `npm run cap:ios`). Capacitor 8 only loads plugins listed in
 * packageClassList inside ios/App/App/capacitor.config.json, and `cap copy`
 * rebuilds that list from npm packages alone. Plugins that live directly in
 * ios/App/App (ICloudSyncPlugin, FirebaseAnalyticsPlugin, AppReviewPlugin)
 * are compiled into the app but never registered, so
 * window.Capacitor.Plugins.X is undefined and every call silently no-ops.
 *
 * This script finds every CAPBridgedPlugin in ios/App/App/*.swift and adds
 * its @objc class name to the list.
 */
const fs = require("fs");
const path = require("path");

const appDir = path.join(__dirname, "..", "ios", "App", "App");
const configPath = path.join(appDir, "capacitor.config.json");

if (!fs.existsSync(configPath)) {
  console.error(`Missing ${configPath}. Run "npx cap copy ios" first.`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const list = new Set(config.packageClassList || []);
const added = [];

for (const file of fs.readdirSync(appDir).filter(f => f.endsWith(".swift"))) {
  const src = fs.readFileSync(path.join(appDir, file), "utf8");
  if (!/\bCAPBridgedPlugin\b/.test(src)) continue;
  const m = src.match(/@objc\(([A-Za-z0-9_]+)\)/);
  if (m && !list.has(m[1])) { list.add(m[1]); added.push(m[1]); }
}

config.packageClassList = [...list];
fs.writeFileSync(configPath, JSON.stringify(config, null, "\t") + "\n");
console.log(`packageClassList: ${config.packageClassList.join(", ")}`);
console.log(added.length ? `Added local plugins: ${added.join(", ")}` : "No new local plugins to add.");
