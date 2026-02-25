import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';

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
    final timeStr = DateFormat('HH:mm').format(booking.dateTime);
    final endTimeStr = DateFormat('HH:mm').format(booking.endTime);
    final dateStr =
        DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(booking.dateTime);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Détails du RDV'),
        actions: [
          PopupMenuButton<BookingStatus>(
            icon: const Icon(Icons.more_vert_rounded),
            onSelected: (status) {
              onStatusChanged?.call(status);
              Navigator.of(context).pop();
            },
            itemBuilder: (context) => [
              if (booking.status != BookingStatus.inProgress)
                const PopupMenuItem(
                  value: BookingStatus.inProgress,
                  child: Text('✂️ Commencer'),
                ),
              if (booking.status != BookingStatus.completed)
                const PopupMenuItem(
                  value: BookingStatus.completed,
                  child: Text('✅ Terminer'),
                ),
              if (booking.status != BookingStatus.cancelled)
                const PopupMenuItem(
                  value: BookingStatus.cancelled,
                  child: Text('❌ Annuler'),
                ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Service Header
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primary.withAlpha(31),
                    AppTheme.primary.withAlpha(8),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withAlpha(51)),
              ),
              child: Column(
                children: [
                  Text(
                    booking.serviceIcon,
                    style: const TextStyle(fontSize: 48),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    booking.serviceName,
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _statusColor.withAlpha(26),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${booking.status.emoji} ${booking.status.label}',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _statusColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${booking.price.toInt()}€',
                        style: GoogleFonts.playfairDisplay(
                          fontSize: 32,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '•  ${booking.durationMinutes} min',
                        style: GoogleFonts.outfit(
                          fontSize: 15,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Date & Time
            _buildSection('📅 Date & Heure', [
              _buildInfoRow('Date', dateStr),
              _buildInfoRow('Heure', '$timeStr — $endTimeStr'),
              _buildInfoRow('Durée', '${booking.durationMinutes} minutes'),
            ]),

            const SizedBox(height: 16),

            // Client Info
            _buildSection('👤 Informations client', [
              _buildInfoRow('Nom', booking.clientName),
              _buildInfoRow('Email', booking.clientEmail),
              _buildInfoRow('Téléphone', booking.clientPhone),
              if (booking.notes != null && booking.notes!.isNotEmpty)
                _buildInfoRow('Notes', booking.notes!),
            ]),

            const SizedBox(height: 16),

            // Booking Info
            _buildSection('📋 Réservation', [
              _buildInfoRow('ID', booking.id),
              _buildInfoRow(
                'Créé le',
                DateFormat('dd/MM/yyyy HH:mm').format(booking.createdAt),
              ),
            ]),

            const SizedBox(height: 24),

            // Action Buttons
            if (booking.status == BookingStatus.confirmed ||
                booking.status == BookingStatus.pending) ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        onStatusChanged?.call(BookingStatus.inProgress);
                        Navigator.of(context).pop();
                      },
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text('Commencer'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        _showCancelDialog(context);
                      },
                      icon: const Icon(Icons.close_rounded),
                      label: const Text('Annuler'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.error,
                        side: const BorderSide(color: AppTheme.error),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (booking.status == BookingStatus.inProgress) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    onStatusChanged?.call(BookingStatus.completed);
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Terminer le RDV'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.success,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Contact buttons
            Row(
              children: [
                Expanded(
                  child: _buildContactButton(
                    icon: Icons.phone_rounded,
                    label: 'Appeler',
                    color: AppTheme.success,
                    onTap: () {},
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildContactButton(
                    icon: Icons.message_rounded,
                    label: 'SMS',
                    color: AppTheme.primary,
                    onTap: () {},
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildContactButton(
                    icon: Icons.email_rounded,
                    label: 'Email',
                    color: Colors.blueAccent,
                    onTap: () {},
                  ),
                ),
              ],
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Color get _statusColor {
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

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 13,
                color: AppTheme.textMuted,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(40)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Annuler le rendez-vous ?',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        content: Text(
          'Le client sera notifié de l\'annulation. Cette action est irréversible.',
          style: GoogleFonts.outfit(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Non, garder',
              style: GoogleFonts.outfit(color: AppTheme.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              onStatusChanged?.call(BookingStatus.cancelled);
              Navigator.of(context).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
            ),
            child: const Text('Oui, annuler'),
          ),
        ],
      ),
    );
  }
}
