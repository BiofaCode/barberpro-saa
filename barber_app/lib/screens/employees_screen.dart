import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  List<Map<String, dynamic>> _employees = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ApiService.getMyEmployees();
    if (mounted) setState(() { _employees = list; _loading = false; });
  }

  Future<void> _deleteEmployee(String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Supprimer $name ?',
            style: GoogleFonts.bricolageGrotesque(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
        content: Text('Cette action est irréversible.',
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
      final ok = await ApiService.deleteEmployee(id);
      if (ok) _load();
    }
  }

  void _showAddSheet() {
    final nameCtrl = TextEditingController();
    final specCtrl = TextEditingController();

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
            Text('Ajouter un employé',
                style: GoogleFonts.bricolageGrotesque(
                    fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            const SizedBox(height: 20),
            TextField(
              controller: nameCtrl,
              style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                labelText: 'Nom complet *',
                prefixIcon: const Icon(Icons.person_rounded, color: AppTheme.primary, size: 20),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: specCtrl,
              style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                labelText: 'Spécialités (séparées par une virgule)',
                prefixIcon: const Icon(Icons.auto_awesome_rounded, color: AppTheme.primary, size: 20),
                hintText: 'Coupe, Barbe, Coloration…',
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final name = nameCtrl.text.trim();
                  if (name.isEmpty) return;
                  final specs = specCtrl.text
                      .split(',')
                      .map((s) => s.trim())
                      .where((s) => s.isNotEmpty)
                      .toList();
                  Navigator.pop(ctx);
                  final ok = await ApiService.addEmployee({'name': name, 'specialties': specs});
                  if (ok) _load();
                },
                child: Text('Ajouter', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15)),
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
        title: const Text('Mon équipe'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppTheme.primary),
            onPressed: _showAddSheet,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
              color: AppTheme.primary,
              onRefresh: _load,
              child: _employees.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.people_outline_rounded,
                              size: 64, color: AppTheme.textMuted.withAlpha(100)),
                          const SizedBox(height: 16),
                          Text('Aucun employé',
                              style: GoogleFonts.bricolageGrotesque(
                                  fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
                          const SizedBox(height: 8),
                          Text('Ajoutez des membres à votre équipe',
                              style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _showAddSheet,
                            icon: const Icon(Icons.add_rounded),
                            label: Text('Ajouter un employé',
                                style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _employees.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _buildEmployeeCard(_employees[i]),
                    ),
            ),
      floatingActionButton: _employees.isNotEmpty
          ? FloatingActionButton(
              onPressed: _showAddSheet,
              child: const Icon(Icons.add_rounded),
            )
          : null,
    );
  }

  Widget _buildEmployeeCard(Map<String, dynamic> emp) {
    final id = emp['_id'] as String? ?? emp['id'] as String? ?? '';
    final name = emp['name'] as String? ?? 'Employé';
    final specs = (emp['specialties'] as List?)?.cast<String>() ?? [];
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withAlpha(20)),
      ),
      child: Row(
        children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryDark],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Text(initial,
                  style: GoogleFonts.bricolageGrotesque(
                      fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.bgDark)),
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
                if (specs.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: specs.map((s) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withAlpha(26),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(s,
                          style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w500)),
                    )).toList(),
                  ),
                ] else ...[
                  const SizedBox(height: 4),
                  Text('Aucune spécialité',
                      style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.success.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('Actif',
                style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => _deleteEmployee(id, name),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.error.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.delete_outline_rounded, color: AppTheme.error, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
