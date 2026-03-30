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
        <div class="form-group">
            <label class="form-label">Slug (URL du site)</label>
            <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:.82rem;color:var(--text-sec);white-space:nowrap">/s/</span>
                <input class="form-input form-input-full" id="eSalonSlug" value="${salon.slug || ''}" placeholder="nom-du-salon" style="font-family:monospace" />
            </div>
            <div style="font-size:.78rem;color:var(--text-sec);margin-top:4px">⚠️ Changer le slug casse les anciens liens partagés</div>
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
  const newSlug = document.getElementById('eSalonSlug').value.trim()
    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  const updates = {
    name: document.getElementById('eSalonName').value.trim(),
    slug: newSlug || undefined,
    address: document.getElementById('eSalonAddr').value.trim(),
    phone: document.getElementById('eSalonPhone').value.trim(),
    email: document.getElementById('eSalonEmail').value.trim(),
    description: document.getElementById('eSalonDesc').value.trim()
  };

  const res = await api('/api/admin/salons/' + salonId, 'PUT', updates);

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
    toast(`Plan mis à jour : ${newPlan.toUpperCase()}`);
    loadDashboard();
    loadSalons();
  } else {
    toast(res.error || 'Erreur lors de la mise à jour du plan', 'error');
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
  // Sidebar active
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  // Bottom nav active
  document.querySelectorAll('.admin-bnav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.admin-bnav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  // Pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  const titles = { dashboard: 'Dashboard', salons: 'Mes Clients', revenue: 'Revenus', activity: 'Activité' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('sidebar').classList.remove('open');
  if (page === 'dashboard') loadDashboard();
  else if (page === 'salons') loadSalons();
  else if (page === 'revenue') loadRevenuePage();
  else if (page === 'activity') loadActivityPage();
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
    // Compute MRR from salon plans
    const salons = salonsRes.success ? salonsRes.data : [];
    const planPrices = { starter: 29.9, pro: 49.9, premium: 89.9 };
    const mrr = salons.reduce((sum, salon) => sum + (planPrices[salon.subscription?.plan || 'pro'] || 49.9), 0);
    const planCounts = salons.reduce((acc, salon) => {
      const p = salon.subscription?.plan || 'pro';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    document.getElementById('statsRow').innerHTML = `
            <div class="stat-card gold">
                <div class="stat-icon">🏪</div>
                <div class="stat-value">${s.totalSalons}</div>
                <div class="stat-label">Salons actifs</div>
            </div>
            <div class="stat-card blue">
                <div class="stat-icon">👥</div>
                <div class="stat-value">${s.totalOwners}</div>
                <div class="stat-label">Propriétaires</div>
            </div>
            <div class="stat-card green">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${s.totalBookings}</div>
                <div class="stat-label">RDV total</div>
            </div>
            <div class="stat-card orange">
                <div class="stat-icon">👤</div>
                <div class="stat-value">${s.totalClients || 0}</div>
                <div class="stat-label">Clients total</div>
            </div>
            <div class="stat-card gold">
                <div class="stat-icon">💰</div>
                <div class="stat-value">${mrr.toFixed(0)} CHF</div>
                <div class="stat-label">MRR estimé</div>
            </div>
            <div class="stat-card blue" style="font-size:.78rem">
                <div class="stat-icon">📊</div>
                <div class="stat-value" style="font-size:1rem">${planCounts.starter||0} / ${planCounts.pro||0} / ${planCounts.premium||0}</div>
                <div class="stat-label">Starter / Pro / Premium</div>
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
const PLAN_PRICES = { starter: 29.9, pro: 49.9, premium: 89.9 };
const PLAN_LABELS = { starter: '🥉 Starter', pro: '🥈 Pro', premium: '🥇 Premium' };

let _activePlanFilter = '';

function filterByPlan(plan) {
  _activePlanFilter = plan;
  document.querySelectorAll('.plan-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.plan === plan);
  });
  applyFilters();
}

function filterSalons(q) {
  document.getElementById('salonSearch')._query = q;
  applyFilters();
}

function applyFilters() {
  const q = (document.getElementById('salonSearch')._query || document.getElementById('salonSearch').value || '').toLowerCase().trim();
  let filtered = state.salons;
  if (_activePlanFilter) {
    filtered = filtered.filter(s => (s.subscription?.plan || 'pro') === _activePlanFilter);
  }
  if (q) {
    filtered = filtered.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.slug || '').toLowerCase().includes(q) ||
      (s.owner?.email || '').toLowerCase().includes(q) ||
      (s.owner?.name || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  }
  renderSalonCards(filtered);
}

function renderSalonCards(salons) {
  const container = document.getElementById('salonsList');
  const countEl = document.getElementById('salonCount');
  if (countEl) {
    const total = state.salons?.length || 0;
    countEl.textContent = salons.length < total ? `${salons.length} / ${total} salons` : `${total} salon${total > 1 ? 's' : ''}`;
  }
  if (!salons.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🏪</div><div class="empty-state-text">Aucun salon trouvé</div></div>`;
    return;
  }
  container.innerHTML = salons.map(s => {
    const plan = s.subscription?.plan || 'pro';
    const mrr = PLAN_PRICES[plan] || 49.9;
    const createdDate = s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-CH', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
    return `
        <div class="salon-card">
            <div class="salon-card-header">
                <div style="min-width:0">
                    <div class="salon-card-name">${s.name}</div>
                    <div style="font-size:.78rem;color:var(--text-muted);margin-top:2px;font-family:monospace">/s/${s.slug}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                    <select class="plan-selector" onchange="changePlan('${s._id}', this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-color);font-size:0.82rem;font-weight:600;">
                        <option value="starter" ${plan === 'starter' ? 'selected' : ''}>Starter</option>
                        <option value="pro" ${plan === 'pro' ? 'selected' : ''}>Pro</option>
                        <option value="premium" ${plan === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
                    <span style="font-size:.75rem;color:var(--primary);font-weight:700">${mrr.toFixed(2)} CHF/mois</span>
                </div>
            </div>
            <div class="salon-card-info">
                <div>👤 <strong>${s.owner?.name || '—'}</strong></div>
                <div>📧 ${s.owner?.email || '—'}</div>
                <div>📍 ${s.address || '—'}</div>
                <div>📅 Créé le ${createdDate}</div>
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
            ${s.adminNotes ? `<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:8px;padding:8px 10px;font-size:.8rem;color:#f59e0b;margin-bottom:8px">📌 ${s.adminNotes}</div>` : ''}
            <div class="salon-card-actions" style="flex-wrap:wrap;gap:8px">
                <button class="btn btn-sm btn-primary" onclick="quickLogin('${s._id}')">🚀 PRO</button>
                <a href="/s/${s.slug}" target="_blank" class="btn btn-sm btn-outline">🌐 Site</a>
                <button class="btn btn-sm btn-outline" onclick="editSalon('${s._id}')">✏️ Edit</button>
                <button class="btn btn-sm btn-outline" onclick="resetOwnerPassword('${s._id}', '${s.owner?._id}')">🔑 MDP</button>
                <button class="btn btn-sm btn-ghost" onclick="showSalonLogs('${s._id}', '${s.name.replace(/'/g, "\\'")}')">📜 Logs</button>
                <button class="btn btn-sm btn-ghost" onclick="editAdminNotes('${s._id}', '${(s.adminNotes || '').replace(/'/g, "\\'")}')">📌 Notes</button>
                <button class="btn btn-sm btn-ghost" onclick="copySalonInfo('${s._id}')">📋 Infos</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSalon('${s._id}')">🗑️</button>
            </div>
        </div>`;
  }).join('');
}

async function loadSalons() {
  const res = await api('/api/admin/salons');
  if (!res.success) return;
  state.salons = res.data;
  applyFilters();
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
                <div id="colorPreview" style="height:42px;border-radius:8px;background:#6366F1;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem">Kreno</div>
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

function deleteSalon(id) {
  const salonName = state.salons?.find(s => s._id === id)?.name || 'ce salon';
  showModal('⚠️ Supprimer le salon', `
    <p style="color:var(--text-sec);margin-bottom:16px">Vous êtes sur le point de supprimer <strong style="color:#fff">${salonName}</strong> et <span style="color:var(--error, #f87171)">toutes ses données</span>. Cette action est irréversible.</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" style="background:var(--error,#ef4444);border-color:var(--error,#ef4444)" onclick="confirmDeleteSalon('${id}')">🗑 Supprimer</button>
    </div>
  `);
}

async function confirmDeleteSalon(id) {
  closeModal();
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

// ============ REVENUE PAGE ============
async function loadRevenuePage() {
  const el = document.getElementById('revenuePage');
  el.innerHTML = '<div class="empty-state">Chargement…</div>';
  const res = await api('/api/admin/salons');
  if (!res.success) { el.innerHTML = '<div class="empty-state">Erreur de chargement</div>'; return; }
  const salons = res.data;
  const prices = { starter: 29.9, pro: 49.9, premium: 89.9 };
  const mrr = salons.reduce((s, x) => s + (prices[x.subscription?.plan || 'pro'] || 49.9), 0);
  const arr = mrr * 12;
  const counts = salons.reduce((a, x) => { const p = x.subscription?.plan || 'pro'; a[p] = (a[p] || 0) + 1; return a; }, {});

  el.innerHTML = `
    <div class="revenue-grid">
      <div class="revenue-card">
        <div class="revenue-card-title">MRR estimé</div>
        <div class="revenue-card-value">${mrr.toFixed(0)} CHF</div>
        <div class="revenue-card-sub">Revenus mensuels récurrents</div>
      </div>
      <div class="revenue-card">
        <div class="revenue-card-title">ARR estimé</div>
        <div class="revenue-card-value">${arr.toFixed(0)} CHF</div>
        <div class="revenue-card-sub">Revenus annuels récurrents</div>
      </div>
      <div class="revenue-card">
        <div class="revenue-card-title">Salons actifs</div>
        <div class="revenue-card-value">${salons.length}</div>
        <div class="revenue-card-sub">${counts.starter||0} Starter · ${counts.pro||0} Pro · ${counts.premium||0} Premium</div>
      </div>
      <div class="revenue-card">
        <div class="revenue-card-title">ARPU moyen</div>
        <div class="revenue-card-value">${salons.length ? (mrr / salons.length).toFixed(0) : 0} CHF</div>
        <div class="revenue-card-sub">Revenu moyen par salon</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>📋 Détail par salon</h3></div>
      <div class="card-body" style="padding:0;overflow-x:auto">
        <table class="revenue-table">
          <thead><tr>
            <th>Salon</th><th>Plan</th><th>CHF/mois</th><th>RDV</th><th>Clients</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${salons.map(s => `
              <tr>
                <td>
                  <div style="font-weight:600;color:var(--text)">${s.name}</div>
                  <div style="font-size:.75rem;font-family:monospace;color:var(--text-muted)">/s/${s.slug}</div>
                </td>
                <td><span class="badge badge-${s.subscription?.plan === 'premium' ? 'active' : s.subscription?.plan === 'pro' ? 'pending' : 'cancelled'}">${s.subscription?.plan || 'pro'}</span></td>
                <td style="font-weight:700;color:var(--primary)">${(prices[s.subscription?.plan || 'pro'] || 49.9).toFixed(2)}</td>
                <td>${s.stats?.bookings || 0}</td>
                <td>${s.stats?.clients || 0}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="quickLogin('${s._id}')">🚀 PRO</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ============ ACTIVITY PAGE ============
async function loadActivityPage() {
  const el = document.getElementById('activityPage');
  el.innerHTML = '<div class="empty-state">Chargement…</div>';
  const res = await api('/api/admin/salons');
  if (!res.success) { el.innerHTML = '<div class="empty-state">Erreur</div>'; return; }

  const salons = res.data;
  // Build activity feed from salons (sort by createdAt desc)
  const items = salons
    .filter(s => s.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map(s => {
      const date = new Date(s.createdAt).toLocaleDateString('fr-CH', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' });
      return `<div class="activity-item">
        <div class="activity-dot new-salon">🏪</div>
        <div class="activity-body">
          <div class="activity-title">Nouveau salon : <strong>${s.name}</strong></div>
          <div class="activity-sub">${s.owner?.email || '—'} · /s/${s.slug} · Plan ${s.subscription?.plan || 'pro'}</div>
        </div>
        <div class="activity-time">${date}</div>
      </div>`;
    }).join('') || '<div class="empty-state">Aucune activité récente</div>';

  el.innerHTML = `<div class="card"><div class="card-header"><h3>🏪 Nouveaux salons (récents → anciens)</h3></div><div class="card-body"><div class="activity-list">${items}</div></div></div>`;
}

// ============ SALON LOGS ============
async function showSalonLogs(salonId, salonName) {
  showModal(`📜 Historique — ${salonName}`, '<div id="logsContainer">Chargement…</div>');
  const res = await api(`/api/admin/salons/${salonId}/logs`);
  const container = document.getElementById('logsContainer');
  if (!res.success || !res.data?.length) {
    container.innerHTML = '<div style="color:var(--text-sec);text-align:center;padding:20px">Aucun historique disponible</div>';
    return;
  }
  const ACTION_LABELS = {
    salon_created: '🏪 Salon créé',
    subscription_activated: '✅ Abonnement activé',
    plan_change: '🔄 Changement de plan',
  };
  container.innerHTML = res.data.map(log => {
    const date = new Date(log.timestamp).toLocaleString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    let detail = '';
    if (log.action === 'plan_change') detail = `${log.details?.from} → ${log.details?.to}`;
    else if (log.action === 'subscription_activated') detail = `Plan ${log.details?.plan}`;
    else if (log.action === 'salon_created') detail = `${log.details?.name || ''} · ${log.details?.ownerEmail || ''}`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <div>
        <div style="font-size:.88rem;font-weight:600">${ACTION_LABELS[log.action] || log.action}</div>
        ${detail ? `<div style="font-size:.78rem;color:var(--text-sec);margin-top:2px">${detail}</div>` : ''}
      </div>
      <div style="font-size:.75rem;color:var(--text-muted);white-space:nowrap;margin-left:12px">${date}</div>
    </div>`;
  }).join('');
}

// ============ ADMIN NOTES ============
async function editAdminNotes(salonId, currentNotes) {
  const notes = prompt('Notes internes (non visible par le salon) :', currentNotes || '');
  if (notes === null) return; // cancelled
  const res = await api(`/api/admin/salons/${salonId}/notes`, 'PUT', { notes });
  if (res.success) {
    toast('Notes enregistrées');
    loadSalons();
  } else {
    toast('Erreur', 'error');
  }
}

// ============ EXPORT CSV ============
async function exportSalonsCSV() {
  const token = localStorage.getItem('adminToken');
  const res = await fetch('/api/admin/salons/export-csv', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) { toast('Erreur export CSV', 'error'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salons-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

initApp();
