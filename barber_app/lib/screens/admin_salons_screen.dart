import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'login_screen.dart';

/// Prix catalogue (CHF/mois), comme `PLAN_PRICES` côté serveur.
const _planPrices = {'starter': 39.0, 'pro': 49.0, 'premium': 89.0};
const _planLabels = {'starter': 'Starter', 'pro': 'Pro', 'premium': 'Premium'};

String _plan(Map<String, dynamic> s) => (s['subscription']?['plan'] ?? 'pro').toString();

/// Prix réellement facturé : le prix enregistré sur le salon (ex. 40.- pour
/// un tarif négocié), sinon le prix catalogue du plan.
double _price(Map<String, dynamic> s) {
  final p = s['subscription']?['price'];
  if (p is num) return p.toDouble();
  return _planPrices[_plan(s)] ?? 49;
}

/// Un salon compte dans le revenu s'il est actif et n'est pas une démo.
bool _paying(Map<String, dynamic> s) => s['active'] == true && s['demoSeed'] != true;

final _chf = NumberFormat.decimalPattern('fr_CH');
String _money(num v) => '${_chf.format(v.round())} CHF';

/// Console admin Kreno : tableau de bord, salons, revenus, création de salon.
class AdminSalonsScreen extends StatefulWidget {
  const AdminSalonsScreen({super.key});

  @override
  State<AdminSalonsScreen> createState() => _AdminSalonsScreenState();
}

class _AdminSalonsScreenState extends State<AdminSalonsScreen> {
  List<Map<String, dynamic>> _salons = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String _query = '';
  String? _opening;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = _salons.isEmpty);
    final results = await Future.wait([ApiService.getAdminSalons(), ApiService.getAdminStats()]);
    if (!mounted) return;
    final list = results[0] as List<Map<String, dynamic>>?;
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
      _stats = (results[1] as Map<String, dynamic>?) ?? {};
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
      _snack(err, error: true);
      return;
    }
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()), (_) => false);
  }

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: GoogleFonts.dmSans()),
      backgroundColor: error ? AppTheme.error : AppTheme.success,
      behavior: SnackBarBehavior.floating,
    ));
  }

  Future<void> _logout() async {
    await ApiService.adminLogout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (_) => const _CreateSalonScreen(), fullscreenDialog: true),
    );
    if (created == null || !mounted) return;
    _snack('Salon « ${created['name']} » créé');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    const titles = ['Tableau de bord', 'Salons', 'Revenus'];
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgMain,
        elevation: 0,
        title: Text(titles[_tab],
            style: GoogleFonts.bricolageGrotesque(fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        actions: [
          IconButton(
            tooltip: 'Quitter la console admin',
            icon: const Icon(Icons.logout_rounded, color: AppTheme.textSecondary),
            onPressed: _logout,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        backgroundColor: AppTheme.textPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: Text('Nouveau salon', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        backgroundColor: AppTheme.bgCard,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights), label: 'Aperçu'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Salons'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Revenus'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: [_overview, _salonsTab, _revenueTab][_tab](),
            ),
    );
  }

  // ---------- Aperçu ----------
  Widget _overview() {
    final paying = _salons.where(_paying).toList();
    final mrr = paying.fold<double>(0, (sum, s) => sum + _price(s));
    final counts = <String, int>{};
    for (final s in paying) {
      counts[_plan(s)] = (counts[_plan(s)] ?? 0) + 1;
    }
    final recent = [..._salons.where((s) => s['createdAt'] != null)]
      ..sort((a, b) => b['createdAt'].toString().compareTo(a['createdAt'].toString()));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      children: [
        _bigCard('Revenu mensuel (MRR)', _money(mrr),
            '${paying.length} salon${paying.length > 1 ? 's' : ''} payant${paying.length > 1 ? 's' : ''} · ${_money(mrr * 12)} / an'),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.9,
          children: [
            _stat('Salons', '${_salons.length}', '${_salons.where((s) => s['active'] == true).length} actifs'),
            _stat('Clients', '${_stats['totalClients'] ?? '—'}', 'tous salons'),
            _stat('Rendez-vous', '${_stats['totalBookings'] ?? '—'}', 'au total'),
            _stat('Gérants', '${_stats['totalOwners'] ?? '—'}', '${_stats['totalEmployees'] ?? 0} employés'),
          ],
        ),
        const SizedBox(height: 12),
        _section('Abonnements', Row(children: [
          for (final p in ['starter', 'pro', 'premium'])
            Expanded(
              child: Column(children: [
                Text('${counts[p] ?? 0}',
                    style: GoogleFonts.bricolageGrotesque(
                        fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                const SizedBox(height: 2),
                Text(_planLabels[p]!, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textMuted)),
              ]),
            ),
        ])),
        const SizedBox(height: 12),
        _section(
          'Activité récente',
          Column(
            children: recent.take(8).map((s) {
              final d = DateTime.tryParse(s['createdAt'].toString());
              return _row(
                icon: Icons.add_business_outlined,
                title: 'Nouveau salon : ${s['name'] ?? '—'}',
                subtitle: '${s['owner']?['email'] ?? '—'} · ${_planLabels[_plan(s)] ?? _plan(s)}',
                trailing: d == null ? '' : DateFormat('d MMM yy', 'fr_FR').format(d.toLocal()),
                onTap: () => _open(s),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // ---------- Salons ----------
  Widget _salonsTab() {
    final q = _query.trim().toLowerCase();
    final shown = q.isEmpty
        ? _salons
        : _salons.where((s) {
            final hay = '${s['name'] ?? ''} ${s['slug'] ?? ''} ${s['owner']?['email'] ?? ''}'.toLowerCase();
            return hay.contains(q);
          }).toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      children: [
        TextField(
          onChanged: (v) => setState(() => _query = v),
          style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            hintText: 'Rechercher un salon, un e-mail…',
            prefixIcon: const Icon(Icons.search_rounded),
            filled: true,
            fillColor: AppTheme.bgCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 12),
        for (final s in shown) ...[_salonTile(s), const SizedBox(height: 8)],
      ],
    );
  }

  Widget _salonTile(Map<String, dynamic> s) {
    final active = s['active'] == true;
    final stats = (s['stats'] ?? {}) as Map;
    final id = s['_id']?.toString();
    final tags = [
      _planLabels[_plan(s)] ?? _plan(s),
      if (s['demoSeed'] == true) 'démo',
      if (!active) 'inactif',
      '${stats['clients'] ?? 0} clients',
      '${stats['bookings'] ?? 0} RDV',
    ].join(' · ');
    return _card(
      onTap: _opening == null ? () => _open(s) : null,
      child: Row(children: [
        Container(
          width: 8, height: 8,
          decoration: BoxDecoration(color: active ? AppTheme.success : AppTheme.textMuted, shape: BoxShape.circle),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s['name']?.toString() ?? '—',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 2),
            Text(tags,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
          ]),
        ),
        _opening == id
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
      ]),
    );
  }

  // ---------- Revenus ----------
  Widget _revenueTab() {
    final paying = _salons.where(_paying).toList()..sort((a, b) => _price(b).compareTo(_price(a)));
    final mrr = paying.fold<double>(0, (sum, s) => sum + _price(s));
    final others = _salons.where((s) => !_paying(s)).length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.9,
          children: [
            _stat('MRR', _money(mrr), 'par mois'),
            _stat('ARR', _money(mrr * 12), 'par an'),
            _stat('Revenu moyen', paying.isEmpty ? '—' : _money(mrr / paying.length), 'par salon'),
            _stat('Payants', '${paying.length}', '$others démo / inactifs'),
          ],
        ),
        const SizedBox(height: 12),
        _section(
          'Détail par salon',
          Column(
            children: paying.map((s) {
              final catalog = _planPrices[_plan(s)];
              final custom = catalog != null && _price(s) != catalog;
              return _row(
                icon: Icons.storefront_outlined,
                title: s['name']?.toString() ?? '—',
                subtitle: '${_planLabels[_plan(s)] ?? _plan(s)}${custom ? ' · tarif négocié' : ''}',
                trailing: '${_price(s).toStringAsFixed(_price(s) % 1 == 0 ? 0 : 2)}.-',
                onTap: () => _open(s),
              );
            }).toList(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 10, 4, 0),
          child: Text(
            'Estimation : salons actifs hors démo, au prix enregistré sur chaque salon. '
            'Les paiements réels sont dans Stripe.',
            style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
          ),
        ),
      ],
    );
  }

  // ---------- Briques visuelles (sobres) ----------
  Widget _card({required Widget child, VoidCallback? onTap, EdgeInsets? padding}) => Material(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: padding ?? const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.border),
            ),
            child: child,
          ),
        ),
      );

  Widget _bigCard(String label, String value, String sub) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: AppTheme.textPrimary, borderRadius: BorderRadius.circular(14)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: GoogleFonts.dmSans(fontSize: 13, color: Colors.white70)),
          const SizedBox(height: 6),
          Text(value,
              style: GoogleFonts.bricolageGrotesque(fontSize: 30, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 4),
          Text(sub, style: GoogleFonts.dmSans(fontSize: 13, color: Colors.white70)),
        ]),
      );

  Widget _stat(String label, String value, String sub) => _card(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(label, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                style: GoogleFonts.bricolageGrotesque(
                    fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
          ),
          Text(sub,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
        ]),
      );

  Widget _section(String title, Widget child) => _card(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          child,
          const SizedBox(height: 6),
        ]),
      );

  Widget _row({
    required IconData icon,
    required String title,
    required String subtitle,
    required String trailing,
    VoidCallback? onTap,
  }) =>
      InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(children: [
            Icon(icon, size: 20, color: AppTheme.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
                Text(subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
              ]),
            ),
            const SizedBox(width: 8),
            Text(trailing,
                style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          ]),
        ),
      );
}

/// Formulaire de création d'un salon (mêmes champs que la console web).
class _CreateSalonScreen extends StatefulWidget {
  const _CreateSalonScreen();

  @override
  State<_CreateSalonScreen> createState() => _CreateSalonScreenState();
}

class _CreateSalonScreenState extends State<_CreateSalonScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  final _ownerName = TextEditingController();
  final _ownerEmail = TextEditingController();
  final _ownerPassword = TextEditingController();
  String _plan = 'pro';
  String _sector = 'coiffure';
  bool _saving = false;

  static const _sectors = {
    'coiffure': 'Coiffure / Barbier',
    'beaute': 'Institut de beauté',
    'ongles': 'Onglerie',
    'epilation': 'Épilation',
    'massage': 'Massage / Spa',
    'autre': 'Autre',
  };

  @override
  void dispose() {
    for (final c in [_name, _address, _phone, _ownerName, _ownerEmail, _ownerPassword]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate() || _saving) return;
    setState(() => _saving = true);
    final r = await ApiService.adminCreateSalon({
      'name': _name.text.trim(),
      'address': _address.text.trim(),
      'phone': _phone.text.trim(),
      'sector': _sector,
      'subscription': {'plan': _plan},
      'ownerName': _ownerName.text.trim(),
      'ownerEmail': _ownerEmail.text.trim(),
      'ownerPassword': _ownerPassword.text,
    });
    if (!mounted) return;
    setState(() => _saving = false);
    if (r.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(r.error!, style: GoogleFonts.dmSans()),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    Navigator.of(context).pop(r.salon);
  }

  InputDecoration _dec(String label, {String? hint}) => InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: AppTheme.bgCard,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      );

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 20, 2, 8),
        child: Text(t.toUpperCase(),
            style: GoogleFonts.dmSans(
                fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: AppTheme.textMuted)),
      );

  @override
  Widget build(BuildContext context) {
    String? required(String? v) => (v == null || v.trim().isEmpty) ? 'Obligatoire' : null;
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgMain,
        elevation: 0,
        title: Text('Nouveau salon',
            style: GoogleFonts.bricolageGrotesque(fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
          children: [
            _label('Salon'),
            TextFormField(controller: _name, decoration: _dec('Nom du salon *'), validator: required,
                textCapitalization: TextCapitalization.words),
            const SizedBox(height: 10),
            TextFormField(controller: _address, decoration: _dec('Adresse', hint: 'Rue, NPA Ville')),
            const SizedBox(height: 10),
            TextFormField(controller: _phone, decoration: _dec('Téléphone du salon'),
                keyboardType: TextInputType.phone),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _sector,
              decoration: _dec('Secteur'),
              items: _sectors.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _sector = v ?? 'coiffure'),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _plan,
              decoration: _dec('Abonnement'),
              items: ['starter', 'pro', 'premium']
                  .map((p) => DropdownMenuItem(
                      value: p, child: Text('${_planLabels[p]} · ${_planPrices[p]!.toStringAsFixed(0)} CHF/mois')))
                  .toList(),
              onChanged: (v) => setState(() => _plan = v ?? 'pro'),
            ),
            _label('Gérant'),
            TextFormField(controller: _ownerName, decoration: _dec('Prénom et nom *'), validator: required,
                textCapitalization: TextCapitalization.words),
            const SizedBox(height: 10),
            TextFormField(
              controller: _ownerEmail,
              decoration: _dec('E-mail de connexion *'),
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              validator: (v) => (v == null || !v.contains('@') || !v.contains('.')) ? 'E-mail invalide' : null,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _ownerPassword,
              decoration: _dec('Mot de passe *', hint: '8 caractères minimum'),
              autocorrect: false,
              validator: (v) => (v == null || v.length < 8) ? '8 caractères minimum' : null,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(2, 10, 2, 0),
              child: Text(
                'Aucun e-mail n\'est envoyé au gérant : transmets-lui ses accès toi-même. '
                'Un salon créé ici est actif sans paiement Stripe et sans crédit SMS.',
                style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.textPrimary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _saving
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text('Créer le salon', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
