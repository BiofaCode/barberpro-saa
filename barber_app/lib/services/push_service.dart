import 'dart:convert';
import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';
import '../screens/booking_detail_screen.dart';
import '../screens/reviews_screen.dart';
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

    // iOS: try to get APNs token but don't block startup if it's slow.
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      await _fm.getAPNSToken().timeout(
        const Duration(seconds: 5),
        onTimeout: () => null,
      );
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

    // If user already has a session (persistent login), register token now
    // that Firebase is ready — avoids the race condition with non-blocking init.
    await registerToken();
  }

  // Called from ApiService.login after a successful auth.
  static Future<void> registerToken() async {
    String? token;
    for (int attempt = 1; attempt <= 3; attempt++) {
      try {
        // On iOS, wait briefly for APNs token before asking FCM for its token.
        if (defaultTargetPlatform == TargetPlatform.iOS) {
          await _fm.getAPNSToken().timeout(
            const Duration(seconds: 10),
            onTimeout: () => null,
          );
        }
        await _fm.deleteToken();
        token = await _fm.getToken().timeout(
          const Duration(seconds: 20),
          onTimeout: () => null,
        );
      } catch (e) {
        debugPrint('PushService.registerToken attempt $attempt error: $e');
      }
      if (token != null) break;
      if (attempt < 3) await Future.delayed(Duration(seconds: attempt * 5));
    }
    if (token == null) return;
    _currentToken = token;
    await _registerOnBackend(token);
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
    debugPrint('🔔 Tap on notification: ${message.data}');
    final type = message.data['type']?.toString();
    final bookingId = message.data['bookingId']?.toString();

    // Deferred to first frame so the navigator is mounted (cold-start case).
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final navigator = navigatorKey.currentState;
      if (navigator == null) return;
      // Always return to root first so the detail sheet stacks on a clean state.
      navigator.popUntil((r) => r.isFirst);

      // A new review notification opens the moderation screen.
      if (type == 'review' && ApiService.isLoggedIn) {
        navigator.push(MaterialPageRoute(builder: (_) => const ReviewsScreen()));
        return;
      }

      // For booking events, fetch the booking and open the detail sheet.
      if ((type == 'booking' || type == 'cancellation') &&
          bookingId != null && bookingId.isNotEmpty) {
        // Cold start: the persisted session may still be loading when the tap
        // is handled. Wait briefly for it before giving up.
        for (int i = 0; i < 10 && !ApiService.isLoggedIn; i++) {
          await Future.delayed(const Duration(milliseconds: 200));
        }
        if (!ApiService.isLoggedIn) return;

        // Fetch with retries: at cold start the Render server can be waking up,
        // so the first request may fail/timeout. Retry with backoff before
        // showing an error.
        BookingModel? booking;
        for (int attempt = 1; attempt <= 3 && booking == null; attempt++) {
          booking = await ApiService.getBookingById(bookingId);
          if (booking == null && attempt < 3) {
            await Future.delayed(Duration(milliseconds: 600 * attempt));
          }
        }

        final ctx = navigatorKey.currentContext;
        if (ctx == null || !ctx.mounted) return;
        if (booking == null) {
          ScaffoldMessenger.of(ctx).showSnackBar(
            SnackBar(
              content: Text(
                'Impossible d\'ouvrir le rendez-vous (connexion ?)',
                style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w500),
              ),
              backgroundColor: AppTheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              margin: const EdgeInsets.all(16),
            ),
          );
          return;
        }
        await BookingDetailSheet.show(ctx, booking);
      }
    });
  }
}
