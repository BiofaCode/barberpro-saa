import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

/// Modération des avis clients — équivalent mobile de la page "Avis" du
/// portail pro. Permet de publier ou rejeter les avis soumis par les clients.
class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key});

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  String _filter = 'pending'; // pending | approved | rejected | all
  String? _busyId; // id de l'avis en cours de modération

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ApiService.getReviews();
    if (mounted) setState(() { _all = list; _loading = false; });
  }

  // null/absent = en attente, true = publié, false = rejeté
  bool _isPending(Map<String, dynamic> r) => r['reviewApproved'] == null;

  List<Map<String, dynamic>> get _filtered {
    switch (_filter) {
      case 'pending':  return _all.where(_isPending).toList();
      case 'approved': return _all.where((r) => r['reviewApproved'] == true).toList();
      case 'rejected': return _all.where((r) => r['reviewApproved'] == false).toList();
      default:         return _all;
    }
  }

  int get _pendingCount => _all.where(_isPending).length;

  Future<void> _moderate(String bookingId, bool approved) async {
    HapticFeedback.mediumImpact();
    setState(() => _busyId = bookingId);
    final ok = await ApiService.moderateReview(bookingId, approved);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (ok) {
      // Mise à jour locale immédiate puis resync.
      setState(() {
        final idx = _all.indexWhere((r) => r['_id'] == bookingId);
        if (idx != -1) _all[idx]['reviewApproved'] = approved;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(approved ? 'Avis publié ✅' : 'Avis rejeté',
              style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w500)),
          backgroundColor: approved ? AppTheme.success : AppTheme.textSecondary,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          margin: const EdgeInsets.all(16),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur — réservé au propriétaire ?',
              style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w500)),
          backgroundColor: AppTheme.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          margin: const EdgeInsets.all(16),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Avis clients')),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : Column(
              children: [
                _buildFilterTabs(),
                Expanded(
                  child: RefreshIndicator(
                    color: AppTheme.primary,
                    onRefresh: _load,
                    child: _filtered.isEmpty
                        ? _buildEmpty()
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: _filtered.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (_, i) => _buildReviewCard(_filtered[i]),
                          ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterTabs() {
    Widget tab(String key, String label) {
      final active = _filter == key;
      final showCount = key == 'pending' && _pendingCount > 0;
      return Padding(
        padding: const EdgeInsets.only(right: 8),
        child: GestureDetector(
          onTap: () => setState(() => _filter = key),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: active ? AppTheme.primary : AppTheme.bgCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: active ? AppTheme.primary : AppTheme.border),
            ),
            child: Text(
              showCount ? '$label ($_pendingCount)' : label,
              style: GoogleFonts.dmSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : AppTheme.textSecondary,
              ),
            ),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      child: Row(children: [
        tab('pending', '⏳ En attente'),
        tab('approved', '✅ Publiés'),
        tab('rejected', '❌ Rejetés'),
        tab('all', 'Tous'),
      ]),
    );
  }

  Widget _buildEmpty() {
    final msgs = {
      'pending': 'Aucun avis en attente',
      'approved': 'Aucun avis publié',
      'rejected': 'Aucun avis rejeté',
      'all': 'Aucun avis client pour le moment',
    };
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        const Center(child: Text('⭐', style: TextStyle(fontSize: 44))),
        const SizedBox(height: 12),
        Center(
          child: Text(msgs[_filter] ?? msgs['all']!,
              style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
        ),
      ],
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> r) {
    final clientName = r['clientName'] as String? ?? 'Client';
    final serviceName = r['serviceName'] as String? ?? '';
    final date = r['date'] as String? ?? '';
    final rating = (r['reviewRating'] as num?)?.toInt() ?? 0;
    final comment = r['reviewComment'] as String? ?? '';
    final approved = r['reviewApproved']; // null | true | false
    final id = r['_id'] as String? ?? '';
    final initial = clientName.isNotEmpty ? clientName[0].toUpperCase() : '?';
    final isBusy = _busyId == id;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withAlpha(20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(initial,
                      style: GoogleFonts.bricolageGrotesque(
                          fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(clientName,
                        style: GoogleFonts.bricolageGrotesque(
                            fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                    if (serviceName.isNotEmpty || date.isNotEmpty)
                      Text([serviceName, date].where((s) => s.isNotEmpty).join(' · '),
                          style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              _statusBadge(approved),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(5, (i) => Icon(
              i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
              size: 20,
              color: const Color(0xFFF59E0B),
            )),
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('"$comment"',
                style: GoogleFonts.dmSans(
                    fontSize: 14, color: AppTheme.textSecondary, fontStyle: FontStyle.italic, height: 1.5)),
          ],
          const SizedBox(height: 14),
          _buildActions(id, approved, isBusy),
        ],
      ),
    );
  }

  Widget _statusBadge(dynamic approved) {
    String label;
    Color color;
    if (approved == true) { label = 'Publié'; color = AppTheme.success; }
    else if (approved == false) { label = 'Rejeté'; color = AppTheme.error; }
    else { label = 'En attente'; color = AppTheme.warning; }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }

  Widget _buildActions(String id, dynamic approved, bool isBusy) {
    if (isBusy) {
      return SizedBox(
        height: 38,
        child: Center(
          child: SizedBox(
            width: 20, height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
          ),
        ),
      );
    }
    if (approved == null) {
      // En attente : publier ou rejeter
      return Row(children: [
        Expanded(child: _actionBtn('✅ Publier', AppTheme.primary, false, () => _moderate(id, true))),
        const SizedBox(width: 8),
        Expanded(child: _actionBtn('❌ Rejeter', AppTheme.error, true, () => _moderate(id, false))),
      ]);
    }
    if (approved == true) {
      return _actionBtn('Retirer', AppTheme.textSecondary, true, () => _moderate(id, false));
    }
    // rejeté
    return _actionBtn('✅ Publier quand même', AppTheme.primary, true, () => _moderate(id, true));
  }

  Widget _actionBtn(String label, Color color, bool outlined, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 38,
        decoration: BoxDecoration(
          color: outlined ? Colors.transparent : color,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: outlined ? color.withAlpha(90) : Colors.transparent),
        ),
        child: Center(
          child: Text(label,
              style: GoogleFonts.dmSans(
                  fontSize: 13, fontWeight: FontWeight.w600,
                  color: outlined ? color : Colors.white)),
        ),
      ),
    );
  }
}
