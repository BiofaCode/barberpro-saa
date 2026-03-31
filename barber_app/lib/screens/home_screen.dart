import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'dashboard_screen.dart';
import 'appointments_screen.dart';
import 'clients_screen.dart';
import 'employees_screen.dart';
import 'services_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    AppointmentsScreen(),
    ClientsScreen(),
    EmployeesScreen(),
    ServicesScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
              _NavItem(icon: Icons.people_rounded, label: 'Clients', index: 2, current: _currentIndex, onTap: _onTap),
              _NavItem(icon: Icons.group_rounded, label: 'Équipe', index: 3, current: _currentIndex, onTap: _onTap),
              _NavItem(icon: Icons.spa_rounded, label: 'Services', index: 4, current: _currentIndex, onTap: _onTap),
              _NavItem(icon: Icons.settings_rounded, label: 'Réglages', index: 5, current: _currentIndex, onTap: _onTap),
            ],
          ),
        ),
      ),
    );
  }

  void _onTap(int index) => setState(() => _currentIndex = index);
}

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
