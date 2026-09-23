import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../models/shipment.dart';
import '../../widgets/status_badge.dart';
import 'create_pre_alert_screen.dart';
import 'shipment_detail_screen.dart';

class ShipmentsListScreen extends StatefulWidget {
  const ShipmentsListScreen({super.key});

  @override
  State<ShipmentsListScreen> createState() => _ShipmentsListScreenState();
}

class _ShipmentsListScreenState extends State<ShipmentsListScreen> {
  final _api = ApiClient();
  late Future<List<Shipment>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Shipment>> _load() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.listShipments(token);
    final shipments = (result['shipments'] as List)
        .map((e) => Shipment.fromJson(e as Map<String, dynamic>))
        .toList();
    return shipments;
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Packages')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const CreatePreAlertScreen()),
          );
          if (created == true) _refresh();
        },
        icon: const Icon(Icons.add),
        label: const Text('Pre-Alert'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Shipment>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _ErrorState(message: '${snapshot.error}', onRetry: _refresh);
            }
            final shipments = snapshot.data ?? [];
            if (shipments.isEmpty) {
              return LayoutBuilder(
                builder: (context, _) => ListView(
                  children: const [
                    SizedBox(height: 120),
                    Center(child: Text('No packages yet.')),
                  ],
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: shipments.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final s = shipments[index];
                return Card(
                  child: ListTile(
                    title: Text(s.trackingNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(s.description?.isNotEmpty == true ? s.description! : s.packageType),
                    trailing: StatusChip.shipment(s.status),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ShipmentDetailScreen(shipmentId: s.id)),
                    ),
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

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, _) => ListView(
        children: [
          const SizedBox(height: 80),
          Icon(Icons.error_outline, size: 40, color: Colors.grey.shade500),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(message, textAlign: TextAlign.center),
          ),
          const SizedBox(height: 16),
          Center(child: OutlinedButton(onPressed: onRetry, child: const Text('Retry'))),
        ],
      ),
    );
  }
}
