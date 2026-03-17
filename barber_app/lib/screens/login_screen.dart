import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;
  String? _success;
  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() { _error = 'Veuillez remplir tous les champs'; _success = null; });
      return;
    }

    setState(() { _loading = true; _error = null; _success = null; });

    final success = await ApiService.login(email, password);

    if (mounted) {
      setState(() => _loading = false);
      if (success) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
      } else {
        setState(() => _error = 'Email ou mot de passe incorrect');
      }
    }
  }

  void _showForgotPassword() {
    final ctrl = TextEditingController();
    bool sending = false;
    String? msg;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 32,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text('Mot de passe oublié',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 22, fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                )),
              const SizedBox(height: 8),
              Text(
                'Entrez votre email. Si un compte existe, vous recevrez un lien de réinitialisation valable 1 heure.',
                style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.textMuted, height: 1.5),
              ),
              const SizedBox(height: 20),
              if (msg != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withAlpha(20),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.primary.withAlpha(60)),
                  ),
                  child: Text(msg!, style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.primary)),
                ),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.emailAddress,
                autofocus: true,
                style: GoogleFonts.outfit(color: AppTheme.textPrimary),
                decoration: InputDecoration(
                  hintText: 'votre@email.com',
                  hintStyle: GoogleFonts.outfit(color: AppTheme.textMuted),
                  prefixIcon: const Icon(Icons.email_outlined, color: AppTheme.textMuted, size: 20),
                  filled: true,
                  fillColor: AppTheme.bgDark,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.primary),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: sending ? null : () async {
                    final email = ctrl.text.trim();
                    if (email.isEmpty) return;
                    setModalState(() => sending = true);
                    await ApiService.forgotPassword(email);
                    setModalState(() {
                      sending = false;
                      msg = '✅ Si un compte existe pour cet email, un lien vous a été envoyé.';
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: sending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Envoyer le lien', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showServerConfig() {
    final ctrl = TextEditingController(text: ApiService.currentServerUrl);
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('URL du serveur', style: GoogleFonts.outfit(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Entrez l\'URL de votre instance SalonPro :', style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.textMuted)),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              style: GoogleFonts.outfit(color: AppTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'https://votre-app.onrender.com',
                hintStyle: GoogleFonts.outfit(color: AppTheme.textMuted, fontSize: 12),
                filled: true,
                fillColor: AppTheme.bgDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppTheme.primary),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('Annuler', style: GoogleFonts.outfit(color: AppTheme.textMuted))),
          TextButton(
            onPressed: () async {
              await ApiService.saveServerUrl(ctrl.text);
              if (context.mounted) Navigator.pop(context);
            },
            child: Text('Enregistrer', style: GoogleFonts.outfit(color: AppTheme.primary, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              children: [
                const SizedBox(height: 60),

                // Logo
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primary, AppTheme.primaryDark],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [BoxShadow(color: AppTheme.primary.withAlpha(61), blurRadius: 30, offset: const Offset(0, 10))],
                  ),
                  child: const Center(child: Text('✨', style: TextStyle(fontSize: 36))),
                ),

                const SizedBox(height: 24),

                Text('SalonPro',
                  style: GoogleFonts.playfairDisplay(fontSize: 32, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                const SizedBox(height: 6),
                Text('Connectez-vous à votre salon',
                  style: GoogleFonts.outfit(fontSize: 15, color: AppTheme.textMuted)),

                const SizedBox(height: 48),

                // Error
                if (_error != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.error.withAlpha(51)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 18),
                      const SizedBox(width: 10),
                      Expanded(child: Text(_error!, style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.error))),
                    ]),
                  ),

                // Email field
                _buildField(controller: _emailController, label: 'Email', icon: Icons.email_outlined, keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 16),

                // Password field
                _buildField(controller: _passwordController, label: 'Mot de passe', icon: Icons.lock_outline_rounded, obscure: _obscurePassword,
                  suffix: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: AppTheme.textMuted, size: 20),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  )),

                const SizedBox(height: 12),

                // Forgot password link
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: _showForgotPassword,
                    child: Text('Mot de passe oublié ?',
                      style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.primary, decoration: TextDecoration.underline, decorationColor: AppTheme.primary)),
                  ),
                ),

                const SizedBox(height: 28),

                // Login button
                SizedBox(
                  width: double.infinity, height: 54,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : Text('Se connecter', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),

                const SizedBox(height: 40),

                // Server config (discreet)
                GestureDetector(
                  onTap: _showServerConfig,
                  child: Text('⚙️ Configurer le serveur',
                    style: GoogleFonts.outfit(fontSize: 11, color: AppTheme.textMuted.withAlpha(100))),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscure = false,
    Widget? suffix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscure,
          style: GoogleFonts.outfit(color: AppTheme.textPrimary),
          onSubmitted: (_) => _login(),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: AppTheme.textMuted, size: 20),
            suffixIcon: suffix,
            filled: true,
            fillColor: AppTheme.bgCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withAlpha(10))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withAlpha(10))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
          ),
        ),
      ],
    );
  }
}
