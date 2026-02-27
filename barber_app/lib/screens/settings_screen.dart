import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

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
        title: Text('Se déconnecter ?', style: GoogleFonts.outfit(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
        content: Text('Voulez-vous vraiment vous déconnecter ?', style: GoogleFonts.outfit(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Annuler', style: GoogleFonts.outfit(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () {
              ApiService.logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (_) => false,
              );
            },
            child: Text('Déconnexion', style: GoogleFonts.outfit(color: AppTheme.error, fontWeight: FontWeight.w600)),
          ),
        ],
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
                            style: GoogleFonts.playfairDisplay(
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
                      _buildSectionTitle('Informations du salon'),
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

                      // Employees
                      _buildSectionTitle('Mon équipe (${_employees.length})'),
                      const SizedBox(height: 12),
                      if (_employees.isEmpty)
                        _buildEmptyCard('Aucun employé', 'Ajoutez des membres à votre équipe')
                      else
                        ..._employees.map((e) => _buildEmployeeTile(e)),
                      const SizedBox(height: 24),

                      // Services
                      _buildSectionTitle('Prestations (${_services.length})'),
                      const SizedBox(height: 12),
                      ..._services.map((s) => _buildServiceTile(s)),
                      const SizedBox(height: 24),

                      // Hours
                      _buildSectionTitle('Horaires d\'ouverture'),
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
                          'BarberPro v2.0.0\nPlateforme SaaS pour barbiers',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted, height: 1.6),
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
                style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w700, color: AppTheme.bgDark),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(ownerName, style: GoogleFonts.playfairDisplay(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                const SizedBox(height: 4),
                Text(salonName, style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.textSecondary)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: AppTheme.warning, size: 16),
                    const SizedBox(width: 4),
                    Text('$rating ($reviews avis)', style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w500)),
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
    return Container(
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
                Text('/s/$slug', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                const SizedBox(height: 2),
                Text('Site de réservation de vos clients', style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
          const Icon(Icons.open_in_new_rounded, color: AppTheme.textMuted, size: 18),
        ],
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
          Text(title, style: GoogleFonts.outfit(fontSize: 14, color: AppTheme.textMuted)),
          const SizedBox(height: 4),
          Text(subtitle, style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildEmployeeTile(Map<String, dynamic> emp) {
    final name = emp['name'] as String? ?? '';
    final specialties = (emp['specialties'] as List?)?.join(', ') ?? '';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primary.withAlpha(26),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.primary),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
                if (specialties.isNotEmpty)
                  Text(specialties, style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.success.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('Actif', style: GoogleFonts.outfit(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary));
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
                Text(label, style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted)),
                const SizedBox(height: 2),
                Text(value, style: GoogleFonts.outfit(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
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
          final isClosed = h == null;
          final timeStr = isClosed ? 'Fermé' : '${h['open']} - ${h['close']}';
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(entry.value, style: GoogleFonts.outfit(fontSize: 14, color: isClosed ? AppTheme.textMuted : AppTheme.textPrimary)),
                Text(timeStr, style: GoogleFonts.outfit(fontSize: 14, color: isClosed ? AppTheme.error : AppTheme.primary, fontWeight: FontWeight.w500)),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildServiceTile(Map<String, dynamic> service) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withAlpha(10)),
      ),
      child: Row(
        children: [
          Text(service['icon'] as String? ?? '✂️', style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(service['name'] as String? ?? '', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
                Text('${service['duration'] ?? 30} min', style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
          Text(
            '${service['price'] ?? 0} CHF',
            style: GoogleFonts.playfairDisplay(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.primary),
          ),
        ],
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
                Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
                Text(subtitle, style: GoogleFonts.outfit(fontSize: 12, color: AppTheme.textMuted)),
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
}
