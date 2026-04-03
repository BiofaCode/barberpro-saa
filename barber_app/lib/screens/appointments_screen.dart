import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';
import '../widgets/booking_card.dart';
import 'booking_detail_screen.dart';

enum _ViewMode { list, day, week }

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
  _ViewMode _viewMode = _ViewMode.day; // Vue jour par défaut

  DateTime _selectedDate = DateTime.now();       // pour la vue liste
  DateTime _calendarDayDate = DateTime.now();    // pour la vue jour
  DateTime _calendarWeekStart = _getMondayOf(DateTime.now()); // pour la vue semaine

  static DateTime _getMondayOf(DateTime date) {
    final monday = date.subtract(Duration(days: date.weekday - 1));
    return DateTime(monday.year, monday.month, monday.day);
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

    // Auto-complétion : marquer localement les RDV passés comme terminés
    // Délai de 2 min pour éviter les faux positifs sur les RDV venant d'être créés
    final now = DateTime.now();
    final graceCutoff = now.subtract(const Duration(minutes: 2));
    final autoCompletedIds = <String>{};
    for (final b in bookings) {
      if (b.status != BookingStatus.completed && b.status != BookingStatus.cancelled) {
        final endTime = b.dateTime.add(Duration(minutes: b.durationMinutes));
        if (endTime.isBefore(graceCutoff)) {
          ApiService.updateBookingStatus(b.id, 'completed'); // fire & forget
          autoCompletedIds.add(b.id);
        }
      }
    }

    setState(() {
      _allBookings = bookings.map((b) => autoCompletedIds.contains(b.id)
          ? b.copyWith(status: BookingStatus.completed)
          : b).toList();
      _loading = false;
    });
  }

  // ── Filtres ──────────────────────────────────────────────────────────────

  List<BookingModel> _bookingsForDate(DateTime date) {
    return _allBookings.where((b) =>
        b.dateTime.year == date.year &&
        b.dateTime.month == date.month &&
        b.dateTime.day == date.day).toList();
  }

  List<BookingModel> get _upcomingBookings =>
      _bookingsForDate(_selectedDate)
          .where((b) => b.status != BookingStatus.completed && b.status != BookingStatus.cancelled)
          .toList()
        ..sort((a, b) => a.dateTime.compareTo(b.dateTime));

  List<BookingModel> get _completedBookings =>
      _bookingsForDate(_selectedDate)
          .where((b) => b.status == BookingStatus.completed)
          .toList()
        ..sort((a, b) => b.dateTime.compareTo(a.dateTime));

  List<BookingModel> get _cancelledBookings =>
      _bookingsForDate(_selectedDate)
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
            // ── Header ──────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 16, 0),
              child: Row(
                children: [
                  Text(
                    'Rendez-vous',
                    style: GoogleFonts.bricolageGrotesque(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const Spacer(),
                  // Toggle views (icônes uniquement pour éviter l'overflow)
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: AppTheme.bgSurface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(children: [
                      _ViewBtn(
                        icon: Icons.view_day_rounded,
                        tooltip: 'Jour',
                        active: _viewMode == _ViewMode.day,
                        onTap: () => setState(() {
                          _viewMode = _ViewMode.day;
                          _calendarDayDate = DateTime.now();
                        }),
                      ),
                      _ViewBtn(
                        icon: Icons.view_list_rounded,
                        tooltip: 'Liste',
                        active: _viewMode == _ViewMode.list,
                        onTap: () => setState(() => _viewMode = _ViewMode.list),
                      ),
                      _ViewBtn(
                        icon: Icons.calendar_view_week_rounded,
                        tooltip: 'Semaine',
                        active: _viewMode == _ViewMode.week,
                        onTap: () => setState(() {
                          _viewMode = _ViewMode.week;
                          _calendarWeekStart = _getMondayOf(DateTime.now());
                        }),
                      ),
                    ]),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _loadBookings,
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Icon(Icons.refresh_rounded, color: AppTheme.primary, size: 18),
                    ),
                  ),
                ],
              ),
            ),

            // ── Date strip (liste) ───────────────────────────────
            if (_viewMode == _ViewMode.list)
              _buildListDateStrip(),

            // ── Tabs (liste) ─────────────────────────────────────
            if (_viewMode == _ViewMode.list)
              TabBar(
                controller: _tabController,
                indicatorColor: AppTheme.primary,
                indicatorWeight: 2,
                labelColor: AppTheme.primary,
                unselectedLabelColor: AppTheme.textMuted,
                labelStyle: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 12),
                tabs: [
                  Tab(text: 'À venir (${_upcomingBookings.length})'),
                  Tab(text: 'Terminés (${_completedBookings.length})'),
                  Tab(text: 'Annulés (${_cancelledBookings.length})'),
                ],
              ),

            // ── Content ──────────────────────────────────────────
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : _viewMode == _ViewMode.week
                      ? _buildWeekCalendarView()
                      : _viewMode == _ViewMode.day
                          ? _buildDayCalendarView()
                          : TabBarView(
                              controller: _tabController,
                              children: [
                                _buildBookingList(_upcomingBookings, 'Aucun rendez-vous à venir'),
                                _buildBookingList(_completedBookings, 'Aucun rendez-vous terminé'),
                                _buildBookingList(_cancelledBookings, 'Aucune annulation'),
                              ],
                            ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LISTE : date strip horizontal
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildListDateStrip() {
    return SizedBox(
      height: 88,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
        itemCount: 14,
        itemBuilder: (context, i) {
          final date = DateTime.now().add(Duration(days: i - 2));
          final isSelected = _isSameDay(date, _selectedDate);
          final isToday = _isSameDay(date, DateTime.now());
          return GestureDetector(
            onTap: () => setState(() => _selectedDate = date),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 52,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primary : AppTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: isToday && !isSelected
                    ? Border.all(color: AppTheme.primary.withAlpha(70))
                    : Border.all(color: AppTheme.border),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(
                  DateFormat('E', 'fr_FR').format(date).toUpperCase(),
                  style: GoogleFonts.dmSans(
                    fontSize: 10, fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white.withAlpha(200) : AppTheme.textMuted,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '${date.day}',
                  style: GoogleFonts.bricolageGrotesque(
                    fontSize: 18, fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppTheme.textPrimary,
                  ),
                ),
              ]),
            ),
          );
        },
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE JOUR : week header Google Calendar style + grille verticale
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildDayCalendarView() {
    return Column(
      children: [
        _buildDayWeekHeader(),
        Expanded(
          child: GestureDetector(
            onHorizontalDragEnd: (details) {
              if (details.primaryVelocity == null) return;
              if (details.primaryVelocity! < -300) {
                setState(() => _calendarDayDate = _calendarDayDate.add(const Duration(days: 1)));
              } else if (details.primaryVelocity! > 300) {
                setState(() => _calendarDayDate = _calendarDayDate.subtract(const Duration(days: 1)));
              }
            },
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
                        child: Stack(children: [
                          _buildDayGridLines(),
                          _buildDayColumnHighlight(),
                          _buildDayBookingBlocks(),
                          _buildDayCurrentTimeIndicator(),
                        ]),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Week header : Lun–Dim avec navigation, style Google Calendar
  Widget _buildDayWeekHeader() {
    final weekStart = _getMondayOf(_calendarDayDate);
    const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    final now = DateTime.now();

    return Container(
      padding: const EdgeInsets.fromLTRB(8, 10, 8, 10),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          // Bouton semaine précédente
          _calNavBtn(Icons.chevron_left_rounded, () => setState(() {
            _calendarDayDate = _calendarDayDate.subtract(const Duration(days: 7));
          })),

          // Jours
          ...List.generate(7, (i) {
            final day = weekStart.add(Duration(days: i));
            final isSelected = _isSameDay(day, _calendarDayDate);
            final isToday = _isSameDay(day, now);
            final count = _bookingsForDate(day).length;

            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _calendarDayDate = day),
                behavior: HitTestBehavior.opaque,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      letters[i],
                      style: GoogleFonts.dmSans(
                        fontSize: 10, fontWeight: FontWeight.w600,
                        color: isSelected
                            ? AppTheme.primary
                            : isToday
                                ? AppTheme.primary
                                : AppTheme.textMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.primary
                            : (isToday ? AppTheme.primaryLight : Colors.transparent),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${day.day}',
                          style: GoogleFonts.bricolageGrotesque(
                            fontSize: 15, fontWeight: FontWeight.w700,
                            color: isSelected
                                ? Colors.white
                                : (isToday ? AppTheme.primary : AppTheme.textPrimary),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 3),
                    if (count > 0)
                      Container(
                        width: 5, height: 5,
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white : AppTheme.primary,
                          shape: BoxShape.circle,
                        ),
                      )
                    else
                      const SizedBox(height: 5),
                  ],
                ),
              ),
            );
          }),

          // Bouton semaine suivante
          _calNavBtn(Icons.chevron_right_rounded, () => setState(() {
            _calendarDayDate = _calendarDayDate.add(const Duration(days: 7));
          })),
        ],
      ),
    );
  }

  Widget _buildDayGridLines() {
    final total = _endHour - _startHour;
    return Stack(children: [
      ...List.generate(total + 1, (i) => Positioned(
        top: i * _hourHeight, left: 0, right: 0,
        child: Container(height: 1, color: AppTheme.border.withAlpha(120)),
      )),
      ...List.generate(total, (i) => Positioned(
        top: i * _hourHeight + _hourHeight / 2, left: 0, right: 0,
        child: Container(height: 1, color: AppTheme.border.withAlpha(50)),
      )),
    ]);
  }

  Widget _buildDayColumnHighlight() {
    if (!_isSameDay(_calendarDayDate, DateTime.now())) return const SizedBox.shrink();
    return Positioned.fill(child: Container(color: AppTheme.primary.withAlpha(8)));
  }

  Widget _buildDayCurrentTimeIndicator() {
    final now = DateTime.now();
    if (!_isSameDay(_calendarDayDate, now) || now.hour < _startHour || now.hour >= _endHour) {
      return const SizedBox.shrink();
    }
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
    final dayBookings = _bookingsForDate(_calendarDayDate)
      ..sort((a, b) => a.dateTime.compareTo(b.dateTime));

    if (dayBookings.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.only(top: 80),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('📅', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 12),
              Text(
                _isSameDay(_calendarDayDate, DateTime.now())
                    ? 'Aucun RDV aujourd\'hui'
                    : 'Aucun RDV ce jour',
                style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    return Stack(
      children: dayBookings.map((booking) {
        if (booking.dateTime.hour < _startHour || booking.dateTime.hour >= _endHour) {
          return const SizedBox.shrink();
        }
        final top = (booking.dateTime.hour - _startHour + booking.dateTime.minute / 60.0) * _hourHeight;
        final height = (booking.durationMinutes / 60.0) * _hourHeight;
        final color = _bookingColor(booking.status);

        final blockHeight = height < 40 ? 40.0 : height;
        return Positioned(
          top: top, left: 4, right: 4,
          height: blockHeight,
          child: GestureDetector(
            onTap: () => _openBookingDetail(booking),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                decoration: BoxDecoration(
                  color: color.withAlpha(28),
                  borderRadius: BorderRadius.circular(10),
                  border: Border(left: BorderSide(color: color, width: 4)),
                ),
                padding: const EdgeInsets.fromLTRB(10, 4, 6, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(children: [
                      Text(booking.serviceIcon, style: const TextStyle(fontSize: 11)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(booking.serviceName,
                            style: GoogleFonts.dmSans(
                              fontSize: 12, fontWeight: FontWeight.w700, color: color),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ]),
                    if (blockHeight >= 52) ...[
                      Text(booking.clientName,
                          style: GoogleFonts.dmSans(fontSize: 10, color: color.withAlpha(200)),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      Text(
                        '${DateFormat('HH:mm').format(booking.dateTime)} → ${DateFormat('HH:mm').format(booking.endTime)}',
                        style: GoogleFonts.dmSans(fontSize: 9, color: color.withAlpha(160)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE SEMAINE
  // ═══════════════════════════════════════════════════════════════════════

  static const double _hourHeight      = 72.0;
  static const double _timeAxisWidth   = 48.0;
  static const double _dayColumnWidth  = 96.0;
  static const int    _startHour       = 8;
  static const int    _endHour         = 20;

  Widget _buildWeekCalendarView() {
    return Column(
      children: [
        _buildWeekNavBar(),
        _buildWeekDayHeaders(),
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
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: SizedBox(
                          width: _dayColumnWidth * 7,
                          height: _hourHeight * (_endHour - _startHour),
                          child: Stack(children: [
                            _buildGridLines(),
                            _buildWeekColumnHighlights(),
                            _buildAllWeekBookingBlocks(),
                            _buildWeekCurrentTimeIndicator(),
                          ]),
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

  Widget _buildWeekNavBar() {
    final weekEnd = _calendarWeekStart.add(const Duration(days: 6));
    final fmt = DateFormat('d MMM', 'fr_FR');
    final label = '${_cap(fmt.format(_calendarWeekStart))} — ${_cap(fmt.format(weekEnd))}';
    final isCurrentWeek = _isSameDay(_calendarWeekStart, _getMondayOf(DateTime.now()));

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      child: Row(children: [
        _calNavBtn(Icons.chevron_left_rounded, () => setState(() =>
            _calendarWeekStart = _calendarWeekStart.subtract(const Duration(days: 7)))),
        Expanded(
          child: Center(
            child: Text(label,
                style: GoogleFonts.dmSans(
                    fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          ),
        ),
        if (!isCurrentWeek)
          GestureDetector(
            onTap: () => setState(() => _calendarWeekStart = _getMondayOf(DateTime.now())),
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                  color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(20)),
              child: Text("Auj.",
                  style: GoogleFonts.dmSans(
                      fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary)),
            ),
          ),
        _calNavBtn(Icons.chevron_right_rounded, () => setState(() =>
            _calendarWeekStart = _calendarWeekStart.add(const Duration(days: 7)))),
      ]),
    );
  }

  Widget _buildWeekDayHeaders() {
    const dayLetters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    final now = DateTime.now();
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(children: [
        SizedBox(width: _timeAxisWidth),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            child: SizedBox(
              width: _dayColumnWidth * 7,
              child: Row(
                children: List.generate(7, (i) {
                  final day = _calendarWeekStart.add(Duration(days: i));
                  final isToday = _isSameDay(day, now);
                  final count = _bookingsForDate(day).length;
                  return SizedBox(
                    width: _dayColumnWidth,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      color: isToday ? AppTheme.primary.withAlpha(12) : Colors.transparent,
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(dayLetters[i],
                            style: GoogleFonts.dmSans(
                                fontSize: 10, fontWeight: FontWeight.w600,
                                color: isToday ? AppTheme.primary : AppTheme.textMuted)),
                        const SizedBox(height: 3),
                        Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                            color: isToday ? AppTheme.primary : Colors.transparent,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text('${day.day}',
                                style: GoogleFonts.bricolageGrotesque(
                                    fontSize: 14, fontWeight: FontWeight.w700,
                                    color: isToday ? Colors.white : AppTheme.textPrimary)),
                          ),
                        ),
                        if (count > 0) ...[
                          const SizedBox(height: 2),
                          Container(
                            width: 4, height: 4,
                            decoration: BoxDecoration(
                                color: isToday ? AppTheme.primary : AppTheme.primary.withAlpha(150),
                                shape: BoxShape.circle),
                          ),
                        ] else
                          const SizedBox(height: 6),
                      ]),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildTimeAxis() {
    return Stack(
      children: List.generate(_endHour - _startHour + 1, (i) {
        final hour = _startHour + i;
        return Positioned(
          top: i * _hourHeight - 8, left: 0, right: 0,
          child: Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Text(
              '${hour.toString().padLeft(2, '0')}:00',
              textAlign: TextAlign.right,
              style: GoogleFonts.dmSans(
                  fontSize: 9, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildGridLines() {
    final total = _endHour - _startHour;
    return Stack(children: [
      ...List.generate(total + 1, (i) => Positioned(
        top: i * _hourHeight, left: 0, right: 0,
        child: Container(height: 1, color: AppTheme.border.withAlpha(120)),
      )),
      ...List.generate(total, (i) => Positioned(
        top: i * _hourHeight + _hourHeight / 2, left: 0, right: 0,
        child: Container(height: 1, color: AppTheme.border.withAlpha(50)),
      )),
      ...List.generate(7, (i) => Positioned(
        top: 0, bottom: 0, left: i * _dayColumnWidth,
        child: Container(width: 1, color: AppTheme.border.withAlpha(80)),
      )),
    ]);
  }

  Widget _buildWeekColumnHighlights() {
    final now = DateTime.now();
    return Stack(
      children: List.generate(7, (i) {
        final day = _calendarWeekStart.add(Duration(days: i));
        if (!_isSameDay(day, now)) return const SizedBox.shrink();
        return Positioned(
          top: 0, bottom: 0, left: i * _dayColumnWidth, width: _dayColumnWidth,
          child: Container(color: AppTheme.primary.withAlpha(8)),
        );
      }),
    );
  }

  Widget _buildWeekCurrentTimeIndicator() {
    final now = DateTime.now();
    if (now.hour < _startHour || now.hour >= _endHour) return const SizedBox.shrink();
    int col = -1;
    for (int i = 0; i < 7; i++) {
      if (_isSameDay(_calendarWeekStart.add(Duration(days: i)), now)) { col = i; break; }
    }
    if (col == -1) return const SizedBox.shrink();
    final top = (now.hour - _startHour + now.minute / 60.0) * _hourHeight;
    return Positioned(
      top: top, left: col * _dayColumnWidth, width: _dayColumnWidth,
      child: Row(children: [
        Container(width: 7, height: 7, decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle)),
        Expanded(child: Container(height: 2, color: AppTheme.error)),
      ]),
    );
  }

  Widget _buildAllWeekBookingBlocks() {
    final weekEnd = _calendarWeekStart.add(const Duration(days: 7));
    final weekBookings = _allBookings.where((b) =>
        !b.dateTime.isBefore(_calendarWeekStart) && b.dateTime.isBefore(weekEnd)).toList();

    return Stack(
      children: weekBookings.map((booking) {
        final col = booking.dateTime.difference(_calendarWeekStart).inDays;
        if (col < 0 || col > 6) return const SizedBox.shrink();
        if (booking.dateTime.hour < _startHour || booking.dateTime.hour >= _endHour) {
          return const SizedBox.shrink();
        }
        final top = (booking.dateTime.hour - _startHour + booking.dateTime.minute / 60.0) * _hourHeight;
        final height = (booking.durationMinutes / 60.0) * _hourHeight;
        final color = _bookingColor(booking.status);

        final wkHeight = height < 26 ? 26.0 : height;
        return Positioned(
          top: top, left: col * _dayColumnWidth + 2, width: _dayColumnWidth - 4,
          height: wkHeight,
          child: GestureDetector(
            onTap: () => _openBookingDetail(booking),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Container(
                decoration: BoxDecoration(
                  color: color.withAlpha(28),
                  borderRadius: BorderRadius.circular(6),
                  border: Border(left: BorderSide(color: color, width: 3)),
                ),
                padding: const EdgeInsets.fromLTRB(5, 3, 4, 3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(booking.serviceName,
                        style: GoogleFonts.dmSans(
                            fontSize: 10, fontWeight: FontWeight.w700, color: color),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    if (wkHeight >= 42)
                      Text(DateFormat('HH:mm').format(booking.dateTime),
                          style: GoogleFonts.dmSans(
                              fontSize: 9, color: color.withAlpha(180), fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LISTE : booking list
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildBookingList(List<BookingModel> bookings, String emptyMsg) {
    if (bookings.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('📅', style: TextStyle(fontSize: 44)),
            const SizedBox(height: 12),
            Text(emptyMsg,
                style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: AppTheme.primary,
      onRefresh: _loadBookings,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        itemCount: bookings.length,
        itemBuilder: (context, i) => BookingCard(
          booking: bookings[i],
          onTap: () => _openBookingDetail(bookings[i]),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════

  Future<void> _openBookingDetail(BookingModel booking) async {
    await BookingDetailSheet.show(context, booking);
    _loadBookings();
  }

  Color _bookingColor(BookingStatus status) {
    switch (status) {
      case BookingStatus.completed:  return const Color(0xFF2563EB);
      case BookingStatus.cancelled:  return AppTheme.error;
      case BookingStatus.inProgress: return AppTheme.success;
      default:                       return AppTheme.primary;
    }
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  String _cap(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  Widget _calNavBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.border),
        ),
        child: Icon(icon, size: 18, color: AppTheme.textSecondary),
      ),
    );
  }
}

// ── Toggle button ─────────────────────────────────────────────────────────────

class _ViewBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool active;
  final VoidCallback onTap;
  const _ViewBtn({required this.icon, required this.tooltip, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: active ? AppTheme.bgCard : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: active ? AppTheme.shadowSm : null,
          ),
          child: Icon(icon, size: 18, color: active ? AppTheme.primary : AppTheme.textMuted),
        ),
      ),
    );
  }
}
