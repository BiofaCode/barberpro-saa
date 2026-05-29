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

  Future<void> _deleteEmployee(String id, String name, String role) async {
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
      final ok = await ApiService.deleteEmployee(id, role: role);
      if (ok) {
        _load();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Impossible de supprimer ce membre',
                style: GoogleFonts.dmSans(color: Colors.white)),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _showAddSheet() {
    final nameCtrl = TextEditingController();
    final specCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    String role = 'employee'; // employee | owner (manager)

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
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
            Text('Ajouter un membre',
                style: GoogleFonts.bricolageGrotesque(
                    fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            const SizedBox(height: 20),
            // Role selector
            Text('Rôle',
                style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
            const SizedBox(height: 8),
            Row(
              children: [
                _roleChip('Employé', 'employee', role, () => setSheetState(() => role = 'employee')),
                const SizedBox(width: 10),
                _roleChip('Manager', 'owner', role, () => setSheetState(() => role = 'owner')),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              role == 'owner'
                  ? 'Le manager peut se connecter et gérer le salon. Email + mot de passe requis.'
                  : 'Un employé apparaît dans le planning mais ne se connecte pas.',
              style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: nameCtrl,
              style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                labelText: 'Nom complet *',
                prefixIcon: Icon(Icons.person_rounded, color: AppTheme.primary, size: 20),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: specCtrl,
              style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                labelText: 'Spécialités (séparées par une virgule)',
                prefixIcon: Icon(Icons.auto_awesome_rounded, color: AppTheme.primary, size: 20),
                hintText: 'Coupe, Barbe, Coloration…',
              ),
            ),
            if (role == 'owner') ...[
              const SizedBox(height: 14),
              TextField(
                controller: emailCtrl,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Email de connexion *',
                  prefixIcon: Icon(Icons.email_rounded, color: AppTheme.primary, size: 20),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: passwordCtrl,
                obscureText: true,
                style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Mot de passe *',
                  prefixIcon: Icon(Icons.lock_rounded, color: AppTheme.primary, size: 20),
                ),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final name = nameCtrl.text.trim();
                  if (name.isEmpty) return;
                  if (role == 'owner' &&
                      (emailCtrl.text.trim().isEmpty || passwordCtrl.text.trim().isEmpty)) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(
                        content: Text('Email et mot de passe requis pour un manager',
                            style: GoogleFonts.dmSans(color: Colors.white)),
                        backgroundColor: AppTheme.error,
                      ),
                    );
                    return;
                  }
                  final specs = specCtrl.text
                      .split(',')
                      .map((s) => s.trim())
                      .where((s) => s.isNotEmpty)
                      .toList();
                  final payload = <String, dynamic>{
                    'name': name,
                    'role': role,
                    'specialties': specs,
                  };
                  if (role == 'owner') {
                    payload['email'] = emailCtrl.text.trim();
                    payload['password'] = passwordCtrl.text.trim();
                  }
                  Navigator.pop(ctx);
                  final ok = await ApiService.addEmployee(payload);
                  if (ok) {
                    _load();
                  } else if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Ajout impossible (limite du forfait ou email déjà utilisé)',
                            style: GoogleFonts.dmSans(color: Colors.white)),
                        backgroundColor: AppTheme.error,
                      ),
                    );
                  }
                },
                child: Text('Ajouter', style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15)),
              ),
            ),
          ],
        ),
        ),
        ),
      ),
    );
  }

  Widget _roleChip(String label, String value, String current, VoidCallback onTap) {
    final isSelected = value == current;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary.withAlpha(40) : AppTheme.bgSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.primary : AppTheme.border,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.dmSans(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
              ),
            ),
          ),
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
            icon: Icon(Icons.add_rounded, color: AppTheme.primary),
            onPressed: _showAddSheet,
          ),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: AppTheme.primary))
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
                            icon: Icon(Icons.add_rounded),
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
              child: Icon(Icons.add_rounded),
            )
          : null,
    );
  }

  Widget _buildEmployeeCard(Map<String, dynamic> emp) {
    final id = emp['_id'] as String? ?? emp['id'] as String? ?? '';
    final name = emp['name'] as String? ?? 'Employé';
    final specs = (emp['specialties'] as List?)?.cast<String>() ?? [];
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final role = emp['role'] as String? ?? 'employee';
    final isManager = role == 'owner';

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
              gradient: LinearGradient(
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
              color: (isManager ? AppTheme.primary : AppTheme.success).withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(isManager ? 'Manager' : 'Employé',
                style: GoogleFonts.dmSans(
                    fontSize: 11,
                    color: isManager ? AppTheme.primary : AppTheme.success,
                    fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => _deleteEmployee(id, name, role),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.error.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.delete_outline_rounded, color: AppTheme.error, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
