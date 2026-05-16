import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';
import 'services/api_service.dart';
import 'services/push_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Fire-and-forget warmup ping — wakes Render server while user types login,
  // so the first authenticated call doesn't pay the cold-start latency.
  ApiService.warmupServer();

  // Init Firebase + push handlers. Wrapped in try/catch so a missing config
  // (e.g. fresh clone before flutterfire configure) does not block app launch.
  try {
    await Firebase.initializeApp();
    await PushService.init();
  } catch (e) {
    debugPrint('Firebase init skipped: $e');
  }

  await initializeDateFormatting('fr_FR', null);
  Intl.defaultLocale = 'fr_FR';
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  // Checking for persistent login
  final isLoggedIn = await ApiService.loadSession();
  // If we have a persisted session, also (re)register the push token in case
  // FCM rotated it while logged in on another device.
  if (isLoggedIn) PushService.registerToken();

  runApp(KrenoApp(isLoggedIn: isLoggedIn));
}

class KrenoApp extends StatelessWidget {
  final bool isLoggedIn;
  const KrenoApp({super.key, this.isLoggedIn = false});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Color>(
      valueListenable: AppTheme.primaryNotifier,
      builder: (context, primaryColor, _) => MaterialApp(
        title: 'Kreno',
        debugShowCheckedModeBanner: false,
        navigatorKey: PushService.navigatorKey,
        theme: AppTheme.themeFor(primaryColor),
        locale: const Locale('fr', 'FR'),
        supportedLocales: const [Locale('fr', 'FR'), Locale('en', 'US')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: isLoggedIn ? const HomeScreen() : const LoginScreen(),
      ),
    );
  }
}
