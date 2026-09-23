import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/user.dart';

/// Holds the signed-in driver/customer's session for the app's lifetime,
/// persisted to the platform keychain/keystore so a restart doesn't force
/// signing in again (the backend token itself is long-lived — 30 days,
/// see lib/mobileAuth.ts on the server — so there's no refresh flow here).
class AuthStore extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  String? _token;
  AppUser? _user;
  bool _loading = true;

  String? get token => _token;
  AppUser? get user => _user;
  bool get isLoading => _loading;
  bool get isSignedIn => _token != null && _user != null;

  Future<void> restore() async {
    _token = await _storage.read(key: _tokenKey);
    final userJson = await _storage.read(key: _userKey);
    if (userJson != null) {
      _user = AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> setSession(String token, AppUser user) async {
    _token = token;
    _user = user;
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
    notifyListeners();
  }

  Future<void> signOut() async {
    _token = null;
    _user = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
    notifyListeners();
  }
}
