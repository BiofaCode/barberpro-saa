import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../widgets/stat_card.dart';
import '../widgets/booking_card.dart';
import 'booking_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<BookingModel> _todayBookings = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final results = await Future.wait([
        ApiService.getMyBookings(date: today),
        ApiService.getMyStats(),
      ]);

      setState(() {
        _todayBookings = results[0] as List<BookingModel>;
        _stats = results[1] as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Impossible de se connecter au serveur';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(DateTime.now());

    return Scaffold(
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
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bonjour ${ApiService.currentUser?['name']?.split(' ').first ?? ''} 👋',
                              style: GoogleFonts.outfit(
                                fontSize: 15,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            Text(
                              ApiService.currentSalon?['name'] ?? 'Mon Salon',
                              style: GoogleFonts.playfairDisplay(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            Text(
                              dateStr,
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, AppTheme.primaryDark],
                          ),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Center(
                          child: Text('✂️', style: TextStyle(fontSize: 22)),
                        ),
                      ),
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
                        const Icon(Icons.wifi_off_rounded,
                            color: AppTheme.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              color: AppTheme.error,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: _loadData,
                          child: const Icon(Icons.refresh_rounded,
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
                      child: CircularProgressIndicator(color: AppTheme.primary),
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
                            subtitle: 'rendez-vous',
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatCard(
                            icon: Icons.euro_rounded,
                            label: 'CA du jour',
                            value: '${_stats['todayRevenue'] ?? 0} CHF',
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
                            subtitle: 'total clients',
                            color: Colors.blueAccent,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatCard(
                            icon: Icons.trending_up_rounded,
                            label: 'CA total',
                            value: '${_stats['totalRevenue'] ?? 0} CHF',
                            subtitle: 'total revenus',
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
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                    child: Text(
                      '📋 Planning du jour',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
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
                              style: GoogleFonts.outfit(
                                fontSize: 15,
                                color: AppTheme.textMuted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Les réservations depuis le site\net l\'admin apparaîtront ici',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.outfit(
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
          gradient: LinearGradient(
            colors: [
              AppTheme.primary.withAlpha(31),
              AppTheme.primary.withAlpha(8),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.primary.withAlpha(51)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '⏰ Prochain rendez-vous',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(next.serviceIcon,
                    style: const TextStyle(fontSize: 30)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        next.clientName,
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Text(
                        '${next.serviceName} · $timeStr',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${next.price.toInt()} CHF',
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _openBookingDetail(BookingModel booking) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BookingDetailScreen(
          booking: booking,
          onStatusChanged: (newStatus) async {
            await ApiService.updateBookingStatus(
                booking.id, booking.copyWith(status: newStatus).statusString);
            _loadData();
          },
        ),
      ),
    );
  }
}
