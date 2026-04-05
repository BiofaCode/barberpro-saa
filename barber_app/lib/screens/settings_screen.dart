import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'employees_screen.dart';
import 'services_screen.dart';
import 'blocks_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notifications = true;
  bool _autoConfirm = false;
  Map<String, dynamic>? _salon;
  List<Map<String, dynamic>> _employees = [];
  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSalonData();
  }

  Future<void> _loadSalonData() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.getMySalon(),
      ApiService.getMyEmployees(),
      ApiService.getMyServices(),
    ]);
    setState(() {
      _salon = results[0] as Map<String, dynamic>?;
      _employees = results[1] as List<Map<String, dynamic>>;
      _services = results[2] as List<Map<String, dynamic>>;
      _loading = false;
    });
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Se déconnecter ?', style: GoogleFonts.dmSans(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
        content: Text('Voulez-vous vraiment vous déconnecter ?', style: GoogleFonts.dmSans(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Annuler', style: GoogleFonts.dmSans(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () {
              ApiService.logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (_) => false,
              );
            },
            child: Text('Déconnexion', style: GoogleFonts.dmSans(color: AppTheme.error, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  void _editSalonInfo() {
    final nameCtrl = TextEditingController(text: _salon?['name'] ?? '');
    final addrCtrl = TextEditingController(text: _salon?['address'] ?? '');
    final phoneCtrl = TextEditingController(text: _salon?['phone'] ?? '');
    final emailCtrl = TextEditingController(text: _salon?['email'] ?? '');
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // drag handle
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppTheme.textMuted.withAlpha(80), borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              Text('Informations du salon', style: GoogleFonts.bricolageGrotesque(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              const SizedBox(height: 20),
              _buildTextField(nameCtrl, 'Nom du salon', Icons.storefront_rounded),
              const SizedBox(height: 12),
              _buildTextField(addrCtrl, 'Adresse', Icons.location_on_rounded),
              const SizedBox(height: 12),
              _buildTextField(phoneCtrl, 'Téléphone', Icons.phone_rounded, keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              _buildTextField(emailCtrl, 'Email', Icons.email_rounded, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: saving ? null : () async {
                    setModalState(() => saving = true);
                    final ok = await ApiService.updateMySalon({
                      'name': nameCtrl.text.trim(),
                      'address': addrCtrl.text.trim(),
                      'phone': phoneCtrl.text.trim(),
                      'email': emailCtrl.text.trim(),
                    });
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (ok) {
                      _loadSalonData();
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✓ Informations mises à jour')));
                    } else {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors de la sauvegarde')));
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('Sauvegarder', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _editHours() {
    final days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    final Map<String, Map<String, dynamic>> hours = {};
    for (final day in days) {
      final h = (_salon?['hours'] ?? {})[day] ?? {};
      hours[day] = {
        'open': h['open'] == true || (h['open'] is String && (h['open'] as String).isNotEmpty),
        'openTime': h['openTime'] ?? (h['open'] is String ? h['open'] as String : '09:00'),
        'closeTime': h['closeTime'] ?? (h['close'] is String ? h['close'] as String : '18:00'),
      };
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          bool saving = false;
          return DraggableScrollableSheet(
            initialChildSize: 0.85,
            maxChildSize: 0.95,
            minChildSize: 0.5,
            expand: false,
            builder: (_, scrollCtrl) => Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Column(
                    children: [
                      Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppTheme.textMuted.withAlpha(80), borderRadius: BorderRadius.circular(2)))),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Horaires d\'ouverture', style: GoogleFonts.bricolageGrotesque(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                          ElevatedButton(
                            onPressed: saving ? null : () async {
                              setModalState(() => saving = true);
                              final ok = await ApiService.updateMySalon({'hours': hours});
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (ok) {
                                _loadSalonData();
                                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✓ Horaires mis à jour')));
                              }
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
                            child: saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('Sauvegarder', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    controller: scrollCtrl,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: days.map((day) {
                      final h = hours[day]!;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(color: AppTheme.bgDark, borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(day[0].toUpperCase() + day.substring(1), style: GoogleFonts.dmSans(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                                Switch(
                                  value: h['open'] as bool,
                                  onChanged: (v) => setModalState(() => h['open'] = v),
                                  activeThumbColor: Colors.white,
                                  activeTrackColor: AppTheme.primary,
                                ),
                              ],
                            ),
                            if (h['open'] == true) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(child: _buildTimeButton(ctx, 'Ouverture', h['openTime'] as String, (t) => setModalState(() => h['openTime'] = t))),
                                  const SizedBox(width: 12),
                                  Expanded(child: _buildTimeButton(ctx, 'Fermeture', h['closeTime'] as String, (t) => setModalState(() => h['closeTime'] = t))),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          );
        }
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            : RefreshIndicator(
                color: AppTheme.primary,
                onRefresh: _loadSalonData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Mon Salon',
                            style: GoogleFonts.bricolageGrotesque(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          GestureDetector(
                            onTap: _logout,
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppTheme.error.withAlpha(20),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.logout_rounded, color: AppTheme.error, size: 20),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Profile card
                      _buildProfileCard(),
                      const SizedBox(height: 24),

                      // Salon info
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Informations du salon', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                          IconButton(
                            icon: const Icon(Icons.edit_rounded, color: AppTheme.primary, size: 20),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: _editSalonInfo,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildInfoTile(Icons.store_rounded, 'Nom', _salon?['name'] ?? '—'),
                      _buildInfoTile(Icons.location_on_rounded, 'Adresse', _salon?['address'] ?? '—'),
                      _buildInfoTile(Icons.phone_rounded, 'Téléphone', _salon?['phone'] ?? '—'),
                      _buildInfoTile(Icons.email_rounded, 'Email', _salon?['email'] ?? '—'),
                      const SizedBox(height: 24),

                      // Website link
                      _buildSectionTitle('Site web dédié'),
                      const SizedBox(height: 12),
                      _buildWebsiteLink(),
                      const SizedBox(height: 24),

                      // Subscription
                      _buildSectionTitle('Abonnement'),
                      const SizedBox(height: 12),
                      _buildSubscriptionCard(),
                      const SizedBox(height: 24),

                      // Branding
                      _buildSectionTitle('Personnalisation'),
                      const SizedBox(height: 12),
                      _buildBrandingCard(),
                      const SizedBox(height: 24),

                      // Employees
                      _buildNavCard(
                        icon: Icons.people_rounded,
                        title: 'Mon équipe',
                        subtitle: '${_employees.length} employé${_employees.length > 1 ? 's' : ''}',
                        onTap: () async {
                          await Navigator.push(context,
                              MaterialPageRoute(builder: (_) => const EmployeesScreen()));
                          _loadSalonData();
                        },
                      ),
                      const SizedBox(height: 12),

                      // Services
                      _buildNavCard(
                        icon: Icons.spa_rounded,
                        title: 'Mes prestations',
                        subtitle: '${_services.length} prestation${_services.length > 1 ? 's' : ''}',
                        onTap: () async {
                          await Navigator.push(context,
                              MaterialPageRoute(builder: (_) => const ServicesScreen()));
                          _loadSalonData();
                        },
                      ),
                      const SizedBox(height: 12),

                      // Blocks
                      _buildNavCard(
                        icon: Icons.block_rounded,
                        title: 'Créneaux bloqués',
                        subtitle: 'Gérez les indisponibilités',
                        onTap: () {
                          Navigator.push(context,
                              MaterialPageRoute(builder: (_) => const BlocksScreen()));
                        },
                      ),
                      const SizedBox(height: 24),

                      // Gallery
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Galerie Photos',
                            style: GoogleFonts.bricolageGrotesque(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add_photo_alternate_outlined, color: AppTheme.primary),
                            onPressed: _pickAndUploadPhoto,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildGalleryList(),
                      const SizedBox(height: 24),

                      // Testimonials
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Avis & Témoignages',
                            style: GoogleFonts.bricolageGrotesque(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                            onPressed: () => _showTestimonialSheet(null),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildTestimonialsList(),
                      const SizedBox(height: 24),

                      // Hours
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Horaires d\'ouverture', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                          IconButton(
                            icon: const Icon(Icons.edit_rounded, color: AppTheme.primary, size: 20),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: _editHours,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildScheduleCard(),
                      const SizedBox(height: 24),

                      // Preferences
                      _buildSectionTitle('Préférences'),
                      const SizedBox(height: 12),
                      _buildSwitchTile(
                        Icons.notifications_rounded, 'Notifications',
                        'Recevoir les notifications de nouveaux RDV',
                        _notifications, (v) => setState(() => _notifications = v),
                      ),
                      _buildSwitchTile(
                        Icons.check_circle_rounded, 'Confirmation auto',
                        'Confirmer automatiquement les réservations',
                        _autoConfirm, (v) => setState(() => _autoConfirm = v),
                      ),
                      const SizedBox(height: 24),

                      // Version
                      Center(
                        child: Text(
                          'Kreno v1.0.0\nPlateforme SaaS pour professionnels',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted, height: 1.6),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildProfileCard() {
    final ownerName = ApiService.currentUser?['name'] ?? 'Propriétaire';
    final salonName = _salon?['name'] ?? 'Mon Salon';
    final rating = _salon?['rating'] ?? 0;
    final reviews = _salon?['reviewCount'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primary.withAlpha(31), AppTheme.primary.withAlpha(8)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primary.withAlpha(51)),
      ),
      child: Row(
        children: [
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.primaryDark]),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Center(
              child: Text(
                ownerName.isNotEmpty ? ownerName[0].toUpperCase() : '?',
                style: GoogleFonts.dmSans(fontSize: 26, fontWeight: FontWeight.w700, color: AppTheme.bgDark),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(ownerName, style: GoogleFonts.bricolageGrotesque(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                const SizedBox(height: 4),
                Text(salonName, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textSecondary)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: AppTheme.warning, size: 16),
                    const SizedBox(width: 4),
                    Text('$rating ($reviews avis)', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w500)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWebsiteLink() {
    final slug = _salon?['slug'] ?? '';
    return GestureDetector(
      onTap: () async {
        if (slug.isNotEmpty) {
          final serverBase = ApiService.currentServerUrl;
          final uri = Uri.parse('$serverBase/s/$slug');
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.primary.withAlpha(31)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.primary.withAlpha(26),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.language_rounded, color: AppTheme.primary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '/s/$slug',
                    style: GoogleFonts.dmSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primary,
                      decoration: TextDecoration.underline,
                      decorationColor: AppTheme.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text('Site de réservation de vos clients', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
            ),
            const Icon(Icons.launch_rounded, color: AppTheme.primary, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCard(String title, String subtitle) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Column(
        children: [
          Text(title, style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
          const SizedBox(height: 4),
          Text(subtitle, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildNavCard({required IconData icon, required String title, required String subtitle, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.primary.withAlpha(31)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.primary.withAlpha(26),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppTheme.primary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.bricolageGrotesque(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textMuted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 22),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary));
  }

  Widget _buildInfoTile(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                const SizedBox(height: 2),
                Text(value, style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleCard() {
    final hours = _salon?['hours'] as Map<String, dynamic>? ?? {};
    final days = {'lundi': 'Lundi', 'mardi': 'Mardi', 'mercredi': 'Mercredi', 'jeudi': 'Jeudi', 'vendredi': 'Vendredi', 'samedi': 'Samedi', 'dimanche': 'Dimanche'};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Column(
        children: days.entries.map((entry) {
          final h = hours[entry.key];
          final isClosed = h == null || (h['open'] != true && !(h['open'] is String && (h['open'] as String).isNotEmpty));
          String timeStr;
          if (isClosed) {
            timeStr = 'Fermé';
          } else {
            final openTime = h['openTime'] ?? h['open'] ?? '';
            final closeTime = h['closeTime'] ?? h['close'] ?? '';
            timeStr = '$openTime - $closeTime';
          }
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(entry.value, style: GoogleFonts.dmSans(fontSize: 14, color: isClosed ? AppTheme.textMuted : AppTheme.textPrimary)),
                Text(timeStr, style: GoogleFonts.dmSans(fontSize: 14, color: isClosed ? AppTheme.error : AppTheme.primary, fontWeight: FontWeight.w500)),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSwitchTile(IconData icon, String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
                Text(subtitle, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
          Switch(
            value: value, onChanged: onChanged,
            activeThumbColor: AppTheme.primary,
            activeTrackColor: AppTheme.primary.withAlpha(77),
          ),
        ],
      ),
    );
  }

  Widget _buildSubscriptionCard() {
    final sub = _salon?['subscription'];
    final plan = sub?['plan'] ?? 'pro';
    final status = sub?['status'] ?? 'active';
    final price = sub?['price'] ?? 49.90;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Plan professionnel', style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.success.withAlpha(26),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(status.toString().toUpperCase(), style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Pack ${plan.toString().toUpperCase()}',
            style: GoogleFonts.bricolageGrotesque(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.primary),
          ),
          Text('$price CHF / mois', style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              // Normally this calls an endpoint to generate Stripe Billing Portal link
              // and opens it in external browser.
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Veuillez utiliser la version Web pour gérer votre abonnement sur Stripe.')));
            },
            icon: const Icon(Icons.credit_card_rounded, size: 18),
            label: const Text('Gérer sur Stripe'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white.withAlpha(10),
              foregroundColor: AppTheme.textPrimary,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrandingCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppTheme.primary.withAlpha(26), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.palette_rounded, color: AppTheme.primary, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Couleurs et Textes', style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                    Text('Personnalisez votre site public', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _showBrandingBottomSheet,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary.withAlpha(26),
              foregroundColor: AppTheme.primary,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Modifier le design'),
          ),
        ],
      ),
    );
  }

  void _showBrandingBottomSheet() {
    final branding = _salon?['branding'] as Map<String, dynamic>? ?? {};
    final titleCtrl = TextEditingController(text: branding['heroTitle'] ?? '');
    final subtitleCtrl = TextEditingController(text: branding['heroSubtitle'] ?? '');
    final primaryColorCtrl = TextEditingController(text: branding['primaryColor'] ?? '#6366F1');
    final accentColorCtrl = TextEditingController(text: branding['accentColor'] ?? '#818CF8');

    final heroStats = branding['heroStats'] as Map<String, dynamic>? ?? {};
    final stat1ValCtrl = TextEditingController(text: heroStats['stat1Value']?.toString() ?? '2500+');
    final stat1LabCtrl = TextEditingController(text: heroStats['stat1Label']?.toString() ?? 'Clients satisfaits');
    final stat2ValCtrl = TextEditingController(text: heroStats['stat2Value']?.toString() ?? '8+');
    final stat2LabCtrl = TextEditingController(text: heroStats['stat2Label']?.toString() ?? "Années d'expérience");
    final stat3ValCtrl = TextEditingController(text: heroStats['stat3Value']?.toString() ?? '15+');
    final stat3LabCtrl = TextEditingController(text: heroStats['stat3Label']?.toString() ?? 'Services uniques');
    bool hideStats = heroStats['hide'] == true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Color hexToColor(String hex) {
            final h = hex.trim().replaceFirst('#', '');
            if (h.length != 6) return AppTheme.primary;
            try { return Color(int.parse('FF$h', radix: 16)); } catch (_) { return AppTheme.primary; }
          }

          Widget buildColorPicker(String label, TextEditingController ctrl) {
            const palette = [
              '#6366F1', '#818CF8', '#9333EA', '#7C3AED',
              '#3B82F6', '#0EA5E9', '#14B8A6', '#10B981',
              '#F59E0B', '#F97316', '#EF4444', '#EC4899',
              '#F43F5E', '#64748B', '#E8E6E3', '#0A0A14',
            ];
            final currentHex = ctrl.text.trim().toLowerCase();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(label, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textMuted)),
                    const SizedBox(width: 8),
                    Container(
                      width: 16, height: 16,
                      decoration: BoxDecoration(
                        color: hexToColor(ctrl.text),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withAlpha(50)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: palette.map((hex) {
                    final isSelected = currentHex == hex.toLowerCase();
                    final color = hexToColor(hex);
                    return GestureDetector(
                      onTap: () => setSheetState(() => ctrl.text = hex),
                      child: Container(
                        width: 34, height: 34,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected ? Colors.white : Colors.white.withAlpha(30),
                            width: isSelected ? 2.5 : 1,
                          ),
                          boxShadow: isSelected
                              ? [BoxShadow(color: color.withAlpha(120), blurRadius: 6, spreadRadius: 1)]
                              : null,
                        ),
                        child: isSelected
                            ? Icon(Icons.check_rounded, color: Colors.white.withAlpha(220), size: 16)
                            : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: ctrl,
                  onChanged: (_) => setSheetState(() {}),
                  style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
                  decoration: InputDecoration(
                    hintText: '#6366F1',
                    hintStyle: GoogleFonts.dmSans(color: AppTheme.textMuted),
                    filled: true,
                    fillColor: AppTheme.bgDark,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    prefixIcon: Padding(
                      padding: const EdgeInsets.all(11),
                      child: Container(
                        width: 18, height: 18,
                        decoration: BoxDecoration(
                          color: hexToColor(ctrl.text),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withAlpha(40)),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          }

          return Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 24, right: 24, top: 24),
            decoration: const BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Personnalisation', style: GoogleFonts.bricolageGrotesque(fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const SizedBox(height: 20),
                  _buildSimpleTextField('Titre principal', titleCtrl),
                  const SizedBox(height: 16),
                  _buildSimpleTextField('Sous-titre', subtitleCtrl),
                  const SizedBox(height: 16),
                  buildColorPicker('Couleur Primaire', primaryColorCtrl),
                  const SizedBox(height: 16),
                  buildColorPicker('Couleur Accent', accentColorCtrl),
                  const SizedBox(height: 24),
                  Text("Statistiques d'accroche (Hero)", style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: Text('Masquer ces statistiques', style: GoogleFonts.dmSans(color: AppTheme.textPrimary, fontSize: 14)),
                    value: hideStats,
                    activeThumbColor: Colors.white,
                    activeTrackColor: AppTheme.primary,
                    onChanged: (val) => setSheetState(() => hideStats = val),
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 12),
                  Row(children: [ Expanded(child: _buildSimpleTextField('Valeur 1', stat1ValCtrl)), const SizedBox(width: 12), Expanded(child: _buildSimpleTextField('Texte 1', stat1LabCtrl)) ]),
                  const SizedBox(height: 12),
                  Row(children: [ Expanded(child: _buildSimpleTextField('Valeur 2', stat2ValCtrl)), const SizedBox(width: 12), Expanded(child: _buildSimpleTextField('Texte 2', stat2LabCtrl)) ]),
                  const SizedBox(height: 12),
                  Row(children: [ Expanded(child: _buildSimpleTextField('Valeur 3', stat3ValCtrl)), const SizedBox(width: 12), Expanded(child: _buildSimpleTextField('Texte 3', stat3LabCtrl)) ]),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        setState(() => _loading = true);
                        final newBranding = {
                          ...branding,
                          'heroTitle': titleCtrl.text.trim(),
                          'heroSubtitle': subtitleCtrl.text.trim(),
                          'primaryColor': primaryColorCtrl.text.trim(),
                          'accentColor': accentColorCtrl.text.trim(),
                          'heroStats': {
                            'stat1Value': stat1ValCtrl.text.trim().isNotEmpty ? stat1ValCtrl.text.trim() : '2500+',
                            'stat1Label': stat1LabCtrl.text.trim().isNotEmpty ? stat1LabCtrl.text.trim() : 'Clients satisfaits',
                            'stat2Value': stat2ValCtrl.text.trim().isNotEmpty ? stat2ValCtrl.text.trim() : '8+',
                            'stat2Label': stat2LabCtrl.text.trim().isNotEmpty ? stat2LabCtrl.text.trim() : "Années d'expérience",
                            'stat3Value': stat3ValCtrl.text.trim().isNotEmpty ? stat3ValCtrl.text.trim() : '15+',
                            'stat3Label': stat3LabCtrl.text.trim().isNotEmpty ? stat3LabCtrl.text.trim() : 'Services uniques',
                            'hide': hideStats,
                          }
                        };
                        final success = await ApiService.updateBranding(newBranding);
                        if (success) {
                          await _loadSalonData();
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Design mis à jour', style: TextStyle(color: Colors.white)), backgroundColor: AppTheme.success));
                        } else {
                          setState(() => _loading = false);
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur de mise à jour', style: TextStyle(color: Colors.white)), backgroundColor: AppTheme.error));
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Enregistrer', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.bgDark)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// Icon-based text field used for salon info and hours editing.
  Widget _buildTextField(TextEditingController ctrl, String label, IconData icon, {TextInputType? keyboardType}) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.dmSans(color: AppTheme.textMuted),
        prefixIcon: Icon(icon, color: AppTheme.textMuted, size: 20),
        filled: true,
        fillColor: AppTheme.bgDark,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
      ),
    );
  }

  /// Label-above text field used for branding and testimonial sheets.
  Widget _buildSimpleTextField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textMuted)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppTheme.bgDark,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildTimeButton(BuildContext ctx, String label, String time, Function(String) onChanged) {
    return GestureDetector(
      onTap: () async {
        final parts = time.split(':');
        final initial = TimeOfDay(hour: int.tryParse(parts[0]) ?? 9, minute: int.tryParse(parts[1]) ?? 0);
        final picked = await showTimePicker(context: ctx, initialTime: initial);
        if (picked != null) {
          onChanged('${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppTheme.primary.withAlpha(40))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.textMuted)),
            const SizedBox(height: 2),
            Text(time, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.primary)),
          ],
        ),
      ),
    );
  }

  Widget _buildTestimonialsList() {
    final testimonials = _salon?['testimonials'] as List? ?? [];
    if (testimonials.isEmpty) {
      return _buildEmptyCard('Aucun avis', 'Ajoutez les témoignages de vos clients');
    }
    return Column(
      children: testimonials.map((t) => _buildTestimonialTile(t)).toList(),
    );
  }

  Widget _buildTestimonialTile(Map<String, dynamic> t) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgDark.withAlpha(50),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(t['name'] ?? '', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.primary),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => _showTestimonialSheet(t),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: AppTheme.error),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => _deleteTestimonial(t['_id']),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(t['role'] ?? 'Client', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
          const SizedBox(height: 8),
          Text(t['text'] ?? '', style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Row(
            children: List.generate(5, (i) => Icon(
              i < (t['stars'] ?? 5) ? Icons.star : Icons.star_border,
              color: Colors.amber, size: 16,
            )),
          ),
        ],
      ),
    );
  }

  void _showTestimonialSheet(Map<String, dynamic>? t) {
    final sub = _salon?['subscription'];
    final plan = sub?['plan'] ?? 'pro';
    if (plan == 'starter') {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Le Pack Pro est requis pour personnaliser les témoignages.')));
      return;
    }

    final isEdit = t != null;
    final nameCtrl = TextEditingController(text: t?['name'] ?? '');
    final textCtrl = TextEditingController(text: t?['text'] ?? '');
    final roleCtrl = TextEditingController(text: t?['role'] ?? 'Client');
    int stars = t?['stars'] ?? 5;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setStateSheet) => Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 24, right: 24, top: 24),
            decoration: const BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(isEdit ? 'Modifier l\'avis' : 'Ajouter un avis', style: GoogleFonts.bricolageGrotesque(fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const SizedBox(height: 20),
                  _buildSimpleTextField('Nom du client', nameCtrl),
                  const SizedBox(height: 16),
                  _buildSimpleTextField('Rôle / Description', roleCtrl),
                  const SizedBox(height: 16),
                  Text('Étoiles ($stars)', style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textMuted)),
                  Slider(
                    value: stars.toDouble(),
                    min: 1, max: 5, divisions: 4,
                    activeColor: Colors.amber,
                    onChanged: (v) => setStateSheet(() => stars = v.toInt()),
                  ),
                  const SizedBox(height: 16),
                  _buildSimpleTextField('Avis / Témoignage', textCtrl),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (nameCtrl.text.isEmpty || textCtrl.text.isEmpty) return;
                        Navigator.pop(ctx);
                        setState(() => _loading = true);
                        final payload = {
                          'name': nameCtrl.text.trim(),
                          'text': textCtrl.text.trim(),
                          'role': roleCtrl.text.trim(),
                          'stars': stars,
                        };
                        final success = isEdit
                            ? await ApiService.updateTestimonial(t!['_id'], payload)
                            : await ApiService.addTestimonial(payload);

                        if (success) {
                          await _loadSalonData();
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Avis enregistré', style: TextStyle(color: Colors.white)), backgroundColor: AppTheme.success));
                        } else {
                          setState(() => _loading = false);
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur', style: TextStyle(color: Colors.white)), backgroundColor: AppTheme.error));
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Enregistrer', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.bgDark)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _deleteTestimonial(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text('Confirmer', style: TextStyle(color: AppTheme.textPrimary)),
        content: const Text('Supprimer cet avis ?', style: TextStyle(color: AppTheme.textMuted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler', style: TextStyle(color: Colors.white70))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _loading = true);
    final success = await ApiService.deleteTestimonial(id);
    if (success) {
      await _loadSalonData();
    } else {
      setState(() => _loading = false);
    }
  }

  Widget _buildGalleryList() {
    final gallery = _salon?['gallery'] as List? ?? [];
    if (gallery.isEmpty) {
      return _buildEmptyCard('Aucune photo', 'Ajoutez des photos de vos réalisations');
    }
    return SizedBox(
      height: 140,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: gallery.length,
        itemBuilder: (ctx, i) => _buildGalleryTile(gallery[i]),
      ),
    );
  }

  Widget _buildGalleryTile(Map<String, dynamic> photo) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: AppTheme.bgDark.withAlpha(50),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(10)),
        image: DecorationImage(
          image: NetworkImage(photo['url'] ?? ''),
          fit: BoxFit.cover,
        ),
      ),
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: LinearGradient(
                colors: [Colors.transparent, Colors.black.withAlpha(180)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Positioned(
            top: 4, right: 4,
            child: IconButton(
              icon: const Icon(Icons.delete, color: Colors.white, size: 20),
              onPressed: () => _deleteGalleryPhoto(photo['_id']),
            ),
          ),
          if (photo['title'] != null && photo['title'].toString().isNotEmpty)
            Positioned(
              bottom: 12, left: 12, right: 12,
              child: Text(
                photo['title'],
                style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                maxLines: 1, overflow: TextOverflow.ellipsis,
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _pickAndUploadPhoto() async {
    final sub = _salon?['subscription'];
    final plan = sub?['plan'] ?? 'pro';
    if (plan == 'starter') {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Le Pack Pro est requis pour la galerie photo.')));
      return;
    }

    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1080, maxHeight: 1080, imageQuality: 80);
    if (pickedFile == null) return;

    final titleCtrl = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text('Titre de la photo', style: TextStyle(color: AppTheme.textPrimary)),
        content: TextField(
          controller: titleCtrl,
          style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            hintText: 'Ex: Taper Fade',
            hintStyle: TextStyle(color: AppTheme.textMuted),
            filled: true,
            fillColor: AppTheme.bgDark,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler', style: TextStyle(color: Colors.white70))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            child: const Text('Envoyer', style: TextStyle(color: AppTheme.bgDark)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _loading = true);
    final success = await ApiService.addGalleryPhoto(titleCtrl.text.trim(), File(pickedFile.path));
    if (success) {
      await _loadSalonData();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo ajoutée', style: TextStyle(color: Colors.white)), backgroundColor: AppTheme.success));
    } else {
      setState(() => _loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Erreur d'upload", style: TextStyle(color: Colors.white)), backgroundColor: AppTheme.error));
    }
  }

  void _deleteGalleryPhoto(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text('Confirmer', style: TextStyle(color: AppTheme.textPrimary)),
        content: const Text('Supprimer cette photo ?', style: TextStyle(color: AppTheme.textMuted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler', style: TextStyle(color: Colors.white70))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _loading = true);
    final success = await ApiService.deleteGalleryPhoto(id);
    if (success) {
      await _loadSalonData();
    } else {
      setState(() => _loading = false);
    }
  }
}
