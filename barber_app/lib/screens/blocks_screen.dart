import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class BlocksScreen extends StatefulWidget {
  const BlocksScreen({super.key});

  @override
  State<BlocksScreen> createState() => _BlocksScreenState();
}

class _BlocksScreenState extends State<BlocksScreen> {
  List<Map<String, dynamic>> _blocks = [];
  bool _loading = true;

  final _dateFmt = DateFormat('dd/MM/yyyy', 'fr_FR');

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ApiService.getBlocks();
    if (!mounted) return;
    // Sort by date ascending
    list.sort((a, b) {
      final da = a['date'] as String? ?? '';
      final db = b['date'] as String? ?? '';
      return da.compareTo(db);
    });
    setState(() {
      _blocks = list;
      _loading = false;
    });
  }

  Future<void> _deleteBlock(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Supprimer ce créneau ?',
          style: GoogleFonts.bricolageGrotesque(
              color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
        ),
        content: Text(
          'Cette action est irréversible.',
          style: GoogleFonts.dmSans(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Annuler',
                style: GoogleFonts.dmSans(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Supprimer',
                style: GoogleFonts.dmSans(
                    color: AppTheme.error, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final ok = await ApiService.deleteBlock(id);
      if (!mounted) return;
      if (ok) {
        _load();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Créneau supprimé',
                style: GoogleFonts.dmSans(color: Colors.white)),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de la suppression',
                style: GoogleFonts.dmSans(color: Colors.white)),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  void _showAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => _AddBlockSheet(
        onCreated: () {
          _load();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Créneau bloqué ajouté',
                  style: GoogleFonts.dmSans(color: Colors.white)),
              backgroundColor: AppTheme.success,
              behavior: SnackBarBehavior.floating,
              shape:
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        },
        onError: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur lors de la création',
                  style: GoogleFonts.dmSans(color: Colors.white)),
              backgroundColor: AppTheme.error,
              behavior: SnackBarBehavior.floating,
              shape:
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        },
      ),
    );
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    try {
      final dt = DateTime.parse(raw);
      return _dateFmt.format(dt);
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Créneaux bloqués',
              style: GoogleFonts.bricolageGrotesque(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary),
            ),
            Text(
              'Gérez les indisponibilités',
              style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: AppTheme.textMuted,
                  fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.primary),
            tooltip: 'Actualiser',
            onPressed: _load,
          ),
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppTheme.primary),
            tooltip: 'Ajouter',
            onPressed: _showAddSheet,
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
              color: AppTheme.primary,
              onRefresh: _load,
              child: _blocks.isEmpty
                  ? _buildEmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _blocks.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _buildBlockCard(_blocks[i]),
                    ),
            ),
      floatingActionButton: _blocks.isNotEmpty
          ? FloatingActionButton(
              onPressed: _showAddSheet,
              tooltip: 'Ajouter un créneau',
              child: const Icon(Icons.add_rounded),
            )
          : null,
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.calendar_today_rounded,
              size: 64, color: AppTheme.textMuted.withAlpha(100)),
          const SizedBox(height: 16),
          Text(
            'Aucun créneau bloqué',
            style: GoogleFonts.bricolageGrotesque(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppTheme.textMuted),
          ),
          const SizedBox(height: 8),
          Text(
            'Ajoutez des indisponibilités pour votre salon',
            style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _showAddSheet,
            icon: const Icon(Icons.add_rounded),
            label: Text('Ajouter un créneau',
                style: GoogleFonts.dmSans(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildBlockCard(Map<String, dynamic> block) {
    final id = block['_id'] as String? ?? '';
    final date = _formatDate(block['date'] as String?);
    final startTime = block['startTime'] as String? ?? '—';
    final endTime = block['endTime'] as String? ?? '—';
    final reason = block['reason'] as String?;
    final employeeName = block['employeeName'] as String?;
    final displayEmployee =
        (employeeName == null || employeeName.isEmpty) ? 'Tout le salon' : employeeName;
    final isWholeSalon = employeeName == null || employeeName.isEmpty;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withAlpha(20)),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left color accent
          Container(
            width: 4,
            height: 64,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.warning, Color(0xFFF97316)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 14),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Date + time row
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 14, color: AppTheme.primary),
                    const SizedBox(width: 4),
                    Text(
                      date,
                      style: GoogleFonts.dmSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.access_time_rounded,
                        size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      '$startTime — $endTime',
                      style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                // Reason
                if (reason != null && reason.isNotEmpty) ...[
                  Text(
                    reason,
                    style: GoogleFonts.dmSans(
                        fontSize: 13, color: AppTheme.textSecondary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                ],
                // Employee badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isWholeSalon
                        ? AppTheme.primary.withAlpha(20)
                        : AppTheme.success.withAlpha(20),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isWholeSalon
                            ? Icons.store_rounded
                            : Icons.person_rounded,
                        size: 11,
                        color: isWholeSalon ? AppTheme.primary : AppTheme.success,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        displayEmployee,
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          color: isWholeSalon
                              ? AppTheme.primary
                              : AppTheme.success,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Delete button
          GestureDetector(
            onTap: id.isNotEmpty ? () => _deleteBlock(id) : null,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.error.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.delete_outline_rounded,
                  color: AppTheme.error, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Add Block Bottom Sheet ────────────────────────────────────────────────────

class _AddBlockSheet extends StatefulWidget {
  final VoidCallback onCreated;
  final VoidCallback onError;

  const _AddBlockSheet({required this.onCreated, required this.onError});

  @override
  State<_AddBlockSheet> createState() => _AddBlockSheetState();
}

class _AddBlockSheetState extends State<_AddBlockSheet> {
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 10, minute: 0);
  final _reasonCtrl = TextEditingController();

  List<Map<String, dynamic>> _employees = [];
  Map<String, dynamic>? _selectedEmployee; // null = whole salon
  bool _loadingEmployees = true;
  bool _saving = false;

  final _dateFmt = DateFormat('dd/MM/yyyy', 'fr_FR');

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadEmployees() async {
    final list = await ApiService.getMyEmployees();
    if (!mounted) return;
    setState(() {
      _employees = list;
      _loadingEmployees = false;
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
      locale: const Locale('fr', 'FR'),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppTheme.primary,
            onPrimary: Colors.white,
            surface: AppTheme.bgCard,
            onSurface: AppTheme.textPrimary,
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
      builder: (ctx, child) => _timePickerTheme(ctx, child),
    );
    if (picked != null) {
      setState(() => _startTime = picked);
    }
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
      builder: (ctx, child) => _timePickerTheme(ctx, child),
    );
    if (picked != null) {
      setState(() => _endTime = picked);
    }
  }

  Widget _timePickerTheme(BuildContext ctx, Widget? child) {
    return Theme(
      data: Theme.of(ctx).copyWith(
        colorScheme: const ColorScheme.light(
          primary: AppTheme.primary,
          onPrimary: Colors.white,
          surface: AppTheme.bgCard,
          onSurface: AppTheme.textPrimary,
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
        ),
      ),
      child: child!,
    );
  }

  String _formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _formatDateApi(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    final startMinutes = _startTime.hour * 60 + _startTime.minute;
    final endMinutes = _endTime.hour * 60 + _endTime.minute;
    if (endMinutes <= startMinutes) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("L'heure de fin doit être après l'heure de début",
              style: GoogleFonts.dmSans(color: Colors.white)),
          backgroundColor: AppTheme.warning,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    setState(() => _saving = true);

    final payload = {
      'date': _formatDateApi(_selectedDate),
      'startTime': _formatTime(_startTime),
      'endTime': _formatTime(_endTime),
      'reason': _reasonCtrl.text.trim().isEmpty ? null : _reasonCtrl.text.trim(),
      'employeeId': _selectedEmployee?['_id'],
      'employeeName': _selectedEmployee?['name'],
    };

    final ok = await ApiService.createBlock(payload);
    if (!mounted) return;

    Navigator.pop(context);
    if (ok) {
      widget.onCreated();
    } else {
      widget.onError();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.textMuted.withAlpha(80),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Title
          Text(
            'Bloquer un créneau',
            style: GoogleFonts.bricolageGrotesque(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary),
          ),
          Text(
            'Ajoutez une indisponibilité',
            style: GoogleFonts.dmSans(
                fontSize: 13, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 24),

          // Date picker
          _SectionLabel(label: 'Date *'),
          const SizedBox(height: 8),
          _PickerButton(
            icon: Icons.calendar_today_rounded,
            label: _dateFmt.format(_selectedDate),
            onTap: _pickDate,
          ),
          const SizedBox(height: 16),

          // Time pickers row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionLabel(label: 'Heure de début *'),
                    const SizedBox(height: 8),
                    _PickerButton(
                      icon: Icons.schedule_rounded,
                      label: _formatTime(_startTime),
                      onTap: _pickStartTime,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionLabel(label: 'Heure de fin *'),
                    const SizedBox(height: 8),
                    _PickerButton(
                      icon: Icons.schedule_rounded,
                      label: _formatTime(_endTime),
                      onTap: _pickEndTime,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Reason
          _SectionLabel(label: 'Motif (optionnel)'),
          const SizedBox(height: 8),
          TextField(
            controller: _reasonCtrl,
            style: GoogleFonts.dmSans(color: AppTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Ex: Réunion, Congé, Formation…',
              prefixIcon: const Icon(Icons.notes_rounded,
                  color: AppTheme.primary, size: 20),
            ),
          ),
          const SizedBox(height: 16),

          // Employee dropdown
          _SectionLabel(label: 'Employé (optionnel)'),
          const SizedBox(height: 8),
          _loadingEmployees
              ? const Center(
                  child: SizedBox(
                    height: 48,
                    child: Center(
                      child: CircularProgressIndicator(
                          color: AppTheme.primary, strokeWidth: 2),
                    ),
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.bgSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<Map<String, dynamic>?>(
                      value: _selectedEmployee,
                      isExpanded: true,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded,
                          color: AppTheme.textMuted),
                      dropdownColor: AppTheme.bgCard,
                      style: GoogleFonts.dmSans(
                          color: AppTheme.textPrimary, fontSize: 14),
                      items: [
                        DropdownMenuItem<Map<String, dynamic>?>(
                          value: null,
                          child: Row(
                            children: [
                              const Icon(Icons.store_rounded,
                                  color: AppTheme.primary, size: 18),
                              const SizedBox(width: 10),
                              Text('Tout le salon',
                                  style: GoogleFonts.dmSans(
                                      color: AppTheme.textPrimary,
                                      fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        ..._employees.map((emp) {
                          final name = emp['name'] as String? ?? 'Employé';
                          return DropdownMenuItem<Map<String, dynamic>?>(
                            value: emp,
                            child: Row(
                              children: [
                                const Icon(Icons.person_rounded,
                                    color: AppTheme.textMuted, size: 18),
                                const SizedBox(width: 10),
                                Text(name,
                                    style: GoogleFonts.dmSans(
                                        color: AppTheme.textPrimary)),
                              ],
                            ),
                          );
                        }),
                      ],
                      onChanged: (val) =>
                          setState(() => _selectedEmployee = val),
                    ),
                  ),
                ),

          const SizedBox(height: 28),

          // Save button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor: AppTheme.primary.withAlpha(100),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      'Enregistrer le créneau',
                      style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                          color: Colors.white),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Small reusable widgets ────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: GoogleFonts.dmSans(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppTheme.textSecondary,
          letterSpacing: 0.3),
    );
  }
}

class _PickerButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PickerButton(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.primary, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.dmSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textPrimary),
              ),
            ),
            const Icon(Icons.keyboard_arrow_down_rounded,
                color: AppTheme.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}
