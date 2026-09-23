import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../core/phone_format.dart';
import '../../models/profile.dart';

/// Mirrors the web app's components/profile/PersonalInfoTab.tsx.
class PersonalInfoTab extends StatefulWidget {
  final Profile profile;
  final ValueChanged<Profile> onSaved;
  const PersonalInfoTab({super.key, required this.profile, required this.onSaved});

  @override
  State<PersonalInfoTab> createState() => _PersonalInfoTabState();
}

class _PersonalInfoTabState extends State<PersonalInfoTab> {
  final _api = ApiClient();
  late TextEditingController _firstName;
  late TextEditingController _lastName;
  late TextEditingController _phone;
  String? _storeLocation;
  List<PickupLocation> _locations = [];
  bool _editing = false;
  bool _submitting = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _firstName = TextEditingController(text: widget.profile.firstName ?? '');
    _lastName = TextEditingController(text: widget.profile.lastName ?? '');
    _phone = TextEditingController(text: widget.profile.phone ?? '');
    _storeLocation = widget.profile.storeLocation?.isNotEmpty == true ? widget.profile.storeLocation : null;
    _loadLocations();
  }

  Future<void> _loadLocations() async {
    try {
      final result = await _api.listLocations();
      final locations =
          (result['locations'] as List).map((e) => PickupLocation.fromJson(e as Map<String, dynamic>)).toList();
      if (mounted) setState(() => _locations = locations);
    } catch (_) {
      // Non-critical — the dropdown just stays empty if this fails.
    }
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _cancel() {
    setState(() {
      _firstName.text = widget.profile.firstName ?? '';
      _lastName.text = widget.profile.lastName ?? '';
      _phone.text = widget.profile.phone ?? '';
      _storeLocation = widget.profile.storeLocation?.isNotEmpty == true ? widget.profile.storeLocation : null;
      _editing = false;
      _error = null;
    });
  }

  Future<void> _save() async {
    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });
    try {
      final token = context.read<AuthStore>().token!;
      final result = await _api.updateProfile(token, {
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        'phone': _phone.text.trim(),
        'storeLocation': _storeLocation ?? '',
      });
      widget.onSaved(Profile.fromJson(result['user'] as Map<String, dynamic>));
      setState(() {
        _editing = false;
        _success = 'Profile updated.';
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
        const Text('Personal Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const Text('Update your personal details and contact information.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 16),
        if (!verified) _Banner(text: 'Verify your email address before updating your profile.', color: Colors.orange),
        if (_error != null) _Banner(text: _error!, color: Colors.red),
        if (_success != null) _Banner(text: _success!, color: Colors.green),
        const SizedBox(height: 8),
        TextField(
          controller: _firstName,
          enabled: _editing,
          decoration: const InputDecoration(labelText: 'First name', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _lastName,
          enabled: _editing,
          decoration: const InputDecoration(labelText: 'Last name', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _phone,
          enabled: _editing,
          keyboardType: TextInputType.phone,
          onChanged: (v) {
            final formatted = formatPhoneInput(v);
            _phone.value = TextEditingValue(
              text: formatted,
              selection: TextSelection.collapsed(offset: formatted.length),
            );
          },
          decoration: const InputDecoration(labelText: 'Phone number', hintText: '+1 (000) 000-0000', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          enabled: false,
          controller: TextEditingController(text: widget.profile.email),
          decoration: const InputDecoration(labelText: 'Email address', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 20),
        const Text('Primary package pickup location', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: _storeLocation,
          // Without this, the field sizes itself to its longest item's
          // natural width instead of the space it's actually given,
          // which is what caused the overflow — the ellipsis on the Text
          // below never got a chance to kick in.
          isExpanded: true,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'Select a location…'),
          items: _locations
              .map((l) => DropdownMenuItem(value: l.name, child: Text('${l.name} — ${l.address}', overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: _editing ? (v) => setState(() => _storeLocation = v) : null,
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
                      : const Text('Update profile'),
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
