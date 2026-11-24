import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_text.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../widgets/booking_card.dart';
import 'booking_detail_screen.dart';
import 'employees_screen.dart';
import 'services_screen.dart';
import 'blocks_screen.dart';
import 'reviews_screen.dart';

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
          _todayBookings = _chronological(cachedBookings
              .map((j) => BookingModel.fromApi(Map<String, dynamic>.from(j)))
              .toList());
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
        _todayBookings = _chronological(bookingsJson.map((j) => BookingModel.fromApi(Map<String, dynamic>.from(j))).toList());
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
    final firstName =
        ApiService.currentUser?['name']?.split(' ').first ?? '';

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
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Row(
                    children: [
                      // Menu button top-left
                      Builder(
                        builder: (ctx) => Padding(
                          padding: const EdgeInsets.only(right: 14),
                          child: Material(
                            color: AppTheme.bgCard,
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(AppTheme.rMd),
                              side: const BorderSide(color: AppTheme.border),
                            ),
                            child: InkWell(
                              onTap: () => Scaffold.of(ctx).openDrawer(),
                              borderRadius:
                                  BorderRadius.circular(AppTheme.rMd),
                              child: const SizedBox(
                                width: 40,
                                height: 40,
                                child: Icon(Icons.menu_rounded,
                                    color: AppTheme.textPrimary, size: 20),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              firstName.isEmpty
                                  ? 'Bonjour'
                                  : 'Bonjour $firstName',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.label
                                  .copyWith(color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              ApiService.currentSalon?['name'] ?? 'Mon Salon',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.title,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _capitalize(dateStr),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.caption,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      _buildLogoAvatar(),
                    ],
                  ),
                ),

                // Error banner
                if (_error != null)
                  Container(
                    margin: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    padding: const EdgeInsets.fromLTRB(14, 4, 4, 4),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(AppTheme.rMd),
                      border: Border.all(color: AppTheme.error.withAlpha(90)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.wifi_off_rounded,
                            color: AppTheme.error, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style: AppText.label
                                .copyWith(color: AppTheme.error),
                          ),
                        ),
                        IconButton(
                          onPressed: _loadData,
                          tooltip: 'Réessayer',
                          icon: const Icon(Icons.refresh_rounded,
                              color: AppTheme.error, size: 20),
                        ),
                      ],
                    ),
                  ),

                // Stats
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppTheme.textPrimary,
                        strokeWidth: 2,
                      ),
                    ),
                  )
                else if (_hasError && _stats.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        vertical: 80, horizontal: 20),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.cloud_off_outlined,
                              size: 40, color: AppTheme.textMuted),
                          const SizedBox(height: 16),
                          Text(
                            'Impossible de charger les données',
                            textAlign: TextAlign.center,
                            style: AppText.body
                                .copyWith(color: AppTheme.textSecondary),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadData,
                            child: const Text('Réessayer'),
                          ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _StatTile(
                            icon: Icons.calendar_today_outlined,
                            label: 'RDV aujourd\'hui',
                            value: '${_stats['todayBookings'] ?? _todayBookings.length}',
                            subtitle: _todayBookings.isEmpty ? 'aucun pour l\'instant' : 'rendez-vous',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatTile(
                            icon: Icons.payments_outlined,
                            label: 'CA du jour',
                            value: _isEmptyAmount(_stats['todayRevenue'])
                                ? '—'
                                : '${_stats['todayRevenue']}',
                            unit: _isEmptyAmount(_stats['todayRevenue'])
                                ? null
                                : 'CHF',
                            subtitle: 'chiffre d\'affaires',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _StatTile(
                            icon: Icons.people_outline_rounded,
                            label: 'Clients',
                            value: '${_stats['totalClients'] ?? 0}',
                            subtitle: (_stats['totalClients'] == null || _stats['totalClients'] == 0)
                                ? 'aucun client encore'
                                : 'clients enregistrés',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatTile(
                            icon: Icons.trending_up_rounded,
                            label: 'CA total',
                            value: _isEmptyAmount(_stats['totalRevenue'])
                                ? '—'
                                : '${_stats['totalRevenue']}',
                            unit: _isEmptyAmount(_stats['totalRevenue'])
                                ? null
                                : 'CHF',
                            subtitle: 'revenus cumulés',
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
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Planning du jour',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.heading,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.bgSurface,
                            borderRadius: BorderRadius.circular(AppTheme.rSm),
                          ),
                          child: Text(
                            '${_todayBookings.length} RDV',
                            maxLines: 1,
                            style: AppText.num(AppText.label)
                                .copyWith(color: AppTheme.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_todayBookings.isEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 28),
                        decoration: BoxDecoration(
                          color: AppTheme.bgCard,
                          borderRadius: BorderRadius.circular(AppTheme.rMd),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.event_available_outlined,
                                size: 28, color: AppTheme.textMuted),
                            const SizedBox(height: 12),
                            Text(
                              'Aucun rendez-vous aujourd\'hui',
                              textAlign: TextAlign.center,
                              style: AppText.body
                                  .copyWith(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Les réservations depuis le site\net l\'admin apparaîtront ici',
                              textAlign: TextAlign.center,
                              style: AppText.label.copyWith(
                                fontWeight: FontWeight.w400,
                                color: AppTheme.textMuted,
                                height: 1.45,
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

  static bool _isEmptyAmount(dynamic v) => v == null || v == 0;

  static String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  Widget _buildLogoAvatar() {
    final logoUrl = ApiService.currentSalon?['logo'] as String?;
    if (logoUrl != null && logoUrl.isNotEmpty) {
      return Container(
        width: 44,
        height: 44,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(AppTheme.rMd),
          border: Border.all(color: AppTheme.border),
        ),
        child: Image.network(
          logoUrl,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _defaultAvatar(),
        ),
      );
    }
    return _defaultAvatar();
  }

  Widget _defaultAvatar() {
    final name = ApiService.currentSalon?['name'] as String? ?? 'S';
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(AppTheme.rMd),
        border: Border.all(color: AppTheme.border),
      ),
      child: Center(
        child: Text(
          name.isEmpty ? 'S' : name[0].toUpperCase(),
          style: AppText.heading,
        ),
      ),
    );
  }

  // The API returns bookings latest-first: the day's planning must read in
  // time order, and "next appointment" must be the earliest upcoming one.
  static List<BookingModel> _chronological(List<BookingModel> list) =>
      list..sort((a, b) => a.dateTime.compareTo(b.dateTime));

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

    // White card with a 3px accent bar on the left (no gradient, no glow).
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(AppTheme.rMd),
          border: Border.all(color: AppTheme.border),
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 3, color: AppTheme.primary),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Prochain rendez-vous',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.caption.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          SizedBox(
                            width: 64,
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                timeStr,
                                maxLines: 1,
                                softWrap: false,
                                style: AppText.num(AppText.title),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppTheme.bgSurface,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.rSm),
                            ),
                            child: Center(
                              child: Text(next.serviceIcon,
                                  style: const TextStyle(fontSize: 18)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  next.clientName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppText.body
                                      .copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  next.serviceName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppText.label.copyWith(
                                    fontWeight: FontWeight.w400,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${next.price.toInt()} CHF',
                            maxLines: 1,
                            style: AppText.num(AppText.body)
                                .copyWith(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    Widget item(IconData icon, String label, VoidCallback onTap) => ListTile(
          leading: Icon(icon, color: AppTheme.textSecondary, size: 22),
          title: Text(label,
              style: AppText.body.copyWith(fontWeight: FontWeight.w500)),
          onTap: onTap,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
        );

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
                  Image.asset('assets/images/logo.png', width: 32, height: 32),
                  const SizedBox(width: 12),
                  Text('Kreno', style: AppText.title),
                ],
              ),
            ),
            const Divider(height: 24),
            item(Icons.group_outlined, 'Équipe', () {
              Navigator.pop(context);
              Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const EmployeesScreen()));
            }),
            item(Icons.content_cut_outlined, 'Services', () {
              Navigator.pop(context);
              Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ServicesScreen()));
            }),
            item(Icons.event_busy_outlined, 'Créneaux bloqués', () {
              Navigator.pop(context);
              Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BlocksScreen()));
            }),
            item(Icons.star_outline_rounded, 'Avis clients', () {
              Navigator.pop(context);
              Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ReviewsScreen()));
            }),
            const Spacer(),
            const Divider(),
            item(Icons.privacy_tip_outlined, 'Politique de confidentialité', () {
              Navigator.pop(context);
              launchUrl(
                Uri.parse('https://kreno.ch/privacy'),
                mode: LaunchMode.externalApplication,
              );
            }),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Text('Version 1.0 · Kreno', style: AppText.caption),
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

/// Flat stat card: white, radius rMd, 1px border, padding 16.
class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.subtitle,
    this.unit,
  });

  final IconData icon;
  final String label;
  final String value;
  final String? unit;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.rMd),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.label.copyWith(color: AppTheme.textSecondary),
                ),
              ),
              const SizedBox(width: 6),
              Icon(icon, size: 16, color: AppTheme.textMuted),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text.rich(
                TextSpan(
                  text: value,
                  children: [
                    if (unit != null)
                      TextSpan(
                        text: ' $unit',
                        style: AppText.label
                            .copyWith(color: AppTheme.textSecondary),
                      ),
                  ],
                ),
                maxLines: 1,
                softWrap: false,
                style: AppText.num(AppText.display),
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppText.caption,
          ),
        ],
      ),
    );
  }
}
