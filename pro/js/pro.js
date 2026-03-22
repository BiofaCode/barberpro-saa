/* ============================================
  * SALON PRO - Espace Pro JS
   ============================================ */

const API = '';
let token = null;
let salonId = null;
let currentUser = null;
let currentSalon = null;

// ---- Custom Fetch that injects the auth token ----
async function apiFetch(url, options = {}) {
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const finalOptions = { ...options, headers };
    return fetch(url, finalOptions);
}

// ---- Login ----
async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errEl = document.getElementById('loginError');

    if (!email || !password) {
        errEl.style.display = 'block';
        errEl.textContent = 'Veuillez remplir tous les champs';
        return;
    }

    try {
        const res = await fetch(`${API}/api/pro/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            token = data.token;
            currentUser = data.user;
            salonId = data.user.salonId;
            currentSalon = data.salon;
            errEl.style.display = 'none';

            // Check subscription status
            const sub = data.subscription || data.salon?.subscription;
            if (sub && sub.status === 'pending_payment') {
                // Show payment required screen
                document.getElementById('loginScreen').innerHTML = `
                    <div class="login-card" style="max-width:480px;text-align:center">
                        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
                        <h2 style="margin-bottom:8px;font-size:22px">Paiement en attente</h2>
                        <p style="color:var(--text-muted);margin-bottom:24px;line-height:1.6;font-size:14px">
                            Votre salon <strong>${currentSalon?.name || 'Mon Salon'}</strong> a été créé, mais votre abonnement n'est pas encore actif.
                            <br><br>Veuillez compléter votre paiement pour accéder à l'Espace Pro.
                        </p>
                        <a href="/" class="btn btn-primary" style="width:100%;text-decoration:none;display:block;padding:14px;text-align:center">
                            Compléter le paiement →
                        </a>
                        <button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="location.reload()">
                            Réessayer
                        </button>
                    </div>
                `;
                return;
            }

            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'flex';
            
            // Save session
            localStorage.setItem('proSession', JSON.stringify({ token, user: currentUser, salonId, salon: currentSalon }));
            
            initApp();
        } else {
            errEl.style.display = 'block';
            errEl.textContent = data.error || 'Email ou mot de passe incorrect';
        }
    } catch (e) {
        errEl.style.display = 'block';
        errEl.textContent = 'Impossible de se connecter au serveur';
    }
}

function doLogout() {
    token = null; salonId = null; currentUser = null; currentSalon = null;
    localStorage.removeItem('proSession');
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

// ---- Init ----
function initApp() {
    // Update sidebar
    if (currentSalon) {
        const name = currentSalon.name || 'Mon Salon';
        const words = name.split(' ');
        document.getElementById('sidebarSalonName').innerHTML = words[0] + (words.length > 1 ? ' <span>' + words.slice(1).join(' ') + '</span>' : '');

        // Apply salon colors to admin panel
        if (currentSalon.branding?.primaryColor) {
            const hex = currentSalon.branding.primaryColor;
            document.documentElement.style.setProperty('--primary', hex);
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            document.documentElement.style.setProperty('--primary-glow', `rgba(${r},${g},${b},0.3)`);
            document.documentElement.style.setProperty('--primary-light', `rgba(${r},${g},${b},0.1)`);
        }
        if (currentSalon.branding?.accentColor) {
            document.documentElement.style.setProperty('--accent', currentSalon.branding.accentColor);
        }
    }
    if (currentUser) {
        const salonName = currentSalon.name || 'Mon Salon';
        const words = salonName.split(' ');
        document.getElementById('sidebarSalonName').innerHTML = words[0] + (words.length > 1 ? ' <span>' + words.slice(1).join(' ') + '</span>' : '');

        // Check Role and adjust UI
        const isEmployee = currentUser.role === 'employee';
        document.getElementById('userName').textContent = currentUser.name || (isEmployee ? 'Employé' : 'Propriétaire');
        document.getElementById('userAvatar').textContent = currentUser.name ? currentUser.name[0].toUpperCase() : '?';
        document.querySelector('.user-role').textContent = isEmployee ? 'Employé' : 'Propriétaire';

        const sidebarNav = document.querySelector('.sidebar-nav');
        if (isEmployee) {
            const linksToHide = ['dashboard', 'clients', 'employees', 'services', 'settings'];
            Array.from(sidebarNav.querySelectorAll('a.nav-item')).forEach(link => {
                const oc = link.getAttribute('onclick') || '';
                if (linksToHide.some(p => oc.includes(`'${p}'`))) link.style.display = 'none';
            });
            // Also hide dashboard/clients/settings in bottom nav
            ['bnav-dashboard', 'bnav-clients', 'bnav-settings'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            activatePage('bookings');
            setTimeout(loadBookings, 0);
        } else {
            Array.from(sidebarNav.querySelectorAll('a')).forEach(a => a.style.display = 'flex');
            activatePage('dashboard');
            setTimeout(loadDashboard, 0);
        }
    }

    // Setup push notifications (owner only, non-blocking)
    if (currentUser?.role !== 'employee') {
        setTimeout(setupPushNotifications, 3000);
    }
}

// ---- Push Notifications ----
async function setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Get VAPID public key from server
        const keyRes = await apiFetch('/api/pro/push/vapid-key');
        const { key } = await keyRes.json();
        if (!key) return;

        // Check existing subscription
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            // Request permission only if not already granted/denied
            if (Notification.permission === 'default') {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') return;
            } else if (Notification.permission === 'denied') return;

            // Subscribe
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(key)
            });
        }

        // Save subscription to server
        await apiFetch('/api/pro/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub.toJSON())
        });
        console.log('🔔 Push notifications activées');
    } catch (e) {
        console.warn('Push setup failed:', e.message);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Activate a page tab without triggering data load (used by initApp)
function activatePage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    Array.from(document.querySelectorAll('.nav-item')).forEach(n => {
        if ((n.getAttribute('onclick') || '').includes(`'${page}'`)) n.classList.add('active');
    });
    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
    const bnavId = { dashboard: 'bnav-dashboard', bookings: 'bnav-bookings', clients: 'bnav-clients', settings: 'bnav-settings' };
    if (bnavId[page]) document.getElementById(bnavId[page])?.classList.add('active');
    const titles = { dashboard: 'Tableau de bord', bookings: 'Rendez-vous', clients: 'Mes Clients', employees: 'Mon Équipe', services: 'Prestations', settings: 'Mon Salon' };
    const titleEl = document.getElementById('topbarTitle');
    if (titleEl) titleEl.textContent = titles[page] || page;
}

function openWebsite() {
    if (currentSalon?.slug) {
        window.open(`/s/${currentSalon.slug}`, '_blank');
    } else {
        alert('Impossible d\'ouvrir le site - aucun slug trouvé');
    }
}

// ---- Pages ----
function showPage(page) {
    activatePage(page);
    if (page === 'dashboard') loadDashboard();
    else if (page === 'bookings') loadBookings();
    else if (page === 'clients') loadClients();
    else if (page === 'employees') loadEmployees();
    else if (page === 'services') loadServices();
    else if (page === 'settings') loadSettings();
}

// ---- Sidebar (mobile drawer) ----
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    // Prevent body scroll when drawer is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// ---- Analytics Charts ----
function renderRevenueChart(months) {
    const el = document.getElementById('chartRevenue');
    if (!el) return;
    if (!months.length) { el.innerHTML = '<div class="empty-state" style="min-height:120px"><div class="empty-state-icon">📊</div><div class="empty-state-text">Pas encore de données</div></div>'; return; }
    const maxRev = Math.max(...months.map(m => m.revenue), 1);
    const bars = months.map(m => {
        const pct = Math.round((m.revenue / maxRev) * 100);
        return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0">
            <div style="font-size:10px;color:var(--text-muted);font-weight:600">${m.revenue > 0 ? m.revenue + ' CHF' : ''}</div>
            <div style="width:100%;background:rgba(255,255,255,.05);border-radius:6px;height:100px;position:relative;display:flex;align-items:flex-end">
                <div style="width:100%;background:linear-gradient(180deg,#C8973A,#A07D4A);border-radius:6px;height:${Math.max(pct, 2)}%;transition:height .4s ease"></div>
            </div>
            <div style="font-size:11px;color:var(--text-sec);text-align:center">${m.label}</div>
            <div style="font-size:10px;color:var(--text-muted)">${m.bookings} RDV</div>
        </div>`;
    }).join('');
    el.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-end;padding:0 4px">${bars}</div>`;
}

function renderTopServices(services) {
    const el = document.getElementById('chartTopServices');
    if (!el) return;
    if (!services.length) { el.innerHTML = '<div class="empty-state" style="min-height:120px"><div class="empty-state-icon">✂️</div><div class="empty-state-text">Pas encore de données</div></div>'; return; }
    const maxCount = Math.max(...services.map(s => s.count), 1);
    el.innerHTML = services.map(s => {
        const pct = Math.round((s.count / maxCount) * 100);
        return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="font-size:18px;width:28px;text-align:center">${s.icon}</div>
            <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                    <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${s.name}</span>
                    <span style="color:var(--text-muted)">${s.count}× · ${s.revenue} CHF</span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#C8973A,#A07D4A);border-radius:4px;transition:width .4s ease"></div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ---- Dashboard ----
async function loadDashboard(_retry = 0) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000); // 8s timeout (Render cold start)
        const [statsRes, bookingsRes, analyticsRes] = await Promise.all([
            apiFetch(`${API}/api/pro/salon/${salonId}/stats`, { signal: ctrl.signal }),
            apiFetch(`${API}/api/pro/salon/${salonId}/bookings?date=${todayStr()}`, { signal: ctrl.signal }),
            apiFetch(`${API}/api/pro/salon/${salonId}/analytics`, { signal: ctrl.signal })
        ]);
        clearTimeout(t);
        const stats = (await statsRes.json()).data || {};
        const bookings = (await bookingsRes.json()).data || [];
        const analyticsData = (await analyticsRes.json()).data || { months: [], topServices: [] };

        // Subscription banner
        let subBanner = '';
        const sub = currentSalon?.subscription;
        if (sub) {
            const planNames = { starter: 'Starter', pro: 'Pro', premium: 'Premium' };
            const statusLabels = {
                trial: '🟢 Essai gratuit',
                active: '🟢 Actif',
                pending_payment: '🟠 En attente de paiement',
                cancelled: '🔴 Annulé'
            };
            let trialInfo = '';
            if (sub.status === 'trial' && sub.trialEnd) {
                const daysLeft = Math.max(0, Math.ceil((new Date(sub.trialEnd) - Date.now()) / (1000 * 60 * 60 * 24)));
                trialInfo = ` — ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`;
            }
            subBanner = `
                <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px">
                    <div style="display:flex;flex-direction:column;gap:6px">
                        <span style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Abonnement</span>
                        <div style="display:flex;align-items:center;gap:12px">
                            <span style="font-weight:700;font-size:18px;color:#fff">${planNames[sub.plan] || sub.plan}</span>
                            <span style="font-size:13px;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;color:var(--text-muted)">
                                ${statusLabels[sub.status] || sub.status}${trialInfo}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }

        document.getElementById('dashStats').innerHTML = subBanner + `
            <div class="stat-card gold">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${stats.todayBookings ?? bookings.length}</div>
                <div class="stat-label">RDV aujourd'hui</div>
            </div>
            <div class="stat-card green">
                <div class="stat-icon">💰</div>
                <div class="stat-value">${stats.todayRevenue ?? 0} CHF</div>
                <div class="stat-label">CA du jour</div>
            </div>
            <div class="stat-card blue">
                <div class="stat-icon">👥</div>
                <div class="stat-value">${stats.totalClients ?? 0}</div>
                <div class="stat-label">Total clients</div>
            </div>
            <div class="stat-card orange">
                <div class="stat-icon">📈</div>
                <div class="stat-value">${stats.totalRevenue ?? 0} CHF</div>
                <div class="stat-label">CA total</div>
            </div>
        `;

        // Analytics charts
        renderRevenueChart(analyticsData.months || []);
        renderTopServices(analyticsData.topServices || []);
        // Advanced stats use the full bookings list (loaded separately in loadBookings)
        if (_allBookings.length) renderAdvancedStats(_allBookings);

        const container = document.getElementById('todayBookings');
        if (bookings.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Aucun rendez-vous aujourd\'hui</div></div>';
        } else {
            container.innerHTML = bookings.map(b => `
                <div class="booking-row">
                    <div class="booking-icon">${b.serviceIcon || '✂️'}</div>
                    <div class="booking-info">
                        <div class="booking-name">${b.clientName}</div>
                        <div class="booking-detail">${b.serviceName} · ${b.time} · ${b.duration || 30}min</div>
                    </div>
                    <div><span class="badge badge-${b.status || 'confirmed'}">${statusLabel(b.status)}</span></div>
                    <div style="font-family:'Playfair Display',serif;font-weight:700;color:var(--primary)">${b.price || 0} CHF</div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Dashboard error:', e);
        if (_retry < 2) {
            // Auto-retry (handles Render cold start ~15s spin-up)
            const delay = (_retry + 1) * 3000;
            document.getElementById('todayBookings').innerHTML =
                `<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">Connexion au serveur… réessai dans ${delay / 1000}s</div></div>`;
            setTimeout(() => loadDashboard(_retry + 1), delay);
        } else {
            document.getElementById('todayBookings').innerHTML =
                `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Impossible de charger les données<br><button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="loadDashboard()">Réessayer</button></div></div>`;
        }
    }
}

// ---- Bookings ----
let _allBookings = [];

async function loadBookings(_retry = 0) {
    const listEl = document.getElementById('bookingsList');
    if (_retry === 0 && listEl) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">Chargement des rendez-vous…</div></div>';
    }
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/bookings`);
        const data = await res.json();
        _allBookings = data.data || [];
        populateEmployeeFilter(_allBookings);
        renderBookingsList(_allBookings);
        renderAdvancedStats(_allBookings);
    } catch (e) {
        console.error('Bookings error:', e);
        if (_retry < 3) {
            const delay = Math.min((_retry + 1) * 3000, 10000);
            setTimeout(() => loadBookings(_retry + 1), delay);
            // Keep spinner visible — no scary counter message
        } else {
            if (listEl) listEl.innerHTML =
                `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Impossible de charger les rendez-vous<br><button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="loadBookings()">Réessayer</button></div></div>`;
        }
    }
}

function renderBookingsList(bookings) {
    const container = document.getElementById('bookingsList');
    if (bookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Aucun rendez-vous correspondant</div></div>';
        return;
    }
    container.innerHTML = '<div class="data-grid">' + bookings.map(b => `
        <div class="data-card" style="cursor:pointer" onclick='showBookingDetail(${JSON.stringify(b).replace(/'/g,"&#39;")})'>
            <div class="data-card-icon">${b.serviceIcon || '✂️'}</div>
            <div class="data-card-info">
                <div class="data-card-name">${b.clientName}</div>
                <div class="data-card-sub">${b.serviceName} · ${b.date} à ${b.time} · ${b.duration || 30}min${b.employeeName ? ' · ' + b.employeeName : ''}</div>
            </div>
            <div><span class="badge badge-${b.status || 'confirmed'}">${statusLabel(b.status)}</span></div>
            <div class="data-card-right">
                <div class="data-card-value">${b.price || 0} CHF</div>
            </div>
        </div>
    `).join('') + '</div>';
}

function applyBookingFilters() {
    const search = (document.getElementById('bookingSearch')?.value || '').toLowerCase();
    const from = document.getElementById('bookingFrom')?.value || '';
    const to = document.getElementById('bookingTo')?.value || '';
    const status = document.getElementById('bookingStatus')?.value || '';
    const emp = document.getElementById('bookingEmployee')?.value || '';

    let filtered = _allBookings;
    if (search) filtered = filtered.filter(b =>
        (b.clientName || '').toLowerCase().includes(search) ||
        (b.serviceName || '').toLowerCase().includes(search) ||
        (b.clientPhone || '').includes(search)
    );
    if (from) filtered = filtered.filter(b => b.date >= from);
    if (to) filtered = filtered.filter(b => b.date <= to);
    if (status) filtered = filtered.filter(b => (b.status || 'confirmed') === status);
    if (emp) filtered = filtered.filter(b => b.employeeName === emp);
    if (_calendarView === 'calendar') renderCalendar(filtered);
    else renderBookingsList(filtered);
}

function resetBookingFilters() {
    ['bookingSearch', 'bookingFrom', 'bookingTo', 'bookingStatus', 'bookingEmployee'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    applyBookingFilters();
}

// Populate employee filter dropdown
function populateEmployeeFilter(bookings) {
    const sel = document.getElementById('bookingEmployee');
    if (!sel) return;
    const names = [...new Set(bookings.map(b => b.employeeName).filter(Boolean))].sort();
    // Keep current value
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tous</option>' + names.map(n => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}</option>`).join('');
}

// ---- Booking Detail Modal ----
function showBookingDetail(b) {
    const reviewLink = `${location.origin}/review/${b._id}`;
    document.getElementById('modalTitle').textContent = '📅 Détails du RDV';
    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid;gap:8px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
                <span style="color:var(--text-muted)">Client</span><strong>${b.clientName}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
                <span style="color:var(--text-muted)">Date</span><strong>${b.date} à ${b.time}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
                <span style="color:var(--text-muted)">Prestation</span><strong>${b.serviceName || '—'}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
                <span style="color:var(--text-muted)">Durée</span><strong>${b.duration || 30} min</strong>
            </div>
            ${b.employeeName ? `<div style="display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">Styliste</span><strong>${b.employeeName}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
                <span style="color:var(--text-muted)">Prix</span><strong>${b.price || 0} CHF</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:.9rem;padding:8px 0">
                <span style="color:var(--text-muted)">Statut</span>
                <select class="form-input" style="width:auto;padding:6px 10px;font-size:.85rem" onchange="updateBookingStatus('${b._id}',this.value)">
                    <option value="confirmed" ${(b.status||'confirmed')==='confirmed'?'selected':''}>Confirmé</option>
                    <option value="completed" ${b.status==='completed'?'selected':''}>Terminé</option>
                    <option value="pending" ${b.status==='pending'?'selected':''}>En attente</option>
                    <option value="cancelled" ${b.status==='cancelled'?'selected':''}>Annulé</option>
                </select>
            </div>
            ${b.reviewRating ? `<div style="padding:8px 0;font-size:.9rem"><span style="color:var(--text-muted)">Avis client : </span><span class="review-stars">${'★'.repeat(b.reviewRating)}${'☆'.repeat(5-b.reviewRating)}</span>${b.reviewComment ? ' · ' + b.reviewComment : ''}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${reviewLink}').then(()=>showToast('Lien copié ✅'))" style="flex:1">🔗 Lien avis</button>
            <button class="btn btn-ghost btn-sm" onclick="printInvoice(${JSON.stringify(b).replace(/"/g,'&quot;')})" style="flex:1">🖨 Facture</button>
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-ghost" onclick="closeModal()">Fermer</button>`;
    document.getElementById('modal').classList.add('active');
}

async function updateBookingStatus(bookingId, status) {
    try {
        await apiFetch(`${API}/api/pro/salon/${salonId}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        showToast('Statut mis à jour ✅');
        loadBookings();
    } catch (e) { showToast('Erreur', 'error'); }
}

// ---- PDF Invoice ----
function printInvoice(b) {
    const salon = currentSalon || {};
    const win = window.open('', '_blank', 'width=640,height=800');
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${b.clientName}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:520px;margin:0 auto}.header{border-bottom:2px solid #1a1a1a;padding-bottom:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start}.salon-name{font-size:22px;font-weight:700}.salon-sub{font-size:12px;color:#666;margin-top:4px;line-height:1.5}.receipt-num{font-size:12px;color:#666;text-align:right}.receipt-title{font-size:16px;font-weight:700;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px}.line{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee;font-size:14px}.total-line{display:flex;justify-content:space-between;padding:14px 0;font-size:18px;font-weight:700}.footer{margin-top:36px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:16px}.print-btn{margin-top:24px;padding:10px 24px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px}@media print{.print-btn{display:none}}</style>
    </head><body>
    <div class="header"><div><div class="salon-name">${salon.name||'Salon'}</div><div class="salon-sub">${salon.address||''}${salon.city?' · '+salon.city:''}${salon.phone?' · '+salon.phone:''}</div></div><div class="receipt-num">Reçu #${(b._id||'').slice(-6).toUpperCase()}<br>${new Date().toLocaleDateString('fr-FR')}</div></div>
    <div class="receipt-title">Reçu de prestation</div>
    <div class="line"><span>Client</span><span>${b.clientName}</span></div>
    <div class="line"><span>Date</span><span>${b.date} à ${b.time}</span></div>
    <div class="line"><span>Prestation</span><span>${b.serviceName||'—'}</span></div>
    <div class="line"><span>Durée</span><span>${b.duration||30} min</span></div>
    ${b.employeeName?`<div class="line"><span>Styliste</span><span>${b.employeeName}</span></div>`:''}
    <div class="total-line"><span>Total</span><span>${b.price||0} CHF</span></div>
    <div class="footer">Merci de votre visite ! — ${salon.name||'Salon'}</div>
    <br><button class="print-btn" onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button>
    </body></html>`);
    win.document.close();
}

// ---- Calendar View ----
let _calendarDate = new Date();
let _calendarView = 'list';

function toggleCalendarView() {
    _calendarView = _calendarView === 'list' ? 'calendar' : 'list';
    const btn = document.getElementById('calViewBtn');
    const calEl = document.getElementById('calendarContainer');
    const listEl = document.getElementById('bookingsList');
    if (_calendarView === 'calendar') {
        if (btn) btn.textContent = '📋 Liste';
        if (listEl) listEl.style.display = 'none';
        if (calEl) calEl.style.display = 'block';
        renderCalendar(_allBookings);
    } else {
        if (btn) btn.textContent = '📅 Calendrier';
        if (calEl) calEl.style.display = 'none';
        if (listEl) listEl.style.display = 'block';
        renderBookingsList(_allBookings);
    }
}

function _weekDates(ref) {
    const d = new Date(ref);
    const dow = d.getDay(); // 0=Sun
    const diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return Array.from({length: 7}, (_, i) => { const dd = new Date(mon); dd.setDate(mon.getDate() + i); return dd; });
}
function _isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function _fmtDay(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }

function _isMobile() { return window.innerWidth < 640; }

function renderCalendar(bookings) {
    if (_isMobile()) renderCalendarDay(bookings);
    else renderCalendarWeek(bookings);
}

// --- WEEK VIEW (desktop) ---
function renderCalendarWeek(bookings) {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    const weekDays = _weekDates(_calendarDate);
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const todayISO = todayStr();
    const hours = Array.from({length: 13}, (_, i) => i + 8);

    const navRow = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="navWeek(-1)">← Précédente</button>
            <span style="font-weight:600;font-size:.88rem">${_fmtDay(weekDays[0])} — ${_fmtDay(weekDays[6])}</span>
            <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="navWeek(0)">Aujourd'hui</button>
                <button class="btn btn-ghost btn-sm" onclick="navWeek(1)">Suivante →</button>
            </div>
        </div>`;

    const gridRows = hours.map(h => {
        const timeLbl = `<div class="cal-time-cell">${h}h</div>`;
        const slots = weekDays.map(d => {
            const iso = _isoDate(d);
            const slotBkgs = bookings.filter(b => b.date === iso && b.time && parseInt(b.time) === h);
            return `<div class="cal-slot${iso === todayISO ? ' cal-today-col' : ''}" onclick="showAddBookingOnDate('${iso}','${String(h).padStart(2,'0')}:00')">
                ${slotBkgs.map(b => `<div class="cal-booking cal-booking-${b.status||'confirmed'}" onclick="event.stopPropagation();showBookingDetail(${JSON.stringify(b).replace(/"/g,'&quot;')})"><div class="cal-booking-name">${b.clientName}</div><div class="cal-booking-svc">${b.serviceName||''}</div></div>`).join('')}
            </div>`;
        }).join('');
        return timeLbl + slots;
    }).join('');

    const headers = `<div class="cal-corner"></div>` + weekDays.map((d, i) => {
        const iso = _isoDate(d);
        return `<div class="cal-day-header${iso === todayISO ? ' cal-today' : ''}"><div class="cal-day-name">${dayNames[i]}</div><div class="cal-day-num">${d.getDate()}</div></div>`;
    }).join('');

    container.innerHTML = navRow + `<div class="cal-wrap"><div class="cal-grid">${headers}${gridRows}</div></div>`;
}

// --- DAY VIEW (mobile) ---
const DAY_NAMES_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function renderCalendarDay(bookings) {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    const todayISO = todayStr();
    const dayISO = _isoDate(_calendarDate);
    const dayBookings = bookings.filter(b => b.date === dayISO).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const hours = Array.from({length: 13}, (_, i) => i + 8);
    const d = _calendarDate;
    const dayLabel = `${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

    const slots = hours.map(h => {
        const hStr = String(h).padStart(2, '0');
        const slotBkgs = dayBookings.filter(b => b.time && parseInt(b.time) === h);
        return `
            <div style="display:flex;gap:0;border-top:1px solid var(--border)">
                <div style="width:44px;flex-shrink:0;padding:10px 6px 10px 0;text-align:right;color:var(--text-muted);font-size:.7rem;padding-top:12px">${hStr}h</div>
                <div style="flex:1;padding:4px 0 4px 8px;min-height:48px;cursor:pointer" onclick="showAddBookingOnDate('${dayISO}','${hStr}:00')">
                    ${slotBkgs.map(b => `
                        <div class="cal-booking cal-booking-${b.status||'confirmed'}" style="margin-bottom:4px"
                             onclick="event.stopPropagation();showBookingDetail(${JSON.stringify(b).replace(/"/g,'&quot;')})">
                            <div class="cal-booking-name">${b.time} · ${b.clientName}</div>
                            <div class="cal-booking-svc">${b.serviceName||''} ${b.duration ? '· '+b.duration+'min' : ''} ${b.price ? '· '+b.price+' CHF' : ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 12px">
            <button class="btn btn-ghost btn-sm" onclick="navDay(-1)" style="font-size:1.2rem;padding:6px 12px">‹</button>
            <div style="text-align:center">
                <div style="font-weight:700;font-size:1rem${dayISO === todayISO ? ';color:var(--primary)' : ''}">${dayLabel}</div>
                ${dayISO !== todayISO ? `<button class="btn btn-ghost btn-sm" style="font-size:.75rem;margin-top:4px;padding:2px 10px" onclick="navDay(0)">Aujourd'hui</button>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="navDay(1)" style="font-size:1.2rem;padding:6px 12px">›</button>
        </div>
        <div style="background:var(--bg-card);border-radius:12px;overflow:hidden;border:1px solid var(--border)">
            ${dayBookings.length === 0 && slots.replace(/<[^>]+>/g,'').trim() === '' ? '' : ''}
            ${slots}
        </div>
        ${dayBookings.length === 0 ? `<div class="empty-state" style="margin-top:16px"><div class="empty-state-icon">😴</div><div class="empty-state-text">Aucun RDV ce jour<br><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="showAddBookingOnDate('${dayISO}','10:00')">+ Ajouter</button></div></div>` : ''}
    `;
}

function navWeek(dir) {
    if (dir === 0) _calendarDate = new Date();
    else { _calendarDate = new Date(_calendarDate); _calendarDate.setDate(_calendarDate.getDate() + dir * 7); }
    renderCalendar(_allBookings);
}

function navDay(dir) {
    if (dir === 0) _calendarDate = new Date();
    else { _calendarDate = new Date(_calendarDate); _calendarDate.setDate(_calendarDate.getDate() + dir); }
    renderCalendar(_allBookings);
}

function showAddBookingOnDate(date, time) {
    showAddBooking();
    setTimeout(() => {
        const d = document.getElementById('mbDate'); if (d) d.value = date;
        const t = document.getElementById('mbTime'); if (t) t.value = time;
    }, 80);
}

// ---- Advanced Stats (occupancy + per-employee revenue) ----
function renderAdvancedStats(bookings) {
    const el = document.getElementById('advancedStats');
    if (!el) return;

    // Occupancy this week
    const weekDays = _weekDates(new Date());
    const weekISOs = weekDays.map(_isoDate);
    const weekBookings = bookings.filter(b => weekISOs.includes(b.date) && b.status !== 'cancelled');
    const workDays = (currentSalon?.hours || []).filter(h => h.open).length || 5;
    const slotsPerDay = 8; // avg 8h × 30min slots / 30min avg = ~16 slots, approximate
    const totalSlots = workDays * slotsPerDay;
    const occ = totalSlots > 0 ? Math.min(100, Math.round((weekBookings.length / totalSlots) * 100)) : 0;

    // Revenue per employee (all time from loaded bookings)
    const empMap = {};
    bookings.filter(b => b.employeeName && b.status !== 'cancelled').forEach(b => {
        empMap[b.employeeName] = (empMap[b.employeeName] || 0) + (b.price || 0);
    });
    const empEntries = Object.entries(empMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxEmp = empEntries[0]?.[1] || 1;

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="card" style="padding:0">
                <div class="card-body">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Occupation cette semaine</div>
                    <div style="font-size:28px;font-weight:700;color:${occ>70?'#22c55e':occ>40?'#f59e0b':'var(--text-muted)'}">${occ}%</div>
                    <div class="occ-bar-wrap" style="margin-top:8px"><div class="occ-bar" style="width:${occ}%;background:${occ>70?'#22c55e':occ>40?'#f59e0b':'#6366f1'}"></div></div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${weekBookings.length} RDV / ~${totalSlots} créneaux</div>
                </div>
            </div>
            <div class="card" style="padding:0">
                <div class="card-body">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">CA par styliste</div>
                    ${empEntries.length ? empEntries.map(([name, rev]) => `
                        <div style="margin-bottom:8px">
                            <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px">
                                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px">${name}</span>
                                <span style="font-weight:600;flex-shrink:0">${rev} CHF</span>
                            </div>
                            <div class="occ-bar-wrap"><div class="occ-bar" style="width:${Math.round((rev/maxEmp)*100)}%;background:var(--primary)"></div></div>
                        </div>
                    `).join('') : '<div style="color:var(--text-muted);font-size:.85rem">Aucune donnée</div>'}
                </div>
            </div>
        </div>
    `;
}

// ---- PWA Install Banner ----
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installPrompt = e;
    setTimeout(showInstallBanner, 3000);
});
function showInstallBanner() {
    if (!_installPrompt || localStorage.getItem('pwaInstallDismissed')) return;
    if (document.getElementById('pwaBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaBanner';
    banner.innerHTML = `
        <div><div style="font-size:.9rem;font-weight:600">📲 Installer l'appli</div><div style="font-size:.75rem;color:#9ca3af;margin-top:2px">Accès rapide depuis votre écran d'accueil</div></div>
        <div style="display:flex;gap:8px;flex-shrink:0">
            <button class="btn btn-ghost btn-sm" onclick="dismissInstallBanner()">Plus tard</button>
            <button class="btn btn-primary btn-sm" onclick="triggerInstall()">Installer</button>
        </div>`;
    document.body.appendChild(banner);
}
async function triggerInstall() {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    await _installPrompt.userChoice;
    _installPrompt = null;
    document.getElementById('pwaBanner')?.remove();
}
function dismissInstallBanner() {
    localStorage.setItem('pwaInstallDismissed', '1');
    document.getElementById('pwaBanner')?.remove();
}

// ---- CSV Export ----
function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function exportBookingsCSV() {
    const data = _allBookings.length ? _allBookings : [];
    if (!data.length) { showToast('Aucun rendez-vous à exporter', 'error'); return; }
    const rows = [['Date', 'Heure', 'Client', 'Téléphone', 'Email', 'Prestation', 'Durée (min)', 'Prix (CHF)', 'Statut', 'Employé']];
    data.forEach(b => rows.push([b.date, b.time, b.clientName, b.clientPhone, b.clientEmail, b.serviceName, b.duration || 30, b.price || 0, statusLabel(b.status), b.employeeName || '']));
    downloadCSV(`rdv_${todayStr()}.csv`, rows);
    showToast('Export CSV téléchargé ✅');
}

async function exportClientsCSV() {
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/clients`);
        const data = await res.json();
        const clients = data.data || [];
        if (!clients.length) { showToast('Aucun client à exporter', 'error'); return; }
        const rows = [['Nom', 'Email', 'Téléphone', 'Total RDV', 'Total dépensé (CHF)', 'Dernière visite', 'Notes']];
        clients.forEach(c => rows.push([c.name, c.email, c.phone, c.totalBookings || 0, c.totalSpent || 0, c.lastVisit ? c.lastVisit.split('T')[0] : '', c.notes || '']));
        downloadCSV(`clients_${todayStr()}.csv`, rows);
        showToast('Export CSV téléchargé ✅');
    } catch (e) {
        showToast('Erreur lors de l\'export', 'error');
    }
}

// ---- Manual Booking (phone call, walk-in) ----
async function showAddBooking() {
    // Fetch services and employees
    let services = [], employees = [];
    try {
        const [svcRes, empRes] = await Promise.all([
            apiFetch(`${API}/api/pro/salon/${salonId}/services`),
            apiFetch(`${API}/api/pro/salon/${salonId}/employees`),
        ]);
        services = (await svcRes.json()).data || [];
        employees = (await empRes.json()).data || [];
    } catch (e) { }

    const svcOptions = services.map(s => `<option value="${s.name}" data-icon="${s.icon}" data-price="${s.price}" data-duration="${s.duration}">${s.icon} ${s.name} — ${s.price} CHF (${s.duration}min)</option>`).join('');

    window._mbEmployees = employees;
    window._mbServices = services;
    window.renderEmpOptions = (serviceName) => {
        if (window._mbEmployees.length === 0) return '<option value="">Aucun membre</option>';
        const validEmps = window._mbEmployees.filter(e => {
            if (!serviceName) return true;
            const service = window._mbServices.find(s => s.name === serviceName);
            if (service && service.assignedEmployees && service.assignedEmployees.length > 0) {
                return service.assignedEmployees.includes(e._id);
            }
            return true;
        });
        if (validEmps.length === 0) return '<option value="">— Aucun pro pour cette prestation —</option>';
        return '<option value="">— Non assigné —</option>' + validEmps.map(e => `<option value="${e._id}" data-name="${e.name}">${e.name}</option>`).join('');
    };

    const initialService = services.length > 0 ? services[0].name : null;
    const empOptions = renderEmpOptions(initialService);

    document.getElementById('modalTitle').textContent = '📅 Ajouter un rendez-vous';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label class="form-label">Prestation</label>
            <select class="form-input form-input-full" id="mbService" onchange="document.getElementById('mbEmployee') ? document.getElementById('mbEmployee').innerHTML = window.renderEmpOptions(this.value) : null">${svcOptions}</select>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1"><label class="form-label">Date</label>
                <input type="date" class="form-input form-input-full" id="mbDate" value="${todayStr()}">
            </div>
            <div class="form-group" style="flex:1"><label class="form-label">Heure</label>
                <input type="time" class="form-input form-input-full" id="mbTime" value="10:00">
            </div>
        </div>
        ${employees.length > 0 ? `<div class="form-group"><label class="form-label">Employé</label>
            <select class="form-input form-input-full" id="mbEmployee">${empOptions}</select>
        </div>` : ''}
        <div class="form-group" style="position:relative">
            <label class="form-label">Nom du client *</label>
            <input class="form-input form-input-full" id="mbClientName" placeholder="Tapez pour rechercher ou créer…" autocomplete="off" oninput="clientSearchDebounce(this.value)">
            <div id="clientSuggestions" style="display:none;position:absolute;left:0;right:0;top:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;z-index:1000;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.4)"></div>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1"><label class="form-label">Téléphone</label>
                <input class="form-input form-input-full" id="mbClientPhone" placeholder="06 12 34 56 78">
            </div>
            <div class="form-group" style="flex:1"><label class="form-label">Email (optionnel)</label>
                <input type="email" class="form-input form-input-full" id="mbClientEmail" placeholder="client@email.com">
            </div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label>
            <input class="form-input form-input-full" id="mbNotes" placeholder="Notes internes...">
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="addManualBooking()">📅 Ajouter le RDV</button>
    `;
    document.getElementById('modal').classList.add('active');
}

// ---- Client autocomplete ----
let _clientSearchTimer = null;
function clientSearchDebounce(val) {
    clearTimeout(_clientSearchTimer);
    const box = document.getElementById('clientSuggestions');
    if (!box) return;
    if (val.length < 2) { box.style.display = 'none'; return; }
    _clientSearchTimer = setTimeout(() => runClientSearch(val), 280);
}

async function runClientSearch(q) {
    const box = document.getElementById('clientSuggestions');
    if (!box) return;
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/clients/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const clients = data.data || [];
        if (!clients.length) { box.style.display = 'none'; return; }
        box.innerHTML = clients.map(c => `
            <div onclick="selectClientSuggestion(${JSON.stringify(c).replace(/"/g,'&quot;')})"
                 style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:.88rem;transition:background .1s"
                 onmouseover="this.style.background='rgba(255,255,255,.05)'"
                 onmouseout="this.style.background=''">
                <div style="font-weight:600">${c.name}</div>
                <div style="color:var(--text-muted);font-size:.78rem">${[c.phone, c.email].filter(Boolean).join(' · ') || 'Pas de contact'}</div>
            </div>
        `).join('');
        box.style.display = 'block';
    } catch(e) { box.style.display = 'none'; }
}

function selectClientSuggestion(c) {
    const nameEl  = document.getElementById('mbClientName');
    const phoneEl = document.getElementById('mbClientPhone');
    const emailEl = document.getElementById('mbClientEmail');
    if (nameEl)  nameEl.value  = c.name  || '';
    if (phoneEl) phoneEl.value = c.phone || '';
    if (emailEl) emailEl.value = c.email || '';
    const box = document.getElementById('clientSuggestions');
    if (box) box.style.display = 'none';
}

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#clientSuggestions') && e.target.id !== 'mbClientName') {
        const box = document.getElementById('clientSuggestions');
        if (box) box.style.display = 'none';
    }
});

async function addManualBooking() {
    const clientName = document.getElementById('mbClientName').value.trim();
    if (!clientName) { showToast('Entrez le nom du client', 'error'); return; }

    const svcSelect = document.getElementById('mbService');
    const opt = svcSelect.options[svcSelect.selectedIndex];
    const empSelect = document.getElementById('mbEmployee');
    const empOpt = empSelect ? empSelect.options[empSelect.selectedIndex] : null;

    const booking = {
        serviceName: svcSelect.value,
        serviceIcon: opt?.dataset.icon || '✂️',
        price: parseInt(opt?.dataset.price) || 0,
        duration: parseInt(opt?.dataset.duration) || 30,
        date: document.getElementById('mbDate').value,
        time: document.getElementById('mbTime').value,
        clientName: clientName,
        clientPhone: document.getElementById('mbClientPhone').value.trim(),
        clientEmail: document.getElementById('mbClientEmail').value.trim(),
        employeeId: empSelect?.value || null,
        employeeName: empOpt?.dataset.name || null,
        notes: document.getElementById('mbNotes').value.trim(),
        source: 'manual',
    };

    try {
        await apiFetch(`${API}/api/pro/salon/${salonId}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        closeModal();
        showToast('Rendez-vous ajouté ✅');
        loadBookings();
        loadDashboard();
    } catch (e) {
        showToast('Erreur lors de l\'ajout', 'error');
    }
}

// ---- Clients ----
async function loadClients() {
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/clients`);
        const data = await res.json();
        const clients = data.data || [];

        const container = document.getElementById('clientsList');
        if (clients.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Aucun client pour le moment</div></div>';
        } else {
            container.innerHTML = '<div class="data-grid">' + clients.map(c => {
                const visits = c.totalBookings ?? 0;
                const loyalty = visits >= 20 ? '🥇' : visits >= 10 ? '🥈' : visits >= 5 ? '🥉' : '';
                return `
                <div class="data-card" style="cursor:pointer" onclick="showClientProfile('${c._id}')">
                    <div class="data-card-icon" style="background:linear-gradient(135deg,var(--primary),#A07D4A);color:var(--bg);font-weight:700;font-size:16px">${(c.name || '?')[0].toUpperCase()}</div>
                    <div class="data-card-info">
                        <div class="data-card-name">${c.name} ${loyalty}</div>
                        <div class="data-card-sub">${c.email || ''} ${c.phone ? '· ' + c.phone : ''}</div>
                    </div>
                    <div class="data-card-right">
                        <div class="data-card-value">${visits}</div>
                        <div class="data-card-label">visites</div>
                    </div>
                </div>`;
            }).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
}

// ---- Client Profile (enriched) ----
async function showClientProfile(clientId) {
    document.getElementById('modalTitle').textContent = '👤 Fiche client';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Chargement…</div>';
    document.getElementById('modalFooter').innerHTML = '';
    document.getElementById('modal').classList.add('active');

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/clients/${clientId}`);
        const data = await res.json();
        if (!data.success) { showToast('Client introuvable', 'error'); closeModal(); return; }
        const c = data.data;
        const visits = c.totalBookings || 0;
        const loyaltyLabel = visits >= 20 ? '🥇 Gold' : visits >= 10 ? '🥈 Silver' : visits >= 5 ? '🥉 Bronze' : '🌱 Nouveau';

        document.getElementById('modalTitle').textContent = `👤 ${c.name}`;
        document.getElementById('modalBody').innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
                <div style="background:var(--bg-surface);border-radius:10px;padding:12px;text-align:center">
                    <div style="font-size:20px;font-weight:700;color:var(--primary)">${visits}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Visites</div>
                </div>
                <div style="background:var(--bg-surface);border-radius:10px;padding:12px;text-align:center">
                    <div style="font-size:18px;font-weight:700;color:#22c55e">${c.totalSpent || 0}</div>
                    <div style="font-size:11px;color:var(--text-muted)">CHF dépensé</div>
                </div>
                <div style="background:var(--bg-surface);border-radius:10px;padding:12px;text-align:center">
                    <div style="font-size:15px;font-weight:700">${loyaltyLabel}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Fidélité</div>
                </div>
            </div>
            <div style="font-size:.85rem;margin-bottom:14px;color:var(--text-muted)">
                ${c.email || '—'} ${c.phone ? '· ' + c.phone : ''}
                ${c.lastVisit ? ' · Dernière visite : ' + c.lastVisit.split('T')[0] : ''}
            </div>
            <div class="form-group">
                <label class="form-label">Notes internes</label>
                <textarea class="form-input form-input-full" id="clientNotesField" rows="3" placeholder="Allergies, préférences, notes…">${c.notes || ''}</textarea>
            </div>
            ${(c.recentBookings || []).length ? `
                <div style="margin-top:14px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Historique des visites</div>
                    ${c.recentBookings.slice(0, 6).map(b => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:.83rem">
                            <div>
                                <div style="font-weight:600">${b.serviceName || '—'}</div>
                                <div style="color:var(--text-muted)">${b.date} à ${b.time}</div>
                            </div>
                            <div style="text-align:right;flex-shrink:0">
                                <div style="font-weight:600">${b.price || 0} CHF</div>
                                <span class="badge badge-${b.status || 'confirmed'}" style="font-size:10px">${statusLabel(b.status)}</span>
                                ${b.reviewRating ? '<div class="review-stars">' + '★'.repeat(b.reviewRating) + '</div>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        document.getElementById('modalFooter').innerHTML = `
            <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
            <button class="btn btn-primary" onclick="saveClientNotes('${clientId}')">💾 Enregistrer</button>
        `;
    } catch (e) { showToast('Erreur de chargement', 'error'); closeModal(); }
}

async function saveClientNotes(clientId) {
    const notes = document.getElementById('clientNotesField')?.value || '';
    try {
        await apiFetch(`${API}/api/pro/salon/${salonId}/clients/${clientId}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        showToast('Notes enregistrées ✅');
        closeModal();
        loadClients();
    } catch (e) { showToast('Erreur', 'error'); }
}

// ---- Employees ----
async function loadEmployees() {
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees`);
        const data = await res.json();
        const emps = data.data || [];

        const plan = currentSalon?.subscription?.plan || 'pro';
        const isOwner = currentUser?.role === 'owner';

        let limit = 999;
        if (plan === 'starter') limit = 2;
        if (plan === 'pro') limit = 5;

        const addBtn = document.querySelector('#page-employees .page-header button');
        const headerTitle = document.querySelector('#page-employees .page-header h2');

        if (headerTitle) {
            headerTitle.innerHTML = `💇 Mon Équipe <span class="badge badge-${plan === 'premium' ? 'confirmed' : plan === 'starter' ? 'pending' : 'active'}" style="margin-left: 10px; font-size: 0.8rem; vertical-align: middle;">Pack ${plan.toUpperCase()}</span>`;
        }

        if (isOwner) {
            if (emps.length >= limit) {
                if (addBtn) {
                    addBtn.style.display = 'none';
                    // Optional: show a small info text next to title
                    if (!document.getElementById('upgradeMsg')) {
                        headerTitle.insertAdjacentHTML('afterend', `<div id="upgradeMsg" style="color:var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Limite de ${limit} employés atteinte. Mettez à niveau votre pack pour en ajouter plus.</div>`);
                    }
                }
            } else {
                if (addBtn) addBtn.style.display = 'inline-flex';
                const msg = document.getElementById('upgradeMsg');
                if (msg) msg.remove();
            }
        } else if (addBtn) {
            addBtn.style.display = 'none';
        }

        const container = document.getElementById('employeesList');
        if (emps.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💇</div><div class="empty-state-text">Aucun employé</div></div>';
        } else {
            container.innerHTML = '<div class="data-grid">' + emps.map(e => `
                <div class="data-card">
                    <div class="data-card-icon" style="background:linear-gradient(135deg,var(--primary),#A07D4A);color:var(--bg);font-weight:700;font-size:16px">${(e.name || '?')[0].toUpperCase()}</div>
                    <div class="data-card-info">
                        <div class="data-card-name">${e.name}</div>
                        <div class="data-card-sub">${(e.specialties || []).join(', ')}</div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0;">
                        <span class="badge badge-active">${e.role === 'owner' ? 'Propriétaire' : 'Employé'}</span>
                        <button class="btn btn-outline btn-sm" onclick='showEditSchedule(${JSON.stringify(e).replace(/'/g, "&#39;")})' title="Modifier les horaires">🕐</button>
                        ${isOwner ? `<button class="btn btn-outline btn-sm" onclick="showChangePassword('${e._id}','${e.role || 'employee'}')" title="Changer mot de passe">🔑</button>` : ''}
                        ${isOwner ? `<button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e._id}', '${e.role || 'employee'}')" title="Supprimer">🗑</button>` : ''}
                    </div>
                </div>
            `).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
}

function showChangePassword(empId, role) {
    document.getElementById('modalTitle').textContent = '🔑 Changer le mot de passe';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label class="form-label">Nouveau mot de passe</label>
            <input type="password" class="form-input form-input-full" id="newEmpPassword" placeholder="Minimum 6 caractères" autocomplete="new-password">
        </div>
        <div class="form-group">
            <label class="form-label">Confirmer</label>
            <input type="password" class="form-input form-input-full" id="newEmpPasswordConfirm" placeholder="••••••••" autocomplete="new-password">
        </div>
        <div id="changePwdError" style="display:none;color:#ef4444;font-size:13px;margin-top:4px"></div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="submitChangePassword('${empId}','${role}')">Enregistrer</button>
    `;
    document.getElementById('modal').classList.add('active');
}

async function submitChangePassword(empId, role) {
    const pwd = document.getElementById('newEmpPassword').value;
    const confirm = document.getElementById('newEmpPasswordConfirm').value;
    const errEl = document.getElementById('changePwdError');
    if (pwd.length < 6) { errEl.style.display = 'block'; errEl.textContent = 'Minimum 6 caractères'; return; }
    if (pwd !== confirm) { errEl.style.display = 'block'; errEl.textContent = 'Les mots de passe ne correspondent pas'; return; }
    errEl.style.display = 'none';
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees/${empId}/password?role=${role}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (data.success) { closeModal(); showToast('Mot de passe mis à jour ✅'); }
        else { errEl.style.display = 'block'; errEl.textContent = data.error || 'Erreur'; }
    } catch (e) {
        errEl.style.display = 'block'; errEl.textContent = 'Erreur de connexion';
    }
}

function toggleSpecsField() {
    const role = document.getElementById('empRole').value;
    document.getElementById('specsGroup').style.display = role === 'owner' ? 'none' : 'block';
}

function showAddEmployee() {
    document.getElementById('modalTitle').textContent = 'Ajouter un membre de l\'équipe';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
            <label class="form-label">Rôle</label>
            <select class="form-input form-input-full" id="empRole" onchange="toggleSpecsField()">
                <option value="employee">Employé (Gère ses RDV)</option>
                <option value="owner">Propriétaire (Accès total au salon)</option>
            </select>
        </div>
        <div class="form-group"><label class="form-label">Nom</label><input class="form-input form-input-full" id="empName" placeholder="Prénom Nom"></div>
        <div class="form-group"><label class="form-label">Email (pour la connexion)</label><input type="email" class="form-input form-input-full" id="empEmail" placeholder="employe@salon.com"></div>
        <div class="form-group"><label class="form-label">Mot de passe provisoire</label><input type="text" class="form-input form-input-full" id="empPassword" placeholder="motdepasse123"></div>
        <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input form-input-full" id="empPhone" placeholder="06XXXXXXXX"></div>
        <div class="form-group" id="specsGroup"><label class="form-label">Prestations (séparées par virgule)</label><input class="form-input form-input-full" id="empSpecs" placeholder="Coupe, Barbe, Coloration"></div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="addEmployee()">Ajouter</button>
    `;
    document.getElementById('modal').classList.add('active');
}

async function addEmployee() {
    const role = document.getElementById('empRole').value;
    const name = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const password = document.getElementById('empPassword').value.trim();
    const phone = document.getElementById('empPhone').value.trim();
    const specs = role === 'owner' ? [] : document.getElementById('empSpecs').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!name) return;

    const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role, specialties: specs })
    });

    const data = await res.json();
    if (!data.success) {
        alert(data.error || "Erreur lors de l'ajout");
        return;
    }

    closeModal();
    loadEmployees();
    showToast('Membre ajouté ✅');
}

async function deleteEmployee(id, role) {
    if (!confirm('Voulez-vous vraiment supprimer ce membre ?')) return;
    const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees/${id}?role=${role}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
    }
    loadEmployees();
    showToast('Membre supprimé');
}

function showEditSchedule(emp) {
    const hours = emp.hours || {};
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const dayLabels = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

    const hoursRows = days.map(d => {
        const h = hours[d];
        const isClosed = !h || !h.open;
        return `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="width:100px;font-weight:600;font-size:.88rem">${dayLabels[d]}</div>
                <label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-sec);cursor:pointer;min-width:70px">
                    <input type="checkbox" class="hours-check-emp" data-day="${d}" ${!isClosed ? 'checked' : ''} onchange="toggleDayEmp('${d}', this.checked)" style="accent-color:var(--primary)">
                    ${!isClosed ? 'Ouvert' : 'Fermé'}
                </label>
                <input type="time" id="emp-hours-${d}-open" value="${h?.openTime || '09:00'}" class="form-input" style="width:110px;${isClosed ? 'opacity:.3;pointer-events:none' : ''}" />
                <span style="color:var(--text-muted)">→</span>
                <input type="time" id="emp-hours-${d}-close" value="${h?.closeTime || '19:00'}" class="form-input" style="width:110px;${isClosed ? 'opacity:.3;pointer-events:none' : ''}" />
            </div>
        `;
    }).join('');

    document.getElementById('modalTitle').textContent = `Horaires de ${emp.name}`;
    document.getElementById('modalBody').innerHTML = `
        <div style="margin-bottom: 12px; font-size: 0.85rem; color: var(--text-sec);">
            Personnalisez les horaires pour cet employé. Ces horaires sont prioritaires sur ceux du salon.
        </div>
        ${hoursRows}
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="saveEmployeeSchedule('${emp._id}')">💾 Enregistrer</button>
    `;
    document.getElementById('modal').classList.add('active');
}

function toggleDayEmp(day, checked) {
    const open = document.getElementById(`emp-hours-${day}-open`);
    const close = document.getElementById(`emp-hours-${day}-close`);
    const label = event.currentTarget.parentElement;
    open.style.opacity = checked ? '1' : '.3';
    open.style.pointerEvents = checked ? 'auto' : 'none';
    close.style.opacity = checked ? '1' : '.3';
    close.style.pointerEvents = checked ? 'auto' : 'none';
    label.querySelector('input').nextSibling.textContent = checked ? ' Ouvert' : ' Fermé';
}

async function saveEmployeeSchedule(empId) {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const newHours = {};
    days.forEach(d => {
        const cb = document.querySelector(`.hours-check-emp[data-day="${d}"]`);
        const isOpen = cb && cb.checked;
        newHours[d] = {
            open: isOpen,
            openTime: isOpen ? document.getElementById(`emp-hours-${d}-open`).value : '09:00',
            closeTime: isOpen ? document.getElementById(`emp-hours-${d}-close`).value : '19:00',
        };
    });

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees/${empId}/hours`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hours: newHours })
        });
        const data = await res.json();
        if (data.success) {
            closeModal();
            loadEmployees();
            showToast('Horaires mis à jour ✅');
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (e) {
        showToast('Erreur de connexion', 'error');
    }
}

// ---- Services ----
async function loadServices() {
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/services`);
        const data = await res.json();
        const svcs = data.data || [];

        const container = document.getElementById('servicesList');
        if (svcs.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">Aucune prestation</div></div>';
        } else {
            container.innerHTML = '<div class="data-grid">' + svcs.map(s => `
                <div class="data-card">
                    <div class="data-card-icon">${s.icon || '✂️'}</div>
                    <div class="data-card-info">
                        <div class="data-card-name">${s.name}</div>
                        <div class="data-card-sub">${s.duration || 30}min · ${s.description || ''}</div>
                    </div>
                    <div class="data-card-right">
                        <div class="data-card-value">${s.price || 0} CHF</div>
                    </div>
                    <div style="display:flex;gap:5px;">
                        <button class="btn btn-outline btn-sm" onclick='showEditService(${JSON.stringify(s).replace(/'/g, "&#39;")})'>✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteService('${s._id}')">🗑</button>
                    </div>
                </div>
            `).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
}

async function showAddService() {
    document.getElementById('modalTitle').textContent = 'Ajouter une prestation';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label class="form-label">Nom</label><input class="form-input form-input-full" id="svcName" placeholder="Coupe Classique"></div>
        <div class="form-row">
            <div class="form-group" style="flex:1"><label class="form-label">Prix (CHF)</label><input type="number" class="form-input form-input-full" id="svcPrice" placeholder="25"></div>
            <div class="form-group" style="flex:1"><label class="form-label">Durée (min)</label><input type="number" class="form-input form-input-full" id="svcDuration" placeholder="30"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Icône (emoji)</label>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                <input class="form-input" id="svcIcon" value="✂️" placeholder="✂️" style="width:70px;text-align:center;font-size:1.4rem">
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('svcIcon').value='✂️'">Réinitialiser</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${['✂️','💇','💅','🧖','💆','🪒','🧴','💋','👗','👠','💄','🌸','🧘','🪮','🧼','🌿','⭐','✨','💎','🔥'].map(e=>`<button type="button" onclick="document.getElementById('svcIcon').value='${e}'" style="font-size:1.3rem;padding:4px 6px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${e}</button>`).join('')}
            </div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input form-input-full" id="svcDesc" placeholder="Description courte"></div>
        <div class="form-group">
            <label class="form-label">Assigner à (laisser vide = tous)</label>
            <div id="svcEmployeesList"><div style="margin-top:10px;font-size:0.9rem;color:var(--text-sec)">Chargement des employés...</div></div>
        </div>
        <div class="form-group" style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px">
            <label class="form-label">💳 Paiement en ligne</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px" id="svcPaymentModeGroup">
                <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;cursor:pointer"><input type="radio" name="svcPayMode" value="none" checked onchange="toggleDepositFields()"> Paiement sur place uniquement</label>
                <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;cursor:pointer"><input type="radio" name="svcPayMode" value="deposit" onchange="toggleDepositFields()"> Acompte requis à la réservation</label>
                <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;cursor:pointer"><input type="radio" name="svcPayMode" value="full_online" onchange="toggleDepositFields()"> Paiement complet en ligne</label>
            </div>
            <div id="svcDepositFields" style="display:none;margin-top:12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px">
                <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:10px">Montant de l'acompte</div>
                <div style="display:flex;gap:10px;align-items:center">
                    <select id="svcDepositType" class="form-input" style="width:140px" onchange="toggleDepositFields()">
                        <option value="fixed">Montant fixe (CHF)</option>
                        <option value="percent">Pourcentage (%)</option>
                    </select>
                    <input type="number" id="svcDepositAmount" class="form-input" style="flex:1" placeholder="20" min="1">
                    <span id="svcDepositUnit" style="font-size:.9rem;color:var(--text-muted);white-space:nowrap">CHF</span>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="addService()">Ajouter</button>
    `;
    document.getElementById('modal').classList.add('active');

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees`);
        const data = await res.json();
        const emps = data.data || [];
        if (emps.length === 0) {
            document.getElementById('svcEmployeesList').innerHTML = '<div style="font-size:0.9rem;color:var(--text-sec)">Aucun membre dans l\'équipe.</div>';
        } else {
            document.getElementById('svcEmployeesList').innerHTML = emps.map(e => `
                <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.9rem;cursor:pointer">
                    <input type="checkbox" class="svc-emp-cb" value="${e._id}"> ${e.name} (${e.role === 'owner' ? 'Propriétaire' : 'Employé'})
                </label>
            `).join('');
        }
    } catch {
        document.getElementById('svcEmployeesList').innerHTML = '<div style="color:var(--danger);font-size:0.9rem">Erreur de chargement.</div>';
    }
}

function getPaymentFields() {
    const modeEl = document.querySelector('input[name="svcPayMode"]:checked');
    const paymentMode = modeEl ? modeEl.value : 'none';
    const depositType = document.getElementById('svcDepositType')?.value || 'fixed';
    const depositAmount = parseFloat(document.getElementById('svcDepositAmount')?.value) || 0;
    return { paymentMode, depositType, depositAmount };
}

function toggleDepositFields() {
    const modeEl = document.querySelector('input[name="svcPayMode"]:checked');
    const mode = modeEl ? modeEl.value : 'none';
    const fields = document.getElementById('svcDepositFields');
    if (fields) fields.style.display = mode === 'deposit' ? 'block' : 'none';
    const unitEl = document.getElementById('svcDepositUnit');
    if (unitEl) {
        const type = document.getElementById('svcDepositType')?.value;
        unitEl.textContent = type === 'percent' ? '%' : 'CHF';
    }
}

async function addService() {
    const name = document.getElementById('svcName').value.trim();
    const price = parseInt(document.getElementById('svcPrice').value) || 0;
    const duration = parseInt(document.getElementById('svcDuration').value) || 30;
    const icon = document.getElementById('svcIcon').value.trim() || '✂️';
    const description = document.getElementById('svcDesc').value.trim();
    const assignedEmployees = Array.from(document.querySelectorAll('.svc-emp-cb:checked')).map(cb => cb.value);
    const { paymentMode, depositType, depositAmount } = getPaymentFields();

    if (!name) return;

    await apiFetch(`${API}/api/pro/salon/${salonId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, duration, icon, description, assignedEmployees, paymentMode, depositType, depositAmount })
    });
    closeModal();
    loadServices();
    showToast('Prestation ajoutée ✅');
}

async function showEditService(svc) {
    document.getElementById('modalTitle').textContent = 'Modifier une prestation';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label class="form-label">Nom</label><input class="form-input form-input-full" id="svcName" value="${svc.name}"></div>
        <div class="form-row">
            <div class="form-group" style="flex:1"><label class="form-label">Prix (CHF)</label><input type="number" class="form-input form-input-full" id="svcPrice" value="${svc.price}"></div>
            <div class="form-group" style="flex:1"><label class="form-label">Durée (min)</label><input type="number" class="form-input form-input-full" id="svcDuration" value="${svc.duration}"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Icône (emoji)</label>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                <input class="form-input" id="svcIcon" value="${svc.icon}" placeholder="✂️" style="width:70px;text-align:center;font-size:1.4rem">
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('svcIcon').value='✂️'">Réinitialiser</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${['✂️','💇','💅','🧖','💆','🪒','🧴','💋','👗','👠','💄','🌸','🧘','🪮','🧼','🌿','⭐','✨','💎','🔥'].map(e=>`<button type="button" onclick="document.getElementById('svcIcon').value='${e}'" style="font-size:1.3rem;padding:4px 6px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${e}</button>`).join('')}
            </div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input form-input-full" id="svcDesc" value="${svc.description}"></div>
        <div class="form-group">
            <label class="form-label">Assigner à (laisser vide = tous)</label>
            <div id="svcEmployeesList"><div style="margin-top:10px;font-size:0.9rem;color:var(--text-sec)">Chargement des employés...</div></div>
        </div>
        <div class="form-group" style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px">
            <label class="form-label">💳 Paiement en ligne</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
                <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;cursor:pointer"><input type="radio" name="svcPayMode" value="none" ${(!svc.paymentMode || svc.paymentMode === 'none') ? 'checked' : ''} onchange="toggleDepositFields()"> Paiement sur place uniquement</label>
                <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;cursor:pointer"><input type="radio" name="svcPayMode" value="deposit" ${svc.paymentMode === 'deposit' ? 'checked' : ''} onchange="toggleDepositFields()"> Acompte requis à la réservation</label>
                <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;cursor:pointer"><input type="radio" name="svcPayMode" value="full_online" ${svc.paymentMode === 'full_online' ? 'checked' : ''} onchange="toggleDepositFields()"> Paiement complet en ligne</label>
            </div>
            <div id="svcDepositFields" style="display:${svc.paymentMode === 'deposit' ? 'block' : 'none'};margin-top:12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px">
                <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:10px">Montant de l'acompte</div>
                <div style="display:flex;gap:10px;align-items:center">
                    <select id="svcDepositType" class="form-input" style="width:140px" onchange="toggleDepositFields()">
                        <option value="fixed" ${svc.depositType !== 'percent' ? 'selected' : ''}>Montant fixe (CHF)</option>
                        <option value="percent" ${svc.depositType === 'percent' ? 'selected' : ''}>Pourcentage (%)</option>
                    </select>
                    <input type="number" id="svcDepositAmount" class="form-input" style="flex:1" value="${svc.depositAmount || ''}" placeholder="20" min="1">
                    <span id="svcDepositUnit" style="font-size:.9rem;color:var(--text-muted);white-space:nowrap">${svc.depositType === 'percent' ? '%' : 'CHF'}</span>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="editService('${svc._id}')">Enregistrer</button>
    `;
    document.getElementById('modal').classList.add('active');

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/employees`);
        const data = await res.json();
        const emps = data.data || [];
        if (emps.length === 0) {
            document.getElementById('svcEmployeesList').innerHTML = '<div style="font-size:0.9rem;color:var(--text-sec)">Aucun membre dans l\'équipe.</div>';
        } else {
            const assignedIds = svc.assignedEmployees || [];
            document.getElementById('svcEmployeesList').innerHTML = emps.map(e => `
                <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.9rem;cursor:pointer">
                    <input type="checkbox" class="svc-emp-cb" value="${e._id}" ${assignedIds.includes(e._id) ? 'checked' : ''}> ${e.name} (${e.role === 'owner' ? 'Propriétaire' : 'Employé'})
                </label>
            `).join('');
        }
    } catch {
        document.getElementById('svcEmployeesList').innerHTML = '<div style="color:var(--danger);font-size:0.9rem">Erreur de chargement.</div>';
    }
}

async function editService(id) {
    const name = document.getElementById('svcName').value.trim();
    const price = parseInt(document.getElementById('svcPrice').value) || 0;
    const duration = parseInt(document.getElementById('svcDuration').value) || 30;
    const icon = document.getElementById('svcIcon').value.trim() || '✂️';
    const description = document.getElementById('svcDesc').value.trim();
    const assignedEmployees = Array.from(document.querySelectorAll('.svc-emp-cb:checked')).map(cb => cb.value);
    const { paymentMode, depositType, depositAmount } = getPaymentFields();

    if (!name) return;

    await apiFetch(`${API}/api/pro/salon/${salonId}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, duration, icon, description, assignedEmployees, paymentMode, depositType, depositAmount })
    });
    closeModal();
    loadServices();
    showToast('Prestation modifiée ✅');
}

async function deleteService(id) {
    if (!confirm('Supprimer cette prestation ?')) return;
    await apiFetch(`${API}/api/pro/salon/${salonId}/services/${id}`, { method: 'DELETE' });
    loadServices();
    showToast('Prestation supprimée');
}

// ---- Settings ----
async function saveSMSSettings() {
    const settings = {
        clientConfirmation: document.getElementById('sms-toggle-confirm')?.checked ?? true,
        clientReminder: document.getElementById('sms-toggle-reminder')?.checked ?? true,
        ownerNotification: document.getElementById('sms-toggle-owner')?.checked ?? false,
        ownerPhone: document.getElementById('sms-owner-phone')?.value?.trim() || '',
    };
    try {
        await apiFetch(`${API}/api/pro/salon/${salonId}/sms-settings`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        showToast('Paramètres SMS enregistrés ✅');
    } catch { showToast('Erreur de sauvegarde', 'error'); }
}

async function loadSMSStatus() {
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/sms-status`);
        const data = await res.json();
        const { credits = 0, packs = {}, configured = false, settings = {} } = data.data || {};
        const el = document.getElementById('smsCardBody');
        if (!el) return;

        const creditColor = credits === 0 ? 'var(--error)' : credits < 20 ? '#f59e0b' : 'var(--success, #22c55e)';
        const configWarning = !configured
            ? `<div style="margin-bottom:16px;padding:10px 14px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:10px;font-size:.82rem;color:#fbbf24">
                ⚠️ Twilio non configuré — ajoutez <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> et <code>TWILIO_PHONE_NUMBER</code> dans Render pour activer l'envoi SMS.
               </div>` : '';

        el.innerHTML = `
            ${configWarning}
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 18px;background:var(--bg-surface);border-radius:12px;border:1px solid var(--border)">
                <span style="font-size:32px">📱</span>
                <div>
                    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:2px">Crédits SMS disponibles</div>
                    <div style="font-size:26px;font-weight:800;color:${creditColor}">${credits}</div>
                </div>
            </div>
            <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px">
                Un crédit = 1 SMS envoyé. Les rappels J-1 et les confirmations de RDV consomment 1 crédit chacun.
            </p>
            <div style="margin-bottom:20px;padding:16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px">
                <div style="font-weight:600;font-size:.9rem;margin-bottom:12px">⚙️ Préférences d'envoi</div>
                ${[
                    { id: 'sms-toggle-confirm', label: 'SMS de confirmation au client', checked: settings.clientConfirmation !== false },
                    { id: 'sms-toggle-reminder', label: 'SMS rappel J-1 au client', checked: settings.clientReminder !== false },
                    { id: 'sms-toggle-owner', label: 'SMS alerte nouveau RDV (vous)', checked: !!settings.ownerNotification },
                ].map(t => `
                <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light,rgba(255,255,255,.06));cursor:pointer">
                    <span style="font-size:.85rem;color:var(--text-sec)">${t.label}</span>
                    <input type="checkbox" id="${t.id}" ${t.checked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary,#6366f1)">
                </label>`).join('')}
                <div style="margin-top:12px">
                    <label style="font-size:.8rem;color:var(--text-muted);display:block;margin-bottom:4px">Votre numéro de téléphone (pour les alertes)</label>
                    <input type="tel" id="sms-owner-phone" value="${settings.ownerPhone || ''}" placeholder="+41 79 000 00 00"
                        class="form-input form-input-full" style="font-size:.85rem;padding:8px 12px">
                </div>
                <button class="btn btn-primary btn-sm" style="margin-top:10px;width:100%" onclick="saveSMSSettings()">Enregistrer les préférences</button>
            </div>
            <div style="display:grid;gap:10px">
                ${Object.entries(packs).map(([key, pack]) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px">
                    <div>
                        <div style="font-weight:600;font-size:.9rem">${pack.label}</div>
                        <div style="font-size:.8rem;color:var(--text-muted)">${pack.credits} SMS</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px">
                        <span style="font-weight:700;font-size:1rem">CHF ${pack.priceChf}</span>
                        <button class="btn btn-primary btn-sm" onclick="buySMSPack('${key}')">Acheter</button>
                    </div>
                </div>`).join('')}
            </div>`;
    } catch(e) {
        const el = document.getElementById('smsCardBody');
        if (el) el.innerHTML = `<div style="font-size:.85rem;color:var(--text-muted)">Impossible de charger les crédits SMS.</div>`;
    }
}

async function buySMSPack(packKey) {
    try {
        const btn = event.currentTarget;
        btn.disabled = true;
        btn.textContent = '…';
        const res = await apiFetch('/api/pro/sms/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pack: packKey })
        });
        const data = await res.json();
        if (data.success && data.url) {
            window.location.href = data.url;
        } else {
            showToast(data.error || 'Erreur paiement', 'error');
            btn.disabled = false;
            btn.textContent = 'Acheter';
        }
    } catch(e) {
        showToast('Erreur de connexion', 'error');
    }
}

async function loadStripeConnect(plan) {
    const body = document.getElementById('stripeConnectBody');
    if (!body) return;

    // Fonctionnalité réservée aux plans Pro et Premium
    if (plan === 'starter') {
        body.innerHTML = `
            <div style="text-align:center;padding:8px 0">
                <div style="font-size:2rem;margin-bottom:10px">🔒</div>
                <div style="font-weight:600;margin-bottom:6px">Fonctionnalité Pro & Premium</div>
                <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">
                    Acceptez des acomptes et paiements en ligne. Disponible à partir du plan <strong>Pro</strong>.
                </p>
                <button class="btn btn-primary btn-sm" onclick="manageSubscription()" style="margin:0 auto">
                    ⬆️ Passer au plan Pro
                </button>
            </div>
        `;
        return;
    }

    try {
        const res = await apiFetch(`${API}/api/pro/stripe/connect/status`);
        const data = await res.json();
        const d = data.data || {};

        if (d.connected) {
            body.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                    <div style="width:10px;height:10px;border-radius:50%;background:var(--success);flex-shrink:0"></div>
                    <div>
                        <div style="font-weight:600;font-size:.95rem">Stripe connecté ✅</div>
                        <div style="font-size:.8rem;color:var(--text-muted)">Votre compte bancaire est lié. Vous pouvez recevoir des paiements en ligne.</div>
                    </div>
                </div>
                <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:.83rem;color:var(--text-sec);margin-bottom:16px">
                    💡 Activez le paiement en ligne ou l'acompte par prestation dans <strong>Mes Prestations → modifier</strong>
                </div>
                <div style="font-size:.78rem;color:var(--text-muted)">SalonPro prélève 2,5% de frais plateforme sur chaque paiement en ligne.</div>
            `;
        } else {
            body.innerHTML = `
                <p style="font-size:.9rem;color:var(--text-sec);margin-bottom:16px">
                    Connectez votre compte Stripe pour <strong>recevoir des paiements en ligne</strong> et activer les acomptes anti-no-show directement sur votre page de réservation.
                </p>
                <ul style="font-size:.85rem;color:var(--text-muted);margin:0 0 20px 0;padding-left:1.2em;line-height:1.9">
                    <li>L'argent arrive <strong>directement</strong> sur votre compte bancaire</li>
                    <li>Acompte configurable par prestation (montant fixe ou %)</li>
                    <li>Frais plateforme : 2,5% sur chaque transaction</li>
                </ul>
                <button class="btn btn-primary" onclick="stripeConnectOnboard()" style="width:100%;justify-content:center">
                    🔗 Connecter mon compte Stripe
                </button>
                ${d.accountId ? `<div style="margin-top:10px;font-size:.78rem;color:var(--text-muted);text-align:center">Compte créé, en attente de validation Stripe</div>` : ''}
            `;
        }
    } catch (e) {
        body.innerHTML = `<div style="color:var(--danger);font-size:.85rem">Erreur de chargement</div>`;
    }
}

async function stripeConnectOnboard() {
    try {
        const res = await apiFetch(`${API}/api/pro/stripe/connect/onboard`, { method: 'POST' });
        const data = await res.json();
        if (data.success && data.data?.url) {
            window.location.href = data.data.url;
        } else {
            showToast(data.error || 'Erreur Stripe', 'error');
        }
    } catch (e) {
        showToast('Erreur de connexion', 'error');
    }
}

async function loadSettings() {
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}`);
        const data = await res.json();
        const salon = data.data || {};
        currentSalon = salon;
        loadSMSStatus(); // load SMS credits alongside settings

        const logoHtml = salon.logo
            ? `<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px"><img src="${salon.logo}" style="width:80px;height:80px;object-fit:cover;border-radius:14px;border:2px solid var(--border)"><div><div style="font-weight:600;margin-bottom:4px">Logo actuel</div><button class="btn btn-danger btn-sm" onclick="deleteLogo()">🗑 Supprimer</button></div></div>`
            : `<div style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">Aucun logo — le nom du salon sera affiché en texte</div>`;

        const hours = salon.hours || {};
        const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        const dayLabels = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

        const hoursRows = days.map(d => {
            const h = hours[d];
            const isClosed = !h || !h.open;
            return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                    <div style="width:100px;font-weight:600;font-size:.88rem">${dayLabels[d]}</div>
                    <label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-sec);cursor:pointer;min-width:70px">
                        <input type="checkbox" class="hours-check" data-day="${d}" ${!isClosed ? 'checked' : ''} onchange="toggleDay('${d}', this.checked)" style="accent-color:var(--primary)">
                        ${!isClosed ? 'Ouvert' : 'Fermé'}
                    </label>
                    <input type="time" id="hours-${d}-open" value="${h?.open || '09:00'}" class="form-input" style="width:110px;${isClosed ? 'opacity:.3;pointer-events:none' : ''}" />
                    <span style="color:var(--text-muted)">→</span>
                    <input type="time" id="hours-${d}-close" value="${h?.close || '19:00'}" class="form-input" style="width:110px;${isClosed ? 'opacity:.3;pointer-events:none' : ''}" />
                </div>
            `;
        }).join('');

        const container = document.getElementById('salonDetails');
        container.innerHTML = `
            <!-- LOGO -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>🖼 Logo du salon</h3></div>
                <div class="card-body">
                    ${logoHtml}
                    <div style="display:flex;align-items:center;gap:12px">
                        <input type="file" id="logoFile" accept="image/*" class="form-input" style="flex:1">
                        <button class="btn btn-primary btn-sm" onclick="uploadLogo()">📤 Uploader</button>
                    </div>
                    <div style="font-size:.75rem;color:var(--text-muted);margin-top:8px">Formats acceptés : JPG, PNG, WebP, SVG (max 5 Mo)</div>
                </div>
            </div>

            <!-- INFORMATIONS -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>🏪 Informations</h3></div>
                <div class="card-body">
                    <div class="form-group"><label class="form-label">Nom du salon</label><input class="form-input form-input-full" id="set-name" value="${salon.name || ''}" placeholder="Mon Salon"></div>
                    <div class="form-group"><label class="form-label">Description</label><input class="form-input form-input-full" id="set-description" value="${salon.description || ''}" placeholder="Salon de coiffure premium..."></div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap">
                        <div class="form-group" style="flex:1;min-width:200px"><label class="form-label">Adresse</label><input class="form-input form-input-full" id="set-address" value="${salon.address || ''}" placeholder="12 Rue du Style, Paris"></div>
                        <div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Téléphone</label><input class="form-input form-input-full" id="set-phone" value="${salon.phone || ''}" placeholder="06 12 34 56 78"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Email</label><input class="form-input form-input-full" id="set-email" value="${salon.email || ''}" placeholder="contact@monsalon.fr"></div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:.82rem;color:var(--text-muted)">
                        <span>🌐</span> Site web : <a href="/s/${salon.slug}" target="_blank" style="color:var(--primary);text-decoration:none;font-weight:600">/s/${salon.slug}</a>
                    </div>
                    <button class="btn btn-primary" onclick="saveInfo()" style="margin-top:16px">💾 Enregistrer les infos</button>
                </div>
            </div>

            <!-- BRANDING -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>🎨 Personnalisation du site</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">Couleur principale</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color1" value="${salon.branding?.primaryColor || '#6366F1'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabel1" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.primaryColor || '#6366F1'}</span>
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">Couleur accent</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color2" value="${salon.branding?.accentColor || '#818CF8'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabel2" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.accentColor || '#818CF8'}</span>
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">Couleur du texte</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color-text" value="${salon.branding?.textColor || '#F5F0E8'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabelText" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.textColor || '#F5F0E8'}</span>
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">Fond du site</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color-bg" value="${salon.branding?.backgroundColor || '#0a0a0f'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabelBg" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.backgroundColor || '#0a0a0f'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="colorPreview" style="padding:16px;border-radius:12px;margin-bottom:16px;text-align:center;font-weight:700;font-size:1rem;background:linear-gradient(135deg,${salon.branding?.primaryColor || '#6366F1'},${salon.branding?.accentColor || '#818CF8'});color:${salon.branding?.textColor || '#F5F0E8'}">
                        <span style="font-size:.8rem;opacity:.7;display:block;font-weight:400">Fond:</span>
                        <span id="previewBgDot" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${salon.branding?.backgroundColor || '#0a0a0f'};border:2px solid rgba(255,255,255,.3);margin-right:6px;vertical-align:middle"></span>
                        Aperçu de vos couleurs
                    </div>
                    <div class="form-group"><label class="form-label">Titre principal du site (hero)</label><input class="form-input form-input-full" id="set-heroTitle" value="${salon.branding?.heroTitle || ''}" placeholder="L'Art de la Coiffure Masculine"></div>
                    <div class="form-group"><label class="form-label">Sous-titre du site</label><input class="form-input form-input-full" id="set-heroSubtitle" value="${salon.branding?.heroSubtitle || ''}" placeholder="Excellence, style et précision"></div>
                    
                    <div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px">
                        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">
                            <div style="font-weight:600;font-size:.9rem">📊 Statistiques d'accroche (Hero)</div>
                            <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--text-sec);cursor:pointer">
                                <input type="checkbox" id="set-heroStatsHide" ${salon.branding?.heroStats?.hide ? 'checked' : ''}>
                                Masquer ces statistiques
                            </label>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">Valeur 1</label><input class="form-input form-input-full" id="set-stat1Value" value="${salon.branding?.heroStats?.stat1Value || '2500+'}" placeholder="2500+"></div>
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">Texte 1</label><input class="form-input form-input-full" id="set-stat1Label" value="${salon.branding?.heroStats?.stat1Label || 'Clients satisfaits'}" placeholder="Clients satisfaits"></div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">Valeur 2</label><input class="form-input form-input-full" id="set-stat2Value" value="${salon.branding?.heroStats?.stat2Value || '8+'}" placeholder="8+"></div>
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">Texte 2</label><input class="form-input form-input-full" id="set-stat2Label" value="${salon.branding?.heroStats?.stat2Label || 'Ann\u00e9es d\'exp\u00e9rience'}" placeholder="Années d'expérience"></div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">Valeur 3</label><input class="form-input form-input-full" id="set-stat3Value" value="${salon.branding?.heroStats?.stat3Value || '15+'}" placeholder="15+"></div>
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">Texte 3</label><input class="form-input form-input-full" id="set-stat3Label" value="${salon.branding?.heroStats?.stat3Label || 'Services uniques'}" placeholder="Services uniques"></div>
                        </div>
                    </div>

                    <div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px">
                        <div style="font-weight:600;margin-bottom:12px;font-size:.9rem">📱 Réseaux sociaux</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">📸 Instagram</label><input class="form-input form-input-full" id="set-instagram" value="${salon.branding?.instagram || ''}" placeholder="https://instagram.com/..."></div>
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">👥 Facebook</label><input class="form-input form-input-full" id="set-facebook" value="${salon.branding?.facebook || ''}" placeholder="https://facebook.com/..."></div>
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">🎵 TikTok</label><input class="form-input form-input-full" id="set-tiktok" value="${salon.branding?.tiktok || ''}" placeholder="https://tiktok.com/@..."></div>
                            <div class="form-group" style="margin-bottom:0"><label class="form-label">🎬 YouTube</label><input class="form-input form-input-full" id="set-youtube" value="${salon.branding?.youtube || ''}" placeholder="https://youtube.com/..."></div>
                        </div>
                        <div style="font-size:.75rem;color:var(--text-muted);margin-top:8px">Laissez vide pour ne pas afficher le réseau sur votre site.</div>
                    </div>
                    <button class="btn btn-primary" onclick="saveBranding()" style="margin-top:12px">🎨 Enregistrer le branding</button>
                </div>
            </div>

            <!-- GALERIE PHOTOS -->
            ${salon.subscription?.plan === 'starter' ? `
            <div class="card" style="margin-bottom:20px; position:relative; overflow:hidden">
                <div class="card-header"><h3>📸 Galerie Photos</h3></div>
                <div class="card-body" style="filter: blur(4px); opacity: 0.5; pointer-events: none;">
                    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
                        <div class="form-group" style="flex:2;margin-bottom:0"><label class="form-label">Image</label><input type="file" class="form-input form-input-full"></div>
                        <div class="form-group" style="flex:1;margin-bottom:0"><label class="form-label">Titre (optionnel)</label><input class="form-input form-input-full" placeholder="Coupe Fade..."></div>
                        <button class="btn btn-primary btn-sm" style="white-space:nowrap">📤 Ajouter</button>
                    </div>
                </div>
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(10,10,15,0.7); z-index:10;">
                    <span style="font-size:2rem; margin-bottom:8px">🔒</span>
                    <h4 style="margin-bottom:8px">Fonctionnalité Premium</h4>
                    <p style="font-size:.85rem; color:var(--text-sec); text-align:center; max-width:80%; margin-bottom:16px">Passez au Pack Pro pour créer votre propre galerie de réalisations.</p>
                </div>
            </div>
            ` : `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>📸 Galerie Photos</h3></div>
                <div class="card-body">
                    <p style="font-size:.85rem;color:var(--text-sec);margin-bottom:12px">Ajoutez des photos de vos réalisations. Elles seront affichées sur votre site public.</p>
                    <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:16px">
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">Image</label>
                            <input type="file" id="galleryFile" accept="image/*" class="form-input form-input-full">
                        </div>
                        <div style="display:flex;gap:10px;align-items:flex-end">
                            <div class="form-group" style="flex:1;margin-bottom:0">
                                <label class="form-label">Titre (optionnel)</label>
                                <input class="form-input form-input-full" id="galleryTitle" placeholder="Coupe Fade...">
                            </div>
                            <button class="btn btn-primary btn-sm" onclick="uploadGalleryPhoto()" style="white-space:nowrap;flex-shrink:0">📤 Ajouter</button>
                        </div>
                    </div>
                    <div id="galleryGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
                        ${(salon.gallery || []).map(p => `
                            <div style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:1;background:var(--bg-surface)">
                                <img src="${p.url}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover">
                                <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.8));padding:8px">
                                    <div style="font-size:.75rem;color:#fff;font-weight:500">${p.title || ''}</div>
                                </div>
                                <button onclick="deleteGalleryPhoto('${p._id}')" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,.9);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:.7rem">✕</button>
                            </div>
                        `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);font-size:.88rem">Aucune photo dans la galerie</div>'}
                    </div>
                </div>
            </div>
            `}

            <!-- TÉMOIGNAGES -->
            ${salon.subscription?.plan === 'starter' ? `
            <div class="card" style="margin-bottom:20px; position:relative; overflow:hidden">
                <div class="card-header"><h3>⭐ Témoignages / Avis</h3></div>
                <div class="card-body" style="filter: blur(4px); opacity: 0.5; pointer-events: none;">
                    <div style="background:var(--bg-surface);border-radius:12px;padding:16px;margin-bottom:10px;">
                        <div style="color:var(--primary);margin-bottom:4px">★★★★★</div>
                        <div style="font-size:.88rem;color:var(--text);margin-bottom:6px">"Super salon !"</div>
                    </div>
                </div>
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(10,10,15,0.7); z-index:10;">
                    <span style="font-size:2rem; margin-bottom:8px">🔒</span>
                    <h4 style="margin-bottom:8px">Fonctionnalité Premium</h4>
                    <p style="font-size:.85rem; color:var(--text-sec); text-align:center; max-width:80%; margin-bottom:16px">Passez au Pack Pro pour intégrer vos propres avis clients sur votre site vitrine.</p>
                </div>
            </div>
            ` : `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>⭐ Témoignages / Avis</h3><button class="btn btn-primary btn-sm" onclick="showAddTestimonial()">+ Ajouter un avis</button></div>
                <div class="card-body">
                    <p style="font-size:.85rem;color:var(--text-sec);margin-bottom:12px">Créez les avis qui seront affichés sur votre site. Vous contrôlez entièrement ce qui est visible.</p>
                    <div id="testimonialsList">
                        ${(salon.testimonials || []).map(t => `
                            <div style="background:var(--bg-surface);border-radius:12px;padding:16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start">
                                <div style="flex:1">
                                    <div style="color:var(--primary);font-size:.9rem;margin-bottom:4px">${'★'.repeat(t.stars)}${'☆'.repeat(5 - t.stars)}</div>
                                    <div style="font-size:.88rem;color:var(--text);margin-bottom:6px">"${t.text}"</div>
                                    <div style="font-size:.8rem;color:var(--text-sec)"><strong>${t.name}</strong> — ${t.role}</div>
                                </div>
                                <div style="display:flex;gap:6px;margin-left:12px">
                                    <button class="btn btn-sm btn-outline" onclick="editTestimonial('${t._id}')">✏️</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteTestimonial('${t._id}')">✕</button>
                                </div>
                            </div>
                        `).join('') || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:.88rem">Aucun avis configuré</div>'}
                    </div>
                </div>
            </div>
            `}

            <!-- HORAIRES -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>🕐 Horaires d'ouverture</h3></div>
                <div class="card-body">
                    ${hoursRows}
                    <button class="btn btn-primary" onclick="saveHours()" style="margin-top:16px">🕐 Enregistrer les horaires</button>
                </div>
            </div>

            <!-- CONGÉS / VACANCES -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>🏖 Congés & Fermetures</h3></div>
                <div class="card-body">
                    <p style="font-size:.85rem;color:var(--text-sec);margin-bottom:12px">Ajoutez les jours de fermeture exceptionnelle (vacances, jours fériés...). Ces jours seront grisés dans le calendrier de réservation.</p>
                    <div class="form-group">
                        <label class="form-label">Date de début</label>
                        <input type="date" class="form-input form-input-full" id="closedDateStart">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date de fin</label>
                        <input type="date" class="form-input form-input-full" id="closedDateEnd">
                    </div>
                    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px">
                        <div class="form-group" style="flex:1;margin-bottom:0">
                            <label class="form-label">Motif (optionnel)</label>
                            <input class="form-input form-input-full" id="closedDateReason" placeholder="Vacances d'été...">
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="addClosedDate()" style="white-space:nowrap;flex-shrink:0">+ Ajouter</button>
                    </div>
                    <div id="closedDatesList">${renderClosedDates(salon.closedDates || [])}</div>
                </div>
            </div>

            <!-- PAIEMENTS EN LIGNE -->
            <div class="card" style="margin-bottom:20px" id="stripeConnectCard">
                <div class="card-header"><h3>💳 Paiements en ligne</h3></div>
                <div class="card-body" id="stripeConnectBody">
                    <div style="text-align:center;color:var(--text-muted);font-size:.85rem">Chargement…</div>
                </div>
            </div>

            <!-- SMS -->
            <div class="card" style="margin-bottom:20px" id="smsCard">
                <div class="card-header"><h3>📱 Crédits SMS</h3></div>
                <div class="card-body" id="smsCardBody">
                    <div style="text-align:center;color:var(--text-muted);font-size:.85rem">Chargement…</div>
                </div>
            </div>

            <!-- ABONNEMENT -->
            <div class="card">
                <div class="card-header"><h3>📋 Abonnement</h3></div>
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-tile"><span class="info-tile-icon">💳</span><div><div class="info-tile-label">Plan</div><div class="info-tile-value" style="text-transform:capitalize">${salon.subscription?.plan || 'standard'}</div></div></div>
                        <div class="info-tile"><span class="info-tile-icon">✅</span><div><div class="info-tile-label">Statut</div><div class="info-tile-value"><span class="badge badge-active">${salon.subscription?.status || 'active'}</span></div></div></div>
                        <div class="info-tile"><span class="info-tile-icon">💰</span><div><div class="info-tile-label">Prix</div><div class="info-tile-value">${salon.subscription?.price ?? 49.90} CHF/mois</div></div></div>
                    </div>
                    ${salon.subscription?.stripeCustomerId ? `
                    <div style="margin-top: 20px;">
                        <button class="btn btn-outline" onclick="manageSubscription()" style="width:100%; justify-content:center;">
                            ⚙️ Gérer mon abonnement sur Stripe
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Appelé APRÈS le rendu HTML — l'élément #stripeConnectBody existe maintenant
        loadStripeConnect(salon.subscription?.plan);

    } catch (e) { console.error(e); }
}

// ---- Save Info ----
async function saveInfo() {
    const updates = {
        name: document.getElementById('set-name').value.trim(),
        description: document.getElementById('set-description').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        phone: document.getElementById('set-phone').value.trim(),
        email: document.getElementById('set-email').value.trim(),
    };
    if (!updates.name) return showToast('Le nom du salon est obligatoire', 'error');
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (data.success) {
            currentSalon = data.data;
            showToast('Informations enregistrées ✅');
            // Update sidebar name
            const name = updates.name;
            const words = name.split(' ');
            document.getElementById('sidebarSalonName').innerHTML = words[0] + (words.length > 1 ? ' <span>' + words.slice(1).join(' ') + '</span>' : '');
        } else {
            showToast('Erreur lors de la sauvegarde', 'error');
        }
    } catch (e) { showToast('Erreur de connexion', 'error'); }
}

// ---- Save Branding ----
async function saveBranding() {
    const branding = {
        primaryColor: document.getElementById('set-color1').value,
        accentColor: document.getElementById('set-color2').value,
        heroTitle: document.getElementById('set-heroTitle').value.trim(),
        heroSubtitle: document.getElementById('set-heroSubtitle').value.trim(),
        textColor: document.getElementById('set-color-text').value,
        backgroundColor: document.getElementById('set-color-bg')?.value || '#0a0a0f',
        instagram: document.getElementById('set-instagram').value.trim(),
        facebook: document.getElementById('set-facebook').value.trim(),
        tiktok: document.getElementById('set-tiktok').value.trim(),
        youtube: document.getElementById('set-youtube').value.trim(),
        heroStats: {
            stat1Value: document.getElementById('set-stat1Value').value.trim() || '2500+',
            stat1Label: document.getElementById('set-stat1Label').value.trim() || 'Clients satisfaits',
            stat2Value: document.getElementById('set-stat2Value').value.trim() || '8+',
            stat2Label: document.getElementById('set-stat2Label').value.trim() || 'Ann\u00e9es d\'exp\u00e9rience',
            stat3Value: document.getElementById('set-stat3Value').value.trim() || '15+',
            stat3Label: document.getElementById('set-stat3Label').value.trim() || 'Services uniques',
            hide: document.getElementById('set-heroStatsHide').checked
        }
    };
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/branding`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branding)
        });
        const data = await res.json();
        if (data.success) {
            currentSalon = data.data;
            showToast('Branding enregistré ✅');
        } else {
            showToast('Erreur', 'error');
        }
    } catch (e) { showToast('Erreur de connexion', 'error'); }
}

async function manageSubscription() {
    try {
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Chargement...';
        btn.disabled = true;

        const res = await apiFetch(`${API}/api/stripe/portal/session`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success && data.data?.url) {
            window.location.href = data.data.url;
        } else {
            showToast(data.error || 'Erreur lors de la connexion à Stripe', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    }
}

function updateColorPreview() {
    const c1 = document.getElementById('set-color1').value;
    const c2 = document.getElementById('set-color2').value;
    const cText = document.getElementById('set-color-text').value;
    const cBg = document.getElementById('set-color-bg')?.value;
    document.getElementById('colorLabel1').textContent = c1;
    document.getElementById('colorLabel2').textContent = c2;
    document.getElementById('colorLabelText').textContent = cText;
    if (cBg) document.getElementById('colorLabelBg').textContent = cBg;
    const prev = document.getElementById('colorPreview');
    prev.style.background = `linear-gradient(135deg,${c1},${c2})`;
    prev.style.color = cText;
    const dot = document.getElementById('previewBgDot');
    if (dot && cBg) dot.style.background = cBg;
}

// ---- Save Hours ----
function toggleDay(day, checked) {
    const open = document.getElementById(`hours-${day}-open`);
    const close = document.getElementById(`hours-${day}-close`);
    const label = event.currentTarget.parentElement;
    open.style.opacity = checked ? '1' : '.3';
    open.style.pointerEvents = checked ? 'auto' : 'none';
    close.style.opacity = checked ? '1' : '.3';
    close.style.pointerEvents = checked ? 'auto' : 'none';
    label.querySelector('input').nextSibling.textContent = checked ? ' Ouvert' : ' Fermé';
}

async function saveHours() {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const newHours = {};
    days.forEach(d => {
        const cb = document.querySelector(`.hours-check[data-day="${d}"]`);
        const isOpen = cb && cb.checked;
        newHours[d] = {
            open: isOpen,
            openTime: isOpen ? document.getElementById(`hours-${d}-open`).value : '09:00',
            closeTime: isOpen ? document.getElementById(`hours-${d}-close`).value : '19:00',
        };
    });

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/hours`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newHours)
        });
        const data = await res.json();
        if (data.success) {
            currentSalon = data.data;
            showToast('Horaires enregistrés ✅');
        } else {
            showToast('Erreur', 'error');
        }
    } catch (e) { showToast('Erreur de connexion', 'error'); }
}

// ---- Closed Dates (Vacances/Congés) ----
function renderClosedDates(dates) {
    if (!dates || dates.length === 0) {
        return '<div style="font-size:.85rem;color:var(--text-muted);padding:12px;text-align:center">Aucune fermeture exceptionnelle programmée</div>';
    }
    return dates.map((d, i) => {
        const start = new Date(d.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        const end = new Date(d.end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        const isPast = new Date(d.end) < new Date();
        return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);${isPast ? 'opacity:.5' : ''}">
                <span style="font-size:1.2rem">🏖</span>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:.88rem">${start}${d.start !== d.end ? ' → ' + end : ''}</div>
                    <div style="font-size:.8rem;color:var(--text-muted)">${d.reason || 'Fermeture exceptionnelle'}</div>
                </div>
                ${isPast ? '<span class="badge" style="background:var(--bg-alt);color:var(--text-muted);font-size:.7rem">Passé</span>' : '<span class="badge badge-pending" style="font-size:.7rem">À venir</span>'}
                <button class="btn btn-danger btn-sm" onclick="removeClosedDate(${i})">🗑</button>
            </div>
        `;
    }).join('');
}

async function addClosedDate() {
    const start = document.getElementById('closedDateStart').value;
    const end = document.getElementById('closedDateEnd').value || start;
    const reason = document.getElementById('closedDateReason').value.trim();
    if (!start) { showToast('Sélectionnez au moins la date de début', 'error'); return; }

    const closedDates = [...(currentSalon.closedDates || []), { start, end, reason }];
    closedDates.sort((a, b) => a.start.localeCompare(b.start));

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/closed-dates`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(closedDates)
        });
        const data = await res.json();
        if (data.success) {
            currentSalon = data.data;
            document.getElementById('closedDatesList').innerHTML = renderClosedDates(closedDates);
            document.getElementById('closedDateStart').value = '';
            document.getElementById('closedDateEnd').value = '';
            document.getElementById('closedDateReason').value = '';
            showToast('Fermeture ajoutée ✅');
        }
    } catch (e) { showToast('Erreur de connexion', 'error'); }
}

async function removeClosedDate(idx) {
    const dates = (currentSalon.closedDates || []).filter((_, i) => i !== idx);

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/closed-dates`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dates)
        });
        const data = await res.json();
        if (data.success) {
            currentSalon = data.data;
            document.getElementById('closedDatesList').innerHTML = renderClosedDates(dates);
            showToast('Fermeture supprimée');
        }
    } catch (e) { showToast('Erreur de connexion', 'error'); }
}

// ---- Logo Upload ----
async function uploadLogo() {
    const fileInput = document.getElementById('logoFile');
    if (!fileInput.files[0]) return showToast('Sélectionnez un fichier', 'error');

    const formData = new FormData();
    formData.append('logo', fileInput.files[0]);

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/logo`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('Logo uploadé ! ✅');
            loadSettings();
        } else {
            showToast(data.error || 'Erreur upload', 'error');
        }
    } catch (e) {
        showToast('Erreur de connexion', 'error');
    }
}

async function deleteLogo() {
    if (!confirm('Supprimer le logo ?')) return;
    await apiFetch(`${API}/api/pro/salon/${salonId}/logo`, { method: 'DELETE' });
    showToast('Logo supprimé');
    loadSettings();
}

// ---- Gallery ----
async function uploadGalleryPhoto() {
    const fileInput = document.getElementById('galleryFile');
    if (!fileInput.files[0]) return showToast('Sélectionnez une image', 'error');

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('title', document.getElementById('galleryTitle').value || '');

    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/gallery`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('Photo ajoutée ! 📸');
            loadSettings();
        } else {
            showToast(data.error || 'Erreur upload', 'error');
        }
    } catch (e) {
        showToast('Erreur de connexion', 'error');
    }
}

async function deleteGalleryPhoto(photoId) {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/gallery/${photoId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Photo supprimée');
            loadSettings();
        }
    } catch (e) { showToast('Erreur', 'error'); }
}

// ---- Testimonials ----
function showAddTestimonial(existing = null) {
    const isEdit = !!existing;
    const modal = document.getElementById('modal');
    modal.querySelector('.modal-header h3').textContent = isEdit ? 'Modifier l\'avis' : 'Ajouter un avis';
    modal.querySelector('.modal-body').innerHTML = `
        <div class="form-group">
            <label class="form-label">Nom du client</label>
            <input class="form-input form-input-full" id="tName" value="${existing?.name || ''}" placeholder="Jean D.">
        </div>
        <div class="form-group">
            <label class="form-label">Avis / Témoignage</label>
            <textarea class="form-input form-input-full" id="tText" rows="3" placeholder="Un service exceptionnel...">${existing?.text || ''}</textarea>
        </div>
        <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
                <label class="form-label">Étoiles</label>
                <select class="form-input form-input-full" id="tStars">
                    ${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${(existing?.stars || 5) === n ? 'selected' : ''}>${'★'.repeat(n)}${'☆'.repeat(5 - n)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="flex:1">
                <label class="form-label">Rôle / Description</label>
                <input class="form-input form-input-full" id="tRole" value="${existing?.role || ''}" placeholder="Client régulier">
            </div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="submitTestimonial('${existing?._id || ''}')">${isEdit ? '💾 Modifier' : '➕ Ajouter'}</button>
    `;
    modal.classList.add('active');
}

async function submitTestimonial(id) {
    const body = {
        name: document.getElementById('tName').value.trim(),
        text: document.getElementById('tText').value.trim(),
        stars: parseInt(document.getElementById('tStars').value),
        role: document.getElementById('tRole').value.trim() || 'Client',
    };
    if (!body.name || !body.text) return showToast('Remplissez le nom et l\'avis', 'error');

    try {
        const url = id ? `${API}/api/pro/salon/${salonId}/testimonials/${id}` : `${API}/api/pro/salon/${salonId}/testimonials`;
        const method = id ? 'PUT' : 'POST';
        const res = await apiFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
            closeModal();
            showToast(id ? 'Avis modifié ✅' : 'Avis ajouté ✅');
            loadSettings();
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (e) { showToast('Erreur de connexion', 'error'); }
}

function editTestimonial(id) {
    const t = (currentSalon.testimonials || []).find(t => t._id === id);
    if (t) showAddTestimonial(t);
}

async function deleteTestimonial(id) {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
        const res = await apiFetch(`${API}/api/pro/salon/${salonId}/testimonials/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Avis supprimé');
            loadSettings();
        }
    } catch (e) { showToast('Erreur', 'error'); }
}

// ---- Utils ----
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function statusLabel(status) {
    const map = { confirmed: 'Confirmé', pending: 'En attente', cancelled: 'Annulé', completed: 'Terminé' };
    return map[status] || status || 'Confirmé';
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Enter key on login
document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('loginEmail').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});

// Magic Login & Persistent Session
document.addEventListener('DOMContentLoaded', () => {
    const magic = localStorage.getItem('magic_login');
    const sessionStr = localStorage.getItem('proSession');
    
    if (magic) {
        localStorage.removeItem('magic_login');
        try {
            const data = JSON.parse(magic);
            token = data.token;
            currentUser = data.user;
            salonId = data.user.salonId;
            currentSalon = data.salon;
            
            // Overwrite normal session with magic user
            localStorage.setItem('proSession', JSON.stringify({ token, user: currentUser, salonId, salon: currentSalon }));
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'flex';
            initApp();
        } catch (e) {
            console.error('Magic login failed', e);
        }
    } else if (sessionStr) {
        try {
            const data = JSON.parse(sessionStr);
            token = data.token;
            currentUser = data.user;
            salonId = data.user.salonId;
            currentSalon = data.salon;
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'flex';
            initApp();

            // Handle URL redirects
            const urlP = new URLSearchParams(window.location.search);
            if (urlP.get('sms_success') === '1') {
                window.history.replaceState({}, '', '/pro');
                setTimeout(() => { showPage('settings'); showToast('✅ Crédits SMS ajoutés !'); }, 500);
            } else if (urlP.get('sms_cancel') === '1') {
                window.history.replaceState({}, '', '/pro');
            } else if (urlP.get('stripe_connect') === 'success') {
                window.history.replaceState({}, '', '/pro');
                setTimeout(() => { showPage('settings'); showToast('✅ Stripe connecté ! Votre compte bancaire est lié.'); }, 500);
            } else if (urlP.get('stripe_connect') === 'refresh') {
                window.history.replaceState({}, '', '/pro');
                setTimeout(() => { showPage('settings'); showToast('Connexion Stripe à finaliser — relancez le processus.', 'error'); }, 500);
            }
        } catch (e) {
            console.error('Session restore failed', e);
            localStorage.removeItem('proSession');
        }
    }
});

// ============================================================
//  FORGOT / RESET PASSWORD
// ============================================================
function openForgotModal() {
    const m = document.getElementById('forgotModal');
    m.style.display = 'flex';
    document.getElementById('forgotEmail').value = '';
    setForgotMsg('', '');
    document.getElementById('forgotSubmitBtn').textContent = 'Envoyer le lien';
    document.getElementById('forgotSubmitBtn').disabled = false;
}
function closeForgotModal() {
    document.getElementById('forgotModal').style.display = 'none';
}

async function submitForgotPassword() {
    const email = (document.getElementById('forgotEmail').value || '').trim();
    const btn = document.getElementById('forgotSubmitBtn');
    if (!email) { setForgotMsg('Veuillez entrer votre email.', 'error'); return; }
    btn.textContent = 'Envoi…'; btn.disabled = true;
    try {
        await fetch('/api/pro/forgot-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        setForgotMsg('✅ Si un compte existe pour cet email, un lien vous a été envoyé. Vérifiez vos spams.', 'success');
        btn.textContent = 'Email envoyé';
    } catch {
        setForgotMsg('Erreur de connexion. Réessayez.', 'error');
        btn.textContent = 'Envoyer le lien'; btn.disabled = false;
    }
}

function setForgotMsg(msg, type) {
    const el = document.getElementById('forgotMsg');
    if (!msg) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.background = type === 'success' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)';
    el.style.border = type === 'success' ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(239,68,68,.3)';
    el.style.color = type === 'success' ? '#22c55e' : '#ef4444';
    el.textContent = msg;
}

async function submitResetPassword() {
    const password = document.getElementById('resetPassword').value || '';
    const confirm = document.getElementById('resetPasswordConfirm').value || '';
    const btn = document.getElementById('resetSubmitBtn');
    const urlToken = new URLSearchParams(window.location.search).get('reset_token');
    const msgEl = document.getElementById('resetMsg');

    if (password.length < 6) { setResetMsg('Minimum 6 caractères.', 'error'); return; }
    if (password !== confirm) { setResetMsg('Les mots de passe ne correspondent pas.', 'error'); return; }
    btn.textContent = 'Enregistrement…'; btn.disabled = true;
    try {
        const res = await fetch('/api/pro/reset-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: urlToken, password })
        });
        const data = await res.json();
        if (data.success) {
            setResetMsg('✅ Mot de passe modifié ! Redirection…', 'success');
            setTimeout(() => { window.history.replaceState({}, '', '/pro'); location.reload(); }, 2000);
        } else {
            setResetMsg(data.error || 'Lien invalide ou expiré.', 'error');
            btn.textContent = 'Enregistrer'; btn.disabled = false;
        }
    } catch {
        setResetMsg('Erreur de connexion. Réessayez.', 'error');
        btn.textContent = 'Enregistrer'; btn.disabled = false;
    }
}

function setResetMsg(msg, type) {
    const el = document.getElementById('resetMsg');
    el.style.display = 'block';
    el.style.background = type === 'success' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)';
    el.style.border = type === 'success' ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(239,68,68,.3)';
    el.style.color = type === 'success' ? '#22c55e' : '#ef4444';
    el.textContent = msg;
}

// Show reset modal if ?reset_token= in URL
(function checkResetToken() {
    const token = new URLSearchParams(window.location.search).get('reset_token');
    if (token) {
        window.addEventListener('DOMContentLoaded', () => {
            const m = document.getElementById('resetModal');
            if (m) m.style.display = 'flex';
        });
    }
})();
