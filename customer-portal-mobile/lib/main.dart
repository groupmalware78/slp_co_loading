import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/auth_store.dart';
import 'models/user.dart';
import 'screens/customer/customer_shell.dart';
import 'screens/driver/deliveries_list_screen.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthStore()..restore(),
      child: const CustomerPortalApp(),
    ),
  );
}

class CustomerPortalApp extends StatelessWidget {
  const CustomerPortalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swift Cargo Express',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0D9488)),
        useMaterial3: true,
      ),
      home: const _Root(),
    );
  }
}

class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthStore>(
      builder: (context, auth, _) {
        if (auth.isLoading) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (!auth.isSignedIn) {
          return const LoginScreen();
        }
        switch (auth.user!.role) {
          case PortalRole.driver:
            return const DeliveriesListScreen();
          case PortalRole.customer:
            return const CustomerShell();
        }
      },
    );
  }
}
