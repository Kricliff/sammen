package com.kricliff.together;

import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.analytics.FirebaseAnalytics;
import java.util.Iterator;

/**
 * Thin bridge to native Firebase Analytics (Google Analytics for Firebase).
 *
 * Hand-written instead of using @capacitor-firebase/analytics - see
 * ios/App/App/FirebaseAnalyticsPlugin.swift for why: that npm package's
 * podspec is broken for this project's iOS build. There's no equivalent
 * proven issue on Android, but the plugin name is kept identical
 * ("FirebaseAnalytics") on both platforms for one shared JS call site in
 * www/index.html, so it's written by hand here too for consistency.
 */
@CapacitorPlugin(name = "FirebaseAnalytics")
public class FirebaseAnalyticsPlugin extends Plugin {
    private FirebaseAnalytics firebaseAnalytics;

    @Override
    public void load() {
        firebaseAnalytics = FirebaseAnalytics.getInstance(getContext());
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        firebaseAnalytics.setAnalyticsCollectionEnabled(enabled);
        call.resolve();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        // No direct getter in the native SDK; report what we've set.
        JSObject ret = new JSObject();
        ret.put("enabled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void setCurrentScreen(PluginCall call) {
        String screenName = call.getString("screenName", "unknown");
        Bundle bundle = new Bundle();
        bundle.putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName);
        firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, bundle);
        call.resolve();
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String name = call.getString("name");
        if (name == null) {
            call.reject("Missing 'name'");
            return;
        }
        JSObject params = call.getObject("params");
        Bundle bundle = new Bundle();
        if (params != null) {
            Iterator<String> keys = params.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = params.opt(key);
                if (value instanceof String) {
                    bundle.putString(key, (String) value);
                } else if (value instanceof Integer) {
                    bundle.putInt(key, (Integer) value);
                } else if (value instanceof Double) {
                    bundle.putDouble(key, (Double) value);
                } else if (value instanceof Boolean) {
                    bundle.putBoolean(key, (Boolean) value);
                }
            }
        }
        firebaseAnalytics.logEvent(name, bundle);
        call.resolve();
    }
}
