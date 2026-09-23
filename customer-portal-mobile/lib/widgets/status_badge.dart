import 'package:flutter/material.dart';

import '../models/delivery.dart';
import '../models/shipment.dart';

const _shipmentColors = {
  ShipmentStatus.pending: Colors.blueGrey,
  ShipmentStatus.received: Colors.blue,
  ShipmentStatus.shipped: Colors.teal,
  ShipmentStatus.atCustoms: Colors.orange,
  ShipmentStatus.readyForPickup: Colors.indigo,
  ShipmentStatus.outForDelivery: Colors.cyan,
  ShipmentStatus.delivered: Colors.green,
  ShipmentStatus.damaged: Colors.red,
  ShipmentStatus.emptyPackage: Colors.amber,
  ShipmentStatus.returned: Colors.purple,
};

const _deliveryColors = {
  DeliveryStatus.requested: Colors.purple,
  DeliveryStatus.assigned: Colors.blueGrey,
  DeliveryStatus.outForDelivery: Colors.cyan,
  DeliveryStatus.delivered: Colors.green,
  DeliveryStatus.failed: Colors.red,
};

class StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const StatusChip({super.key, required this.label, required this.color});

  factory StatusChip.shipment(ShipmentStatus status) => StatusChip(
        label: shipmentStatusLabels[status]!,
        color: _shipmentColors[status]!,
      );

  factory StatusChip.delivery(DeliveryStatus status) => StatusChip(
        label: deliveryStatusLabels[status]!,
        color: _deliveryColors[status]!,
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}
