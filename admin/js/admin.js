/* ============================================
   SALON PRO SaaS - Super Admin Dashboard JS
   Gestion de tes clients (salons/instituts)
   ============================================ */

const API = '';
let state = { salons: [], currentPage: 'dashboard' };

async function api(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + endpoint, opts);

  if (res.status === 401 && endpoint !== '/api/admin/login') {
    logoutAdmin();
    return { success: false, error: 'Unauthorized' };
  }
  return res.json();
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

async function quickLogin(salonId) {
  const res = await api('/api/admin/salons/' + salonId + '/magic-link');
  if (res.success) {
    localStorage.setItem('magic_login', JSON.stringify(res.data));
    window.open('/pro', '_blank');
  } else {
    alert(res.error || 'Erreur lors de la création du lien magique');
  }
}

async function resetOwnerPassword(salonId, ownerId) {
  if (!ownerId || ownerId === 'undefined') return alert('Aucun propriétaire principal trouvé');
  const newPwd = prompt('Entrez le nouveau mot de passe pour le propriétaire :');
  if (!newPwd) return;

  const res = await api('/api/admin/salons/' + salonId + '/owners/' + ownerId + '/password', {
    method: 'PUT',
    body: JSON.stringify({ password: newPwd })
  });

  if (res.success) {
    alert('Mot de passe mis à jour avec succès');
    loadSalons();
  } else {
    alert(res.error || 'Erreur');
  }
}

function editSalon(salonId) {
  const salon = state.salons.find(s => s._id === salonId);
  if (!salon) return;

  showModal('Modifier le salon', `
        <div class="form-group">
            <label class="form-label">Nom du salon</label>
            <input class="form-input form-input-full" id="eSalonName" value="${salon.name || ''}" />
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Adresse</label>
                <input class="form-input form-input-full" id="eSalonAddr" value="${salon.address || ''}" />
            </div>
            <div class="form-group">
                <label class="form-label">Téléphone</label>
                <input class="form-input form-input-full" id="eSalonPhone" value="${salon.phone || ''}" />
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Email de contact</label>
            <input class="form-input form-input-full" id="eSalonEmail" value="${salon.email || ''}" />
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <input class="form-input form-input-full" id="eSalonDesc" value="${salon.description || ''}" />
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="submitEditSalon('${salonId}')">Enregistrer</button>
    `);
}

async function submitEditSalon(salonId) {
  const updates = {
    name: document.getElementById('eSalonName').value.trim(),
    address: document.getElementById('eSalonAddr').value.trim(),
    phone: document.getElementById('eSalonPhone').value.trim(),
    email: document.getElementById('eSalonEmail').value.trim(),
    description: document.getElementById('eSalonDesc').value.trim()
  };

  const res = await api('/api/admin/salons/' + salonId, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });

  if (res.success) {
    closeModal();
    loadSalons();
    loadDashboard();
  } else {
    alert(res.error || 'Erreur lors de la modification');
  }
}

async function changePlan(salonId, newPlan) {
  const res = await api(`/api/admin/salons/${salonId}/plan`, 'PUT', { plan: newPlan });
  if (res.success) {
    alert(`Plan mis à jour : ${newPlan.toUpperCase()}`);
    loadDashboard();
    loadSalons();
  } else {
    alert(res.error || 'Erreur lors de la mise à jour du plan');
  }
}

// ---- Navigation ----
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  const titles = { dashboard: 'Dashboard Plateforme', salons: 'Mes Clients (Salons)' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('sidebar').classList.remove('open');
  if (page === 'dashboard') loadDashboard();
  else if (page === 'salons') loadSalons();
}

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ============ DASHBOARD ============
async function loadDashboard() {
  const token = localStorage.getItem('adminToken');
  if (!token) return; // Prevent loading dashboard if not logged in

  const [statsRes, salonsRes] = await Promise.all([
    api('/api/admin/stats'),
    api('/api/admin/salons')
  ]);

  if (statsRes.success) {
    const s = statsRes.data;
    document.getElementById('statsRow').innerHTML = `
            <div class="stat-card gold">
                <div class="stat-icon">🏪</div>
                <div class="stat-value">${s.totalSalons}</div>
                <div class="stat-label">Salons actifs</div>
            </div>
            <div class="stat-card blue">
                <div class="stat-icon">👤</div>
                <div class="stat-value">${s.totalOwners}</div>
                <div class="stat-label">Propriétaires</div>
            </div>
            <div class="stat-card green">
                <div class="stat-icon">👥</div>
                <div class="stat-value">${s.totalEmployees}</div>
                <div class="stat-label">Employés total</div>
            </div>
            <div class="stat-card orange">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${s.totalBookings}</div>
                <div class="stat-label">RDV total</div>
            </div>
            <div class="stat-card gold">
                <div class="stat-icon">💰</div>
                <div class="stat-value">${parseFloat(s.revenueEstimate || 0).toFixed(0)} CHF</div>
                <div class="stat-label">Revenus estimés/mois</div>
            </div>
        `;
  }

  if (salonsRes.success) {
    state.salons = salonsRes.data;
    const container = document.getElementById('recentSalonsList');
    if (salonsRes.data.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏪</div><div class="empty-state-text">Aucun salon créé — cliquez sur "+ Créer un Salon"</div></div>`;
    } else {
      container.innerHTML = salonsRes.data.slice(-5).reverse().map(s => `
                <div class="booking-item" style="cursor:pointer" onclick="navigateTo('salons')">
                    <div class="booking-icon">🏪</div>
                    <div class="booking-info">
                        <div class="booking-info-name">${s.name}</div>
                        <div class="booking-info-service">${s.owner?.name || '—'} · ${s.address}</div>
                    </div>
                    <span class="badge badge-${s.active ? 'active' : 'cancelled'}">${s.active ? 'Actif' : 'Inactif'}</span>
                    <div style="font-size:.8rem;color:var(--text-muted)">${s.stats?.bookings || 0} RDV · ${s.stats?.clients || 0} clients</div>
                </div>
            `).join('');
    }
  }
}

// ============ SALONS (tes clients) ============
async function loadSalons() {
  const res = await api('/api/admin/salons');
  if (!res.success) return;
  state.salons = res.data;

  const container = document.getElementById('salonsList');
  if (res.data.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🏪</div><div class="empty-state-text">Aucun salon créé</div></div>`;
    return;
  }

  container.innerHTML = res.data.map(s => `
        <div class="salon-card">
            <div class="salon-card-header">
                <div>
                    <div class="salon-card-name">${s.name}</div>
                    <div style="font-size:.8rem;color:var(--text-muted);margin-top:2px">/${s.slug}</div>
                </div>
                <select class="plan-selector" onchange="changePlan('${s._id}', this.value)" style="padding:4px 8px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-color); font-size:0.85rem; font-weight:600;">
                    <option value="starter" ${(s.subscription?.plan || 'pro') === 'starter' ? 'selected' : ''}>Starter</option>
                    <option value="pro" ${(s.subscription?.plan || 'pro') === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="premium" ${(s.subscription?.plan || 'pro') === 'premium' ? 'selected' : ''}>Premium</option>
                </select>
            </div>
            <div class="salon-card-info">
                <div>👤 <strong>${s.owner?.name || '—'}</strong></div>
                <div>📧 ${s.owner?.email || '—'}</div>
                <div>📍 ${s.address || '—'}</div>
                <div>📞 ${s.phone || '—'}</div>
            </div>
            <div class="salon-card-stats">
                <div class="salon-card-stat">
                    <div class="salon-card-stat-value">${s.stats?.employees || 0}</div>
                    <div class="salon-card-stat-label">Employés</div>
                </div>
                <div class="salon-card-stat">
                    <div class="salon-card-stat-value">${s.stats?.bookings || 0}</div>
                    <div class="salon-card-stat-label">RDV</div>
                </div>
                <div class="salon-card-stat">
                    <div class="salon-card-stat-value">${s.stats?.clients || 0}</div>
                    <div class="salon-card-stat-label">Clients</div>
                </div>
                <div class="salon-card-stat">
                    <div class="salon-card-stat-value">${s.services?.length || 0}</div>
                    <div class="salon-card-stat-label">Services</div>
                </div>
            </div>
            <div class="salon-card-actions" style="flex-wrap: wrap; gap: 8px;">
                <button class="btn btn-sm btn-primary" onclick="quickLogin('${s._id}')">🚀 PRO</button>
                <a href="/s/${s.slug}" target="_blank" class="btn btn-sm btn-outline">🌐 Site</a>
                <button class="btn btn-sm btn-outline" onclick="editSalon('${s._id}')">✏️ Edit</button>
                <button class="btn btn-sm btn-outline" onclick="resetOwnerPassword('${s._id}', '${s.owner?._id}')">🔑 MDP</button>
                <button class="btn btn-sm btn-ghost" onclick="copySalonInfo('${s._id}')">📋 Info</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSalon('${s._id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openCreateSalonModal() {
  showModal('Créer un nouveau salon', `
        <p style="color:var(--text-sec);font-size:.88rem;margin-bottom:18px">
            Tu crées un compte pour ton client. Il recevra un site dédié + accès à l'espace pro.
        </p>
        <h4 style="color:var(--primary);margin-bottom:10px;font-size:.85rem;text-transform:uppercase;letter-spacing:1px">🏪 Infos du Salon</h4>
        <div class="form-group">
            <label class="form-label">Nom du salon</label>
            <input class="form-input form-input-full" id="mSalonName" placeholder="Ex: Elite Barber Marseille" />
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Adresse</label>
                <input class="form-input form-input-full" id="mSalonAddr" placeholder="12 Rue du Port, Marseille" />
            </div>
            <div class="form-group">
                <label class="form-label">Téléphone salon</label>
                <input class="form-input form-input-full" id="mSalonPhone" placeholder="04 91 ..." />
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Email du salon</label>
            <input class="form-input form-input-full" id="mSalonEmail" placeholder="contact@salon.fr" />
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <input class="form-input form-input-full" id="mSalonDesc" placeholder="Salon premium au cœur de..." />
        </div>

        <hr style="border-color:var(--border);margin:20px 0" />
        <h4 style="color:var(--primary);margin-bottom:10px;font-size:.85rem;text-transform:uppercase;letter-spacing:1px">👤 Propriétaire (ton client)</h4>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Nom du propriétaire</label>
                <input class="form-input form-input-full" id="mOwnerName" placeholder="Prénom Nom" />
            </div>
            <div class="form-group">
                <label class="form-label">Téléphone</label>
                <input class="form-input form-input-full" id="mOwnerPhone" placeholder="06 ..." />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Email (login app)</label>
                <input class="form-input form-input-full" id="mOwnerEmail" placeholder="client@email.com" />
            </div>
            <div class="form-group">
                <label class="form-label">Mot de passe</label>
                <input type="password" class="form-input form-input-full" id="mOwnerPass" placeholder="Mot de passe du propriétaire..." />
            </div>
        </div>

        <hr style="border-color:var(--border);margin:20px 0" />
        <h4 style="color:var(--primary);margin-bottom:10px;font-size:.85rem;text-transform:uppercase;letter-spacing:1px">💎 Abonnement</h4>
        <div class="form-group">
            <label class="form-label">Plan</label>
            <select class="form-input form-input-full" id="mPlan">
                <option value="pro" selected>Pro (49.90 CHF/mois)</option>
            </select>
        </div>

        <hr style="border-color:var(--border);margin:20px 0" />
        <h4 style="color:var(--primary);margin-bottom:10px;font-size:.85rem;text-transform:uppercase;letter-spacing:1px">🎨 Couleur du site</h4>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Couleur principale</label>
                <input type="color" class="form-input" id="mColor" value="#6366F1" style="height:42px;width:100%" />
            </div>
            <div class="form-group">
                <label class="form-label">Aperçu</label>
                <div id="colorPreview" style="height:42px;border-radius:8px;background:#6366F1;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem">SalonPro</div>
            </div>
        </div>
    `, async () => {
    const data = {
      name: document.getElementById('mSalonName').value,
      address: document.getElementById('mSalonAddr').value,
      phone: document.getElementById('mSalonPhone').value,
      email: document.getElementById('mSalonEmail').value,
      description: document.getElementById('mSalonDesc').value,
      ownerName: document.getElementById('mOwnerName').value,
      ownerEmail: document.getElementById('mOwnerEmail').value,
      ownerPhone: document.getElementById('mOwnerPhone').value,
      ownerPassword: document.getElementById('mOwnerPass').value,
      subscription: { plan: document.getElementById('mPlan').value },
      branding: { primaryColor: document.getElementById('mColor').value }
    };

    if (!data.name || !data.ownerName || !data.ownerEmail) {
      return toast('Remplis le nom du salon, du propriétaire et son email', 'error');
    }

    const res = await api('/api/admin/salons', 'POST', data);
    if (res.success) {
      toast(`Salon "${res.data.salon.name}" créé ! Site: /s/${res.data.salon.slug}`);
      closeModal();
      loadSalons();
      loadDashboard();
    } else {
      toast('Erreur lors de la création', 'error');
    }
  });

  // Color preview live update
  setTimeout(() => {
    const colorInput = document.getElementById('mColor');
    const preview = document.getElementById('colorPreview');
    if (colorInput && preview) {
      colorInput.addEventListener('input', () => {
        preview.style.background = colorInput.value;
      });
    }
  }, 100);
}

function copySalonInfo(salonId) {
  const salon = state.salons.find(s => (s._id || s.id) === salonId);
  if (!salon) return;
  const info = `
🏪 ${salon.name}
🌐 Site: ${window.location.origin}/s/${salon.slug}
👤 Propriétaire: ${salon.owner?.name || '—'}
📧 Login: ${salon.owner?.email || '—'}
🔑 Mot de passe: (celui défini à la création)
    `.trim();
  navigator.clipboard.writeText(info).then(() => {
    toast('Infos de connexion copiées !');
  }).catch(() => {
    // Fallback
    showModal('Infos de connexion', `<pre style="color:var(--text);white-space:pre-wrap;font-size:.85rem">${info}</pre>`, () => closeModal());
  });
}

async function resetOwnerPassword(salonId, ownerId) {
  if (!ownerId || ownerId === 'undefined') {
    return toast('Aucun propriétaire associé à ce salon !', 'error');
  }
  const newPass = prompt("Entrez le nouveau mot de passe pour le propriétaire :");
  if (!newPass) return;

  const res = await api(`/api/admin/salons/${salonId}/owners/${ownerId}/password`, 'PUT', { password: newPass });
  if (res.success) {
    toast('Mot de passe mis à jour avec succès !');
  } else {
    toast(res.error || 'Erreur lors de la mise à jour', 'error');
  }
}

async function deleteSalon(id) {
  if (!confirm('Supprimer ce salon et toutes ses données ? Cette action est irréversible.')) return;
  await api(`/api/admin/salons/${id}`, 'DELETE');
  toast('Salon supprimé');
  loadSalons();
  loadDashboard();
}

// ============ MODAL SYSTEM ============
function showModal(title, bodyHTML, onSave) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
        <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
            <button class="btn btn-primary" id="modalSaveBtn">Enregistrer</button>
        </div>
    `;
  document.getElementById('modalSaveBtn').addEventListener('click', onSave);
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ============ LOGIN & INIT ============
async function loginAdmin() {
  const pwd = document.getElementById('adminPassword').value;
  if (!pwd) return;

  document.getElementById('loginError').style.display = 'none';
  const res = await api('/api/admin/login', 'POST', { password: pwd });

  if (res.success && res.token) {
    localStorage.setItem('adminToken', res.token);
    document.getElementById('loginOverlay').style.display = 'none';

    // Show logout button in topbar if needed
    let acts = document.querySelector('.topbar-actions');
    if (acts && !acts.innerHTML.includes('Déconnexion')) {
      acts.innerHTML += `<button class="btn btn-sm btn-outline" onclick="logoutAdmin()">Déconnexion</button>`;
    }

    loadDashboard();
  } else {
    document.getElementById('loginError').textContent = res.error || 'Erreur de connexion';
    document.getElementById('loginError').style.display = 'block';
  }
}

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('adminPassword').value = '';

  let acts = document.querySelector('.topbar-actions');
  if (acts) acts.innerHTML = '';
}

function initApp() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    document.getElementById('loginOverlay').style.display = 'flex';
  } else {
    document.getElementById('loginOverlay').style.display = 'none';

    // Setup logout button
    let acts = document.querySelector('.topbar-actions');
    if (acts && !acts.innerHTML.includes('Déconnexion')) {
      acts.innerHTML = `<button class="btn btn-sm btn-outline" onclick="logoutAdmin()">Déconnexion</button>`;
    }

    loadDashboard();
  }
}

initApp();
