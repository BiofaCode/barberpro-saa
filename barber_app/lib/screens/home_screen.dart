import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'dashboard_screen.dart';
import 'appointments_screen.dart';
import 'clients_screen.dart';
import 'settings_screen.dart';
import 'employees_screen.dart';
import 'services_screen.dart';
import 'blocks_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final _dashboardKey = GlobalKey<DashboardScreenState>();
  final _appointmentsKey = GlobalKey<AppointmentsScreenState>();

  late final List<Widget> _screens = [
    DashboardScreen(key: _dashboardKey),
    AppointmentsScreen(key: _appointmentsKey),
    const ClientsScreen(),
    const SettingsScreen(),
  ];

  void openDrawer() => _scaffoldKey.currentState?.openDrawer();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(context),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          border: Border(
            top: BorderSide(color: AppTheme.primary.withAlpha(20), width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(20),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              _NavItem(icon: Icons.dashboard_rounded, label: 'Accueil', index: 0, current: _currentIndex, onTap: _onTap),
              _NavItem(icon: Icons.calendar_month_rounded, label: 'RDV', index: 1, current: _currentIndex, onTap: _onTap),
              _NewButton(onTap: _onNewTap),
              _NavItem(icon: Icons.people_rounded, label: 'Clients', index: 2, current: _currentIndex, onTap: _onTap),
              _NavItem(icon: Icons.storefront_rounded, label: 'Salon', index: 3, current: _currentIndex, onTap: _onTap),
            ],
          ),
        ),
      ),
    );
  }

  void _onTap(int index) {
    setState(() => _currentIndex = index);
    if (index == 0) _dashboardKey.currentState?.reload();
    if (index == 1) _appointmentsKey.currentState?.reload();
  }

  Future<void> _onNewTap() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const _NewBookingSheet(),
    );
    _appointmentsKey.currentState?.reload();
    _dashboardKey.currentState?.reload();
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: AppTheme.bgCard,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(
                      child: Text('K', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text('Kreno',
                    style: GoogleFonts.bricolageGrotesque(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    )),
                ],
              ),
            ),
            const Divider(height: 24),
            _DrawerItem(
              icon: Icons.group_rounded,
              label: 'Équipe',
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EmployeesScreen()));
              },
            ),
            _DrawerItem(
              icon: Icons.spa_rounded,
              label: 'Services',
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ServicesScreen()));
              },
            ),
            _DrawerItem(
              icon: Icons.block_rounded,
              label: 'Créneaux bloqués',
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BlocksScreen()));
              },
            ),
            const Spacer(),
            const Divider(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text('Version 1.0 · Kreno',
                style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// New Booking Sheet
// ─────────────────────────────────────────────────────────────────────────────

class _NewBookingSheet extends StatefulWidget {
  const _NewBookingSheet();

  @override
  State<_NewBookingSheet> createState() => _NewBookingSheetState();
}

class _NewBookingSheetState extends State<_NewBookingSheet> {
  // Loading state
  bool _loadingInit = true;

  // Services & employees
  List<Map<String, dynamic>> _services = [];
  List<Map<String, dynamic>> _employees = [];

  // Selected values
  Map<String, dynamic>? _selectedService;
  Map<String, dynamic>? _selectedEmployee; // null = "Aucun / Au choix"
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();

  // Client fields
  Map<String, dynamic>? _selectedClient;
  final TextEditingController _clientSearchCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();

  List<Map<String, dynamic>> _clientResults = [];
  bool _searchingClients = false;
  bool _showClientResults = false;
  Timer? _searchTimer;

  // Submit state
  bool _submitting = false;
  bool _showServiceError = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _searchTimer?.cancel();
    _clientSearchCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final results = await Future.wait([
      ApiService.getMyServices(),
      ApiService.getMyEmployees(),
    ]);
    if (!mounted) return;
    setState(() {
      _services = results[0];
      _employees = results[1];
      _loadingInit = false;
    });
  }

  void _onClientSearchChanged(String value) {
    _searchTimer?.cancel();
    if (value.length < 2) {
      setState(() {
        _clientResults = [];
        _showClientResults = false;
        _searchingClients = false;
      });
      return;
    }
    setState(() => _searchingClients = true);
    _searchTimer = Timer(const Duration(milliseconds: 300), () async {
      final results = await ApiService.searchClients(value);
      if (!mounted) return;
      setState(() {
        _clientResults = results;
        _showClientResults = true;
        _searchingClients = false;
      });
    });
  }

  void _selectClient(Map<String, dynamic> client) {
    setState(() {
      _selectedClient = client;
      _clientSearchCtrl.text = client['name'] ?? '';
      _phoneCtrl.text = client['phone'] ?? '';
      _emailCtrl.text = client['email'] ?? '';
      _showClientResults = false;
      _clientResults = [];
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isAfter(DateTime.now()) ? _selectedDate : DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppTheme.primary,
            onPrimary: Colors.white,
            surface: AppTheme.bgCard,
            onSurface: AppTheme.textPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _pickTime() async {
    // Sélecteur de créneaux toutes les 30 min
    final picked = await _showTimeSlotPicker(context, _selectedTime);
    if (picked != null) setState(() => _selectedTime = picked);
  }

  static Future<TimeOfDay?> _showTimeSlotPicker(
      BuildContext context, TimeOfDay current) {
    // Créneaux de 7h00 à 21h30 par tranches de 30 min
    final slots = <TimeOfDay>[];
    for (int h = 7; h <= 21; h++) {
      slots.add(TimeOfDay(hour: h, minute: 0));
      if (h < 21) slots.add(TimeOfDay(hour: h, minute: 30));
    }

    return showModalBottomSheet<TimeOfDay>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _TimeSlotSheet(slots: slots, current: current),
    );
  }

  Future<void> _submit() async {
    // Validation: past date/time
    final selectedDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );
    if (selectedDateTime.isBefore(DateTime.now())) {
      _showValidationSnack('Impossible de créer un RDV dans le passé');
      return;
    }

    // Validation: client name required
    final clientName = _clientSearchCtrl.text.trim();
    if (clientName.isEmpty) {
      _showValidationSnack('Veuillez saisir le nom du client');
      return;
    }

    // Validation: service required
    if (_selectedService == null) {
      setState(() => _showServiceError = true);
      _showValidationSnack('Veuillez sélectionner une prestation');
      return;
    }

    // Validation: phone required
    if (_phoneCtrl.text.trim().isEmpty) {
      _showValidationSnack('Veuillez saisir le téléphone du client');
      return;
    }

    setState(() => _submitting = true);

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final timeStr = DateFormat('HH:mm').format(
      DateTime(2000, 1, 1, _selectedTime.hour, _selectedTime.minute),
    );

    final svc = _selectedService!;
    final payload = <String, dynamic>{
      'serviceName': svc['name'] ?? '',
      'serviceIcon': svc['icon'] ?? '',
      'price': svc['price'] ?? 0,
      'duration': svc['duration'] ?? 30,
      'date': dateStr,
      'time': timeStr,
      'employeeId': _selectedEmployee?['_id'],
      'employeeName': _selectedEmployee?['name'],
      'clientName': clientName,
      'clientPhone': _phoneCtrl.text.trim(),
      'clientEmail': _emailCtrl.text.trim(),
      'clientId': _selectedClient?['_id'],
      'notes': _notesCtrl.text.trim(),
      'source': 'manual',
      'status': 'confirmed',
    };

    final result = await ApiService.createBooking(payload);
    if (!mounted) return;
    setState(() => _submitting = false);

    if (result != null) {
      _showSnack('RDV créé avec succès ✓', isError: false);
      Navigator.of(context).pop();
    } else {
      _showSnack('Erreur lors de la création du RDV', isError: true);
    }
  }

  void _showValidationSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w500)),
        backgroundColor: AppTheme.warning,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showSnack(String msg, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.dmSans(color: Colors.white, fontWeight: FontWeight.w500)),
        backgroundColor: isError ? AppTheme.error : AppTheme.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        initialChildSize: 0.92,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (ctx, scrollCtrl) {
          return Column(
            children: [
              // ── Drag handle + title ──────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: Column(
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppTheme.textMuted.withAlpha(80),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Text(
                          'Nouveau rendez-vous',
                          style: GoogleFonts.bricolageGrotesque(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppTheme.bgSurface,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(Icons.close_rounded, size: 18, color: AppTheme.textMuted),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Divider(height: 1, color: AppTheme.border),
                  ],
                ),
              ),
              // ── Body ─────────────────────────────────────────────
              Expanded(
                child: _loadingInit
                    ? Center(
                        child: CircularProgressIndicator(
                          color: AppTheme.primary,
                          strokeWidth: 2,
                        ),
                      )
                    : ListView(
                        controller: scrollCtrl,
                        padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
                        children: [
                          // ── Prestation ──────────────────────────
                          _SectionLabel(label: 'Prestation', required: true),
                          const SizedBox(height: 8),
                          _ServiceDropdown(
                            services: _services,
                            selected: _selectedService,
                            showError: _showServiceError,
                            onChanged: (svc) => setState(() {
                              _selectedService = svc;
                              _showServiceError = false;
                            }),
                          ),
                          const SizedBox(height: 20),

                          // ── Date & Heure ─────────────────────────
                          _SectionLabel(label: 'Date & Heure', required: true),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _PickerButton(
                                  icon: Icons.calendar_today_rounded,
                                  label: DateFormat('EEE d MMM', 'fr_FR').format(_selectedDate),
                                  onTap: _pickDate,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _PickerButton(
                                  icon: Icons.access_time_rounded,
                                  label: _selectedTime.format(context),
                                  onTap: _pickTime,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ── Employé ─────────────────────────────
                          _SectionLabel(label: 'Employé', required: false),
                          const SizedBox(height: 8),
                          _EmployeeDropdown(
                            employees: _employees,
                            selected: _selectedEmployee,
                            onChanged: (emp) => setState(() => _selectedEmployee = emp),
                          ),
                          const SizedBox(height: 20),

                          // ── Client ───────────────────────────────
                          _SectionLabel(label: 'Client', required: true),
                          const SizedBox(height: 8),
                          _buildClientSearch(),
                          if (_showClientResults && _clientResults.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            _buildClientResultsList(),
                          ],
                          const SizedBox(height: 12),
                          _buildTextField(
                            controller: _phoneCtrl,
                            hint: 'Téléphone',
                            icon: Icons.phone_rounded,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            controller: _emailCtrl,
                            hint: 'Email',
                            icon: Icons.email_rounded,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 20),

                          // ── Notes ────────────────────────────────
                          _SectionLabel(label: 'Notes', required: false),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _notesCtrl,
                            hint: 'Informations complémentaires…',
                            icon: Icons.notes_rounded,
                            maxLines: 3,
                          ),
                          const SizedBox(height: 28),

                          // ── Submit button ─────────────────────────
                          _SubmitButton(
                            loading: _submitting,
                            onTap: _submit,
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildClientSearch() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: TextField(
        controller: _clientSearchCtrl,
        onChanged: _onClientSearchChanged,
        style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary),
        decoration: InputDecoration(
          hintText: 'Rechercher un client…',
          hintStyle: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted),
          prefixIcon: Icon(Icons.search_rounded, size: 20, color: AppTheme.textMuted),
          suffixIcon: _searchingClients
              ? Padding(
                  padding: const EdgeInsets.all(12),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                  ),
                )
              : (_clientSearchCtrl.text.isNotEmpty
                  ? GestureDetector(
                      onTap: () {
                        _clientSearchCtrl.clear();
                        setState(() {
                          _selectedClient = null;
                          _clientResults = [];
                          _showClientResults = false;
                        });
                      },
                      child: Icon(Icons.close_rounded, size: 18, color: AppTheme.textMuted),
                    )
                  : null),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          filled: false,
        ),
      ),
    );
  }

  Widget _buildClientResultsList() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
        boxShadow: AppTheme.shadowMd,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _clientResults.length > 5 ? 5 : _clientResults.length,
          separatorBuilder: (_, __) => Divider(height: 1, color: AppTheme.border),
          itemBuilder: (_, i) {
            final client = _clientResults[i];
            final name = client['name'] ?? '';
            final phone = client['phone'] ?? '';
            final email = client['email'] ?? '';
            return InkWell(
              onTap: () => _selectClient(client),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withAlpha(20),
                        borderRadius: BorderRadius.circular(17),
                      ),
                      child: Center(
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                            style: GoogleFonts.dmSans(
                              fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                          if (phone.isNotEmpty || email.isNotEmpty)
                            Text(phone.isNotEmpty ? phone : email,
                              style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.textMuted),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted),
          prefixIcon: maxLines == 1
              ? Icon(icon, size: 20, color: AppTheme.textMuted)
              : Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 0, 0),
                  child: Icon(icon, size: 20, color: AppTheme.textMuted),
                ),
          prefixIconConstraints: maxLines > 1
              ? const BoxConstraints(minWidth: 48, minHeight: 0)
              : null,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(
            horizontal: 16,
            vertical: maxLines > 1 ? 14 : 14,
          ),
          filled: false,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-widgets for the booking sheet
// ─────────────────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  final bool required;
  const _SectionLabel({required this.label, required this.required});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label,
          style: GoogleFonts.dmSans(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          )),
        if (required) ...[
          const SizedBox(width: 4),
          Text('*', style: TextStyle(color: AppTheme.error, fontSize: 13, fontWeight: FontWeight.w700)),
        ],
      ],
    );
  }
}

class _ServiceDropdown extends StatelessWidget {
  final List<Map<String, dynamic>> services;
  final Map<String, dynamic>? selected;
  final bool showError;
  final ValueChanged<Map<String, dynamic>?> onChanged;

  const _ServiceDropdown({
    required this.services,
    required this.selected,
    required this.onChanged,
    this.showError = false,
  });

  @override
  Widget build(BuildContext context) {
    if (services.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Text('Aucune prestation configurée',
          style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: showError
              ? AppTheme.error
              : selected != null
                  ? AppTheme.primary.withAlpha(100)
                  : AppTheme.border,
          width: showError ? 1.5 : 1.0,
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<Map<String, dynamic>>(
          isExpanded: true,
          value: selected,
          hint: Text('Choisir une prestation',
            style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.textMuted),
          dropdownColor: AppTheme.bgCard,
          style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary),
          items: services.map((svc) {
            final name = svc['name'] ?? '';
            final price = svc['price'];
            final duration = svc['duration'];
            final icon = svc['icon'] ?? '';
            return DropdownMenuItem<Map<String, dynamic>>(
              value: svc,
              child: Row(
                children: [
                  if (icon.isNotEmpty) ...[
                    Text(icon, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(name,
                          style: GoogleFonts.dmSans(
                            fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                        if (price != null || duration != null)
                          Text(
                            [
                              if (price != null) '${price}€',
                              if (duration != null) '${duration} min',
                            ].join(' · '),
                            style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: onChanged,
          selectedItemBuilder: (ctx) => services.map((svc) {
            final name = svc['name'] ?? '';
            final price = svc['price'];
            final duration = svc['duration'];
            final icon = svc['icon'] ?? '';
            return Row(
              children: [
                if (icon.isNotEmpty) ...[
                  Text(icon, style: const TextStyle(fontSize: 16)),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    [
                      name,
                      if (price != null) '${price}€',
                      if (duration != null) '${duration} min',
                    ].join(' · '),
                    style: GoogleFonts.dmSans(
                      fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _EmployeeDropdown extends StatelessWidget {
  final List<Map<String, dynamic>> employees;
  final Map<String, dynamic>? selected;
  final ValueChanged<Map<String, dynamic>?> onChanged;

  const _EmployeeDropdown({
    required this.employees,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    // Build items: null = "Aucun / Au choix" + actual employees
    final items = <DropdownMenuItem<Map<String, dynamic>?>>[
      DropdownMenuItem<Map<String, dynamic>?>(
        value: null,
        child: Text('Aucun / Au choix',
          style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
      ),
      ...employees.map((emp) {
        final name = emp['name'] ?? '';
        final role = emp['role'] ?? emp['speciality'] ?? '';
        return DropdownMenuItem<Map<String, dynamic>?>(
          value: emp,
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withAlpha(20),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: GoogleFonts.dmSans(
                      fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(name,
                      style: GoogleFonts.dmSans(
                        fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                    if (role.isNotEmpty)
                      Text(role, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.textMuted)),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<Map<String, dynamic>?>(
          isExpanded: true,
          value: selected,
          hint: Text('Aucun / Au choix',
            style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textMuted)),
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.textMuted),
          dropdownColor: AppTheme.bgCard,
          style: GoogleFonts.dmSans(fontSize: 14, color: AppTheme.textPrimary),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _PickerButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PickerButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppTheme.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubmitButton extends StatelessWidget {
  final bool loading;
  final VoidCallback onTap;

  const _SubmitButton({required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 52,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: loading
                ? [AppTheme.primary.withAlpha(120), AppTheme.primary.withAlpha(100)]
                : [AppTheme.primary, AppTheme.primaryDark],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: loading
              ? []
              : [
                  BoxShadow(
                    color: AppTheme.primary.withAlpha(80),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2.5,
                  ),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_outline_rounded, size: 20, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      'Créer le RDV',
                      style: GoogleFonts.dmSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom nav items
// ─────────────────────────────────────────────────────────────────────────────

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final int index;
  final int current;
  final ValueChanged<int> onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.index,
    required this.current,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = index == current;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: active ? AppTheme.primary.withAlpha(26) : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(
                  icon,
                  size: 22,
                  color: active ? AppTheme.primary : AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.dmSans(
                  fontSize: 10,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  color: active ? AppTheme.primary : AppTheme.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NewButton extends StatelessWidget {
  final VoidCallback onTap;
  const _NewButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary, AppTheme.primary.withAlpha(200)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withAlpha(80),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.add_rounded, size: 26, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(
                'Nouveau',
                style: GoogleFonts.dmSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _DrawerItem({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.textSecondary, size: 22),
      title: Text(label,
        style: GoogleFonts.dmSans(
          fontSize: 15, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur de créneaux horaires (toutes les 30 min)
// ─────────────────────────────────────────────────────────────────────────────

class _TimeSlotSheet extends StatelessWidget {
  final List<TimeOfDay> slots;
  final TimeOfDay current;

  const _TimeSlotSheet({required this.slots, required this.current});

  @override
  Widget build(BuildContext context) {
    // Index du créneau le plus proche de l'heure actuelle
    final now = TimeOfDay.now();
    final initialIndex = slots.indexWhere((s) => s.hour > now.hour || (s.hour == now.hour && s.minute >= now.minute));
    final scrollIndex = initialIndex < 0 ? 0 : initialIndex;

    final controller = ScrollController(
      initialScrollOffset: scrollIndex * 56.0 > 0 ? (scrollIndex * 56.0) - 56 : 0,
    );

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle + titre
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Column(children: [
              Center(
                child: Container(
                  width: 36, height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Text('Choisir l\'heure',
                      style: GoogleFonts.bricolageGrotesque(
                          fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSurface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.close_rounded, size: 16, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ]),
          ),
          const Divider(height: 1),

          // Grille de créneaux
          SizedBox(
            height: 320,
            child: GridView.builder(
              controller: controller,
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 2.2,
              ),
              itemCount: slots.length,
              itemBuilder: (ctx, i) {
                final slot = slots[i];
                final isSelected = slot.hour == current.hour && slot.minute == current.minute;
                final isPast = () {
                  final now = DateTime.now();
                  return DateTime(now.year, now.month, now.day, slot.hour, slot.minute)
                      .isBefore(now);
                }();

                return GestureDetector(
                  onTap: isPast ? null : () => Navigator.pop(context, slot),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primary
                          : isPast
                              ? AppTheme.bgSurface
                              : AppTheme.bgSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.primary
                            : isPast
                                ? AppTheme.border
                                : AppTheme.border,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '${slot.hour.toString().padLeft(2, '0')}:${slot.minute.toString().padLeft(2, '0')}',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? Colors.white
                              : isPast
                                  ? AppTheme.textMuted
                                  : AppTheme.textPrimary,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Padding bas
          SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
        ],
      ),
    );
  }
}
