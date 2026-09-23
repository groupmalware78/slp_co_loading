import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../models/delivery.dart';
import '../../widgets/status_badge.dart';
import '../profile_screen.dart';
import 'delivery_detail_screen.dart';

class DeliveriesListScreen extends StatefulWidget {
  const DeliveriesListScreen({super.key});

  @override
  State<DeliveriesListScreen> createState() => _DeliveriesListScreenState();
}

class _DeliveriesListScreenState extends State<DeliveriesListScreen> {
  final _api = ApiClient();
  late Future<List<Delivery>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Delivery>> _load() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.listDeliveries(token);
    return (result['deliveries'] as List).map((e) => Delivery.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Deliveries'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Profile',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Delivery>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return LayoutBuilder(
                builder: (context, _) => ListView(
                  children: [
                    const SizedBox(height: 100),
                    Center(child: Text('${snapshot.error}')),
                  ],
                ),
              );
            }
            final deliveries = snapshot.data ?? [];
            if (deliveries.isEmpty) {
              return LayoutBuilder(
                builder: (context, _) => ListView(
                  children: const [SizedBox(height: 120), Center(child: Text('No deliveries assigned.'))],
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: deliveries.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final d = deliveries[index];
                return Card(
                  child: ListTile(
                    title: Text(d.package.trackingNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                      d.package.description?.isNotEmpty == true
                          ? d.package.description!
                          : '${d.package.pieces} ${d.package.packageType.toLowerCase()}',
                    ),
                    trailing: StatusChip.delivery(d.status),
                    onTap: () async {
                      final changed = await Navigator.of(context).push<bool>(
                        MaterialPageRoute(builder: (_) => DeliveryDetailScreen(deliveryId: d.id)),
                      );
                      if (changed == true) _refresh();
                    },
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
