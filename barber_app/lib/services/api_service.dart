import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/booking_model.dart';

class ApiService {
  // URL de production par défaut
  static const String _defaultUrl = 'https://barberpro-saa.onrender.com';

  static String? _customUrl;

  static String get _url => _customUrl ?? _defaultUrl;

  // Sauvegarder l'URL serveur dans les préférences
  static Future<void> saveServerUrl(String url) async {
    final cleaned = url.trim().replaceAll(RegExp(r'/+$'), '');
    _customUrl = cleaned;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('serverUrl', cleaned);
  }

  static String get currentServerUrl => _url;

  static void setBaseUrl(String url) => _customUrl = url;

  // Barbier connecté
  static String? _token;
  static String? _salonId;
  static Map<String, dynamic>? _currentUser;
  static Map<String, dynamic>? _currentSalon;

  static String? get salonId => _salonId;
  static Map<String, dynamic>? get currentUser => _currentUser;
  static Map<String, dynamic>? get currentSalon => _currentSalon;
  static bool get isLoggedIn => _token != null && _salonId != null;

  // ---- Initialiser la session ----
  static Future<bool> loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Charger l'URL serveur sauvegardée
      final savedUrl = prefs.getString('serverUrl');
      if (savedUrl != null && savedUrl.isNotEmpty) _customUrl = savedUrl;

      final token = prefs.getString('token');
      final userStr = prefs.getString('currentUser');
      final salonStr = prefs.getString('currentSalon');

      if (token != null && userStr != null) {
        _token = token;
        _currentUser = jsonDecode(userStr);
        if (salonStr != null) {
          _currentSalon = jsonDecode(salonStr);
        }
        _salonId = _currentUser?['salonId'];
        return true;
      }
    } catch (e) {
      debugPrint('Error loading session: $e');
    }
    return false;
  }

  // ---- Mot de passe oublié ----
  static Future<bool> forgotPassword(String email) async {
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (forgotPassword): $e');
      return false;
    }
  }

  // ---- Login barbier ----
  static Future<bool> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        _token = data['token'];
        _currentUser = Map<String, dynamic>.from(data['user']);
        _currentSalon = data['salon'] != null ? Map<String, dynamic>.from(data['salon']) : null;
        _salonId = _currentUser?['salonId'];

        // Sauvegarder dans SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('currentUser', jsonEncode(_currentUser));
        if (_currentSalon != null) {
          await prefs.setString('currentSalon', jsonEncode(_currentSalon));
        }

        return true;
      }
    } catch (e) {
      debugPrint('Login error: $e');
    }
    return false;
  }

  static Future<void> logout() async {
    _token = null;
    _salonId = null;
    _currentUser = null;
    _currentSalon = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // ---- Helper pour injecter le token ----
  static Map<String, String> get _authHeaders {
    return {
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }

  // ---- Mon salon ----
  static Future<Map<String, dynamic>?> getMySalon() async {
    if (_salonId == null) return null;
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        _currentSalon = Map<String, dynamic>.from(data['data']);
        return _currentSalon;
      }
    } catch (e) {
      debugPrint('API Error (getMySalon): $e');
    }
    return null;
  }

  static Future<bool> updateMySalon(Map<String, dynamic> updates) async {
    if (_salonId == null) return false;
    try {
      final res = await http.put(
        Uri.parse('$_url/api/barber/salon/$_salonId'),
        headers: _authHeaders,
        body: jsonEncode(updates),
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        _currentSalon = Map<String, dynamic>.from(data['data']);
        return true;
      }
    } catch (e) {
      debugPrint('API Error (updateMySalon): $e');
    }
    return false;
  }

  // ---- Stats de mon salon ----
  static Future<Map<String, dynamic>> getMyStats() async {
    if (_salonId == null) return {};
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/stats'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) return Map<String, dynamic>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (getMyStats): $e');
    }
    return {};
  }

  // ---- Mes RDV ----
  static Future<List<BookingModel>> getMyBookings({String? date, String? status}) async {
    if (_salonId == null) return [];
    try {
      final params = <String, String>{};
      if (date != null) params['date'] = date;
      if (status != null) params['status'] = status;
      final uri = Uri.parse('$_url/api/barber/salon/$_salonId/bookings')
          .replace(queryParameters: params.isEmpty ? null : params);
      final res = await http.get(uri, headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        return (data['data'] as List).map((j) => BookingModel.fromApi(j)).toList();
      }
    } catch (e) {
      debugPrint('API Error (getMyBookings): $e');
    }
    return [];
  }

  static Future<bool> updateBookingStatus(String bookingId, String status) async {
    if (_salonId == null) return false;
    try {
      final res = await http.put(
        Uri.parse('$_url/api/barber/salon/$_salonId/bookings/$bookingId'),
        headers: _authHeaders,
        body: jsonEncode({'status': status}),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (updateBookingStatus): $e');
    }
    return false;
  }

  // ---- Mes clients ----
  static Future<List<Map<String, dynamic>>> getMyClients() async {
    if (_salonId == null) return [];
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/clients'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) return List<Map<String, dynamic>>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (getMyClients): $e');
    }
    return [];
  }

  // ---- Mes employés ----
  static Future<List<Map<String, dynamic>>> getMyEmployees() async {
    if (_salonId == null) return [];
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/employees'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) return List<Map<String, dynamic>>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (getMyEmployees): $e');
    }
    return [];
  }

  static Future<bool> addEmployee(Map<String, dynamic> empData) async {
    if (_salonId == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/salon/$_salonId/employees'),
        headers: _authHeaders,
        body: jsonEncode(empData),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (addEmployee): $e');
    }
    return false;
  }

  static Future<bool> deleteEmployee(String empId) async {
    if (_salonId == null) return false;
    try {
      final res = await http.delete(Uri.parse('$_url/api/barber/salon/$_salonId/employees/$empId'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (deleteEmployee): $e');
    }
    return false;
  }

  // ---- Mes services ----
  static Future<List<Map<String, dynamic>>> getMyServices() async {
    if (_salonId == null) return [];
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/services'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) return List<Map<String, dynamic>>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (getMyServices): $e');
    }
    return [];
  }

  static Future<bool> addService(Map<String, dynamic> svcData) async {
    if (_salonId == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/salon/$_salonId/services'),
        headers: _authHeaders,
        body: jsonEncode(svcData),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (addService): $e');
    }
    return false;
  }

  static Future<bool> updateService(String svcId, Map<String, dynamic> updates) async {
    if (_salonId == null) return false;
    try {
      final res = await http.put(
        Uri.parse('$_url/api/barber/salon/$_salonId/services/$svcId'),
        headers: _authHeaders,
        body: jsonEncode(updates),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (updateService): $e');
    }
    return false;
  }

  static Future<bool> deleteService(String svcId) async {
    if (_salonId == null) return false;
    try {
      final res = await http.delete(Uri.parse('$_url/api/barber/salon/$_salonId/services/$svcId'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (deleteService): $e');
    }
    return false;
  }

  // ---- Branding ----
  static Future<bool> updateBranding(Map<String, dynamic> branding) async {
    if (_salonId == null) return false;
    try {
      final res = await http.put(
        Uri.parse('$_url/api/barber/salon/$_salonId/branding'),
        headers: _authHeaders,
        body: jsonEncode(branding),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (updateBranding): $e');
    }
    return false;
  }

  // ---- Testimonials ----
  static Future<bool> addTestimonial(Map<String, dynamic> data) async {
    if (_salonId == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/salon/$_salonId/testimonials'),
        headers: _authHeaders,
        body: jsonEncode(data),
      );
      final decoded = jsonDecode(res.body);
      return decoded['success'] == true;
    } catch (e) {
      debugPrint('API Error (addTestimonial): $e');
    }
    return false;
  }

  static Future<bool> updateTestimonial(String id, Map<String, dynamic> data) async {
    if (_salonId == null) return false;
    try {
      final res = await http.put(
        Uri.parse('$_url/api/barber/salon/$_salonId/testimonials/$id'),
        headers: _authHeaders,
        body: jsonEncode(data),
      );
      final decoded = jsonDecode(res.body);
      return decoded['success'] == true;
    } catch (e) {
      debugPrint('API Error (updateTestimonial): $e');
    }
    return false;
  }

  static Future<bool> deleteTestimonial(String id) async {
    if (_salonId == null) return false;
    try {
      final res = await http.delete(
        Uri.parse('$_url/api/barber/salon/$_salonId/testimonials/$id'),
        headers: _authHeaders,
      );
      final decoded = jsonDecode(res.body);
      return decoded['success'] == true;
    } catch (e) {
      debugPrint('API Error (deleteTestimonial): $e');
    }
    return false;
  }

  // ---- Gallery ----
  static Future<bool> addGalleryPhoto(String title, File image) async {
    if (_salonId == null || _token == null) return false;
    try {
      final request = http.MultipartRequest('POST', Uri.parse('$_url/api/barber/salon/$_salonId/gallery'));
      request.headers['Authorization'] = 'Bearer $_token';
      request.fields['title'] = title;
      request.files.add(await http.MultipartFile.fromPath('image', image.path));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final decoded = jsonDecode(response.body);
      return decoded['success'] == true;
    } catch (e) {
      debugPrint('API Error (addGalleryPhoto): $e');
    }
    return false;
  }

  static Future<bool> deleteGalleryPhoto(String id) async {
    if (_salonId == null) return false;
    try {
      final res = await http.delete(
        Uri.parse('$_url/api/barber/salon/$_salonId/gallery/$id'),
        headers: _authHeaders,
      );
      final decoded = jsonDecode(res.body);
      return decoded['success'] == true;
    } catch (e) {
      debugPrint('API Error (deleteGalleryPhoto): $e');
    }
    return false;
  }

  // ---- Créer un RDV ----
  static Future<Map<String, dynamic>?> createBooking(Map<String, dynamic> bookingData) async {
    if (_salonId == null) return null;
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/salon/$_salonId/bookings'),
        headers: _authHeaders,
        body: jsonEncode(bookingData),
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true) return Map<String, dynamic>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (createBooking): $e');
    }
    return null;
  }

  // ---- Recherche clients ----
  static Future<List<Map<String, dynamic>>> searchClients(String query) async {
    if (_salonId == null) return [];
    try {
      final uri = Uri.parse('$_url/api/barber/salon/$_salonId/clients/search')
          .replace(queryParameters: {'q': query});
      final res = await http.get(uri, headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) return List<Map<String, dynamic>>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (searchClients): $e');
    }
    return [];
  }

  // ---- Blocs (indisponibilités) ----
  static Future<List<Map<String, dynamic>>> getBlocks() async {
    if (_salonId == null) return [];
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/blocks'), headers: _authHeaders);
      final data = jsonDecode(res.body);
      if (data['success'] == true) return List<Map<String, dynamic>>.from(data['data']);
    } catch (e) {
      debugPrint('API Error (getBlocks): $e');
    }
    return [];
  }

  static Future<bool> createBlock(Map<String, dynamic> blockData) async {
    if (_salonId == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$_url/api/barber/salon/$_salonId/blocks'),
        headers: _authHeaders,
        body: jsonEncode(blockData),
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (createBlock): $e');
    }
    return false;
  }

  static Future<bool> deleteBlock(String blockId) async {
    if (_salonId == null) return false;
    try {
      final res = await http.delete(
        Uri.parse('$_url/api/barber/salon/$_salonId/blocks/$blockId'),
        headers: _authHeaders,
      );
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (deleteBlock): $e');
    }
    return false;
  }
}
