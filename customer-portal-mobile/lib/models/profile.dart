import 'user.dart';

/// The richer profile returned by GET /api/mobile/me — AppUser (in
/// auth_store) stays the minimal, persisted-to-secure-storage identity;
/// this is fetched fresh each time the profile screen opens.
class Profile {
  final String id;
  final String name;
  final String email;
  final PortalRole role;
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? storeLocation;
  final String? addressLine1;
  final String? addressLine2;
  final String? cityParish;
  final String? country;
  final String? trn;
  final bool emailVerified;

  Profile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.storeLocation,
    required this.addressLine1,
    required this.addressLine2,
    required this.cityParish,
    required this.country,
    required this.trn,
    required this.emailVerified,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: roleFromString(json['role'] as String),
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      phone: json['phone'] as String?,
      storeLocation: json['storeLocation'] as String?,
      addressLine1: json['addressLine1'] as String?,
      addressLine2: json['addressLine2'] as String?,
      cityParish: json['cityParish'] as String?,
      country: json['country'] as String?,
      trn: json['trn'] as String?,
      emailVerified: json['emailVerified'] as bool? ?? false,
    );
  }

  String? get formattedAddress {
    final parts = [addressLine1, addressLine2, cityParish, country]
        .where((p) => p != null && p.trim().isNotEmpty)
        .toList();
    return parts.isEmpty ? null : parts.join(', ');
  }
}

class AuthorizedPickupPerson {
  final String id;
  final String name;
  final String? phone;
  final String? relationship;

  AuthorizedPickupPerson({required this.id, required this.name, required this.phone, required this.relationship});

  factory AuthorizedPickupPerson.fromJson(Map<String, dynamic> json) {
    return AuthorizedPickupPerson(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String?,
      relationship: json['relationship'] as String?,
    );
  }
}

class PickupLocation {
  final String id;
  final String name;
  final String address;

  PickupLocation({required this.id, required this.name, required this.address});

  factory PickupLocation.fromJson(Map<String, dynamic> json) {
    return PickupLocation(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
    );
  }
}
