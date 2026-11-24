import 'package:flutter/material.dart';

import '../theme/app_text.dart';
import '../theme/app_theme.dart';

/// Flat bottom navigation: four tabs with a « + » action between RDV and
/// Clients. White background, 1px top border, no shadow.
class KrenoBottomBar extends StatelessWidget {
  const KrenoBottomBar({
    super.key,
    required this.current,
    required this.onTap,
    required this.onNew,
  });

  final int current;
  final ValueChanged<int> onTap;
  final VoidCallback onNew;

  static const List<String> labels = ['Accueil', 'RDV', 'Clients', 'Salon'];
  static const List<IconData> icons = [
    Icons.home_outlined,
    Icons.calendar_today_outlined,
    Icons.people_outline_rounded,
    Icons.storefront_outlined,
  ];

  @override
  Widget build(BuildContext context) {
    Widget tab(int i) => _BarItem(
          icon: icons[i],
          label: labels[i],
          selected: i == current,
          onTap: () => onTap(i),
        );

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Row(
            children: [
              tab(0),
              tab(1),
              Expanded(child: Center(child: _NewButton(onTap: onNew))),
              tab(2),
              tab(3),
            ],
          ),
        ),
      ),
    );
  }
}

class _BarItem extends StatelessWidget {
  const _BarItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        excludeSemantics: true,
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color:
                        selected ? AppTheme.accentTint : Colors.transparent,
                    borderRadius: BorderRadius.circular(AppTheme.rLg),
                  ),
                  child: Icon(
                    icon,
                    size: 22,
                    color: selected ? AppTheme.primary : AppTheme.textMuted,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.caption.copyWith(
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    color:
                        selected ? AppTheme.textPrimary : AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NewButton extends StatelessWidget {
  const _NewButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Nouveau rendez-vous',
      excludeSemantics: true,
      child: Material(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(AppTheme.rMd),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.rMd),
          child: SizedBox(
            width: 48,
            height: 48,
            child: Icon(Icons.add_rounded, size: 26, color: AppTheme.onPrimary),
          ),
        ),
      ),
    );
  }
}
