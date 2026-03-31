import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';

class BookingCard extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback? onTap;
  final Function(BookingStatus)? onStatusChanged;

  const BookingCard({
    super.key,
    required this.booking,
    this.onTap,
    this.onStatusChanged,
  });

  @override
  Widget build(BuildContext context) {
    final timeStr    = DateFormat('HH:mm').format(booking.dateTime);
    final endTimeStr = DateFormat('HH:mm').format(booking.endTime);
    final accent     = _accentColor;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
          boxShadow: AppTheme.shadowSm,
        ),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Colored left accent strip
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                ),
              ),

              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                  child: Row(
                    children: [
                      // Time column
                      SizedBox(
                        width: 44,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              timeStr,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            Container(
                              margin: const EdgeInsets.symmetric(vertical: 3),
                              width: 1,
                              height: 14,
                              color: AppTheme.border,
                            ),
                            Text(
                              endTimeStr,
                              style: GoogleFonts.dmSans(
                                fontSize: 11,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Service icon
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: accent.withAlpha(18),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            booking.serviceIcon,
                            style: const TextStyle(fontSize: 19),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Client + service info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              booking.clientName,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              booking.serviceName,
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Status badge + price
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: accent.withAlpha(18),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              booking.status.label,
                              style: GoogleFonts.dmSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: accent,
                              ),
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            '${booking.price.toInt()} CHF',
                            style: GoogleFonts.bricolageGrotesque(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                              letterSpacing: -0.3,
                            ),
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

  Color get _accentColor {
    switch (booking.status) {
      case BookingStatus.pending:
        return AppTheme.warning;
      case BookingStatus.confirmed:
        return AppTheme.primary;
      case BookingStatus.inProgress:
        return AppTheme.success;
      case BookingStatus.completed:
        return AppTheme.success;
      case BookingStatus.cancelled:
        return AppTheme.error;
    }
  }
}
