import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ApiService.getMyServices();
    if (mounted) setState(() { _services = list; _loading = false; });
  }

  Future<void> _deleteService(String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Supprimer "$name" ?',
            style: GoogleFonts.bricolageGrotesque(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
        content: Text('Cette prestation sera retirée de vos réservations.',
            style: GoogleFonts.dmSans(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Annuler', style: GoogleFonts.dmSans(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Supprimer', style: GoogleFonts.dmSans(color: AppTheme.error, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      final ok = await ApiService.deleteService(id);
      if (ok) _load();
    }
  }

  void _showServiceSheet(Map<String, dynamic>? existing) {
    final isEdit = existing != null;
    final nameCtrl = TextEditingController(text: existing?['name'] as String? ?? '');
    final priceCtrl = TextEditingController(
        text: existing?['price'] != null ? existing!['price'].toString() : '');
    final durationCtrl = TextEditingController(
        text: existing?['duration'] != null ? existing!['duration'].toString() : '');
    final descCtrl = TextEditingController(text: existing?['description'] as String? ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.textMuted.withAlpha(80),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(isEdit ? 'Modifier la prestation' : 'Ajouter une prestation',
                style: GoogleFonts.bricolageGrotesque(
                    fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            const SizedBox(height: 20),
            TextField(
              controller: nameCtrl,
              style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                labelText: 'Nom de la prestation *',
                prefixIcon: const Icon(Icons.spa_rounded, color: AppTheme.primary, size: 20),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: priceCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                    style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Prix (CHF)',
                      prefixIcon: const Icon(Icons.attach_money_rounded, color: AppTheme.primary, size: 20),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: durationCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Durée (min)',
                      prefixIcon: const Icon(Icons.timer_rounded, color: AppTheme.primary, size: 20),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: descCtrl,
              style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'Description (optionnel)',
                prefixIcon: const Icon(Icons.notes_rounded, color: AppTheme.primary, size: 20),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final name = nameCtrl.text.trim();
                  if (name.isEmpty) return;
                  final payload = {
                    'name': name,
                    if (priceCtrl.text.isNotEmpty) 'price': double.tryParse(priceCtrl.text) ?? 0,
                    if (durationCtrl.text.isNotEmpty) 'duration': int.tryParse(durationCtrl.text) ?? 30,
                    if (descCtrl.text.isNotEmpty) 'description': descCtrl.text.trim(),
                  };
                  Navigator.pop(ctx);
                  bool ok;
                  if (isEdit) {
                    final id = existing!['_id'] as String? ?? existing['id'] as String? ?? '';
                    ok = await ApiService.updateService(id, payload);
                  } else {
                    ok = await ApiService.addService(payload);
                  }
                  if (ok) _load();
                },
                child: Text(isEdit ? 'Enregistrer' : 'Ajouter',
                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes prestations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppTheme.primary),
            onPressed: () => _showServiceSheet(null),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
              color: AppTheme.primary,
              onRefresh: _load,
              child: _services.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.spa_outlined,
                              size: 64, color: AppTheme.textMuted.withAlpha(100)),
                          const SizedBox(height: 16),
                          Text('Aucune prestation',
                              style: GoogleFonts.bricolageGrotesque(
                                  fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
                          const SizedBox(height: 8),
                          Text('Ajoutez les services que vous proposez',
                              style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: () => _showServiceSheet(null),
                            icon: const Icon(Icons.add_rounded),
                            label: Text('Ajouter une prestation',
                                style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _services.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _buildServiceCard(_services[i]),
                    ),
            ),
      floatingActionButton: _services.isNotEmpty
          ? FloatingActionButton(
              onPressed: () => _showServiceSheet(null),
              child: const Icon(Icons.add_rounded),
            )
          : null,
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> svc) {
    final id = svc['_id'] as String? ?? svc['id'] as String? ?? '';
    final name = svc['name'] as String? ?? 'Prestation';
    final price = svc['price'];
    final duration = svc['duration'];
    final description = svc['description'] as String?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withAlpha(20)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: AppTheme.primary.withAlpha(26),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Icon(Icons.spa_rounded, color: AppTheme.primary, size: 22),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: GoogleFonts.bricolageGrotesque(
                        fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                if (description != null && description.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(description,
                      style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (price != null)
                      _buildBadge(
                        Icons.attach_money_rounded,
                        '${price is double ? price.toStringAsFixed(0) : price} CHF',
                        AppTheme.success,
                      ),
                    if (price != null && duration != null) const SizedBox(width: 8),
                    if (duration != null)
                      _buildBadge(Icons.timer_rounded, '${duration} min', AppTheme.warning),
                  ],
                ),
              ],
            ),
          ),
          Column(
            children: [
              GestureDetector(
                onTap: () => _showServiceSheet(svc),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withAlpha(26),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.edit_rounded, color: AppTheme.primary, size: 16),
                ),
              ),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: () => _deleteService(id, name),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withAlpha(20),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.delete_outline_rounded, color: AppTheme.error, size: 16),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.dmSans(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
