/* ============================================
   BARBER PRO - Espace Barbier JS
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
        const res = await fetch(`${API}/api/barber/login`, {
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
            // Hide specific menu items for employees
            const linksToHide = ['dashboard', 'clients', 'employees', 'services', 'settings'];
            linksToHide.forEach(pageId => {
                const link = sidebarNav.querySelector(`a[onclick="showPage('${pageId}')"]`);
                if (link) link.style.display = 'none';
            });
            showPage('bookings');
        } else {
            // Show all
            Array.from(sidebarNav.querySelectorAll('a')).forEach(a => a.style.display = 'flex');
            showPage('dashboard');
        }
    }
    loadDashboard();
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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const titles = { dashboard: 'Tableau de bord', bookings: 'Rendez-vous', clients: 'Mes Clients', employees: 'Mon Équipe', services: 'Mes Prestations', settings: 'Mon Salon' };
    document.getElementById('topbarTitle').textContent = titles[page] || page;

    if (page === 'dashboard') loadDashboard();
    else if (page === 'bookings') loadBookings();
    else if (page === 'clients') loadClients();
    else if (page === 'employees') loadEmployees();
    else if (page === 'services') loadServices();
    else if (page === 'settings') loadSettings();

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ---- Dashboard ----
async function loadDashboard() {
    try {
        const [statsRes, bookingsRes] = await Promise.all([
            apiFetch(`${API}/api/barber/salon/${salonId}/stats`),
            apiFetch(`${API}/api/barber/salon/${salonId}/bookings?date=${todayStr()}`)
        ]);
        const stats = (await statsRes.json()).data || {};
        const bookings = (await bookingsRes.json()).data || [];

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
    }
}

// ---- Bookings ----
async function loadBookings() {
    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/bookings`);
        const data = await res.json();
        const bookings = data.data || [];

        const container = document.getElementById('bookingsList');
        if (bookings.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Aucun rendez-vous</div></div>';
        } else {
            container.innerHTML = '<div class="data-grid">' + bookings.map(b => `
                <div class="data-card">
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
    } catch (e) { console.error(e); }
}

// ---- Manual Booking (phone call, walk-in) ----
async function showAddBooking() {
    // Fetch services and employees
    let services = [], employees = [];
    try {
        const [svcRes, empRes] = await Promise.all([
            apiFetch(`${API}/api/barber/salon/${salonId}/services`),
            apiFetch(`${API}/api/barber/salon/${salonId}/employees`),
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
        <div class="form-row">
            <div class="form-group" style="flex:1"><label class="form-label">Nom du client *</label>
                <input class="form-input form-input-full" id="mbClientName" placeholder="Nom complet">
            </div>
            <div class="form-group" style="flex:1"><label class="form-label">Téléphone</label>
                <input class="form-input form-input-full" id="mbClientPhone" placeholder="06 12 34 56 78">
            </div>
        </div>
        <div class="form-group"><label class="form-label">Email (optionnel)</label>
            <input type="email" class="form-input form-input-full" id="mbClientEmail" placeholder="client@email.com">
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
        await apiFetch(`${API}/api/barber/salon/${salonId}/bookings`, {
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/clients`);
        const data = await res.json();
        const clients = data.data || [];

        const container = document.getElementById('clientsList');
        if (clients.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Aucun client pour le moment</div></div>';
        } else {
            container.innerHTML = '<div class="data-grid">' + clients.map(c => `
                <div class="data-card">
                    <div class="data-card-icon" style="background:linear-gradient(135deg,var(--primary),#A07D4A);color:var(--bg);font-weight:700;font-size:16px">${(c.name || '?')[0].toUpperCase()}</div>
                    <div class="data-card-info">
                        <div class="data-card-name">${c.name}</div>
                        <div class="data-card-sub">${c.email || ''} ${c.phone ? '· ' + c.phone : ''}</div>
                    </div>
                    <div class="data-card-right">
                        <div class="data-card-value">${c.totalBookings ?? 0}</div>
                        <div class="data-card-label">visites</div>
                    </div>
                </div>
            `).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
}

// ---- Employees ----
async function loadEmployees() {
    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/employees`);
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
                    <div><span class="badge badge-active">${e.role === 'owner' ? 'Propriétaire' : 'Employé'}</span></div>
                    <div>
                        <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e._id}', '${e.role || 'employee'}')">🗑</button>
                    </div>
                </div>
            `).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
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

    const res = await apiFetch(`${API}/api/barber/salon/${salonId}/employees`, {
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
    const res = await apiFetch(`${API}/api/barber/salon/${salonId}/employees/${id}?role=${role}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
    }
    loadEmployees();
    showToast('Membre supprimé');
}

// ---- Services ----
async function loadServices() {
    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/services`);
        const data = await res.json();
        const svcs = data.data || [];

        const container = document.getElementById('servicesList');
        if (svcs.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💈</div><div class="empty-state-text">Aucune prestation</div></div>';
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
        <div class="form-group"><label class="form-label">Icône (emoji)</label><input class="form-input form-input-full" id="svcIcon" value="✂️" placeholder="✂️"></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input form-input-full" id="svcDesc" placeholder="Description courte"></div>
        <div class="form-group">
            <label class="form-label">Assigner à (laisser vide = tous)</label>
            <div id="svcEmployeesList"><div style="margin-top:10px;font-size:0.9rem;color:var(--text-sec)">Chargement des employés...</div></div>
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="addService()">Ajouter</button>
    `;
    document.getElementById('modal').classList.add('active');

    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/employees`);
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

async function addService() {
    const name = document.getElementById('svcName').value.trim();
    const price = parseInt(document.getElementById('svcPrice').value) || 0;
    const duration = parseInt(document.getElementById('svcDuration').value) || 30;
    const icon = document.getElementById('svcIcon').value.trim() || '✂️';
    const description = document.getElementById('svcDesc').value.trim();
    const assignedEmployees = Array.from(document.querySelectorAll('.svc-emp-cb:checked')).map(cb => cb.value);

    if (!name) return;

    await apiFetch(`${API}/api/barber/salon/${salonId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, duration, icon, description, assignedEmployees })
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
        <div class="form-group"><label class="form-label">Icône (emoji)</label><input class="form-input form-input-full" id="svcIcon" value="${svc.icon}"></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input form-input-full" id="svcDesc" value="${svc.description}"></div>
        <div class="form-group">
            <label class="form-label">Assigner à (laisser vide = tous)</label>
            <div id="svcEmployeesList"><div style="margin-top:10px;font-size:0.9rem;color:var(--text-sec)">Chargement des employés...</div></div>
        </div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="editService('${svc._id}')">Enregistrer</button>
    `;
    document.getElementById('modal').classList.add('active');

    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/employees`);
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

    if (!name) return;

    await apiFetch(`${API}/api/barber/salon/${salonId}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, duration, icon, description, assignedEmployees })
    });
    closeModal();
    loadServices();
    showToast('Prestation modifiée ✅');
}

async function deleteService(id) {
    if (!confirm('Supprimer cette prestation ?')) return;
    await apiFetch(`${API}/api/barber/salon/${salonId}/services/${id}`, { method: 'DELETE' });
    loadServices();
    showToast('Prestation supprimée');
}

// ---- Settings ----
async function loadSettings() {
    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}`);
        const data = await res.json();
        const salon = data.data || {};
        currentSalon = salon;

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
                    <div style="display:flex;gap:12px">
                        <div class="form-group" style="flex:1"><label class="form-label">Adresse</label><input class="form-input form-input-full" id="set-address" value="${salon.address || ''}" placeholder="12 Rue du Style, Paris"></div>
                        <div class="form-group" style="flex:1"><label class="form-label">Téléphone</label><input class="form-input form-input-full" id="set-phone" value="${salon.phone || ''}" placeholder="06 12 34 56 78"></div>
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
                    <div style="display:flex;gap:12px;margin-bottom:12px">
                        <div class="form-group" style="flex:1">
                            <label class="form-label">Couleur principale</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color1" value="${salon.branding?.primaryColor || '#6366F1'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabel1" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.primaryColor || '#6366F1'}</span>
                            </div>
                        </div>
                        <div class="form-group" style="flex:1">
                            <label class="form-label">Couleur accent</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color2" value="${salon.branding?.accentColor || '#818CF8'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabel2" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.accentColor || '#818CF8'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="colorPreview" style="padding:16px;border-radius:12px;margin-bottom:16px;text-align:center;font-weight:700;font-size:1rem;background:linear-gradient(135deg,${salon.branding?.primaryColor || '#6366F1'},${salon.branding?.accentColor || '#818CF8'});color:#fff">
                        Aperçu de vos couleurs
                    </div>
                    <div class="form-group"><label class="form-label">Titre principal du site (hero)</label><input class="form-input form-input-full" id="set-heroTitle" value="${salon.branding?.heroTitle || ''}" placeholder="L'Art de la Coiffure Masculine"></div>
                    <div class="form-group"><label class="form-label">Sous-titre du site</label><input class="form-input form-input-full" id="set-heroSubtitle" value="${salon.branding?.heroSubtitle || ''}" placeholder="Excellence, style et précision"></div>
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
                    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px">
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
                    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px">
                        <div class="form-group" style="flex:2;margin-bottom:0">
                            <label class="form-label">Image</label>
                            <input type="file" id="galleryFile" accept="image/*" class="form-input form-input-full">
                        </div>
                        <div class="form-group" style="flex:1;margin-bottom:0">
                            <label class="form-label">Titre (optionnel)</label>
                            <input class="form-input form-input-full" id="galleryTitle" placeholder="Coupe Fade...">
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="uploadGalleryPhoto()" style="white-space:nowrap">📤 Ajouter</button>
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
                    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px">
                        <div class="form-group" style="flex:1;margin-bottom:0">
                            <label class="form-label">Date de début</label>
                            <input type="date" class="form-input form-input-full" id="closedDateStart">
                        </div>
                        <div class="form-group" style="flex:1;margin-bottom:0">
                            <label class="form-label">Date de fin</label>
                            <input type="date" class="form-input form-input-full" id="closedDateEnd">
                        </div>
                        <div class="form-group" style="flex:1;margin-bottom:0">
                            <label class="form-label">Motif (optionnel)</label>
                            <input class="form-input form-input-full" id="closedDateReason" placeholder="Vacances d'été...">
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="addClosedDate()" style="white-space:nowrap">+ Ajouter</button>
                    </div>
                    <div id="closedDatesList">${renderClosedDates(salon.closedDates || [])}</div>
                </div>
            </div>

            <!-- SMS -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h3>📱 Rappels SMS</h3><span class="badge badge-pending">En développement</span></div>
                <div class="card-body">
                    <div style="display:flex;align-items:flex-start;gap:16px;padding:12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px">
                        <span style="font-size:28px">🔔</span>
                        <div>
                            <div style="font-weight:600;margin-bottom:4px">Rappels SMS automatiques</div>
                            <div style="font-size:.85rem;color:var(--text-sec)">Les rappels SMS seront envoyés automatiquement 24h et 1h avant chaque rendez-vous. Cette fonctionnalité sera disponible prochainement.</div>
                            <div style="margin-top:10px;font-size:.8rem;color:var(--text-muted)">Statut : <span class="badge badge-pending">${salon.smsReminders?.status || 'En développement'}</span></div>
                        </div>
                    </div>
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
                </div>
            </div>
        `;
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}`, {
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
        instagram: document.getElementById('set-instagram').value.trim(),
        facebook: document.getElementById('set-facebook').value.trim(),
        tiktok: document.getElementById('set-tiktok').value.trim(),
        youtube: document.getElementById('set-youtube').value.trim(),
    };
    try {
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/branding`, {
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

function updateColorPreview() {
    const c1 = document.getElementById('set-color1').value;
    const c2 = document.getElementById('set-color2').value;
    document.getElementById('colorLabel1').textContent = c1;
    document.getElementById('colorLabel2').textContent = c2;
    document.getElementById('colorPreview').style.background = `linear-gradient(135deg,${c1},${c2})`;
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/hours`, {
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/closed-dates`, {
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/closed-dates`, {
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/logo`, {
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
    await apiFetch(`${API}/api/barber/salon/${salonId}/logo`, { method: 'DELETE' });
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/gallery`, {
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/gallery/${photoId}`, { method: 'DELETE' });
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
        const url = id ? `${API}/api/barber/salon/${salonId}/testimonials/${id}` : `${API}/api/barber/salon/${salonId}/testimonials`;
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
        const res = await apiFetch(`${API}/api/barber/salon/${salonId}/testimonials/${id}`, { method: 'DELETE' });
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

// Magic Login from Admin
document.addEventListener('DOMContentLoaded', () => {
    const magic = localStorage.getItem('magic_login');
    if (magic) {
        localStorage.removeItem('magic_login');
        try {
            const data = JSON.parse(magic);
            token = data.token;
            currentUser = data.user;
            salonId = data.user.salonId;
            currentSalon = data.salon;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'flex';
            initApp();
        } catch (e) {
            console.error('Magic login failed', e);
        }
    }
});
