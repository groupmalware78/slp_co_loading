import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
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

/// Mirrors the web app's components/profile/AddressTab.tsx.
class AddressTab extends StatefulWidget {
  final Profile profile;
  final ValueChanged<Profile> onSaved;
  const AddressTab({super.key, required this.profile, required this.onSaved});

  @override
  State<AddressTab> createState() => _AddressTabState();
}

class _AddressTabState extends State<AddressTab> {
  final _api = ApiClient();
  late TextEditingController _line1;
  late TextEditingController _line2;
  late TextEditingController _cityParish;
  late String _country;
  bool _editing = false;
  bool _submitting = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _line1 = TextEditingController(text: widget.profile.addressLine1 ?? '');
    _line2 = TextEditingController(text: widget.profile.addressLine2 ?? '');
    _cityParish = TextEditingController(text: widget.profile.cityParish ?? '');
    _country = widget.profile.country?.isNotEmpty == true ? widget.profile.country! : 'Jamaica';
  }

  @override
  void dispose() {
    _line1.dispose();
    _line2.dispose();
    _cityParish.dispose();
    super.dispose();
  }

  void _cancel() {
    setState(() {
      _line1.text = widget.profile.addressLine1 ?? '';
      _line2.text = widget.profile.addressLine2 ?? '';
      _cityParish.text = widget.profile.cityParish ?? '';
      _country = widget.profile.country?.isNotEmpty == true ? widget.profile.country! : 'Jamaica';
      _editing = false;
      _error = null;
    });
  }

  Future<void> _save() async {
    if (_line1.text.trim().isEmpty || _cityParish.text.trim().isEmpty) {
      setState(() => _error = 'Address line 1 and city/parish are required.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });
    try {
      final token = context.read<AuthStore>().token!;
      final result = await _api.updateProfile(token, {
        'addressLine1': _line1.text.trim(),
        'addressLine2': _line2.text.trim(),
        'cityParish': _cityParish.text.trim(),
        'country': _country,
      });
      widget.onSaved(Profile.fromJson(result['user'] as Map<String, dynamic>));
      setState(() {
        _editing = false;
        _success = 'Address updated.';
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not save changes: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final verified = widget.profile.emailVerified;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const Text('Your personal address on file.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 16),
        if (!verified) _Banner(text: 'Verify your email address before updating your address.', color: Colors.orange),
        if (_error != null) _Banner(text: _error!, color: Colors.red),
        if (_success != null) _Banner(text: _success!, color: Colors.green),
        const SizedBox(height: 8),
        TextField(
          controller: _line1,
          enabled: _editing,
          decoration: const InputDecoration(labelText: 'Address line 1', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _line2,
          enabled: _editing,
          decoration: const InputDecoration(labelText: 'Address line 2', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _cityParish,
          enabled: _editing,
          decoration: const InputDecoration(labelText: 'City / parish', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _country,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Country', border: OutlineInputBorder()),
          items: _countries.map((c) => DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis))).toList(),
          onChanged: _editing ? (v) => setState(() => _country = v ?? _country) : null,
        ),
        const SizedBox(height: 24),
        if (_editing)
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _submitting ? null : _save,
                  child: _submitting
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Update address'),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(onPressed: _submitting ? null : _cancel, child: const Text('Cancel')),
            ],
          )
        else
          FilledButton(
            onPressed: verified
                ? () => setState(() {
                      _editing = true;
                      _success = null;
                    })
                : null,
            child: const Text('Enable edit'),
          ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  final String text;
  final Color color;
  const _Banner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color)),
    );
  }
}
