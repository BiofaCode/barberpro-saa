import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_text.dart';
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
    final statusText = _statusTextColor;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
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
              // Thin status bar on the left (decorative, never text).
              Container(width: 3, color: _barColor),

              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(13, 14, 14, 14),
                  child: Row(
                    children: [
                      // Time column
                      // Largeur fixe + FittedBox : « 09:00 » ne passe jamais
                      // à la ligne, même avec une grande taille de texte iOS.
                      SizedBox(
                        width: 52,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                timeStr,
                                maxLines: 1,
                                softWrap: false,
                                style: AppText.num(AppText.body)
                                    .copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                            Container(
                              margin: const EdgeInsets.symmetric(vertical: 3),
                              width: 1,
                              height: 12,
                              color: AppTheme.border,
                            ),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                endTimeStr,
                                maxLines: 1,
                                softWrap: false,
                                style: AppText.num(AppText.caption),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Service icon (comes from the API)
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.bgSurface,
                          borderRadius: BorderRadius.circular(AppTheme.rSm),
                        ),
                        child: Center(
                          child: Text(
                            booking.serviceIcon,
                            style: const TextStyle(fontSize: 18),
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
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.body
                                  .copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              booking.serviceName,
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

                      // Status + price
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: statusText.withAlpha(14),
                              borderRadius:
                                  BorderRadius.circular(AppTheme.rSm),
                            ),
                            child: Text(
                              booking.status.label,
                              maxLines: 1,
                              style: AppText.caption.copyWith(
                                fontWeight: FontWeight.w600,
                                color: statusText,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${booking.price.toInt()} CHF',
                            maxLines: 1,
                            style: AppText.num(AppText.label)
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

  /// Status colour used as text (chip label): neutral/status tokens only,
  /// never the salon colour, which may be too light to read on white.
  Color get _statusTextColor {
    switch (booking.status) {
      case BookingStatus.pending:
        return AppTheme.warning;
      case BookingStatus.confirmed:
        return AppTheme.success;
      case BookingStatus.inProgress:
        return AppTheme.textPrimary;
      case BookingStatus.completed:
        return AppTheme.textMuted;
      case BookingStatus.cancelled:
        return AppTheme.error;
    }
  }

  /// Left bar colour: the salon colour marks confirmed bookings.
  Color get _barColor {
    switch (booking.status) {
      case BookingStatus.confirmed:
        return AppTheme.primary;
      case BookingStatus.completed:
        return AppTheme.border;
      default:
        return _statusTextColor;
    }
  }
}
