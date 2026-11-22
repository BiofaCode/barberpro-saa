import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/booking_model.dart';
import '../theme/app_theme.dart';
import 'api_service.dart';

/// Heures libres d'un jour, pour la création manuelle et la reprogrammation.
///
/// Même règle que le serveur (`hasConflict`) : pendant les horaires du salon,
/// sans chevaucher un RDV actif ni un blocage, et pas dans le passé.
/// Pas de 15 min + l'heure pile après chaque RDV pour pouvoir enchaîner.
class FreeSlots {
  final List<TimeOfDay> slots;
  final bool closed;
  const FreeSlots(this.slots, {this.closed = false});

  static const _days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  static int _toMin(Object? t) {
    final p = (t?.toString() ?? '').split(':');
    if (p.length < 2) return -1;
    return (int.tryParse(p[0]) ?? 0) * 60 + (int.tryParse(p[1]) ?? 0);
  }

  static Future<FreeSlots> load({
    required DateTime day,
    required int durationMin,
    String? employeeId,
    String? excludeBookingId,
  }) async {
    final dateStr = DateFormat('yyyy-MM-dd').format(day);
    // Le salon est déjà en mémoire depuis la connexion : pas d'appel réseau en plus.
    final results = await Future.wait([
      ApiService.currentSalon != null
          ? Future.value(ApiService.currentSalon)
          : ApiService.getMySalon(),
      ApiService.getMyBookings(date: dateStr),
      ApiService.getBlocks(from: dateStr, to: dateStr),
    ]);
    final salon = results[0] as Map<String, dynamic>?;
    final bookings = results[1] as List<BookingModel>;
    final blocks = results[2] as List<Map<String, dynamic>>;

    int open = 7 * 60, close = 21 * 60; // repli si horaires inconnus
    if (salon != null && salon['hours'] is Map) {
      final h = (salon['hours'] as Map)[_days[day.weekday - 1]];
      final isOpen = h is Map &&
          (h['open'] == true || (h['open'] is String && (h['open'] as String).isNotEmpty));
      if (!isOpen) return const FreeSlots([], closed: true);
      final o = _toMin(h['openTime'] ?? (h['open'] is String ? h['open'] : null));
      final c = _toMin(h['closeTime'] ?? h['close']);
      if (o >= 0 && c > o) {
        open = o;
        close = c;
      }
    }

    bool otherEmployee(String? other) =>
        employeeId != null && other != null && other.isNotEmpty && other != employeeId;

    final busy = <List<int>>[];
    for (final b in bookings) {
      if (b.id == excludeBookingId) continue;
      if (b.status == BookingStatus.cancelled) continue;
      if (b.dateTime.year != day.year || b.dateTime.month != day.month || b.dateTime.day != day.day) continue;
      if (otherEmployee(b.employeeId)) continue;
      final s = b.dateTime.hour * 60 + b.dateTime.minute;
      busy.add([s, s + b.durationMinutes]);
    }
    for (final bl in blocks) {
      if (bl['date'] != dateStr) continue;
      if (otherEmployee(bl['employeeId']?.toString())) continue;
      final s = _toMin(bl['startTime']), e = _toMin(bl['endTime']);
      if (s >= 0 && e > s) busy.add([s, e]);
    }

    final now = DateTime.now();
    final isToday = day.year == now.year && day.month == now.month && day.day == now.day;
    final nowMin = now.hour * 60 + now.minute;
    final dur = durationMin <= 0 ? 30 : durationMin;
    final starts = <int>{};
    for (int t = open; t + dur <= close; t += 15) {
      starts.add(t);
    }
    for (final b in busy) {
      starts.add(b[1]);
    }
    final out = starts
        .where((t) =>
            t >= open &&
            t + dur <= close &&
            !(isToday && t <= nowMin) &&
            !busy.any((b) => t < b[1] && t + dur > b[0]))
        .toList()
      ..sort();
    return FreeSlots(out.map((t) => TimeOfDay(hour: t ~/ 60, minute: t % 60)).toList());
  }
}

/// Encadré bien visible quand aucune heure n'est proposée.
class NoSlotsNotice extends StatelessWidget {
  final bool closed;
  const NoSlotsNotice({super.key, required this.closed});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: AppTheme.error.withAlpha(18),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.error.withAlpha(60)),
      ),
      child: Column(children: [
        Icon(closed ? Icons.store_mall_directory_outlined : Icons.event_busy_rounded,
            size: 40, color: AppTheme.error),
        const SizedBox(height: 12),
        Text(closed ? 'Salon fermé ce jour-là' : 'Aucun créneau libre',
            textAlign: TextAlign.center,
            style: GoogleFonts.bricolageGrotesque(
                fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        const SizedBox(height: 6),
        Text('Choisis une autre date.',
            textAlign: TextAlign.center,
            style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textSecondary)),
      ]),
    );
  }
}
