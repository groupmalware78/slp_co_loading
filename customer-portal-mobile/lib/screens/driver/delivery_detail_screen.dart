import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../models/delivery.dart';
import '../../widgets/status_badge.dart';
import 'complete_delivery_screen.dart';

class DeliveryDetailScreen extends StatefulWidget {
  final String deliveryId;
  const DeliveryDetailScreen({super.key, required this.deliveryId});

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  final _api = ApiClient();
  late Future<Delivery> _future;
  bool _updating = false;
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<Delivery> _load() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.getDelivery(token, widget.deliveryId);
    return Delivery.fromJson(result['delivery'] as Map<String, dynamic>);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  Future<void> _setStatus(String status) async {
    setState(() => _updating = true);
    try {
      final token = context.read<AuthStore>().token!;
      await _api.updateDeliveryStatus(token, widget.deliveryId, status: status);
      _changed = true;
      await _refresh();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _navigate(Delivery d) async {
    // A Google Maps directions URL — this is the standard cross-platform
    // "open the native map app" trick: iOS Safari/apps offer to open it in
    // Apple Maps or the Google Maps app if installed, Android opens it
    // directly via the Google Maps app intent, and it still works as a
    // plain web page as a fallback either way.
    final uri = Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': d.formattedAddress,
    });
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open maps.')));
    }
  }

  Future<void> _completeDelivery() async {
    final done = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CompleteDeliveryScreen(deliveryId: widget.deliveryId)),
    );
    if (done == true) {
      _changed = true;
      _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        // Intercepts the back button/gesture so it always reports whether
        // this screen changed anything — otherwise the deliveries list
        // wouldn't know to refresh after a status update made here.
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Delivery')),
        body: FutureBuilder<Delivery>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            final d = snapshot.data!;
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(d.package.trackingNumber,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, fontFamily: 'monospace')),
                    StatusChip.delivery(d.status),
                  ],
                ),
                const SizedBox(height: 8),
                if (d.package.description?.isNotEmpty == true) Text(d.package.description!),
                Text('${d.package.pieces} ${d.package.packageType.toLowerCase()}'),
                const SizedBox(height: 8),
                Text(d.formattedAddress, style: const TextStyle(fontWeight: FontWeight.w500)),
                if (d.status == DeliveryStatus.assigned || d.status == DeliveryStatus.outForDelivery) ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _navigate(d),
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Navigate'),
                  ),
                ],
                const SizedBox(height: 8),
                Text('Assigned ${DateFormat.yMMMd().add_jm().format(d.assignedAt.toLocal())}',
                    style: TextStyle(color: Colors.grey.shade600)),
                if (d.deliveredAt != null)
                  Text('Delivered ${DateFormat.yMMMd().add_jm().format(d.deliveredAt!.toLocal())}',
                      style: TextStyle(color: Colors.grey.shade600)),
                if (d.notes?.isNotEmpty == true) ...[
                  const SizedBox(height: 16),
                  const Text('Notes', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(d.notes!),
                ],
                const SizedBox(height: 32),
                if (d.status == DeliveryStatus.assigned)
                  FilledButton.icon(
                    onPressed: _updating ? null : () => _setStatus('OUT_FOR_DELIVERY'),
                    icon: const Icon(Icons.local_shipping_outlined),
                    label: const Text('Start delivery'),
                  ),
                if (d.status == DeliveryStatus.outForDelivery) ...[
                  FilledButton.icon(
                    onPressed: _updating ? null : _completeDelivery,
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Complete delivery'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _updating ? null : () => _setStatus('FAILED'),
                    icon: const Icon(Icons.error_outline),
                    label: const Text('Report failed attempt'),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  ),
                ],
                if (d.status == DeliveryStatus.delivered)
                  Text('Delivery complete.', style: TextStyle(color: Colors.green.shade700)),
                if (d.status == DeliveryStatus.failed)
                  FilledButton.icon(
                    onPressed: _updating ? null : () => _setStatus('OUT_FOR_DELIVERY'),
                    icon: const Icon(Icons.replay),
                    label: const Text('Retry delivery'),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
