import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../models/shipping_rate.dart';

/// Mirrors the web app's components/RatesCalculator.tsx — weight-based
/// shipping cost estimate against this company's published rate tiers.
class CalculatorScreen extends StatefulWidget {
  const CalculatorScreen({super.key});

  @override
  State<CalculatorScreen> createState() => _CalculatorScreenState();
}

class _CalculatorScreenState extends State<CalculatorScreen> {
  final _api = ApiClient();
  final _weightController = TextEditingController();
  late Future<List<ShippingRate>> _future;
  double? _weight;

  @override
  void initState() {
    super.initState();
    _future = _load();
    _weightController.addListener(() {
      setState(() => _weight = double.tryParse(_weightController.text.trim()));
    });
  }

  @override
  void dispose() {
    _weightController.dispose();
    super.dispose();
  }

  Future<List<ShippingRate>> _load() async {
    final result = await _api.listShippingRates();
    return (result['rates'] as List).map((e) => ShippingRate.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rate Calculator')),
      body: FutureBuilder<List<ShippingRate>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final rates = snapshot.data ?? [];
          if (rates.isEmpty) {
            return const Center(child: Text('No shipping rates published yet.'));
          }
          ShippingRate? matched;
          if (_weight != null && _weight! > 0) {
            for (final r in rates) {
              if (r.matches(_weight!)) {
                matched = r;
                break;
              }
            }
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'Enter a package weight for an instant estimate.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _weightController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Package weight (lbs)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(onPressed: () => _weightController.clear(), child: const Text('Clear')),
                ],
              ),
              if (_weightController.text.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.teal.withValues(alpha: 0.08),
                    border: Border.all(color: Colors.teal.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    matched != null
                        ? '${matched.label} — estimated cost \$${matched.price.toStringAsFixed(2)}'
                        : 'That weight is outside our standard rates — please reach out for a custom quote.',
                    style: const TextStyle(color: Colors.teal, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              Card(
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    for (final rate in rates)
                      Container(
                        color: matched?.id == rate.id ? Colors.teal.withValues(alpha: 0.08) : null,
                        child: ListTile(
                          title: Text(rate.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            rate.maxWeightLbs != null
                                ? '${rate.minWeightLbs} lbs – ${rate.maxWeightLbs} lbs'
                                : '${rate.minWeightLbs} lbs and up',
                          ),
                          trailing: Text(
                            '\$${rate.price.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
