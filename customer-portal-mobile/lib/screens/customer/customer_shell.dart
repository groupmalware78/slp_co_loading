import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_store.dart';
import '../profile_screen.dart';
import 'calculator_screen.dart';
import 'shipments_list_screen.dart';

/// Top-level shell shown after a CUSTOMER signs in — a persistent bottom
/// nav with Packages, Profile, Calculator, and Sign out. Packages and
/// Calculator are real, state-preserving tabs (kept alive in an
/// IndexedStack); Profile pushes the existing full-screen ProfileScreen
/// (which has its own app bar and its own sub-category bottom nav — hence
/// this doesn't try to also highlight it as a "selected" tab), and Sign
/// out is a one-tap action behind a confirmation dialog rather than a
/// screen of its own.
class CustomerShell extends StatefulWidget {
  const CustomerShell({super.key});

  @override
  State<CustomerShell> createState() => _CustomerShellState();
}

class _CustomerShellState extends State<CustomerShell> {
  static const _packagesDestination = 0;
  static const _profileDestination = 1;
  static const _calculatorDestination = 2;
  static const _signOutDestination = 3;

  // Only ever 0 (Packages) or 2 (Calculator) — Profile/Sign out are
  // one-shot actions, not screens this shell keeps selected.
  int _navIndex = _packagesDestination;

  // Wrapped in SizedBox.expand: IndexedStack gives non-positioned children
  // loose constraints, and without a forced size each page's own Scaffold
  // could settle to its content's height instead of filling the tab —
  // which is what made the calculator's rate list look unscrollable (its
  // ListView had exactly as much room as its content, so there was
  // nothing to scroll to).
  static const _pages = [
    SizedBox.expand(child: ShipmentsListScreen()),
    SizedBox.expand(child: CalculatorScreen()),
  ];

  int get _stackIndex => _navIndex == _calculatorDestination ? 1 : 0;

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text("You'll need to sign in again to access your account."),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<AuthStore>().signOut();
    }
  }

  void _onDestinationSelected(int index) {
    switch (index) {
      case _packagesDestination:
      case _calculatorDestination:
        setState(() => _navIndex = index);
      case _profileDestination:
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
      case _signOutDestination:
        _confirmSignOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _stackIndex, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: _onDestinationSelected,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), label: 'Packages'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
          NavigationDestination(icon: Icon(Icons.calculate_outlined), label: 'Calculator'),
          NavigationDestination(icon: Icon(Icons.logout), label: 'Sign out'),
        ],
      ),
    );
  }
}
