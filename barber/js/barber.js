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
    if (currentSalon?.slug) {
        document.getElementById('salonWebLink').href = `/s/${currentSalon.slug}`;
    }

    loadDashboard();
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

        document.getElementById('dashStats').innerHTML = `
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
    const renderEmpOptions = (serviceName) => {
        if (employees.length === 0) return '<option value="">Aucun employé</option>';
        const validEmps = employees.filter(e => {
            if (!serviceName) return true;
            if (!e.specialties || e.specialties.length === 0) return true;
            return e.specialties.some(s => s.toLowerCase() === serviceName.toLowerCase());
        });
        if (validEmps.length === 0) return '<option value="">— Aucun pro pour cette prestation —</option>';
        return '<option value="">— Non assigné —</option>' + validEmps.map(e => `<option value="${e._id}" data-name="${e.name}">${e.name}</option>`).join('');
    };

    const initialService = services.length > 0 ? services[0].name : null;
    const empOptions = renderEmpOptions(initialService);

    document.getElementById('modalTitle').textContent = '📅 Ajouter un rendez-vous';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label class="form-label">Prestation</label>
            <select class="form-input form-input-full" id="mbService" onchange="document.getElementById('mbEmployee') ? document.getElementById('mbEmployee').innerHTML = renderEmpOptions(this.value) : null">${svcOptions}</select>
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
                    <div><span class="badge badge-active">Actif</span></div>
                    <div>
                        <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e._id}')">🗑</button>
                    </div>
                </div>
            `).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
}

function showAddEmployee() {
    document.getElementById('modalTitle').textContent = 'Ajouter un employé';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label class="form-label">Nom</label><input class="form-input form-input-full" id="empName" placeholder="Prénom Nom"></div>
        <div class="form-group"><label class="form-label">Email (pour la connexion)</label><input type="email" class="form-input form-input-full" id="empEmail" placeholder="employe@salon.com"></div>
        <div class="form-group"><label class="form-label">Mot de passe provisoire</label><input type="text" class="form-input form-input-full" id="empPassword" placeholder="motdepasse123"></div>
        <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input form-input-full" id="empPhone" placeholder="06XXXXXXXX"></div>
        <div class="form-group"><label class="form-label">Prestations (séparées par virgule)</label><input class="form-input form-input-full" id="empSpecs" placeholder="Coupe, Barbe, Coloration"></div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="addEmployee()">Ajouter</button>
    `;
    document.getElementById('modal').classList.add('active');
}

async function addEmployee() {
    const name = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const password = document.getElementById('empPassword').value.trim();
    const phone = document.getElementById('empPhone').value.trim();
    const specs = document.getElementById('empSpecs').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!name) return;

    await apiFetch(`${API}/api/barber/salon/${salonId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, specialties: specs })
    });
    closeModal();
    loadEmployees();
    showToast('Employé ajouté ✅');
}

async function deleteEmployee(id) {
    if (!confirm('Voulez-vous vraiment supprimer cet employé ?')) return;
    await apiFetch(`${API}/api/barber/salon/${salonId}/employees/${id}`, { method: 'DELETE' });
    loadEmployees();
    showToast('Employé supprimé');
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
                    <div>
                        <button class="btn btn-danger btn-sm" onclick="deleteService('${s._id}')">🗑</button>
                    </div>
                </div>
            `).join('') + '</div>';
        }
    } catch (e) { console.error(e); }
}

function showAddService() {
    document.getElementById('modalTitle').textContent = 'Ajouter une prestation';
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label class="form-label">Nom</label><input class="form-input form-input-full" id="svcName" placeholder="Coupe Classique"></div>
        <div class="form-row">
            <div class="form-group" style="flex:1"><label class="form-label">Prix (CHF)</label><input type="number" class="form-input form-input-full" id="svcPrice" placeholder="25"></div>
            <div class="form-group" style="flex:1"><label class="form-label">Durée (min)</label><input type="number" class="form-input form-input-full" id="svcDuration" placeholder="30"></div>
        </div>
        <div class="form-group"><label class="form-label">Icône (emoji)</label><input class="form-input form-input-full" id="svcIcon" value="✂️" placeholder="✂️"></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input form-input-full" id="svcDesc" placeholder="Description courte"></div>
    `;
    document.getElementById('modalFooter').innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="addService()">Ajouter</button>
    `;
    document.getElementById('modal').classList.add('active');
}

async function addService() {
    const name = document.getElementById('svcName').value.trim();
    const price = parseInt(document.getElementById('svcPrice').value) || 0;
    const duration = parseInt(document.getElementById('svcDuration').value) || 30;
    const icon = document.getElementById('svcIcon').value.trim() || '✂️';
    const description = document.getElementById('svcDesc').value.trim();
    if (!name) return;

    await apiFetch(`${API}/api/barber/salon/${salonId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, duration, icon, description })
    });
    closeModal();
    loadServices();
    showToast('Prestation ajoutée ✅');
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
                                <input type="color" id="set-color1" value="${salon.branding?.primaryColor || '#C9A96E'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabel1" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.primaryColor || '#C9A96E'}</span>
                            </div>
                        </div>
                        <div class="form-group" style="flex:1">
                            <label class="form-label">Couleur accent</label>
                            <div style="display:flex;align-items:center;gap:10px">
                                <input type="color" id="set-color2" value="${salon.branding?.accentColor || '#D4B97E'}" style="width:50px;height:40px;border:none;border-radius:8px;cursor:pointer" oninput="updateColorPreview()">
                                <span id="colorLabel2" style="font-family:monospace;font-size:.82rem;color:var(--text-sec)">${salon.branding?.accentColor || '#D4B97E'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="colorPreview" style="padding:16px;border-radius:12px;margin-bottom:16px;text-align:center;font-weight:700;font-size:1rem;background:linear-gradient(135deg,${salon.branding?.primaryColor || '#C9A96E'},${salon.branding?.accentColor || '#D4B97E'});color:#000">
                        Aperçu de vos couleurs
                    </div>
                    <div class="form-group"><label class="form-label">Titre principal du site (hero)</label><input class="form-input form-input-full" id="set-heroTitle" value="${salon.branding?.heroTitle || ''}" placeholder="L'Art de la Coiffure Masculine"></div>
                    <div class="form-group"><label class="form-label">Sous-titre du site</label><input class="form-input form-input-full" id="set-heroSubtitle" value="${salon.branding?.heroSubtitle || ''}" placeholder="Excellence, style et précision"></div>
                    <button class="btn btn-primary" onclick="saveBranding()" style="margin-top:8px">🎨 Enregistrer le branding</button>
                </div>
            </div>

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
                        <div class="info-tile"><span class="info-tile-icon">💰</span><div><div class="info-tile-label">Prix</div><div class="info-tile-value">${salon.subscription?.price ?? 29.99} CHF/mois</div></div></div>
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
