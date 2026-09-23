import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import 'api_config.dart';

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}

/// Thin wrapper over api/'s REST endpoints (see api/src/app/api/v1/mobile
/// on the server, plus the two public-browsing v1 endpoints below). Every
/// call other than login/listLocations/listShippingRates takes the bearer
/// token explicitly rather than reading a global — callers get it from
/// AuthStore.
class ApiClient {
  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('${ApiConfig.baseUrl}$path').replace(queryParameters: query);

  Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Map<String, String> _apiKeyHeaders() => {
        'Content-Type': 'application/json',
        'x-api-key': ApiConfig.apiKey,
      };

  Map<String, dynamic> _decodeOrThrow(http.Response res) {
    Map<String, dynamic> body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      body = {};
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    final message = body['error'] as String? ?? 'Request failed (${res.statusCode}).';
    throw ApiException(message, res.statusCode);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      _uri('/api/v1/mobile/auth/login'),
      headers: _apiKeyHeaders(),
      body: jsonEncode({'email': email, 'password': password}),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> me(String token) async {
    final res = await http.get(_uri('/api/v1/mobile/me'), headers: _headers(token));
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> listShipments(String token, {String? status, int page = 1}) async {
    final res = await http.get(
      _uri('/api/v1/mobile/shipments', {
        'page': '$page',
        'status': ?status,
      }),
      headers: _headers(token),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> getShipment(String token, String id) async {
    final res = await http.get(_uri('/api/v1/mobile/shipments/$id'), headers: _headers(token));
    return _decodeOrThrow(res);
  }

  Uri shipmentInvoiceUrl(String id) => _uri('/api/v1/mobile/shipments/$id/invoice');

  Future<Map<String, dynamic>> listDeliveries(String token, {String? status, int page = 1}) async {
    final res = await http.get(
      _uri('/api/v1/mobile/deliveries', {
        'page': '$page',
        'status': ?status,
      }),
      headers: _headers(token),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> getDelivery(String token, String id) async {
    final res = await http.get(_uri('/api/v1/mobile/deliveries/$id'), headers: _headers(token));
    return _decodeOrThrow(res);
  }

  /// Customer-only: the latest delivery request/assignment for one of
  /// their own shipments (or null if they've never requested delivery
  /// for it).
  Future<Map<String, dynamic>> getShipmentDelivery(String token, String shipmentId) async {
    final res = await http.get(_uri('/api/v1/mobile/shipments/$shipmentId/delivery'), headers: _headers(token));
    return _decodeOrThrow(res);
  }

  /// Customer-only: request home delivery for one of their own,
  /// undelivered shipments.
  Future<Map<String, dynamic>> requestDelivery(
    String token, {
    required String packageId,
    required String addressLine1,
    String? addressLine2,
    required String cityParish,
    required String country,
  }) async {
    final res = await http.post(
      _uri('/api/v1/mobile/deliveries'),
      headers: _headers(token),
      body: jsonEncode({
        'packageId': packageId,
        'addressLine1': addressLine1,
        'addressLine2': ?addressLine2,
        'cityParish': cityParish,
        'country': country,
      }),
    );
    return _decodeOrThrow(res);
  }

  /// Customer-only: correct the address on their own delivery request,
  /// while it's still REQUESTED or ASSIGNED.
  Future<Map<String, dynamic>> updateDeliveryAddress(
    String token,
    String id, {
    required String addressLine1,
    String? addressLine2,
    required String cityParish,
    required String country,
  }) async {
    final res = await http.patch(
      _uri('/api/v1/mobile/deliveries/$id'),
      headers: _headers(token),
      body: jsonEncode({
        'addressLine1': addressLine1,
        'addressLine2': addressLine2 ?? '',
        'cityParish': cityParish,
        'country': country,
      }),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> updateDeliveryStatus(
    String token,
    String id, {
    required String status,
    String? notes,
  }) async {
    final res = await http.patch(
      _uri('/api/v1/mobile/deliveries/$id'),
      headers: _headers(token),
      body: jsonEncode({'status': status, 'notes': ?notes}),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> completeDelivery(
    String token,
    String id, {
    required List<int> signaturePngBytes,
    List<int>? photoJpegBytes,
    String? notes,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      _uri('/api/v1/mobile/deliveries/$id/complete'),
    );
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(http.MultipartFile.fromBytes(
      'signature',
      signaturePngBytes,
      filename: 'signature.png',
      contentType: MediaType('image', 'png'),
    ));
    if (photoJpegBytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'photo',
        photoJpegBytes,
        filename: 'photo.jpg',
        contentType: MediaType('image', 'jpeg'),
      ));
    }
    if (notes != null && notes.trim().isNotEmpty) {
      request.fields['notes'] = notes.trim();
    }
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> createPreAlert(
    String token, {
    required String trackingNumber,
    required String pieces,
    required String packageType,
    required String description,
    required String weightLbs,
    String? cost,
    String? merchantName,
    String? additionalDetails,
    required List<int> invoiceBytes,
    required String invoiceFilename,
    required String invoiceContentType,
  }) async {
    final request = http.MultipartRequest('POST', _uri('/api/v1/mobile/pre-alert'));
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['trackingNumber'] = trackingNumber;
    request.fields['pieces'] = pieces;
    request.fields['packageType'] = packageType;
    request.fields['description'] = description;
    request.fields['weightLbs'] = weightLbs;
    if (cost != null && cost.isNotEmpty) request.fields['cost'] = cost;
    if (merchantName != null && merchantName.isNotEmpty) request.fields['merchantName'] = merchantName;
    if (additionalDetails != null && additionalDetails.isNotEmpty) {
      request.fields['additionalDetails'] = additionalDetails;
    }
    request.files.add(http.MultipartFile.fromBytes(
      'invoice',
      invoiceBytes,
      filename: invoiceFilename,
      contentType: MediaType.parse(invoiceContentType),
    ));
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> updateProfile(String token, Map<String, dynamic> fields) async {
    final res = await http.patch(
      _uri('/api/v1/mobile/profile'),
      headers: _headers(token),
      body: jsonEncode(fields),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> changePassword(
    String token, {
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await http.post(
      _uri('/api/v1/mobile/profile/password'),
      headers: _headers(token),
      body: jsonEncode({'currentPassword': currentPassword, 'newPassword': newPassword}),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> listAuthorizedPickups(String token) async {
    final res = await http.get(_uri('/api/v1/mobile/profile/authorized-pickup'), headers: _headers(token));
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> addAuthorizedPickup(
    String token, {
    required String name,
    String? phone,
    String? relationship,
  }) async {
    final res = await http.post(
      _uri('/api/v1/mobile/profile/authorized-pickup'),
      headers: _headers(token),
      body: jsonEncode({
        'name': name,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (relationship != null && relationship.isNotEmpty) 'relationship': relationship,
      }),
    );
    return _decodeOrThrow(res);
  }

  Future<void> deleteAuthorizedPickup(String token, String id) async {
    final res = await http.delete(_uri('/api/v1/mobile/profile/authorized-pickup/$id'), headers: _headers(token));
    _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> listLocations() async {
    final res = await http.get(
      _uri('/api/v1/locations', {'activeOnly': 'true'}),
      headers: _apiKeyHeaders(),
    );
    return _decodeOrThrow(res);
  }

  Future<Map<String, dynamic>> listShippingRates() async {
    final res = await http.get(_uri('/api/v1/shipping-rates'), headers: _apiKeyHeaders());
    return _decodeOrThrow(res);
  }

  Future<List<int>> downloadBytes(Uri uri, String token) async {
    final res = await http.get(uri, headers: {'Authorization': 'Bearer $token'});
    if (res.statusCode != 200) {
      throw ApiException('Download failed (${res.statusCode}).', res.statusCode);
    }
    return res.bodyBytes;
  }
}
