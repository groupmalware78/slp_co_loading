import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/auth_store.dart';
import '../models/profile.dart';
import '../models/user.dart';
import 'profile/address_tab.dart';
import 'profile/authorized_pickup_tab.dart';
import 'profile/personal_info_tab.dart';
import 'profile/security_tab.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiClient();
  late Future<Profile> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<Profile> _load() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.me(token);
    return Profile.fromJson(result['user'] as Map<String, dynamic>);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () async {
              // Flipping the auth state alone doesn't dismiss this pushed
              // screen — pop back to the root route (which the state
              // change has by now turned into LoginScreen) to actually
              // reveal it.
              await context.read<AuthStore>().signOut();
              if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
            },
          ),
        ],
      ),
      body: FutureBuilder<Profile>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final profile = snapshot.data!;
          return profile.role == PortalRole.customer
              ? _CustomerProfile(profile: profile)
              : _DriverProfile(profile: profile);
        },
      ),
    );
  }
}

/// DRIVER (staff-like) profile — mirrors the web app's non-CUSTOMER profile
/// page: an account-details summary plus a password-change form. No
/// address/personal-info/authorized-pickup sections, since those are
/// customer-registration-only fields staff accounts never fill in.
class _DriverProfile extends StatelessWidget {
  final Profile profile;
  const _DriverProfile({required this.profile});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: CircleAvatar(
            radius: 36,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: Text(
              profile.name.isNotEmpty ? profile.name[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Center(child: Text(profile.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
        const Center(child: Text('Driver', style: TextStyle(color: Colors.grey))),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Email', style: TextStyle(fontSize: 12, color: Colors.grey)),
                Text(profile.email),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text('Change password', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const SecurityTab(),
      ],
    );
  }
}

/// CUSTOMER profile — the 4 sections from the web app's ProfileTabs.tsx
/// (Personal Info, Address, Security, Authorized Pickup), switched via a
/// bottom navigation bar.
class _CustomerProfile extends StatefulWidget {
  final Profile profile;
  const _CustomerProfile({required this.profile});

  @override
  State<_CustomerProfile> createState() => _CustomerProfileState();
}

class _CustomerProfileState extends State<_CustomerProfile> {
  late Profile _profile;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _profile = widget.profile;
  }

  void _onSaved(Profile updated) => setState(() => _profile = updated);

  @override
  Widget build(BuildContext context) {
    final pages = [
      PersonalInfoTab(profile: _profile, onSaved: _onSaved),
      AddressTab(profile: _profile, onSaved: _onSaved),
      const SecurityTab(),
      const AuthorizedPickupTab(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Personal'),
          NavigationDestination(icon: Icon(Icons.location_on_outlined), label: 'Address'),
          NavigationDestination(icon: Icon(Icons.lock_outline), label: 'Security'),
          NavigationDestination(icon: Icon(Icons.people_outline), label: 'Pickup'),
        ],
      ),
    );
  }
}
