import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:signature/signature.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';

class CompleteDeliveryScreen extends StatefulWidget {
  final String deliveryId;
  const CompleteDeliveryScreen({super.key, required this.deliveryId});

  @override
  State<CompleteDeliveryScreen> createState() => _CompleteDeliveryScreenState();
}

class _CompleteDeliveryScreenState extends State<CompleteDeliveryScreen> {
  final _signatureController = SignatureController(penStrokeWidth: 3, penColor: Colors.black);
  final _notesController = TextEditingController();
  final _api = ApiClient();
  final _picker = ImagePicker();

  XFile? _photo;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _signatureController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    final photo = await _picker.pickImage(source: ImageSource.camera, maxWidth: 1600, imageQuality: 85);
    if (photo != null) setState(() => _photo = photo);
  }

  Future<void> _submit() async {
    if (_signatureController.isEmpty) {
      setState(() => _error = 'A signature is required to complete delivery.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final signatureBytes = await _signatureController.toPngBytes();
      if (signatureBytes == null) throw Exception('Could not capture signature.');

      Uint8List? photoBytes;
      if (_photo != null) {
        photoBytes = await File(_photo!.path).readAsBytes();
      }
      if (!mounted) return;

      final token = context.read<AuthStore>().token!;
      await _api.completeDelivery(
        token,
        widget.deliveryId,
        signaturePngBytes: signatureBytes,
        photoJpegBytes: photoBytes,
        notes: _notesController.text,
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not complete delivery: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Complete Delivery')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Signature', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400), borderRadius: BorderRadius.circular(8)),
            height: 200,
            child: Signature(controller: _signatureController, backgroundColor: Colors.white),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => setState(() => _signatureController.clear()),
              child: const Text('Clear'),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Photo (optional)', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_photo != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(File(_photo!.path), height: 180, width: double.infinity, fit: BoxFit.cover),
            ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _capturePhoto,
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(_photo == null ? 'Take photo' : 'Retake photo'),
          ),
          const SizedBox(height: 16),
          const Text('Notes (optional)', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'e.g. Left at front door'),
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
                : const Text('Complete delivery'),
          ),
        ],
      ),
    );
  }
}
