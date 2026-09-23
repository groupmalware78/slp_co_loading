// requested = a customer has asked for home delivery but no driver has
// been assigned yet (see DeliveryAssignment.driverId in the server
// schema) — a driver's own deliveries list never contains one (it's
// filtered by driverId, which is null for these), but a customer's own
// delivery-status lookup can.
enum DeliveryStatus { requested, assigned, outForDelivery, delivered, failed }

const _deliveryStatusByWire = {
  'REQUESTED': DeliveryStatus.requested,
  'ASSIGNED': DeliveryStatus.assigned,
  'OUT_FOR_DELIVERY': DeliveryStatus.outForDelivery,
  'DELIVERED': DeliveryStatus.delivered,
  'FAILED': DeliveryStatus.failed,
};

DeliveryStatus deliveryStatusFromWire(String value) =>
    _deliveryStatusByWire[value] ?? DeliveryStatus.requested;

String deliveryStatusToWire(DeliveryStatus status) {
  switch (status) {
    case DeliveryStatus.requested:
      return 'REQUESTED';
    case DeliveryStatus.assigned:
      return 'ASSIGNED';
    case DeliveryStatus.outForDelivery:
      return 'OUT_FOR_DELIVERY';
    case DeliveryStatus.delivered:
      return 'DELIVERED';
    case DeliveryStatus.failed:
      return 'FAILED';
  }
}

const deliveryStatusLabels = {
  DeliveryStatus.requested: 'Requested — waiting to be assigned',
  DeliveryStatus.assigned: 'Assigned',
  DeliveryStatus.outForDelivery: 'Out for delivery',
  DeliveryStatus.delivered: 'Delivered',
  DeliveryStatus.failed: 'Failed',
};

class DeliveryPackageSummary {
  final String id;
  final String trackingNumber;
  final String? description;
  final int pieces;
  final String packageType;

  DeliveryPackageSummary({
    required this.id,
    required this.trackingNumber,
    required this.description,
    required this.pieces,
    required this.packageType,
  });

  factory DeliveryPackageSummary.fromJson(Map<String, dynamic> json) {
    return DeliveryPackageSummary(
      id: json['id'] as String,
      trackingNumber: json['trackingNumber'] as String,
      description: json['description'] as String?,
      pieces: json['pieces'] as int,
      packageType: json['packageType'] as String,
    );
  }
}

class Delivery {
  final String id;
  final DeliveryStatus status;
  final String? notes;
  final DateTime assignedAt;
  final DateTime? deliveredAt;
  final DateTime? proofCapturedAt;
  final String addressLine1;
  final String? addressLine2;
  final String cityParish;
  final String country;
  // Null while status is requested — no driver assigned yet.
  final String? driverName;
  final DeliveryPackageSummary package;

  Delivery({
    required this.id,
    required this.status,
    required this.notes,
    required this.assignedAt,
    required this.deliveredAt,
    required this.proofCapturedAt,
    required this.addressLine1,
    required this.addressLine2,
    required this.cityParish,
    required this.country,
    required this.driverName,
    required this.package,
  });

  factory Delivery.fromJson(Map<String, dynamic> json) {
    return Delivery(
      id: json['id'] as String,
      status: deliveryStatusFromWire(json['status'] as String),
      notes: json['notes'] as String?,
      assignedAt: DateTime.parse(json['assignedAt'] as String),
      deliveredAt: json['deliveredAt'] != null ? DateTime.parse(json['deliveredAt'] as String) : null,
      proofCapturedAt:
          json['proofCapturedAt'] != null ? DateTime.parse(json['proofCapturedAt'] as String) : null,
      addressLine1: json['addressLine1'] as String,
      addressLine2: json['addressLine2'] as String?,
      cityParish: json['cityParish'] as String,
      country: json['country'] as String,
      driverName: (json['driver'] as Map<String, dynamic>?)?['name'] as String?,
      package: DeliveryPackageSummary.fromJson(json['package'] as Map<String, dynamic>),
    );
  }

  String get formattedAddress =>
      [addressLine1, addressLine2, cityParish, country].where((p) => p != null && p.isNotEmpty).join(', ');
}
