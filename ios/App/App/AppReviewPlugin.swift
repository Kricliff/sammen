import Foundation
import Capacitor
import StoreKit

/**
 * Asks iOS to show Apple's own "Enjoying Together?" rating sheet.
 *
 * App Store guideline 5.6.1 requires the system API for review prompts, so
 * this wraps it instead of drawing a custom dialog. iOS decides whether the
 * sheet is actually shown (at most three times a year per user, never in
 * TestFlight builds), so the call always resolves and never reports back.
 * www/index.html (maybeAskForReview) only calls it at good moments.
 */
@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let scene = UIApplication.shared.connectedScenes
                .first { $0.activationState == .foregroundActive } as? UIWindowScene
            if let scene = scene {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve()
        }
    }
}
