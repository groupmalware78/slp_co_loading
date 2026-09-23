import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../models/delivery.dart';
import '../../models/shipment.dart';
import '../../widgets/status_badge.dart';
import 'request_delivery_screen.dart';

class ShipmentDetailScreen extends StatefulWidget {
  final String shipmentId;
  const ShipmentDetailScreen({super.key, required this.shipmentId});

  @override
  State<ShipmentDetailScreen> createState() => _ShipmentDetailScreenState();
}

class _ShipmentDetailScreenState extends State<ShipmentDetailScreen> {
  final _api = ApiClient();
  late Future<Shipment> _future;
  late Future<Delivery?> _deliveryFuture;
  bool _openingInvoice = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
    _deliveryFuture = _loadDelivery();
  }

  Future<Shipment> _load() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.getShipment(token, widget.shipmentId);
    return Shipment.fromJson(result['shipment'] as Map<String, dynamic>);
  }

  Future<Delivery?> _loadDelivery() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.getShipmentDelivery(token, widget.shipmentId);
    final json = result['delivery'] as Map<String, dynamic>?;
    return json == null ? null : Delivery.fromJson(json);
  }

  Future<void> _openRequestDelivery({Delivery? editing}) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RequestDeliveryScreen(packageId: widget.shipmentId, existing: editing),
      ),
    );
    if (changed == true) {
      setState(() => _deliveryFuture = _loadDelivery());
    }
  }

  Future<void> _openInvoice(Shipment shipment) async {
    setState(() => _openingInvoice = true);
    try {
      final token = context.read<AuthStore>().token!;
      final bytes = await _api.downloadBytes(_api.shipmentInvoiceUrl(shipment.id), token);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${shipment.generatedInvoiceFileName ?? 'invoice.pdf'}');
      await file.writeAsBytes(bytes, flush: true);
      await OpenFilex.open(file.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not open invoice: $e')));
      }
    } finally {
      if (mounted) setState(() => _openingInvoice = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Package')),
      body: FutureBuilder<Shipment>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final s = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(s.trackingNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, fontFamily: 'monospace')),
                  StatusChip.shipment(s.status),
                ],
              ),
              const SizedBox(height: 20),
              _DetailRow(label: 'Package type', value: s.packageType),
              _DetailRow(label: 'Pieces', value: '${s.pieces}'),
              if (s.weightLbs != null) _DetailRow(label: 'Weight', value: '${s.weightLbs} lbs'),
              if (s.description?.isNotEmpty == true) _DetailRow(label: 'Description', value: s.description!),
              if (s.cost != null)
                _DetailRow(label: 'Cost', value: '\$${s.cost!.toStringAsFixed(2)}'),
              _DetailRow(label: 'Payment', value: s.paymentStatus),
              if (s.receivedAt != null)
                _DetailRow(label: 'Received', value: DateFormat.yMMMd().add_jm().format(s.receivedAt!.toLocal())),
              const SizedBox(height: 24),
              const Text('Invoice', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (s.generatedInvoiceFileName != null)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.picture_as_pdf_outlined),
                    title: Text(s.generatedInvoiceFileName!),
                    subtitle: s.generatedInvoiceAt != null
                        ? Text('Generated ${DateFormat.yMMMd().format(s.generatedInvoiceAt!.toLocal())}')
                        : null,
                    trailing: _openingInvoice
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.chevron_right),
                    onTap: _openingInvoice ? null : () => _openInvoice(s),
                  ),
                )
              else
                Text('Not generated yet.', style: TextStyle(color: Colors.grey.shade600)),
              if (s.status != ShipmentStatus.delivered) ...[
                const SizedBox(height: 24),
                const Text('Delivery', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                FutureBuilder<Delivery?>(
                  future: _deliveryFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: LinearProgressIndicator(),
                      );
                    }
                    final delivery = snapshot.data;
                    final canRequestFresh = delivery == null || delivery.status == DeliveryStatus.failed;
                    final canEditAddress =
                        delivery != null && (delivery.status == DeliveryStatus.requested || delivery.status == DeliveryStatus.assigned);
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (delivery != null) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(child: Text(deliveryStatusLabels[delivery.status]!)),
                              StatusChip.delivery(delivery.status),
                            ],
                          ),
                          if (delivery.driverName != null) ...[
                            const SizedBox(height: 4),
                            Text('Driver: ${delivery.driverName}', style: TextStyle(color: Colors.grey.shade600)),
                          ],
                          const SizedBox(height: 4),
                          Text(delivery.formattedAddress, style: TextStyle(color: Colors.grey.shade600)),
                          if (canEditAddress) ...[
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => _openRequestDelivery(editing: delivery),
                              child: const Text('Edit delivery address'),
                            ),
                          ],
                        ],
                        if (canRequestFresh) ...[
                          if (delivery?.status == DeliveryStatus.failed)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                'The last delivery attempt failed. You can request delivery again below.',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                              ),
                            ),
                          OutlinedButton.icon(
                            onPressed: () => _openRequestDelivery(),
                            icon: const Icon(Icons.local_shipping_outlined),
                            label: const Text('Request delivery'),
                          ),
                        ],
                      ],
                    );
                  },
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: TextStyle(color: Colors.grey.shade600))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
