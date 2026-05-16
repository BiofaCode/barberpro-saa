import 'dart:convert';
import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../theme/app_theme.dart';
import 'api_service.dart';

// Background handler must be a top-level function annotated with @pragma.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  debugPrint('📩 BG push: ${message.notification?.title}');
}

class PushService {
  static final FirebaseMessaging _fm = FirebaseMessaging.instance;
  static String? _currentToken;

  // Global navigator key — set in main.dart — so we can navigate from a tap
  // when the app was launched from a notification.
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  // Called once at app startup, before runApp.
  static Future<void> init() async {
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    // Request permission (iOS). On Android 13+, this also prompts.
    await _fm.requestPermission(alert: true, badge: true, sound: true);

    // iOS: ensure APNs token is ready before asking for FCM token.
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      await _fm.getAPNSToken();
    }

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onMessageTap);

    // If the app was opened from a notification (cold start):
    final initial = await _fm.getInitialMessage();
    if (initial != null) _onMessageTap(initial);

    _fm.onTokenRefresh.listen((newToken) {
      _currentToken = newToken;
      _registerOnBackend(newToken);
    });
  }

  // Called from ApiService.login after a successful auth.
  static Future<void> registerToken() async {
    try {
      final token = await _fm.getToken();
      if (token == null) return;
      _currentToken = token;
      await _registerOnBackend(token);
    } catch (e) {
      debugPrint('PushService.registerToken error: $e');
    }
  }

  // Called from ApiService.logout to drop the token server-side.
  static Future<void> clearToken() async {
    if (_currentToken == null) return;
    try {
      await http.delete(
        Uri.parse('${ApiService.currentServerUrl}/api/pro/push-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${ApiService.authToken ?? ''}',
        },
        body: jsonEncode({'token': _currentToken}),
      ).timeout(const Duration(seconds: 10));
    } catch (e) {
      debugPrint('PushService.clearToken error: $e');
    }
    _currentToken = null;
  }

  static Future<void> _registerOnBackend(String token) async {
    final auth = ApiService.authToken;
    if (auth == null) return; // not logged in — try again on next login
    final platform = Platform.isIOS ? 'ios' : (Platform.isAndroid ? 'android' : 'other');
    try {
      await http.post(
        Uri.parse('${ApiService.currentServerUrl}/api/pro/push-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $auth',
        },
        body: jsonEncode({'token': token, 'platform': platform}),
      ).timeout(const Duration(seconds: 15));
    } catch (e) {
      debugPrint('PushService._registerOnBackend error: $e');
    }
  }

  static void _onForegroundMessage(RemoteMessage message) {
    final ctx = navigatorKey.currentContext;
    if (ctx == null) return;
    final title = message.notification?.title ?? 'Notification';
    final body = message.notification?.body ?? '';
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
              style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
            if (body.isNotEmpty)
              Text(body,
                style: GoogleFonts.dmSans(color: Colors.white.withAlpha(220), fontSize: 13)),
          ],
        ),
        backgroundColor: AppTheme.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 5),
      ),
    );
  }

  static void _onMessageTap(RemoteMessage message) {
    // For all notification types, just navigate to root (HomeScreen with
    // AppointmentsScreen by default). The app is already authenticated.
    debugPrint('🔔 Tap on notification: ${message.data}');
    // Navigation deferred to first frame so the navigator is mounted.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      navigatorKey.currentState?.popUntil((r) => r.isFirst);
    });
  }
}
