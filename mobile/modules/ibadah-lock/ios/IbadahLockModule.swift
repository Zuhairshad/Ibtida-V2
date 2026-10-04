import ExpoModulesCore

/**
 iOS stub. Real app shielding on iOS uses Screen Time (FamilyControls + ManagedSettings +
 DeviceActivity), which requires the `com.apple.developer.family-controls` entitlement. Apple
 grants it per app on request, and it is not enabled for Ibtida, so every call here reports
 "unsupported" and the lock runs in-app only. See modules/ibadah-lock/README.md for the steps.
 */
public class IbadahLockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IbadahLock")

    Events("onBlockedAttempt")

    Function("isSupported") { () -> Bool in
      false
    }

    Function("isPermissionGranted") { () -> Bool in
      false
    }

    AsyncFunction("openPermissionSettings") {}

    Function("getSession") { () -> [String: Any]? in
      nil
    }

    AsyncFunction("start") { (packages: [String], endsAt: Double?, returnUrl: String?) -> [String: Any] in
      ["packages": [String](), "shielding": false]
    }

    AsyncFunction("stop") {}
  }
}
