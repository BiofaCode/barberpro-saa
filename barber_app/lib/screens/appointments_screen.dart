import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../widgets/booking_card.dart';
import 'booking_detail_screen.dart';

enum _ViewMode { list, week, day }

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => AppointmentsScreenState();
}

class AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<BookingModel> _allBookings = [];
  bool _loading = true;
  _ViewMode _viewMode = _ViewMode.list;
  DateTime _selectedDate = DateTime.now();
  DateTime _calendarWeekStart = _getMondayOf(DateTime.now());
  DateTime _calendarDayDate = DateTime.now();

  static DateTime _getMondayOf(DateTime date) {
    final monday = date.subtract(Duration(days: date.weekday - 1));
    return DateTime(monday.year, monday.month, monday.day); // truncate to midnight
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadBookings();
  }

  void reload() => _loadBookings();

  Future<void> _loadBookings() async {
    setState(() => _loading = true);
    final bookings = await ApiService.getMyBookings();
    // Auto-complete past bookings silently
    final now = DateTime.now();
    for (final b in bookings) {
      if (b.status != BookingStatus.completed &&
          b.status != BookingStatus.cancelled) {
        final endTime = b.dateTime.add(Duration(minutes: b.durationMinutes));
        if (endTime.isBefore(now)) {
          ApiService.updateBookingStatus(b.id, 'completed'); // fire and forget
        }
      }
    }
    setState(() {
      _allBookings = bookings;
      _loading = false;
    });
  }

  List<BookingModel> _bookingsForDate(BookingStatus? status,
      {bool upcoming = false}) {
    return _allBookings.where((b) {
      final sameDay = b.dateTime.year == _selectedDate.year &&
          b.dateTime.month == _selectedDate.month &&
          b.dateTime.day == _selectedDate.day;
      if (!sameDay) return false;
      if (upcoming) {
        return b.status != BookingStatus.completed &&
            b.status != BookingStatus.cancelled;
      }
      if (status != null) return b.status == status;
      return true;
    }).toList();
  }

  List<BookingModel> get _upcomingBookings =>
      _bookingsForDate(null, upcoming: true)
        ..sort((a, b) => a.dateTime.compareTo(b.dateTime));

  List<BookingModel> get _completedBookings =>
      _bookingsForDate(BookingStatus.completed)
        ..sort((a, b) => b.dateTime.compareTo(a.dateTime));

  List<BookingModel> get _cancelledBookings =>
      _bookingsForDate(BookingStatus.cancelled)
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
                  Row(
                    children: [
                      // 3-mode toggle row
                      Row(children: [
                        _ViewToggleBtn(icon: Icons.view_list_rounded, active: _viewMode == _ViewMode.list, onTap: () => setState(() => _viewMode = _ViewMode.list)),
                        const SizedBox(width: 6),
                        _ViewToggleBtn(icon: Icons.calendar_view_week_rounded, active: _viewMode == _ViewMode.week, onTap: () => setState(() { _viewMode = _ViewMode.week; _calendarWeekStart = _getMondayOf(DateTime.now()); })),
                        const SizedBox(width: 6),
                        _ViewToggleBtn(icon: Icons.calendar_today_rounded, active: _viewMode == _ViewMode.day, onTap: () => setState(() { _viewMode = _ViewMode.day; _calendarDayDate = DateTime.now(); })),
                      ]),
                      const SizedBox(width: 8),
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
                ],
              ),
            ),

            // Horizontal Date Picker (list view only)
            if (_viewMode == _ViewMode.list)
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
                                    ? Colors.white
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

            // Tabs (list mode only)
            if (_viewMode == _ViewMode.list)
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
                      child: CircularProgressIndicator(color: AppTheme.primary),
                    )
                  : _viewMode == _ViewMode.week
                      ? _buildWeekCalendarView()
                      : _viewMode == _ViewMode.day
                          ? _buildDayCalendarView()
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

  // ─────────────────────────────────────────────────────────────
  //  WEEKLY CALENDAR VIEW
  // ─────────────────────────────────────────────────────────────

  static const double _hourHeight = 80.0; // pixels per hour
  static const double _timeAxisWidth = 50.0;
  static const double _dayColumnWidth = 110.0;
  static const int _startHour = 8;
  static const int _endHour = 20; // exclusive, so 20:00 is the bottom line

  Widget _buildWeekCalendarView() {
    return Column(
      children: [
        _buildWeekNavBar(),
        _buildDayHeaders(),
        Expanded(
          child: RefreshIndicator(
            color: AppTheme.primary,
            onRefresh: _loadBookings,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: _hourHeight * (_endHour - _startHour),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Fixed time axis
                    SizedBox(
                      width: _timeAxisWidth,
                      child: _buildTimeAxis(),
                    ),
                    // Scrollable 7-day grid
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: SizedBox(
                          width: _dayColumnWidth * 7,
                          height: _hourHeight * (_endHour - _startHour),
                          child: Stack(
                            children: [
                              _buildGridLines(),
                              _buildDayColumns(),
                              _buildAllBookingBlocks(),
                              _buildCurrentTimeIndicator(),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  DAILY CALENDAR VIEW
  // ─────────────────────────────────────────────────────────────

  Widget _buildDayCalendarView() {
    return Column(
      children: [
        _buildDayNavBar(),
        Expanded(
          child: RefreshIndicator(
            color: AppTheme.primary,
            onRefresh: _loadBookings,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: _hourHeight * (_endHour - _startHour),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: _timeAxisWidth, child: _buildTimeAxis()),
                    Expanded(
                      child: Stack(
                        children: [
                          _buildDayGridLines(),
                          _buildDayColumnHighlight(),
                          _buildDayBookingBlocks(),
                          _buildDayCurrentTimeIndicator(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDayNavBar() {
    final fmt = DateFormat('EEEE d MMMM yyyy', 'fr_FR');
    final now = DateTime.now();
    final isToday = _calendarDayDate.year == now.year &&
        _calendarDayDate.month == now.month &&
        _calendarDayDate.day == now.day;
    final label = _capitalizeFirst(fmt.format(_calendarDayDate));
    final count = _bookingsForWeekDay(_calendarDayDate).length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      child: Row(
        children: [
          _navButton(
            icon: Icons.chevron_left_rounded,
            onTap: () => setState(() => _calendarDayDate = _calendarDayDate.subtract(const Duration(days: 1))),
          ),
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600, color: isToday ? AppTheme.primary : AppTheme.textPrimary)),
                  if (count > 0)
                    Text('$count rendez-vous', style: GoogleFonts.outfit(fontSize: 11, color: AppTheme.textMuted)),
                ],
              ),
            ),
          ),
          if (!isToday)
            GestureDetector(
              onTap: () => setState(() => _calendarDayDate = DateTime.now()),
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: AppTheme.primary.withAlpha(20), borderRadius: BorderRadius.circular(20)),
                child: Text("Auj.", style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary)),
              ),
            ),
          _navButton(
            icon: Icons.chevron_right_rounded,
            onTap: () => setState(() => _calendarDayDate = _calendarDayDate.add(const Duration(days: 1))),
          ),
        ],
      ),
    );
  }

  Widget _buildDayGridLines() {
    final totalHours = _endHour - _startHour;
    return Stack(
      children: [
        ...List.generate(totalHours + 1, (i) => Positioned(
          top: i * _hourHeight, left: 0, right: 0,
          child: Container(height: 1, color: AppTheme.border.withAlpha(120)),
        )),
        ...List.generate(totalHours, (i) => Positioned(
          top: i * _hourHeight + _hourHeight / 2, left: 0, right: 0,
          child: Container(height: 1, color: AppTheme.border.withAlpha(50)),
        )),
      ],
    );
  }

  Widget _buildDayColumnHighlight() {
    final now = DateTime.now();
    final isToday = _calendarDayDate.year == now.year &&
        _calendarDayDate.month == now.month &&
        _calendarDayDate.day == now.day;
    if (!isToday) return const SizedBox.shrink();
    return Positioned.fill(child: Container(color: AppTheme.primary.withAlpha(8)));
  }

  Widget _buildDayCurrentTimeIndicator() {
    final now = DateTime.now();
    final isToday = _calendarDayDate.year == now.year &&
        _calendarDayDate.month == now.month &&
        _calendarDayDate.day == now.day;
    if (!isToday || now.hour < _startHour || now.hour >= _endHour) return const SizedBox.shrink();
    final top = (now.hour - _startHour + now.minute / 60.0) * _hourHeight;
    return Positioned(
      top: top, left: 0, right: 0,
      child: Row(children: [
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle)),
        Expanded(child: Container(height: 2, color: AppTheme.error)),
      ]),
    );
  }

  Widget _buildDayBookingBlocks() {
    final dayBookings = _bookingsForWeekDay(_calendarDayDate);
    return Stack(
      children: dayBookings.map((booking) {
        if (booking.dateTime.hour < _startHour || booking.dateTime.hour >= _endHour) {
          return const SizedBox.shrink();
        }
        final topOffset = (booking.dateTime.hour - _startHour + booking.dateTime.minute / 60.0) * _hourHeight;
        final blockHeight = (booking.durationMinutes / 60.0) * _hourHeight;
        final Color blockColor;
        switch (booking.status) {
          case BookingStatus.completed: blockColor = AppTheme.success; break;
          case BookingStatus.cancelled: blockColor = AppTheme.error; break;
          default: blockColor = AppTheme.primary;
        }
        return Positioned(
          top: topOffset, left: 4, right: 4,
          height: blockHeight < 28 ? 28 : blockHeight,
          child: GestureDetector(
            onTap: () => _openBookingDetail(booking),
            child: Container(
              decoration: BoxDecoration(
                color: blockColor.withAlpha(30),
                borderRadius: BorderRadius.circular(8),
                border: Border(left: BorderSide(color: blockColor, width: 4)),
              ),
              padding: const EdgeInsets.fromLTRB(10, 4, 8, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(booking.serviceName, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: blockColor), maxLines: 1, overflow: TextOverflow.ellipsis),
                  if (blockHeight >= 44) ...[
                    Text(booking.clientName, style: GoogleFonts.dmSans(fontSize: 11, color: blockColor.withAlpha(200)), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text('${DateFormat('HH:mm').format(booking.dateTime)} — ${DateFormat('HH:mm').format(booking.endTime)}', style: GoogleFonts.outfit(fontSize: 10, color: blockColor.withAlpha(160))),
                  ],
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // Week navigation bar
  Widget _buildWeekNavBar() {
    final weekEnd = _calendarWeekStart.add(const Duration(days: 6));
    final fmt = DateFormat('d MMM', 'fr_FR');
    final label =
        '${_capitalizeFirst(fmt.format(_calendarWeekStart))} — ${_capitalizeFirst(fmt.format(weekEnd))}';

    final now = DateTime.now();
    final isCurrentWeek = _calendarWeekStart.year == _getMondayOf(now).year &&
        _calendarWeekStart.month == _getMondayOf(now).month &&
        _calendarWeekStart.day == _getMondayOf(now).day;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      child: Row(
        children: [
          // Previous week
          _navButton(
            icon: Icons.chevron_left_rounded,
            onTap: () => setState(() => _calendarWeekStart =
                _calendarWeekStart.subtract(const Duration(days: 7))),
          ),
          // Week label
          Expanded(
            child: Center(
              child: Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
          ),
          // Today button
          if (!isCurrentWeek)
            GestureDetector(
              onTap: () => setState(
                  () => _calendarWeekStart = _getMondayOf(DateTime.now())),
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withAlpha(20),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  "Aujourd'hui",
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primary,
                  ),
                ),
              ),
            ),
          // Next week
          _navButton(
            icon: Icons.chevron_right_rounded,
            onTap: () => setState(() => _calendarWeekStart =
                _calendarWeekStart.add(const Duration(days: 7))),
          ),
        ],
      ),
    );
  }

  Widget _navButton(
      {required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.border),
        ),
        child: Icon(icon, size: 20, color: AppTheme.textSecondary),
      ),
    );
  }

  // Day-of-week sub-header
  Widget _buildDayHeaders() {
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    final now = DateTime.now();

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(bottom: BorderSide(color: AppTheme.border, width: 1)),
      ),
      child: Row(
        children: [
          // Spacer for time axis
          SizedBox(width: _timeAxisWidth),
          // Day columns header — scrollable to match body
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              child: SizedBox(
                width: _dayColumnWidth * 7,
                child: Row(
                  children: List.generate(7, (i) {
                    final day = _calendarWeekStart.add(Duration(days: i));
                    final isToday = day.year == now.year &&
                        day.month == now.month &&
                        day.day == now.day;
                    final bookingsCount = _bookingsForWeekDay(day).length;

                    return SizedBox(
                      width: _dayColumnWidth,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isToday
                              ? AppTheme.primary.withAlpha(12)
                              : Colors.transparent,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              dayNames[i],
                              style: GoogleFonts.outfit(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isToday
                                    ? AppTheme.primary
                                    : AppTheme.textMuted,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Container(
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(
                                color: isToday
                                    ? AppTheme.primary
                                    : Colors.transparent,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  '${day.day}',
                                  style: GoogleFonts.outfit(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isToday
                                        ? Colors.white
                                        : AppTheme.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                            if (bookingsCount > 0) ...[
                              const SizedBox(height: 3),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: isToday
                                      ? AppTheme.primary
                                      : AppTheme.primary.withAlpha(30),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '$bookingsCount',
                                  style: GoogleFonts.outfit(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: isToday
                                        ? Colors.white
                                        : AppTheme.primary,
                                  ),
                                ),
                              ),
                            ] else
                              const SizedBox(height: 14),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Time axis (left column)
  Widget _buildTimeAxis() {
    return Stack(
      children: List.generate(_endHour - _startHour + 1, (i) {
        final hour = _startHour + i;
        return Positioned(
          top: i * _hourHeight - 8,
          left: 0,
          right: 0,
          child: Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Text(
              '${hour.toString().padLeft(2, '0')}:00',
              textAlign: TextAlign.right,
              style: GoogleFonts.outfit(
                fontSize: 10,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        );
      }),
    );
  }

  // Horizontal grid lines
  Widget _buildGridLines() {
    final totalHours = _endHour - _startHour;
    return Stack(
      children: [
        // Full-hour lines
        ...List.generate(totalHours + 1, (i) {
          return Positioned(
            top: i * _hourHeight,
            left: 0,
            right: 0,
            child: Container(
              height: 1,
              color: AppTheme.border.withAlpha(120),
            ),
          );
        }),
        // Half-hour dashed lines
        ...List.generate(totalHours, (i) {
          return Positioned(
            top: i * _hourHeight + _hourHeight / 2,
            left: 0,
            right: 0,
            child: Container(
              height: 1,
              color: AppTheme.border.withAlpha(50),
            ),
          );
        }),
        // Vertical column separators
        ...List.generate(7, (i) {
          return Positioned(
            top: 0,
            bottom: 0,
            left: i * _dayColumnWidth,
            child: Container(
              width: 1,
              color: AppTheme.border.withAlpha(80),
            ),
          );
        }),
      ],
    );
  }

  // Today column highlight
  Widget _buildDayColumns() {
    final now = DateTime.now();
    return Stack(
      children: List.generate(7, (i) {
        final day = _calendarWeekStart.add(Duration(days: i));
        final isToday = day.year == now.year &&
            day.month == now.month &&
            day.day == now.day;
        if (!isToday) return const SizedBox.shrink();
        return Positioned(
          top: 0,
          bottom: 0,
          left: i * _dayColumnWidth,
          width: _dayColumnWidth,
          child: Container(
            color: AppTheme.primary.withAlpha(8),
          ),
        );
      }),
    );
  }

  // Current time red indicator
  Widget _buildCurrentTimeIndicator() {
    final now = DateTime.now();
    if (now.hour < _startHour || now.hour >= _endHour) {
      return const SizedBox.shrink();
    }

    // Find which column today falls in
    int todayColumnIndex = -1;
    for (int i = 0; i < 7; i++) {
      final day = _calendarWeekStart.add(Duration(days: i));
      if (day.year == now.year &&
          day.month == now.month &&
          day.day == now.day) {
        todayColumnIndex = i;
        break;
      }
    }
    if (todayColumnIndex == -1) return const SizedBox.shrink();

    final top = (now.hour - _startHour + now.minute / 60.0) * _hourHeight;

    return Positioned(
      top: top,
      left: todayColumnIndex * _dayColumnWidth,
      width: _dayColumnWidth,
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppTheme.error,
              shape: BoxShape.circle,
            ),
          ),
          Expanded(
            child: Container(
              height: 2,
              color: AppTheme.error,
            ),
          ),
        ],
      ),
    );
  }

  // All booking blocks for the week
  Widget _buildAllBookingBlocks() {
    final weekBookings = _allBookings.where((b) {
      final weekEnd = _calendarWeekStart.add(const Duration(days: 7));
      return !b.dateTime.isBefore(_calendarWeekStart) &&
          b.dateTime.isBefore(weekEnd);
    }).toList();

    return Stack(
      children: weekBookings.map((booking) {
        // Which column?
        final dayIndex = booking.dateTime
            .difference(_calendarWeekStart)
            .inDays;
        if (dayIndex < 0 || dayIndex > 6) return const SizedBox.shrink();

        final topOffset =
            (booking.dateTime.hour - _startHour + booking.dateTime.minute / 60.0) *
                _hourHeight;
        final blockHeight =
            (booking.durationMinutes / 60.0) * _hourHeight;

        // Only show if within visible time range
        if (booking.dateTime.hour < _startHour ||
            booking.dateTime.hour >= _endHour) {
          return const SizedBox.shrink();
        }

        final Color blockColor;
        switch (booking.status) {
          case BookingStatus.completed:
            blockColor = AppTheme.success;
            break;
          case BookingStatus.cancelled:
            blockColor = AppTheme.error;
            break;
          default:
            blockColor = AppTheme.primary;
        }

        return Positioned(
          top: topOffset,
          left: dayIndex * _dayColumnWidth + 2,
          width: _dayColumnWidth - 4,
          height: blockHeight < 24 ? 24 : blockHeight,
          child: GestureDetector(
            onTap: () => _openBookingDetail(booking),
            child: Container(
              decoration: BoxDecoration(
                color: blockColor.withAlpha(30),
                borderRadius: BorderRadius.circular(6),
                border: Border(
                  left: BorderSide(color: blockColor, width: 3),
                ),
              ),
              padding: const EdgeInsets.fromLTRB(5, 3, 4, 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    booking.serviceName,
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: blockColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (blockHeight >= 40)
                    Text(
                      DateFormat('HH:mm').format(booking.dateTime),
                      style: GoogleFonts.outfit(
                        fontSize: 9,
                        color: blockColor.withAlpha(180),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  List<BookingModel> _bookingsForWeekDay(DateTime day) {
    return _allBookings.where((b) {
      return b.dateTime.year == day.year &&
          b.dateTime.month == day.month &&
          b.dateTime.day == day.day;
    }).toList();
  }

  String _capitalizeFirst(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }

  // ─────────────────────────────────────────────────────────────
  //  LIST VIEW
  // ─────────────────────────────────────────────────────────────

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

class _ViewToggleBtn extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  const _ViewToggleBtn({required this.icon, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: active ? AppTheme.primary.withAlpha(30) : AppTheme.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: active ? AppTheme.primary.withAlpha(80) : Colors.transparent),
        ),
        child: Icon(icon, color: active ? AppTheme.primary : AppTheme.textMuted, size: 18),
      ),
    );
  }
}
