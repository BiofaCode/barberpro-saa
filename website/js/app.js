/* ============================================
   SALON PRO - Main Application Logic
   ============================================ */

let SALON_DATA = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.SALON_SLUG) {
    try {
      const res = await fetch(`/api/salon/${window.SALON_SLUG}`);
      const data = await res.json();
      if (data.success) {
        SALON_DATA = data.data;
        applySalonBranding(SALON_DATA);
      }
    } catch (e) { console.warn('Could not load salon data:', e); }
  }
  initNavbar();
  initParticles();
  initCounters();
  initScrollReveal();
  initBookingModal();
});

/* ============================================
   SALON BRANDING
   ============================================ */
function applySalonBranding(salon) {
  if (salon.branding) {
    const b = salon.branding;
    document.documentElement.style.setProperty('--color-primary', b.primaryColor || '#C9A96E');
    document.documentElement.style.setProperty('--color-primary-light', b.accentColor || '#D4B97E');
    const hex = b.primaryColor || '#C9A96E';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--color-primary-glow', `rgba(${r},${g},${bl},0.3)`);
    document.documentElement.style.setProperty('--color-primary-dark', b.accentColor || '#A88B52');
  }

  const logoEl = document.querySelector('.nav-logo-text');
  const logoIcon = document.querySelector('.nav-logo-icon');
  if (salon.logo && logoIcon) logoIcon.innerHTML = `<img src="${salon.logo}" alt="${salon.name}" style="width:36px;height:36px;object-fit:cover;border-radius:8px">`;
  if (logoEl) logoEl.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');

  const heroTitle = document.querySelector('.hero h1');
  const heroSub = document.querySelector('.hero-description');
  if (heroTitle && salon.branding?.heroTitle) heroTitle.innerHTML = salon.branding.heroTitle;
  if (heroSub && salon.branding?.heroSubtitle) heroSub.textContent = salon.branding.heroSubtitle;
  document.title = `${salon.name} | Réservation en ligne`;

  if (salon.services?.length > 0) {
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
      servicesGrid.innerHTML = salon.services.map(s => `
        <div class="service-card reveal active">
          <div class="service-icon">${s.icon}</div>
          <h3>${s.name}</h3>
          <p>${s.description || ''}</p>
          <div class="service-meta">
            <span class="service-price">${s.price} CHF</span>
            <span class="service-duration">⏱ ${s.duration} min</span>
          </div>
        </div>
      `).join('');
    }
  }
  updateFooter(salon);
}

function updateFooter(salon) {
  const footerLogo = document.querySelector('.footer-brand .nav-logo-text');
  if (footerLogo) footerLogo.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');
  const footerDesc = document.querySelector('.footer-brand > p');
  if (footerDesc) footerDesc.textContent = salon.description || `${salon.name} — Votre salon premium.`;

  const footerSvc = document.getElementById('footerServices');
  if (footerSvc && salon.services) footerSvc.innerHTML = `<h4>Services</h4><ul>${salon.services.map(s => `<li><a href="#services">${s.name}</a></li>`).join('')}</ul>`;

  const footerHours = document.getElementById('footerHours');
  if (footerHours && salon.hours) {
    const dayLabels = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const lines = []; let i = 0;
    while (i < days.length) {
      const d = days[i], h = salon.hours[d];
      if (!h || !h.open) { lines.push(`<li><a href="#">${dayLabels[d]} : Fermé</a></li>`); i++; }
      else {
        let j = i + 1;
        while (j < days.length && salon.hours[days[j]]?.open === h.open && salon.hours[days[j]]?.close === h.close) j++;
        const label = j - i > 1 ? `${dayLabels[days[i]]} - ${dayLabels[days[j - 1]]}` : dayLabels[d];
        lines.push(`<li><a href="#">${label} : ${h.open} - ${h.close}</a></li>`); i = j;
      }
    }
    footerHours.innerHTML = `<h4>Horaires</h4><ul>${lines.join('')}</ul>`;
  }

  const footerContact = document.getElementById('footerContact');
  if (footerContact) {
    const items = [];
    if (salon.phone) items.push(`<li><a href="tel:${salon.phone.replace(/\s/g, '')}">📞 ${salon.phone}</a></li>`);
    if (salon.email) items.push(`<li><a href="mailto:${salon.email}">✉️ ${salon.email}</a></li>`);
    if (salon.address) items.push(`<li><a href="#">📍 ${salon.address}</a></li>`);
    if (items.length) footerContact.innerHTML = `<h4>Contact</h4><ul>${items.join('')}</ul>`;
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));
  hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); navLinks.classList.toggle('open'); });
  navLinks.querySelectorAll('a:not(.nav-cta)').forEach(link => {
    link.addEventListener('click', () => { hamburger.classList.remove('active'); navLinks.classList.remove('open'); });
  });
}

function initParticles() {
  const c = document.getElementById('heroParticles'); if (!c) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div'); p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%'; p.style.animationDelay = Math.random() * 6 + 's';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    p.style.width = (2 + Math.random() * 4) + 'px'; p.style.height = p.style.width;
    c.appendChild(p);
  }
}

function initCounters() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const t = parseInt(e.target.dataset.count); let cur = 0; const inc = t / 60;
        const timer = setInterval(() => { cur += inc; if (cur >= t) { cur = t; clearInterval(timer); } e.target.textContent = Math.floor(cur) + '+'; }, 30);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(c => observer.observe(c));
}

function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(r => observer.observe(r));
}

/* ============================================
   BOOKING MODAL — Dynamic Steps
   ============================================ */
let bmState = {};
let bmSteps = [];

function getEmployees() { return SALON_DATA?.employees || []; }
function hasMultipleEmployees() { return getEmployees().length > 1; }

function buildSteps() {
  const steps = [];
  steps.push({ id: 'service', label: 'Prestation' });
  if (hasMultipleEmployees()) steps.push({ id: 'employee', label: 'Pro' });
  steps.push({ id: 'datetime', label: 'Date' });
  steps.push({ id: 'info', label: 'Infos' });
  steps.push({ id: 'confirm', label: 'Confirmer' });
  return steps;
}

function renderStepsBar() {
  const bar = document.getElementById('bmStepsBar');
  bar.innerHTML = bmSteps.map((s, i) =>
    (i > 0 ? '<div class="bm-step-line"></div>' : '') +
    `<div class="bm-step" data-step-id="${s.id}">
      <div class="bm-step-num">${i + 1}</div>
      <span>${s.label}</span>
    </div>`
  ).join('');
}

function openBooking() {
  document.getElementById('navHamburger')?.classList.remove('active');
  document.getElementById('navLinks')?.classList.remove('open');
  bmState = { stepIdx: 0, employee: null, service: null, date: null, time: null, month: new Date().getMonth(), year: new Date().getFullYear() };
  bmSteps = buildSteps();
  renderStepsBar();
  populateServices();
  // We'll populate employees later when transitioning to the employee step, 
  // so we can filter them by the selected service.

  // Reset form fields
  ['bmFirstName', 'bmLastName', 'bmEmail', 'bmPhone', 'bmNotes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });

  // Hide success, show normal content
  document.getElementById('bmSuccessView').style.display = 'none';
  document.getElementById('bookingModalBody').style.display = 'block';
  document.querySelector('.booking-modal-steps').style.display = 'flex';
  document.querySelector('.booking-modal-footer').style.display = 'flex';

  goToStep(0);
  document.getElementById('bookingModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBooking() {
  document.getElementById('bookingModal').classList.remove('active');
  document.body.style.overflow = '';
}

function populateEmployees(serviceName = null) {
  const grid = document.getElementById('bmEmployeeGrid');
  let emps = getEmployees();

  // Filter employees by service specialty
  if (serviceName) {
    emps = emps.filter(e => {
      if (!e.specialties || e.specialties.length === 0) return true;
      return e.specialties.some(s => s.toLowerCase() === serviceName.toLowerCase());
    });
  }

  if (emps.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-sec)">Aucun professionnel disponible pour cette prestation.</div>';
    return;
  }

  // If there's only one employee after filtering, and we are showing this step (which only happens if total emps > 1)
  // We should maybe auto-select them, but for now just showing them is fine.

  grid.innerHTML = emps.map(e => `
    <div class="bm-service-card" data-emp-id="${e._id}" data-emp-name="${e.name}">
      <div class="bm-service-icon" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-primary-dark));display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;color:var(--color-bg-dark);font-weight:700">${(e.name || '?')[0].toUpperCase()}</div>
      <div class="bm-service-name">${e.name}</div>
      <div class="bm-service-dur">${(e.specialties || []).join(', ') || 'Tous services'}</div>
    </div>
  `).join('');
  grid.addEventListener('click', (ev) => {
    const card = ev.target.closest('.bm-service-card'); if (!card) return;
    grid.querySelectorAll('.bm-service-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    bmState.employee = { id: card.dataset.empId, name: card.dataset.empName };
  });
}

function populateServices() {
  const grid = document.getElementById('bmServiceGrid');
  const services = SALON_DATA?.services || [
    { name: 'Coupe Classique', icon: '✂️', price: 25, duration: 30 },
    { name: 'Soin Visage', icon: '💆', price: 35, duration: 40 },
    { name: 'Pack Premium', icon: '💎', price: 55, duration: 60 },
    { name: 'Coloration', icon: '🎨', price: 40, duration: 45 },
    { name: 'Soin Capillaire', icon: '🧴', price: 30, duration: 35 },
    { name: 'Épilation', icon: '✨', price: 20, duration: 20 },
  ];
  grid.innerHTML = services.map(s => `
    <div class="bm-service-card" data-name="${s.name}" data-icon="${s.icon}" data-price="${s.price}" data-duration="${s.duration}">
      <div class="bm-service-icon">${s.icon}</div>
      <div class="bm-service-name">${s.name}</div>
      <div class="bm-service-price">${s.price} CHF</div>
      <div class="bm-service-dur">${s.duration} min</div>
    </div>
  `).join('');
  grid.addEventListener('click', (ev) => {
    const card = ev.target.closest('.bm-service-card'); if (!card) return;
    grid.querySelectorAll('.bm-service-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    bmState.service = { name: card.dataset.name, icon: card.dataset.icon, price: parseInt(card.dataset.price), duration: parseInt(card.dataset.duration) };
  });
}

function initBookingModal() {
  document.getElementById('bmCalPrev').addEventListener('click', () => {
    bmState.month--; if (bmState.month < 0) { bmState.month = 11; bmState.year--; } renderBmCalendar();
  });
  document.getElementById('bmCalNext').addEventListener('click', () => {
    bmState.month++; if (bmState.month > 11) { bmState.month = 0; bmState.year++; } renderBmCalendar();
  });
  document.getElementById('bookingModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeBooking(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBooking(); });
}

/* ---- Step Nav ---- */
function currentStepId() { return bmSteps[bmState.stepIdx]?.id; }

function goToStep(idx) {
  bmState.stepIdx = idx;
  const stepId = bmSteps[idx].id;
  document.querySelectorAll('.bm-section').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
  const sec = document.querySelector(`.bm-section[data-section="${stepId}"]`);
  if (sec) { sec.style.display = 'block'; sec.classList.add('active'); }

  document.querySelectorAll('.bm-step').forEach(s => {
    const sIdx = bmSteps.findIndex(st => st.id === s.dataset.stepId);
    s.classList.remove('active', 'completed');
    if (sIdx === idx) s.classList.add('active');
    else if (sIdx < idx) s.classList.add('completed');
  });

  document.getElementById('bmPrev').style.display = idx === 0 ? 'none' : '';
  document.getElementById('bmNext').textContent = idx === bmSteps.length - 1 ? '✓ Confirmer' : 'Suivant →';
  if (stepId === 'employee') populateEmployees(bmState.service?.name);
  if (stepId === 'datetime') renderBmCalendar();
  if (stepId === 'confirm') populateConfirmation();
}

function bmNextStep() {
  const stepId = currentStepId();
  if (stepId === 'employee' && !bmState.employee) { showToast('Choisissez un professionnel'); return; }
  if (stepId === 'service' && !bmState.service) { showToast('Choisissez une prestation'); return; }
  if (stepId === 'datetime' && (!bmState.date || !bmState.time)) { showToast('Choisissez une date et un créneau'); return; }
  if (stepId === 'info') {
    const fn = document.getElementById('bmFirstName').value.trim();
    const ln = document.getElementById('bmLastName').value.trim();
    const em = document.getElementById('bmEmail').value.trim();
    const ph = document.getElementById('bmPhone').value.trim();
    if (!fn || !ln || !em || !ph) { showToast('Remplissez tous les champs obligatoires'); return; }
  }
  if (stepId === 'confirm') { submitBooking(); return; }
  goToStep(bmState.stepIdx + 1);
}

function bmPrevStep() { if (bmState.stepIdx > 0) goToStep(bmState.stepIdx - 1); }

/* ---- Calendar ---- */
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_MAP = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function isDateClosed(date) {
  const closedDates = SALON_DATA?.closedDates || [];
  const dateStr = date.toISOString().split('T')[0];
  return closedDates.some(cd => dateStr >= cd.start && dateStr <= cd.end);
}

function isDayClosed(date) {
  if (isDateClosed(date)) return true;
  if (!SALON_DATA?.hours) return date.getDay() === 0;
  return !(SALON_DATA.hours[DAY_MAP[date.getDay()]]?.open);
}

function getOpenHours(date) {
  if (!SALON_DATA?.hours) return { open: '09:00', close: '19:00' };
  return SALON_DATA.hours[DAY_MAP[date.getDay()]] || { open: '09:00', close: '19:00' };
}

function renderBmCalendar() {
  const grid = document.getElementById('bmCalGrid');
  const monthEl = document.getElementById('bmCalMonth');
  const dayNames = grid.querySelectorAll('.bm-cal-dayname');
  grid.innerHTML = ''; dayNames.forEach(dn => grid.appendChild(dn));
  monthEl.textContent = `${MONTH_NAMES[bmState.month]} ${bmState.year}`;
  const firstDay = new Date(bmState.year, bmState.month, 1);
  const lastDay = new Date(bmState.year, bmState.month + 1, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < startDay; i++) { const b = document.createElement('div'); b.classList.add('bm-cal-day', 'empty'); grid.appendChild(b); }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const el = document.createElement('button'); el.classList.add('bm-cal-day'); el.textContent = d;
    const date = new Date(bmState.year, bmState.month, d);
    if (date < today || isDayClosed(date)) el.classList.add('disabled');
    else {
      el.addEventListener('click', () => {
        grid.querySelectorAll('.bm-cal-day').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected'); bmState.date = date; bmState.time = null; renderBmTimeSlots();
      });
    }
    if (date.getTime() === today.getTime()) el.classList.add('today');
    if (bmState.date && date.getTime() === bmState.date.getTime()) el.classList.add('selected');
    grid.appendChild(el);
  }
}

function renderBmTimeSlots() {
  const container = document.getElementById('bmTimeSlots');
  const grid = document.getElementById('bmTimeSlotsGrid');
  container.style.display = 'block'; grid.innerHTML = '';

  const hours = getOpenHours(bmState.date);
  const [oH, oM] = hours.open.split(':').map(Number);
  const [cH, cM] = hours.close.split(':').map(Number);

  const now = new Date();
  const isToday = bmState.date.toDateString() === now.toDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let h = oH, m = oM;
  while (h < cH || (h === cH && m < cM)) {
    const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const slotMinutes = h * 60 + m;

    // Skip lunch (12:00-13:59) and past slots for today
    if ((h < 12 || h >= 14) && !(isToday && slotMinutes <= currentMinutes)) {
      const el = document.createElement('div'); el.classList.add('bm-timeslot'); el.textContent = t;
      el.addEventListener('click', () => {
        grid.querySelectorAll('.bm-timeslot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected'); bmState.time = t;
      });
      grid.appendChild(el);
    }
    m += 30; if (m >= 60) { m = 0; h++; }
  }

  if (grid.children.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:1rem;font-size:0.85rem">Aucun créneau disponible pour cette date</div>';
  }
}

function populateConfirmation() {
  document.getElementById('bmConfService').textContent = bmState.service?.name || '-';
  document.getElementById('bmConfDuration').textContent = bmState.service ? bmState.service.duration + ' min' : '-';
  document.getElementById('bmConfTotal').textContent = bmState.service ? bmState.service.price + ' CHF' : '-';
  if (bmState.date) document.getElementById('bmConfDate').textContent = bmState.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('bmConfTime').textContent = bmState.time || '-';
  const fn = document.getElementById('bmFirstName').value, ln = document.getElementById('bmLastName').value;
  document.getElementById('bmConfName').textContent = fn && ln ? `${fn} ${ln}` : '-';
  document.getElementById('bmConfEmail').textContent = document.getElementById('bmEmail').value || '-';
  document.getElementById('bmConfPhone').textContent = document.getElementById('bmPhone').value || '-';
}

/* ---- Submit ---- */
async function submitBooking() {
  const slug = window.SALON_SLUG;
  const booking = {
    serviceName: bmState.service?.name || '',
    serviceIcon: bmState.service?.icon || '✂️',
    price: bmState.service?.price || 0,
    duration: bmState.service?.duration || 30,
    date: bmState.date ? bmState.date.toISOString().split('T')[0] : '',
    time: bmState.time,
    employeeId: bmState.employee?.id || null,
    employeeName: bmState.employee?.name || null,
    clientName: `${document.getElementById('bmFirstName').value} ${document.getElementById('bmLastName').value}`,
    clientEmail: document.getElementById('bmEmail').value,
    clientPhone: document.getElementById('bmPhone').value,
    notes: document.getElementById('bmNotes').value || '',
  };

  try {
    const endpoint = slug ? `/api/salon/${slug}/book` : '/api/bookings';
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) });
  } catch (e) {
    const b = JSON.parse(localStorage.getItem('salonpro_bookings') || '[]');
    b.push(booking); localStorage.setItem('salonpro_bookings', JSON.stringify(b));
  }

  // Show success inside same modal
  showBookingSuccess();
}

function showBookingSuccess() {
  document.getElementById('bookingModalBody').style.display = 'none';
  document.querySelector('.booking-modal-steps').style.display = 'none';
  document.querySelector('.booking-modal-footer').style.display = 'none';

  const successView = document.getElementById('bmSuccessView');
  successView.style.display = 'flex';
  successView.innerHTML = `
    <div style="text-align:center;padding:2rem 1rem">
      <div style="font-size:4rem;margin-bottom:1rem;animation:fadeInUp 0.5s ease-out">✅</div>
      <h3 style="margin-bottom:0.5rem;font-size:1.3rem">Rendez-vous confirmé !</h3>
      <p style="color:var(--color-text-secondary);margin-bottom:0.5rem;font-size:0.9rem">
        ${bmState.service?.name || 'Prestation'} — ${bmState.date ? bmState.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''} à ${bmState.time || ''}
      </p>
      ${bmState.employee ? `<p style="color:var(--color-text-muted);font-size:0.85rem;margin-bottom:1.5rem">avec ${bmState.employee.name}</p>` : '<div style="margin-bottom:1.5rem"></div>'}
      <p style="color:var(--color-text-muted);font-size:0.82rem;margin-bottom:2rem">Vous recevrez une confirmation par email avec tous les détails.</p>
      <button class="btn btn-primary" onclick="closeBooking()" style="margin:0 auto">Parfait, merci ! 🎉</button>
    </div>
  `;
}

/* ---- Toast ---- */
function showToast(msg) {
  const existing = document.querySelector('.toast'); if (existing) existing.remove();
  const t = document.createElement('div'); t.classList.add('toast');
  t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--color-bg-elevated);color:var(--color-text-primary);padding:0.8rem 1.5rem;border-radius:var(--radius-md);border:1px solid var(--color-warning);box-shadow:var(--shadow-md);z-index:6000;animation:fadeInUp 0.3s ease-out;font-size:0.88rem;white-space:nowrap;';
  t.innerHTML = `⚠️ ${msg}`; document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* ---- Smooth Scroll ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const href = this.getAttribute('href'); if (href === '#') return;
    e.preventDefault(); const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
