import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';

const _packageTypes = ['BOX', 'BAG', 'ENVELOPE', 'OTHER'];

class CreatePreAlertScreen extends StatefulWidget {
  const CreatePreAlertScreen({super.key});

  @override
  State<CreatePreAlertScreen> createState() => _CreatePreAlertScreenState();
}

class _CreatePreAlertScreenState extends State<CreatePreAlertScreen> {
  final _formKey = GlobalKey<FormState>();
  final _trackingController = TextEditingController();
  final _piecesController = TextEditingController(text: '1');
  final _descriptionController = TextEditingController();
  final _weightController = TextEditingController();
  final _costController = TextEditingController();
  final _merchantController = TextEditingController();
  final _detailsController = TextEditingController();
  String _packageType = 'BOX';
  XFile? _receipt;

  final _api = ApiClient();
  final _picker = ImagePicker();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _trackingController.dispose();
    _piecesController.dispose();
    _descriptionController.dispose();
    _weightController.dispose();
    _costController.dispose();
    _merchantController.dispose();
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _pickReceipt(ImageSource source) async {
    final file = await _picker.pickImage(source: source, maxWidth: 2000, imageQuality: 90);
    if (file != null) setState(() => _receipt = file);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_receipt == null) {
      setState(() => _error = 'Please attach a photo of the invoice or receipt.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final bytes = await File(_receipt!.path).readAsBytes();
      if (!mounted) return;
      final token = context.read<AuthStore>().token!;
      await _api.createPreAlert(
        token,
        trackingNumber: _trackingController.text.trim(),
        pieces: _piecesController.text.trim(),
        packageType: _packageType,
        description: _descriptionController.text.trim(),
        weightLbs: _weightController.text.trim(),
        cost: _costController.text.trim(),
        merchantName: _merchantController.text.trim(),
        additionalDetails: _detailsController.text.trim(),
        invoiceBytes: bytes,
        invoiceFilename: _receipt!.name,
        invoiceContentType: _receipt!.mimeType ?? 'image/jpeg',
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not submit pre-alert: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Pre-Alert')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _trackingController,
              decoration: const InputDecoration(labelText: 'Tracking number', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _piecesController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Pieces', border: OutlineInputBorder()),
                    validator: (v) {
                      final n = int.tryParse(v ?? '');
                      return (n == null || n < 1) ? 'Enter a valid number' : null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _packageType,
                    decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                    items: _packageTypes
                        .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                        .toList(),
                    onChanged: (v) => setState(() => _packageType = v ?? _packageType),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Description (what is it?)', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _weightController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Weight (lbs)', border: OutlineInputBorder()),
                    validator: (v) {
                      final n = double.tryParse(v ?? '');
                      return (n == null || n <= 0) ? 'Enter a valid weight' : null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _costController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Cost \$ (optional)', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _merchantController,
              decoration: const InputDecoration(labelText: 'Merchant / seller (optional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _detailsController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Additional details (optional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            const Text('Invoice or receipt', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (_receipt != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(File(_receipt!.path), height: 160, width: double.infinity, fit: BoxFit.cover),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickReceipt(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Take photo'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickReceipt(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_outlined),
                    label: const Text('Choose photo'),
                  ),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit pre-alert'),
            ),
          ],
        ),
      ),
    );
  }
}
