/// Mirrors customer-portal's PackageStatus enum (src/components/StatusBadge.tsx).
enum ShipmentStatus {
  pending,
  received,
  shipped,
  atCustoms,
  readyForPickup,
  outForDelivery,
  delivered,
  damaged,
  emptyPackage,
  returned,
}

const _statusByWire = {
  'PENDING': ShipmentStatus.pending,
  'RECEIVED': ShipmentStatus.received,
  'SHIPPED': ShipmentStatus.shipped,
  'AT_CUSTOMS': ShipmentStatus.atCustoms,
  'READY_FOR_PICKUP': ShipmentStatus.readyForPickup,
  'OUT_FOR_DELIVERY': ShipmentStatus.outForDelivery,
  'DELIVERED': ShipmentStatus.delivered,
  'DAMAGED': ShipmentStatus.damaged,
  'EMPTY_PACKAGE': ShipmentStatus.emptyPackage,
  'RETURNED': ShipmentStatus.returned,
};

ShipmentStatus shipmentStatusFromWire(String value) =>
    _statusByWire[value] ?? ShipmentStatus.pending;

const shipmentStatusLabels = {
  ShipmentStatus.pending: 'Pre-alert submitted',
  ShipmentStatus.received: 'Received at warehouse',
  ShipmentStatus.shipped: 'Shipped',
  ShipmentStatus.atCustoms: 'At customs',
  ShipmentStatus.readyForPickup: 'Ready for pickup',
  ShipmentStatus.outForDelivery: 'Out for delivery',
  ShipmentStatus.delivered: 'Delivered',
  ShipmentStatus.damaged: 'Damaged',
  ShipmentStatus.emptyPackage: 'Empty package',
  ShipmentStatus.returned: 'Returned',
};

class Shipment {
  final String id;
  final String trackingNumber;
  final ShipmentStatus status;
  final String packageType;
  final int pieces;
  final double? weightLbs;
  final double? cost;
  final String paymentStatus;
  final double? amountPaid;
  final String? description;
  final String? generatedInvoiceFileName;
  final DateTime? generatedInvoiceAt;
  final DateTime? receivedAt;
  final DateTime createdAt;

  Shipment({
    required this.id,
    required this.trackingNumber,
    required this.status,
    required this.packageType,
    required this.pieces,
    required this.weightLbs,
    required this.cost,
    required this.paymentStatus,
    required this.amountPaid,
    required this.description,
    required this.generatedInvoiceFileName,
    required this.generatedInvoiceAt,
    required this.receivedAt,
    required this.createdAt,
  });

  factory Shipment.fromJson(Map<String, dynamic> json) {
    return Shipment(
      id: json['id'] as String,
      trackingNumber: json['trackingNumber'] as String,
      status: shipmentStatusFromWire(json['status'] as String),
      packageType: json['packageType'] as String,
      pieces: json['pieces'] as int,
      weightLbs: (json['weightLbs'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      paymentStatus: json['paymentStatus'] as String,
      amountPaid: (json['amountPaid'] as num?)?.toDouble(),
      description: json['description'] as String?,
      generatedInvoiceFileName: json['generatedInvoiceFileName'] as String?,
      generatedInvoiceAt: json['generatedInvoiceAt'] != null
          ? DateTime.parse(json['generatedInvoiceAt'] as String)
          : null,
      receivedAt: json['receivedAt'] != null ? DateTime.parse(json['receivedAt'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
