import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/booking_model.dart';

class BookingDetailScreen extends StatefulWidget {
  final BookingModel booking;
  final Function(BookingStatus)? onStatusChanged;

  const BookingDetailScreen({
    super.key,
    required this.booking,
    this.onStatusChanged,
  });

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  late BookingStatus _currentStatus;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.booking.status;
  }

  void _changeStatus(BookingStatus newStatus) {
    setState(() => _currentStatus = newStatus);
    widget.onStatusChanged?.call(newStatus);
    Navigator.of(context).pop();
  }

  Future<void> _launchPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(phone)));
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(phone)));
      }
    }
  }

  Future<void> _launchSms(String phone) async {
    final uri = Uri.parse('sms:$phone');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(phone)));
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(phone)));
      }
    }
  }

  Future<void> _launchEmail(String email) async {
    final uri = Uri.parse('mailto:$email');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(email)));
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(email)));
      }
    }
  }

  Color get _statusColor {
    switch (_currentStatus) {
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

  @override
  Widget build(BuildContext context) {
    final booking = widget.booking;
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
            onSelected: _changeStatus,
            itemBuilder: (context) => [
              if (_currentStatus != BookingStatus.inProgress)
                const PopupMenuItem(
                  value: BookingStatus.inProgress,
                  child: Text('✂️ Commencer'),
                ),
              if (_currentStatus != BookingStatus.completed)
                const PopupMenuItem(
                  value: BookingStatus.completed,
                  child: Text('✅ Terminer'),
                ),
              if (_currentStatus != BookingStatus.cancelled)
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
                      '${_currentStatus.emoji} ${_currentStatus.label}',
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
                        '${booking.price.toInt()} CHF',
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
            if (_currentStatus == BookingStatus.confirmed ||
                _currentStatus == BookingStatus.pending) ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () =>
                          _changeStatus(BookingStatus.inProgress),
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
            ] else if (_currentStatus == BookingStatus.inProgress) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _changeStatus(BookingStatus.completed),
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
                    onTap: () => _launchPhone(booking.clientPhone),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildContactButton(
                    icon: Icons.message_rounded,
                    label: 'SMS',
                    color: AppTheme.primary,
                    onTap: () => _launchSms(booking.clientPhone),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildContactButton(
                    icon: Icons.email_rounded,
                    label: 'Email',
                    color: Colors.blueAccent,
                    onTap: () => _launchEmail(booking.clientEmail),
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
              _changeStatus(BookingStatus.cancelled);
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
