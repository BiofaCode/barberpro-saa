import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../models/booking_model.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  List<Map<String, dynamic>> _clients = [];
  bool _loading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadClients();
  }

  Future<void> _loadClients() async {
    setState(() {
      _loading = true;
      _hasError = false;
    });
    try {
      final clients = await ApiService.getMyClients();
      if (!mounted) return;
      setState(() {
        _clients = clients;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _hasError = true;
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredClients {
    if (_searchQuery.isEmpty) return _clients;
    return _clients
        .where((c) => (c['name'] as String? ?? '')
            .toLowerCase()
            .contains(_searchQuery.toLowerCase()))
        .toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Clients',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: _loadClients,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.bgCard,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.refresh_rounded,
                              color: AppTheme.primary, size: 20),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withAlpha(26),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_clients.length} clients',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Search
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _searchQuery = v),
                decoration: InputDecoration(
                  hintText: 'Rechercher un client...',
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: AppTheme.textMuted,
                  ),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded,
                              color: AppTheme.textMuted),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                ),
              ),
            ),

            // Client list
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppTheme.primary),
                    )
                  : _hasError
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.wifi_off_rounded,
                                  size: 48, color: AppTheme.textMuted),
                              const SizedBox(height: 16),
                              Text(
                                'Impossible de charger les données',
                                style: GoogleFonts.outfit(
                                  fontSize: 15,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _loadClients,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 24, vertical: 12),
                                ),
                                child: Text('Réessayer',
                                    style: GoogleFonts.dmSans(
                                        fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          color: AppTheme.primary,
                          onRefresh: _loadClients,
                          child: _filteredClients.isEmpty
                              ? ListView(
                                  physics:
                                      const AlwaysScrollableScrollPhysics(),
                                  children: [
                                    const SizedBox(height: 80),
                                    Center(
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Text('👥',
                                              style:
                                                  TextStyle(fontSize: 48)),
                                          const SizedBox(height: 12),
                                          Text(
                                            _searchQuery.isNotEmpty
                                                ? 'Aucun client trouvé'
                                                : 'Aucun client pour l\'instant',
                                            style: GoogleFonts.outfit(
                                              fontSize: 15,
                                              color: AppTheme.textMuted,
                                            ),
                                          ),
                                          if (_searchQuery.isEmpty) ...[
                                            const SizedBox(height: 8),
                                            Text(
                                              'Les clients ajoutés depuis l\'admin\nou le site apparaîtront ici',
                                              textAlign: TextAlign.center,
                                              style: GoogleFonts.outfit(
                                                fontSize: 13,
                                                color: AppTheme.textMuted,
                                                height: 1.5,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                )
                              : ListView.builder(
                                  physics:
                                      const AlwaysScrollableScrollPhysics(),
                                  padding:
                                      const EdgeInsets.fromLTRB(20, 8, 20, 20),
                                  itemCount: _filteredClients.length,
                                  itemBuilder: (context, index) {
                                    final client = _filteredClients[index];
                                    return _buildClientCard(client);
                                  },
                                ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClientCard(Map<String, dynamic> client) {
    final name = client['name'] as String? ?? 'Client';
    final phone = client['phone'] as String? ?? '';
    final visits = (client['totalBookings'] ?? client['visits'] ?? 0) as int;

    final initials = name
        .split(' ')
        .map((n) => n.isNotEmpty ? n[0] : '')
        .join()
        .toUpperCase();

    return GestureDetector(
      onTap: () => _showClientHistory(client),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withAlpha(10)),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.bgDark,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    phone,
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Visit count + chevron
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '$visits visites',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      visits >= 10 ? 'Client fidèle' : 'Client',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: visits >= 10 ? AppTheme.success : AppTheme.textMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 18),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showClientHistory(Map<String, dynamic> client) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ClientHistorySheet(client: client),
    );
  }
}

// ─── Client History Bottom Sheet ─────────────────────────────────────────────

class _ClientHistorySheet extends StatefulWidget {
  final Map<String, dynamic> client;
  const _ClientHistorySheet({required this.client});

  @override
  State<_ClientHistorySheet> createState() => _ClientHistorySheetState();
}

class _ClientHistorySheetState extends State<_ClientHistorySheet> {
  List<BookingModel> _bookings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final all = await ApiService.getMyBookings();
    if (!mounted) return;
    final phone = widget.client['phone'] as String? ?? '';
    final name = widget.client['name'] as String? ?? '';
    final filtered = all.where((b) {
      if (phone.isNotEmpty && b.clientPhone == phone) return true;
      if (name.isNotEmpty && b.clientName == name) return true;
      return false;
    }).toList()
      ..sort((a, b) => b.dateTime.compareTo(a.dateTime));
    setState(() {
      _bookings = filtered;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.client['name'] as String? ?? 'Client';
    final phone = widget.client['phone'] as String? ?? '';
    final email = widget.client['email'] as String? ?? '';
    final initials = name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join().toUpperCase();

    final completed = _bookings.where((b) => b.status == BookingStatus.completed).toList();
    final totalSpent = completed.fold<double>(0, (sum, b) => sum + b.price);

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      expand: false,
      builder: (_, scrollCtrl) => Column(
        children: [
          // Drag handle
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 4),
            child: Center(
              child: Container(
                width: 36, height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.textMuted.withAlpha(80),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
          // Client header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Row(
              children: [
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.primaryDark]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(initials,
                        style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.bgDark)),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: GoogleFonts.bricolageGrotesque(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                      if (phone.isNotEmpty)
                        Text(phone, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.textSecondary)),
                      if (email.isNotEmpty)
                        Text(email, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Stats row
          if (!_loading) Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _StatChip(label: 'Visites', value: '${completed.length}', icon: Icons.check_circle_rounded, color: AppTheme.success),
                const SizedBox(width: 10),
                _StatChip(label: 'Dépensé', value: '${totalSpent.toInt()} CHF', icon: Icons.payments_rounded, color: AppTheme.primary),
                const SizedBox(width: 10),
                if (_bookings.isNotEmpty)
                  _StatChip(
                    label: 'Dernier RDV',
                    value: DateFormat('d MMM', 'fr_FR').format(_bookings.first.dateTime),
                    icon: Icons.calendar_today_rounded,
                    color: AppTheme.warning,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text('Historique des RDV',
                style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : _bookings.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('📅', style: TextStyle(fontSize: 40)),
                            const SizedBox(height: 12),
                            Text('Aucun RDV trouvé',
                                style: GoogleFonts.outfit(fontSize: 14, color: AppTheme.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        controller: scrollCtrl,
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        itemCount: _bookings.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final b = _bookings[i];
                          final color = b.status == BookingStatus.completed
                              ? AppTheme.success
                              : b.status == BookingStatus.cancelled
                                  ? AppTheme.error
                                  : AppTheme.primary;
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppTheme.bgDark,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 8, height: 8,
                                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(b.serviceName,
                                          style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                                      Text(
                                        DateFormat("d MMM yyyy 'à' HH:mm", 'fr_FR').format(b.dateTime),
                                        style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Text('${b.price.toInt()} CHF',
                                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatChip({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(value, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
            Text(label, style: GoogleFonts.dmSans(fontSize: 10, color: AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}
