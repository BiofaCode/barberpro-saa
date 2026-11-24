import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'login_screen.dart';

/// Console admin Kreno : tous les salons, ouvrables comme leur gérant.
class AdminSalonsScreen extends StatefulWidget {
  const AdminSalonsScreen({super.key});

  @override
  State<AdminSalonsScreen> createState() => _AdminSalonsScreenState();
}

class _AdminSalonsScreenState extends State<AdminSalonsScreen> {
  List<Map<String, dynamic>> _salons = [];
  bool _loading = true;
  String _query = '';
  String? _opening;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ApiService.getAdminSalons();
    if (!mounted) return;
    if (list == null) {
      // Jeton admin absent/expiré → retour à la connexion.
      Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
      return;
    }
    list.sort((a, b) {
      final act = (b['active'] == true ? 1 : 0) - (a['active'] == true ? 1 : 0);
      if (act != 0) return act;
      return (a['name'] ?? '').toString().toLowerCase().compareTo((b['name'] ?? '').toString().toLowerCase());
    });
    setState(() {
      _salons = list;
      _loading = false;
    });
  }

  Future<void> _open(Map<String, dynamic> s) async {
    final id = s['_id']?.toString();
    if (id == null) return;
    setState(() => _opening = id);
    final err = await ApiService.openSalonAsAdmin(id);
    if (!mounted) return;
    setState(() => _opening = null);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err, style: GoogleFonts.dmSans()),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()), (_) => false);
  }

  Future<void> _logout() async {
    await ApiService.adminLogout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final shown = q.isEmpty
        ? _salons
        : _salons.where((s) {
            final hay = '${s['name'] ?? ''} ${s['slug'] ?? ''} ${s['owner']?['email'] ?? ''}'.toLowerCase();
            return hay.contains(q);
          }).toList();

    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgMain,
        elevation: 0,
        title: Text('Console admin',
            style: GoogleFonts.bricolageGrotesque(fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        actions: [
          IconButton(
            tooltip: 'Quitter la console admin',
            icon: const Icon(Icons.logout_rounded, color: AppTheme.error),
            onPressed: _logout,
          ),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _query = v),
            style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Rechercher un salon, un e-mail…',
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true,
              fillColor: AppTheme.bgCard,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                    itemCount: shown.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _tile(shown[i]),
                  ),
                ),
        ),
      ]),
    );
  }

  Widget _tile(Map<String, dynamic> s) {
    final active = s['active'] == true;
    final demo = s['demoSeed'] == true;
    final plan = (s['subscription']?['plan'] ?? '').toString();
    final stats = (s['stats'] ?? {}) as Map;
    final id = s['_id']?.toString();
    final opening = _opening == id;
    return Material(
      color: AppTheme.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: _opening == null ? () => _open(s) : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 10, height: 10,
              decoration: BoxDecoration(
                color: active ? AppTheme.success : AppTheme.textMuted,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s['name']?.toString() ?? '—',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                const SizedBox(height: 3),
                Text(
                  [
                    s['slug'],
                    if (plan.isNotEmpty) plan,
                    if (demo) 'démo',
                    if (!active) 'inactif',
                    '${stats['bookings'] ?? 0} RDV',
                  ].where((e) => e != null && e.toString().isNotEmpty).join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
                ),
              ]),
            ),
            opening
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
          ]),
        ),
      ),
    );
  }
}
