import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';

/// Affiche les détails d'un RDV dans un bottom sheet.
/// Usage: await BookingDetailSheet.show(context, booking);
class BookingDetailSheet extends StatefulWidget {
  final BookingModel booking;

  const BookingDetailSheet({super.key, required this.booking});

  static Future<void> show(BuildContext context, BookingModel booking) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => BookingDetailSheet(booking: booking),
    );
  }

  @override
  State<BookingDetailSheet> createState() => _BookingDetailSheetState();
}

class _BookingDetailSheetState extends State<BookingDetailSheet> {
  late BookingStatus _currentStatus;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.booking.status;
  }

  Future<void> _changeStatus(BookingStatus newStatus) async {
    HapticFeedback.mediumImpact();
    setState(() => _saving = true);
    final statusStr = widget.booking.copyWith(status: newStatus).statusString;
    await ApiService.updateBookingStatus(widget.booking.id, statusStr);
    if (mounted) setState(() { _currentStatus = newStatus; _saving = false; });
  }

  Future<void> _reschedule() async {
    final now = DateTime.now();
    final currentDt = widget.booking.dateTime;

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: currentDt.isAfter(now) ? currentDt : now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppTheme.primary,
            onPrimary: Colors.white,
            surface: AppTheme.bgCard,
            onSurface: AppTheme.textPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: currentDt.hour, minute: currentDt.minute),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppTheme.primary,
            onPrimary: Colors.white,
            surface: AppTheme.bgCard,
            onSurface: AppTheme.textPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (pickedTime == null || !mounted) return;

    setState(() => _saving = true);
    final dateStr = DateFormat('yyyy-MM-dd').format(pickedDate);
    final timeStr =
        '${pickedTime.hour.toString().padLeft(2, '0')}:${pickedTime.minute.toString().padLeft(2, '0')}';

    final ok = await ApiService.rescheduleBooking(widget.booking.id, dateStr, timeStr);
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('RDV reprogrammé au $dateStr à $timeStr',
              style: GoogleFonts.dmSans()),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur lors du reprogrammation',
              style: GoogleFonts.dmSans()),
          backgroundColor: AppTheme.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Annuler le rendez-vous ?',
            style: GoogleFonts.bricolageGrotesque(
                fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        content: Text(
          'Le client sera notifié de l\'annulation.',
          style: GoogleFonts.dmSans(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Garder', style: GoogleFonts.dmSans(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _changeStatus(BookingStatus.cancelled);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Annuler le RDV'),
          ),
        ],
      ),
    );
  }

  Future<void> _launch(String url, String fallback) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(fallback)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(fallback)));
      }
    }
  }

  Color get _statusColor {
    switch (_currentStatus) {
      case BookingStatus.pending:    return AppTheme.warning;
      case BookingStatus.confirmed:  return AppTheme.primary;
      case BookingStatus.inProgress: return AppTheme.success;
      case BookingStatus.completed:  return const Color(0xFF2563EB);
      case BookingStatus.cancelled:  return AppTheme.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.booking;
    final timeStr    = DateFormat('HH:mm').format(b.dateTime);
    final endTimeStr = DateFormat('HH:mm').format(b.endTime);
    final dateStr    = _capitalize(DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(b.dateTime));

    final isPast = b.endTime.isBefore(DateTime.now());
    final canStart     = (_currentStatus == BookingStatus.confirmed || _currentStatus == BookingStatus.pending) && !isPast;
    final canComplete  = _currentStatus == BookingStatus.inProgress || (_currentStatus == BookingStatus.confirmed && !isPast);
    final canCancel    = _currentStatus != BookingStatus.cancelled && _currentStatus != BookingStatus.completed;
    final canReschedule = _currentStatus != BookingStatus.cancelled && _currentStatus != BookingStatus.completed;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: const BoxDecoration(
          color: AppTheme.bgMain,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Drag handle
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 4),
              child: Row(
                children: [
                  Text(
                    'Détails du rendez-vous',
                    style: GoogleFonts.bricolageGrotesque(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  if (_saving)
                    const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                    )
                  else
                    // More actions popup
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_horiz_rounded, color: AppTheme.textSecondary),
                      color: AppTheme.bgCard,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      onSelected: (val) {
                        if (val == 'start')    _changeStatus(BookingStatus.inProgress);
                        if (val == 'complete') _changeStatus(BookingStatus.completed);
                        if (val == 'confirm')  _changeStatus(BookingStatus.confirmed);
                        if (val == 'cancel')   _showCancelDialog();
                        if (val == 'reschedule') _reschedule();
                      },
                      itemBuilder: (_) => [
                        if (_currentStatus == BookingStatus.pending)
                          _menuItem('confirm',   Icons.check_circle_outline_rounded, 'Confirmer', AppTheme.primary),
                        if (canStart)
                          _menuItem('start',     Icons.play_circle_outline_rounded, 'Commencer', AppTheme.success),
                        if (_currentStatus == BookingStatus.inProgress)
                          _menuItem('complete',  Icons.task_alt_rounded, 'Terminer', const Color(0xFF2563EB)),
                        if (canReschedule)
                          _menuItem('reschedule', Icons.edit_calendar_rounded, 'Reprogrammer', AppTheme.warning),
                        if (canCancel)
                          _menuItem('cancel',    Icons.cancel_outlined, 'Annuler le RDV', AppTheme.error),
                      ],
                    ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSurface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.close_rounded, size: 18, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable content
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: [
                  // ── Service card ──────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [_statusColor.withAlpha(25), _statusColor.withAlpha(8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: _statusColor.withAlpha(45)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 56, height: 56,
                          decoration: BoxDecoration(
                            color: _statusColor.withAlpha(20),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Center(
                            child: Text(b.serviceIcon, style: const TextStyle(fontSize: 26)),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                b.serviceName,
                                style: GoogleFonts.bricolageGrotesque(
                                  fontSize: 18, fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary, letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$timeStr — $endTimeStr · ${b.durationMinutes} min',
                                style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textSecondary),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                dateStr,
                                style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${b.price.toInt()} CHF',
                              style: GoogleFonts.bricolageGrotesque(
                                fontSize: 22, fontWeight: FontWeight.w800,
                                color: AppTheme.textPrimary, letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _statusColor.withAlpha(20),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${_currentStatus.emoji} ${_currentStatus.label}',
                                style: GoogleFonts.dmSans(
                                  fontSize: 11, fontWeight: FontWeight.w700,
                                  color: _statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // ── Client card ───────────────────────────────
                  _buildCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _sectionLabel('Client'),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: AppTheme.primaryLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(
                                  b.clientName.isNotEmpty ? b.clientName[0].toUpperCase() : '?',
                                  style: GoogleFonts.bricolageGrotesque(
                                    fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.primary,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(b.clientName,
                                      style: GoogleFonts.dmSans(
                                          fontSize: 15, fontWeight: FontWeight.w600,
                                          color: AppTheme.textPrimary)),
                                  if (b.clientEmail.isNotEmpty)
                                    Text(b.clientEmail,
                                        style: GoogleFonts.dmSans(
                                            fontSize: 12, color: AppTheme.textMuted)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (b.clientPhone.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          const Divider(height: 1),
                          const SizedBox(height: 14),
                          // Contact buttons
                          Row(
                            children: [
                              _contactBtn(Icons.phone_rounded, 'Appeler', AppTheme.success,
                                  () => _launch('tel:${b.clientPhone}', b.clientPhone)),
                              const SizedBox(width: 8),
                              _contactBtn(Icons.message_rounded, 'SMS', AppTheme.primary,
                                  () => _launch('sms:${b.clientPhone}', b.clientPhone)),
                              const SizedBox(width: 8),
                              if (b.clientEmail.isNotEmpty)
                                _contactBtn(Icons.email_rounded, 'Email', const Color(0xFF2563EB),
                                    () => _launch('mailto:${b.clientEmail}', b.clientEmail)),
                            ],
                          ),
                        ],
                        if (b.notes != null && b.notes!.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          const Divider(height: 1),
                          const SizedBox(height: 12),
                          _infoRow(Icons.notes_rounded, 'Notes', b.notes!),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // ── Action buttons ────────────────────────────
                  if (canStart || canComplete || canCancel || canReschedule)
                    _buildCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _sectionLabel('Actions'),
                          const SizedBox(height: 12),
                          if (canStart)
                            _actionBtn(
                              icon: Icons.play_arrow_rounded,
                              label: 'Commencer le RDV',
                              color: AppTheme.success,
                              onTap: () => _changeStatus(BookingStatus.inProgress),
                            ),
                          if (_currentStatus == BookingStatus.inProgress) ...[
                            _actionBtn(
                              icon: Icons.task_alt_rounded,
                              label: 'Terminer le RDV',
                              color: const Color(0xFF2563EB),
                              onTap: () => _changeStatus(BookingStatus.completed),
                            ),
                          ],
                          if (_currentStatus == BookingStatus.pending)
                            _actionBtn(
                              icon: Icons.check_circle_outline_rounded,
                              label: 'Confirmer le RDV',
                              color: AppTheme.primary,
                              onTap: () => _changeStatus(BookingStatus.confirmed),
                            ),
                          if (canReschedule) ...[
                            if (canStart || _currentStatus == BookingStatus.inProgress || _currentStatus == BookingStatus.pending)
                              const SizedBox(height: 8),
                            _actionBtn(
                              icon: Icons.edit_calendar_rounded,
                              label: 'Reprogrammer',
                              color: AppTheme.warning,
                              onTap: _reschedule,
                              outlined: true,
                            ),
                          ],
                          if (canCancel) ...[
                            const SizedBox(height: 8),
                            _actionBtn(
                              icon: Icons.cancel_outlined,
                              label: 'Annuler le rendez-vous',
                              color: AppTheme.error,
                              onTap: _showCancelDialog,
                              outlined: true,
                            ),
                          ],
                        ],
                      ),
                    ),

                  const SizedBox(height: 12),

                  // ── Info details ──────────────────────────────
                  _buildCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _sectionLabel('Informations'),
                        const SizedBox(height: 12),
                        _infoRow(Icons.calendar_today_rounded, 'Date', dateStr),
                        const SizedBox(height: 10),
                        _infoRow(Icons.access_time_rounded, 'Horaire', '$timeStr → $endTimeStr · ${b.durationMinutes} min'),
                        const SizedBox(height: 10),
                        _infoRow(Icons.tag_rounded, 'ID réservation',
                            b.id.length > 12 ? '…${b.id.substring(b.id.length - 12)}' : b.id),
                        const SizedBox(height: 10),
                        _infoRow(Icons.schedule_rounded, 'Créé le',
                            DateFormat('dd/MM/yyyy HH:mm').format(b.createdAt)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: child,
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.dmSans(
        fontSize: 10, fontWeight: FontWeight.w700,
        color: AppTheme.textMuted, letterSpacing: 0.8,
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppTheme.textMuted),
        const SizedBox(width: 10),
        SizedBox(
          width: 100,
          child: Text(label,
              style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textMuted)),
        ),
        Expanded(
          child: Text(value,
              style: GoogleFonts.dmSans(
                  fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
        ),
      ],
    );
  }

  Widget _contactBtn(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: color.withAlpha(18),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withAlpha(35)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 5),
              Text(label,
                  style: GoogleFonts.dmSans(
                      fontSize: 11, fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    bool outlined = false,
  }) {
    return GestureDetector(
      onTap: _saving ? null : onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          color: outlined ? Colors.transparent : color,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: outlined ? color.withAlpha(80) : Colors.transparent),
        ),
        child: Row(
          children: [
            Icon(icon, color: outlined ? color : Colors.white, size: 20),
            const SizedBox(width: 12),
            Text(
              label,
              style: GoogleFonts.dmSans(
                fontSize: 14, fontWeight: FontWeight.w600,
                color: outlined ? color : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  PopupMenuItem<String> _menuItem(String value, IconData icon, String label, Color color) {
    return PopupMenuItem(
      value: value,
      child: Row(children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 10),
        Text(label, style: GoogleFonts.dmSans(color: AppTheme.textPrimary, fontSize: 14)),
      ]),
    );
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

// Backward-compat alias so existing Navigator.push calls still compile
// until they're migrated to BookingDetailSheet.show()
class BookingDetailScreen extends StatelessWidget {
  final BookingModel booking;
  final Function(BookingStatus)? onStatusChanged;

  const BookingDetailScreen({
    super.key,
    required this.booking,
    this.onStatusChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      body: SafeArea(
        child: BookingDetailSheet(booking: booking),
      ),
    );
  }
}
