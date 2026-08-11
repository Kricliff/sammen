import Foundation
import Capacitor
import FirebaseCore
import FirebaseAnalytics

/**
 * Thin bridge to native Firebase Analytics (Google Analytics for Firebase).
 *
 * Written by hand instead of using @capacitor-firebase/analytics: that
 * package's podspec structures its Firebase-SDK-pulling subspecs (Lite /
 * Analytics / AnalyticsWithoutAdIdSupport) with no source files of their
 * own, which — confirmed by inspecting the generated Pods.xcodeproj across
 * two package versions — makes CocoaPods treat the whole pod as a
 * dependency-only aggregate target with zero build phases. Its own plugin
 * Swift source (FirebaseAnalyticsPlugin.swift) is never compiled by any
 * target, so `window.Capacitor.Plugins.FirebaseAnalytics` never exists at
 * runtime no matter how the Podfile references it. The underlying
 * FirebaseAnalytics/FirebaseCore pods link and work fine on their own —
 * only that wrapper package is broken for this setup — so this plugin
 * calls the native SDK directly instead.
 *
 * jsName is kept as "FirebaseAnalytics" so www/index.html's existing calls
 * (initAnalytics/logScreenView) don't need to change.
 */
@objc(FirebaseAnalyticsPlugin)
public class FirebaseAnalyticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FirebaseAnalyticsPlugin"
    public let jsName = "FirebaseAnalytics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCurrentScreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }

    @objc func setEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? true
        Analytics.setAnalyticsCollectionEnabled(enabled)
        call.resolve()
    }

    @objc func isEnabled(_ call: CAPPluginCall) {
        // The native SDK has no direct getter; report what we've set.
        // Collection defaults to enabled unless explicitly turned off.
        call.resolve(["enabled": true])
    }

    @objc func setCurrentScreen(_ call: CAPPluginCall) {
        let screenName = call.getString("screenName")
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName ?? "unknown"
        ])
        call.resolve()
    }

    @objc func logEvent(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else {
            call.reject("Missing 'name'")
            return
        }
        let params = call.getObject("params") ?? [:]
        Analytics.logEvent(name, parameters: params)
        call.resolve()
    }
}
