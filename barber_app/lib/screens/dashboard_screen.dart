import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../widgets/stat_card.dart';
import '../widgets/booking_card.dart';
import 'booking_detail_screen.dart';
import 'employees_screen.dart';
import 'services_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => DashboardScreenState();
}

class DashboardScreenState extends State<DashboardScreen> {
  List<BookingModel> _todayBookings = [];
  Map<String, dynamic> _stats = {};
  // Show spinner only on first load when we have nothing cached.
  // Subsequent reloads (pull-to-refresh, tab switch) refresh silently.
  bool _loading = false;
  bool _firstLoadDone = false;
  String? _error;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void reload() => _loadData();

  Future<void> _loadData() async {
    // Hydrate from cache first so the dashboard is never blank on cold-start.
    if (!_firstLoadDone && _stats.isEmpty && _todayBookings.isEmpty) {
      final cached = await ApiService.getCachedBootstrap();
      if (!mounted) return;
      if (cached != null) {
        final cachedBookings = (cached['todayBookings'] as List?) ?? [];
        final cachedStats = Map<String, dynamic>.from(cached['stats'] ?? {});
        setState(() {
          _todayBookings = cachedBookings
              .map((j) => BookingModel.fromApi(Map<String, dynamic>.from(j)))
              .toList();
          _stats = cachedStats;
          _loading = false;
          _firstLoadDone = true;
        });
      } else {
        setState(() {
          _loading = true;
          _error = null;
          _hasError = false;
        });
      }
    } else {
      setState(() {
        _error = null;
        _hasError = false;
      });
    }

    try {
      final payload = await ApiService.getBootstrap();
      if (!mounted) return;
      if (payload == null) throw Exception('bootstrap failed');

      final bookingsJson = (payload['todayBookings'] as List?) ?? [];
      final stats = Map<String, dynamic>.from(payload['stats'] ?? {});

      setState(() {
        _todayBookings = bookingsJson.map((j) => BookingModel.fromApi(Map<String, dynamic>.from(j))).toList();
        _stats = stats;
        _loading = false;
        _firstLoadDone = true;
      });
    } catch (e) {
      if (!mounted) return;
      // If we already have cached data on screen, keep it and silently fail.
      if (_stats.isNotEmpty || _todayBookings.isNotEmpty) {
        setState(() {
          _loading = false;
          _firstLoadDone = true;
        });
        return;
      }
      setState(() {
        _error = 'Impossible de se connecter au serveur';
        _hasError = true;
        _loading = false;
        _firstLoadDone = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(DateTime.now());

    return Scaffold(
      drawer: _buildDrawer(context),
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: _loadData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Row(
                    children: [
                      // Menu button top-left
                      Builder(
                        builder: (ctx) => GestureDetector(
                          onTap: () => Scaffold.of(ctx).openDrawer(),
                          child: Container(
                            margin: const EdgeInsets.only(right: 14),
                            padding: const EdgeInsets.all(9),
                            decoration: BoxDecoration(
                              color: AppTheme.bgCard,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.menu_rounded,
                                color: AppTheme.textPrimary, size: 20),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bonjour ${ApiService.currentUser?['name']?.split(' ').first ?? ''} 👋',
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              ApiService.currentSalon?['name'] ?? 'Mon Salon',
                              style: GoogleFonts.bricolageGrotesque(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              dateStr,
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _buildLogoAvatar(),
                    ],
                  ),
                ),

                // Error banner
                if (_error != null)
                  Container(
                    margin: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.error.withAlpha(51)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.wifi_off_rounded,
                            color: AppTheme.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style: GoogleFonts.dmSans(
                              fontSize: 13,
                              color: AppTheme.error,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: _loadData,
                          child: Icon(Icons.refresh_rounded,
                              color: AppTheme.error, size: 20),
                        ),
                      ],
                    ),
                  ),

                // Stats
                if (_loading)
                  Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(
                      child: CircularProgressIndicator(color: AppTheme.primary),
                    ),
                  )
                else if (_hasError && _stats.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 80),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.cloud_off_rounded,
                              size: 56, color: AppTheme.textMuted),
                          const SizedBox(height: 16),
                          Text(
                            'Impossible de charger les données',
                            style: GoogleFonts.dmSans(
                              fontSize: 15,
                              color: AppTheme.textMuted,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadData,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 12),
                            ),
                            child: Text('Réessayer',
                                style: GoogleFonts.dmSans(
                                    fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: StatCard(
                            icon: Icons.calendar_today_rounded,
                            label: 'RDV aujourd\'hui',
                            value: '${_stats['todayBookings'] ?? _todayBookings.length}',
                            subtitle: _todayBookings.isEmpty ? 'aucun pour l\'instant' : 'rendez-vous',
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatCard(
                            icon: Icons.euro_rounded,
                            label: 'CA du jour',
                            value: (_stats['todayRevenue'] == null || _stats['todayRevenue'] == 0)
                                ? '—'
                                : '${_stats['todayRevenue']} CHF',
                            subtitle: 'chiffre d\'affaires',
                            color: AppTheme.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: StatCard(
                            icon: Icons.people_rounded,
                            label: 'Clients',
                            value: '${_stats['totalClients'] ?? 0}',
                            subtitle: (_stats['totalClients'] == null || _stats['totalClients'] == 0)
                                ? 'aucun client encore'
                                : 'clients enregistrés',
                            color: Colors.blueAccent,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatCard(
                            icon: Icons.trending_up_rounded,
                            label: 'CA total',
                            value: (_stats['totalRevenue'] == null || _stats['totalRevenue'] == 0)
                                ? '—'
                                : '${_stats['totalRevenue']} CHF',
                            subtitle: 'revenus cumulés',
                            color: AppTheme.warning,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Next appointment
                  if (_todayBookings.isNotEmpty) ...[
                    _buildNextAppointment(),
                  ],

                  // Today's schedule
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Planning du jour',
                          style: GoogleFonts.bricolageGrotesque(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryLight,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${_todayBookings.length} RDV',
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_todayBookings.isEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                      child: Center(
                        child: Column(
                          children: [
                            const Text('📅', style: TextStyle(fontSize: 48)),
                            const SizedBox(height: 12),
                            Text(
                              'Aucun rendez-vous aujourd\'hui',
                              style: GoogleFonts.dmSans(
                                fontSize: 15,
                                color: AppTheme.textMuted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Les réservations depuis le site\net l\'admin apparaîtront ici',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                color: AppTheme.textMuted,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                      itemCount: _todayBookings.length,
                      itemBuilder: (context, index) {
                        final booking = _todayBookings[index];
                        return BookingCard(
                          booking: booking,
                          onTap: () => _openBookingDetail(booking),
                        );
                      },
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoAvatar() {
    final logoUrl = ApiService.currentSalon?['logo'] as String?;
    if (logoUrl != null && logoUrl.isNotEmpty) {
      return Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: AppTheme.border, width: 1.5),
          boxShadow: AppTheme.shadowSm,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            logoUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _defaultAvatar(),
          ),
        ),
      );
    }
    return _defaultAvatar();
  }

  Widget _defaultAvatar() {
    final name = ApiService.currentSalon?['name'] as String? ?? 'S';
    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(13),
        boxShadow: const [
          BoxShadow(
            color: Color(0x335850E8),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          name[0].toUpperCase(),
          style: GoogleFonts.bricolageGrotesque(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildNextAppointment() {
    final now = DateTime.now();
    final upcoming = _todayBookings
        .where((b) =>
            b.dateTime.isAfter(now) &&
            b.status != BookingStatus.completed &&
            b.status != BookingStatus.cancelled)
        .toList();

    if (upcoming.isEmpty) return const SizedBox.shrink();

    final next = upcoming.first;
    final timeStr = DateFormat('HH:mm').format(next.dateTime);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.primary,
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(
              color: Color(0x405850E8),
              blurRadius: 20,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Prochain rendez-vous',
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withAlpha(180),
                    letterSpacing: 0.3,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(30),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    timeStr,
                    style: GoogleFonts.bricolageGrotesque(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(next.serviceIcon,
                        style: const TextStyle(fontSize: 22)),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        next.clientName,
                        style: GoogleFonts.bricolageGrotesque(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        next.serviceName,
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: Colors.white.withAlpha(180),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${next.price.toInt()} CHF',
                  style: GoogleFonts.bricolageGrotesque(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: AppTheme.bgCard,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(
                children: [
                  Image.asset('assets/images/logo.png', width: 36, height: 36),
                  const SizedBox(width: 12),
                  Text('Kreno',
                    style: GoogleFonts.bricolageGrotesque(
                      fontSize: 22, fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    )),
                ],
              ),
            ),
            const Divider(height: 24),
            ListTile(
              leading: Icon(Icons.group_rounded, color: AppTheme.textSecondary, size: 22),
              title: Text('Équipe',
                style: GoogleFonts.dmSans(
                    fontSize: 15, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const EmployeesScreen()));
              },
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
            ),
            ListTile(
              leading: Icon(Icons.spa_rounded, color: AppTheme.textSecondary, size: 22),
              title: Text('Services',
                style: GoogleFonts.dmSans(
                    fontSize: 15, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ServicesScreen()));
              },
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
            ),
            const Spacer(),
            const Divider(),
            ListTile(
              leading: Icon(Icons.privacy_tip_outlined, color: AppTheme.textSecondary, size: 22),
              title: Text('Politique de confidentialité',
                style: GoogleFonts.dmSans(
                    fontSize: 15, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                launchUrl(
                  Uri.parse('https://kreno.ch/privacy'),
                  mode: LaunchMode.externalApplication,
                );
              },
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Text('Version 1.0 · Kreno',
                style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openBookingDetail(BookingModel booking) async {
    await BookingDetailSheet.show(context, booking);
    _loadData();
  }
}
