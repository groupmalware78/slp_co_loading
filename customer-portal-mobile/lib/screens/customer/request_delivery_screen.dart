import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../models/delivery.dart';
import '../../models/profile.dart';

const _countries = [
  'Jamaica',
  'United States',
  'Canada',
  'United Kingdom',
  'Trinidad and Tobago',
  'Barbados',
  'Bahamas',
  'Guyana',
  'Other',
];

/// Request home delivery for a shipment, or edit the address on an
/// existing request — same screen, since the form is identical. Defaults
/// to the customer's own profile address when requesting fresh (mirrors
/// customer-portal's web DeliveryRequestCard).
class RequestDeliveryScreen extends StatefulWidget {
  final String packageId;
  final Delivery? existing;
  const RequestDeliveryScreen({super.key, required this.packageId, this.existing});

  @override
  State<RequestDeliveryScreen> createState() => _RequestDeliveryScreenState();
}

class _RequestDeliveryScreenState extends State<RequestDeliveryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiClient();
  late final TextEditingController _line1;
  late final TextEditingController _line2;
  late final TextEditingController _cityParish;
  String _country = 'Jamaica';
  bool _loadingDefaults = false;
  bool _submitting = false;
  String? _error;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _line1 = TextEditingController(text: existing?.addressLine1 ?? '');
    _line2 = TextEditingController(text: existing?.addressLine2 ?? '');
    _cityParish = TextEditingController(text: existing?.cityParish ?? '');
    if (existing != null) {
      _country = existing.country;
    } else {
      _loadDefaultAddress();
    }
  }

  @override
  void dispose() {
    _line1.dispose();
    _line2.dispose();
    _cityParish.dispose();
    super.dispose();
  }

  Future<void> _loadDefaultAddress() async {
    setState(() => _loadingDefaults = true);
    try {
      final token = context.read<AuthStore>().token!;
      final result = await _api.me(token);
      final profile = Profile.fromJson(result['user'] as Map<String, dynamic>);
      if (!mounted) return;
      setState(() {
        _line1.text = profile.addressLine1 ?? '';
        _line2.text = profile.addressLine2 ?? '';
        _cityParish.text = profile.cityParish ?? '';
        if (profile.country?.isNotEmpty == true) _country = profile.country!;
      });
    } catch (_) {
      // Best-effort — an empty form is still usable, just not pre-filled.
    } finally {
      if (mounted) setState(() => _loadingDefaults = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final token = context.read<AuthStore>().token!;
      if (_isEditing) {
        await _api.updateDeliveryAddress(
          token,
          widget.existing!.id,
          addressLine1: _line1.text.trim(),
          addressLine2: _line2.text.trim(),
          cityParish: _cityParish.text.trim(),
          country: _country,
        );
      } else {
        await _api.requestDelivery(
          token,
          packageId: widget.packageId,
          addressLine1: _line1.text.trim(),
          addressLine2: _line2.text.trim(),
          cityParish: _cityParish.text.trim(),
          country: _country,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not save: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Edit Delivery Address' : 'Request Delivery')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (!_isEditing)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Defaulted from your profile address — edit below if this delivery should go elsewhere.',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            if (_loadingDefaults) const LinearProgressIndicator(),
            if (_error != null) ...[
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ],
            TextFormField(
              controller: _line1,
              decoration: const InputDecoration(labelText: 'Address line 1', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _line2,
              decoration: const InputDecoration(labelText: 'Address line 2', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cityParish,
              decoration: const InputDecoration(labelText: 'City / Parish', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _country,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Country', border: OutlineInputBorder()),
              items: _countries.map((c) => DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis))).toList(),
              onChanged: (v) => setState(() => _country = v ?? _country),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_isEditing ? 'Save address' : 'Submit request'),
            ),
          ],
        ),
      ),
    );
  }
}
