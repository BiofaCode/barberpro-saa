import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../widgets/booking_card.dart';
import 'booking_detail_screen.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<BookingModel> _allBookings = [];
  bool _loading = true;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() => _loading = true);
    final bookings = await ApiService.getMyBookings();
    setState(() {
      _allBookings = bookings;
      _loading = false;
    });
  }

  List<BookingModel> get _upcomingBookings => _allBookings
      .where((b) =>
          b.status != BookingStatus.completed &&
          b.status != BookingStatus.cancelled)
      .toList()
    ..sort((a, b) => a.dateTime.compareTo(b.dateTime));

  List<BookingModel> get _completedBookings => _allBookings
      .where((b) => b.status == BookingStatus.completed)
      .toList()
    ..sort((a, b) => b.dateTime.compareTo(a.dateTime));

  List<BookingModel> get _cancelledBookings => _allBookings
      .where((b) => b.status == BookingStatus.cancelled)
      .toList()
    ..sort((a, b) => b.dateTime.compareTo(a.dateTime));

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Rendez-vous',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  GestureDetector(
                    onTap: _loadBookings,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.refresh_rounded,
                          color: AppTheme.primary, size: 20),
                    ),
                  ),
                ],
              ),
            ),

            // Horizontal Date Picker
            SizedBox(
              height: 90,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                itemCount: 14,
                itemBuilder: (context, index) {
                  final date = DateTime.now().add(Duration(days: index - 2));
                  final isSelected = date.day == _selectedDate.day &&
                      date.month == _selectedDate.month &&
                      date.year == _selectedDate.year;
                  final isToday = date.day == DateTime.now().day &&
                      date.month == DateTime.now().month;

                  return GestureDetector(
                    onTap: () => setState(() => _selectedDate = date),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 52,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        color:
                            isSelected ? AppTheme.primary : AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(14),
                        border: isToday && !isSelected
                            ? Border.all(
                                color: AppTheme.primary.withAlpha(77))
                            : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            DateFormat('E', 'fr_FR').format(date).toUpperCase(),
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isSelected
                                  ? AppTheme.bgDark
                                  : AppTheme.textMuted,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${date.day}',
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? AppTheme.bgDark
                                  : AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Tabs
            TabBar(
              controller: _tabController,
              indicatorColor: AppTheme.primary,
              indicatorWeight: 2,
              labelColor: AppTheme.primary,
              unselectedLabelColor: AppTheme.textMuted,
              labelStyle: GoogleFonts.outfit(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
              tabs: [
                Tab(text: 'À venir (${_upcomingBookings.length})'),
                Tab(text: 'Terminés (${_completedBookings.length})'),
                Tab(text: 'Annulés (${_cancelledBookings.length})'),
              ],
            ),

            // Content
            Expanded(
              child: _loading
                  ? const Center(
                      child:
                          CircularProgressIndicator(color: AppTheme.primary),
                    )
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildBookingList(
                            _upcomingBookings, 'Aucun rendez-vous à venir'),
                        _buildBookingList(
                            _completedBookings, 'Aucun rendez-vous terminé'),
                        _buildBookingList(
                            _cancelledBookings, 'Aucune annulation'),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingList(List<BookingModel> bookings, String emptyMsg) {
    if (bookings.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('📅', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 12),
            Text(
              emptyMsg,
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppTheme.primary,
      onRefresh: _loadBookings,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        itemCount: bookings.length,
        itemBuilder: (context, index) {
          final booking = bookings[index];
          return BookingCard(
            booking: booking,
            onTap: () => _openBookingDetail(booking),
          );
        },
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
            _loadBookings();
          },
        ),
      ),
    );
  }
}
