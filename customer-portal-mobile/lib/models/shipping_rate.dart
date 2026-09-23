/// Mirrors the web app's ShippingRate (Prisma model) as returned by the
/// public GET /api/shipping-rates — see components/RatesCalculator.tsx for
/// the matching logic this screen replicates.
class ShippingRate {
  final String id;
  final String label;
  final double minWeightLbs;
  final double? maxWeightLbs;
  final double price;

  ShippingRate({
    required this.id,
    required this.label,
    required this.minWeightLbs,
    required this.maxWeightLbs,
    required this.price,
  });

  factory ShippingRate.fromJson(Map<String, dynamic> json) {
    return ShippingRate(
      id: json['id'] as String,
      label: json['label'] as String,
      minWeightLbs: (json['minWeightLbs'] as num).toDouble(),
      maxWeightLbs: (json['maxWeightLbs'] as num?)?.toDouble(),
      price: (json['price'] as num).toDouble(),
    );
  }

  bool matches(double weight) => weight >= minWeightLbs && (maxWeightLbs == null || weight <= maxWeightLbs!);
}
