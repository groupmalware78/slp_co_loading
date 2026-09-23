import 'dart:io' show Platform;

/// Points this app at the `api/` app (port 3010) directly — customer-portal
/// no longer has any mobile routes of its own, per the split into a
/// standalone REST API layer (Service-Provider onboards companies and
/// issues API keys, Warehouse logs packages, api/ is the one REST surface
/// every client app — including this one — calls).
///
/// This build targets Swift Cargo Express only, so [apiKey] is that one
/// company's key, supplied at build time via `--dart-define=API_KEY=...`
/// (Service-Provider app -> Companies -> API Key). A build for a
/// different company just needs a different --dart-define value — see
/// the project README for what else would need to change to support
/// switching companies at runtime.
///
/// There is no in-app key-refresh mechanism: if this company's key is
/// rotated (manually or automatically) on the server, this build stops
/// authenticating until a new release ships with the new key. Until a
/// future task adds runtime key fetching, keep automatic rotation
/// disabled (apiKeyRotationDays = 0, set via the Service-Provider app's
/// Access panel) for any company with a shipped mobile build.
///
/// - iOS Simulator can reach the host Mac directly via `localhost`.
/// - Android emulator maps the host machine to `10.0.2.2`, not `localhost`.
/// - A physical device needs the host machine's LAN IP instead of either,
///   and api/'s CORS assumptions may need to allow that origin.
class ApiConfig {
  static const int _devPort = 3010;

  static String get baseUrl {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;

    if (!Platform.isAndroid) return 'http://localhost:$_devPort';
    return 'http://10.0.2.2:$_devPort';
  }

  /// Swift Cargo Express's API key (Service-Provider app → Companies → API
  /// Key). Identifies this deployment's company on login and on the two
  /// public-browsing endpoints (locations, shipping rates); every other
  /// call after login is authenticated by the bearer token login returns
  /// instead.
  ///
  /// Must be supplied at build time — there is deliberately no bundled
  /// fallback key. A key baked into source ships inside the compiled app
  /// binary, extractable by anyone who has the app, so it's passed in at
  /// build time instead and kept out of version control.
  static String get apiKey {
    const override = String.fromEnvironment('API_KEY');
    if (override.isEmpty) {
      throw StateError(
        'No API_KEY provided. Build with --dart-define=API_KEY=<key> '
        '(Service-Provider app -> Companies -> API Key). Refusing to fall '
        'back to a bundled key.',
      );
    }
    return override;
  }
}
