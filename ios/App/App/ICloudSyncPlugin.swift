import Foundation
import Capacitor

/**
 * Thin bridge to NSUbiquitousKeyValueStore (iCloud Key-Value Storage).
 * Stores the app's entire JSON state blob under one key so it can be
 * restored automatically after a delete/reinstall on the same Apple ID.
 * No CloudKit container needed — this is the lightweight iCloud store,
 * capped at 1MB total / 1024 keys, which is ample for this app's state.
 */
@objc(ICloudSyncPlugin)
public class ICloudSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudSyncPlugin"
    public let jsName = "ICloudSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise)
    ]

    private let store = NSUbiquitousKeyValueStore.default
    private let stateKey = "together_state_v1"

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(storeDidChangeExternally(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: store
        )
        store.synchronize()
    }

    @objc func storeDidChangeExternally(_ notification: Notification) {
        let value = store.string(forKey: stateKey)
        notifyListeners("change", data: ["value": value as Any])
    }

    @objc func setValue(_ call: CAPPluginCall) {
        guard let value = call.getString("value") else {
            call.reject("Missing 'value'")
            return
        }
        store.set(value, forKey: stateKey)
        store.synchronize()
        call.resolve()
    }

    @objc func getValue(_ call: CAPPluginCall) {
        store.synchronize()
        let value = store.string(forKey: stateKey)
        call.resolve(["value": value as Any])
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": FileManager.default.ubiquityIdentityToken != nil])
    }
}
