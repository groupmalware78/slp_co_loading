import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../core/phone_format.dart';
import '../../models/profile.dart';

/// Mirrors the web app's components/profile/AuthorizedPickupTab.tsx.
class AuthorizedPickupTab extends StatefulWidget {
  const AuthorizedPickupTab({super.key});

  @override
  State<AuthorizedPickupTab> createState() => _AuthorizedPickupTabState();
}

class _AuthorizedPickupTabState extends State<AuthorizedPickupTab> {
  final _api = ApiClient();
  late Future<List<AuthorizedPickupPerson>> _future;
  bool _showForm = false;
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _relationshipController = TextEditingController();
  bool _submitting = false;
  String? _error;
  String? _removingId;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _relationshipController.dispose();
    super.dispose();
  }

  Future<List<AuthorizedPickupPerson>> _load() async {
    final token = context.read<AuthStore>().token!;
    final result = await _api.listAuthorizedPickups(token);
    return (result['people'] as List).map((e) => AuthorizedPickupPerson.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  Future<void> _add() async {
    if (_nameController.text.trim().isEmpty) {
      setState(() => _error = 'Name is required.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final token = context.read<AuthStore>().token!;
      await _api.addAuthorizedPickup(
        token,
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        relationship: _relationshipController.text.trim(),
      );
      _nameController.clear();
      _phoneController.clear();
      _relationshipController.clear();
      setState(() => _showForm = false);
      await _refresh();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not add person: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _remove(String id) async {
    setState(() => _removingId = id);
    try {
      final token = context.read<AuthStore>().token!;
      await _api.deleteAuthorizedPickup(token, id);
      await _refresh();
    } catch (_) {
      // Best-effort — the list stays as-is and the user can retry.
    } finally {
      if (mounted) setState(() => _removingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Authorized Pickup', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text("People you've authorized to collect packages on your behalf.",
                        style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              IconButton.filled(
                onPressed: () => setState(() => _showForm = !_showForm),
                icon: Icon(_showForm ? Icons.close : Icons.add),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_showForm)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(_error!, style: const TextStyle(color: Colors.red)),
                      ),
                    TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      onChanged: (v) {
                        final formatted = formatPhoneInput(v);
                        _phoneController.value = TextEditingValue(
                          text: formatted,
                          selection: TextSelection.collapsed(offset: formatted.length),
                        );
                      },
                      decoration: const InputDecoration(labelText: 'Phone (optional)', hintText: '+1 (000) 000-0000', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _relationshipController,
                      decoration: const InputDecoration(labelText: 'Relationship (optional)', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitting ? null : _add,
                        child: _submitting
                            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Add'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),
          FutureBuilder<List<AuthorizedPickupPerson>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
              }
              if (snapshot.hasError) {
                return Padding(padding: const EdgeInsets.all(24), child: Center(child: Text('${snapshot.error}')));
              }
              final people = snapshot.data ?? [];
              if (people.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(child: Text('No authorized pickup people added yet.', style: TextStyle(color: Colors.grey))),
                );
              }
              return Column(
                children: people
                    .map((p) => Card(
                          child: ListTile(
                            title: Text(p.name),
                            subtitle: Text(
                              [p.relationship, p.phone].where((s) => s != null && s.isNotEmpty).join(' · '),
                            ),
                            trailing: _removingId == p.id
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                : IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                                    onPressed: () => _remove(p.id),
                                  ),
                          ),
                        ))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
