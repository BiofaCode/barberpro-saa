/**
 * Kreno — Cookie Consent Banner
 * Conforme nLPD (Suisse) + RGPD
 * Un seul fichier JS à inclure sur toutes les pages
 */
(function () {
  const KEY = 'salonpro_cookie_consent';
  const consent = localStorage.getItem(KEY);

  // Si déjà répondu, on ne montre rien
  if (consent === 'accepted' || consent === 'declined') return;

  /* ── Styles ── */
  const style = document.createElement('style');
  style.textContent = `
    #sp-cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #1e1e22;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      animation: sp-slide-up .35s cubic-bezier(.22,1,.36,1) both;
      box-shadow: 0 -8px 32px rgba(0,0,0,.45);
    }
    @keyframes sp-slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #sp-cookie-banner.sp-hide {
      animation: sp-slide-down .3s ease forwards;
    }
    @keyframes sp-slide-down {
      to { transform: translateY(100%); opacity: 0; }
    }
    .sp-cookie-text {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13.5px;
      color: #a1a1aa;
      line-height: 1.55;
      flex: 1;
      min-width: 240px;
    }
    .sp-cookie-text strong {
      color: #f4f4f5;
      font-weight: 600;
    }
    .sp-cookie-text a {
      color: #6366f1;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .sp-cookie-text a:hover { color: #818cf8; }
    .sp-cookie-btns {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }
    .sp-btn-accept, .sp-btn-decline {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 500;
      padding: 9px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all .2s;
      white-space: nowrap;
    }
    .sp-btn-accept {
      background: #6366f1;
      color: #fff;
    }
    .sp-btn-accept:hover { background: #4f46e5; transform: translateY(-1px); }
    .sp-btn-decline {
      background: transparent;
      color: #71717a;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .sp-btn-decline:hover { color: #a1a1aa; border-color: rgba(255,255,255,0.2); }

    @media (max-width: 560px) {
      #sp-cookie-banner { flex-direction: column; align-items: flex-start; padding: 16px 18px 20px; }
      .sp-cookie-btns { width: 100%; }
      .sp-btn-accept, .sp-btn-decline { flex: 1; text-align: center; }
    }
  `;
  document.head.appendChild(style);

  /* ── HTML ── */
  const banner = document.createElement('div');
  banner.id = 'sp-cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Consentement aux cookies');
  banner.innerHTML = `
    <p class="sp-cookie-text">
      <strong>Cookies</strong> — Nous utilisons uniquement des cookies essentiels au fonctionnement du service (session, authentification). Aucun cookie publicitaire ni tiers de tracking.
      <a href="/saas/cgu.html#cookies">En savoir plus</a>
    </p>
    <div class="sp-cookie-btns">
      <button class="sp-btn-decline" id="sp-decline">Refuser</button>
      <button class="sp-btn-accept" id="sp-accept">Accepter</button>
    </div>
  `;
  document.body.appendChild(banner);

  /* ── Logique ── */
  function dismiss(choice) {
    localStorage.setItem(KEY, choice);
    banner.classList.add('sp-hide');
    setTimeout(() => banner.remove(), 350);
  }

  document.getElementById('sp-accept').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('sp-decline').addEventListener('click', () => dismiss('declined'));
})();
