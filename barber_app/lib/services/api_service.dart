import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';

class ApiService {
  // URL du serveur
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000';
    return 'http://10.0.2.2:3000'; // Android emulator
  }

  static String? _customUrl;
  static void setBaseUrl(String url) => _customUrl = url;
  static String get _url => _customUrl ?? baseUrl;

  // Barbier connecté
  static String? _token;
  static String? _salonId;
  static Map<String, dynamic>? _currentUser;
  static Map<String, dynamic>? _currentSalon;

  static String? get salonId => _salonId;
  static Map<String, dynamic>? get currentUser => _currentUser;
  static Map<String, dynamic>? get currentSalon => _currentSalon;
  static bool get isLoggedIn => _token != null && _salonId != null;

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
        return true;
      }
    } catch (e) {
      debugPrint('Login error: $e');
    }
    return false;
  }

  static void logout() {
    _token = null;
    _salonId = null;
    _currentUser = null;
    _currentSalon = null;
  }

  // ---- Mon salon ----
  static Future<Map<String, dynamic>?> getMySalon() async {
    if (_salonId == null) return null;
    try {
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId'));
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
        headers: {'Content-Type': 'application/json'},
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
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/stats'));
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
      final res = await http.get(uri);
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
        headers: {'Content-Type': 'application/json'},
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
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/clients'));
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
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/employees'));
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
        headers: {'Content-Type': 'application/json'},
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
      final res = await http.delete(Uri.parse('$_url/api/barber/salon/$_salonId/employees/$empId'));
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
      final res = await http.get(Uri.parse('$_url/api/barber/salon/$_salonId/services'));
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
        headers: {'Content-Type': 'application/json'},
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
        headers: {'Content-Type': 'application/json'},
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
      final res = await http.delete(Uri.parse('$_url/api/barber/salon/$_salonId/services/$svcId'));
      final data = jsonDecode(res.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('API Error (deleteService): $e');
    }
    return false;
  }
}
