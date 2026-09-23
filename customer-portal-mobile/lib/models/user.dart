enum PortalRole { driver, customer }

PortalRole roleFromString(String value) {
  switch (value) {
    case 'DRIVER':
      return PortalRole.driver;
    case 'CUSTOMER':
      return PortalRole.customer;
    default:
      throw ArgumentError('Unsupported role for this app: $value');
  }
}

class AppUser {
  final String id;
  final String name;
  final String email;
  final PortalRole role;

  AppUser({required this.id, required this.name, required this.email, required this.role});

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: roleFromString(json['role'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role == PortalRole.driver ? 'DRIVER' : 'CUSTOMER',
      };
}
