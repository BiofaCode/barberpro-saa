/* ============================================
   BARBER PRO - Main Application Logic
   Dynamically branded per salon
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
    } catch (e) {
      console.warn('Could not load salon data:', e);
    }
  }

  initNavbar();
  initParticles();
  initCounters();
  initScrollReveal();
  initBookingModal();
});

/* ============================================
   DYNAMIC SALON BRANDING
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

  // Logo + name
  const logoEl = document.querySelector('.nav-logo-text');
  const logoIcon = document.querySelector('.nav-logo-icon');
  if (salon.logo && logoIcon) {
    logoIcon.innerHTML = `<img src="${salon.logo}" alt="${salon.name}" style="width:36px;height:36px;object-fit:cover;border-radius:8px">`;
  }
  if (logoEl) logoEl.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');

  // Hero
  const heroTitle = document.querySelector('.hero h1');
  const heroSub = document.querySelector('.hero-description');
  if (heroTitle && salon.branding?.heroTitle) heroTitle.innerHTML = salon.branding.heroTitle;
  if (heroSub && salon.branding?.heroSubtitle) heroSub.textContent = salon.branding.heroSubtitle;

  document.title = `${salon.name} | Réservation en ligne`;

  // Update services showcase
  if (salon.services && salon.services.length > 0) {
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
      servicesGrid.innerHTML = salon.services.map(s => `
        <div class="service-card reveal active">
          <div class="service-icon">${s.icon}</div>
          <h3>${s.name}</h3>
          <p>${s.description || ''}</p>
          <div class="service-meta">
            <span class="service-price">${s.price}€</span>
            <span class="service-duration">⏱ ${s.duration} min</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Update footer
  updateFooter(salon);
}

function updateFooter(salon) {
  // Footer logo
  const footerLogo = document.querySelector('.footer-brand .nav-logo-text');
  if (footerLogo) footerLogo.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');

  // Footer description
  const footerDesc = document.querySelector('.footer-brand > p');
  if (footerDesc) footerDesc.textContent = salon.description || `${salon.name} — Votre salon de coiffure premium.`;

  // Footer services
  const footerSvc = document.getElementById('footerServices');
  if (footerSvc && salon.services) {
    footerSvc.innerHTML = `<h4>Services</h4><ul>${salon.services.map(s =>
      `<li><a href="#services">${s.name}</a></li>`
    ).join('')}</ul>`;
  }

  // Footer hours
  const footerHours = document.getElementById('footerHours');
  if (footerHours && salon.hours) {
    const dayLabels = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const lines = [];
    let i = 0;
    while (i < days.length) {
      const d = days[i];
      const h = salon.hours[d];
      if (!h || !h.open) {
        lines.push(`<li><a href="#">${dayLabels[d]} : Fermé</a></li>`);
        i++;
      } else {
        let j = i + 1;
        while (j < days.length && salon.hours[days[j]]?.open === h.open && salon.hours[days[j]]?.close === h.close) j++;
        if (j - i > 1) {
          lines.push(`<li><a href="#">${dayLabels[days[i]]} - ${dayLabels[days[j - 1]]} : ${h.open} - ${h.close}</a></li>`);
        } else {
          lines.push(`<li><a href="#">${dayLabels[d]} : ${h.open} - ${h.close}</a></li>`);
        }
        i = j;
      }
    }
    footerHours.innerHTML = `<h4>Horaires</h4><ul>${lines.join('')}</ul>`;
  }

  // Footer contact
  const footerContact = document.getElementById('footerContact');
  if (footerContact) {
    const items = [];
    if (salon.phone) items.push(`<li><a href="tel:${salon.phone.replace(/\s/g, '')}">📞 ${salon.phone}</a></li>`);
    if (salon.email) items.push(`<li><a href="mailto:${salon.email}">✉️ ${salon.email}</a></li>`);
    if (salon.address) items.push(`<li><a href="#">📍 ${salon.address}</a></li>`);
    if (items.length > 0) footerContact.innerHTML = `<h4>Contact</h4><ul>${items.join('')}</ul>`;
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a:not(.nav-cta)').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });
}

/* ============================================
   HERO PARTICLES
   ============================================ */
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 6 + 's';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    p.style.width = (2 + Math.random() * 4) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}

/* ============================================
   ANIMATED COUNTERS
   ============================================ */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.count);
        let current = 0;
        const inc = target / 60;
        const timer = setInterval(() => {
          current += inc;
          if (current >= target) { current = target; clearInterval(timer); }
          entry.target.textContent = Math.floor(current) + '+';
        }, 30);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

/* ============================================
   SCROLL REVEAL
   ============================================ */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('active');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  reveals.forEach(r => observer.observe(r));
}

/* ============================================
   BOOKING MODAL SYSTEM
   ============================================ */
let bmState = {
  step: 1,
  service: null,
  date: null,
  time: null,
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
};

function openBooking() {
  // Close mobile nav if open
  document.getElementById('navHamburger')?.classList.remove('active');
  document.getElementById('navLinks')?.classList.remove('open');

  // Reset state
  bmState = { step: 1, service: null, date: null, time: null, month: new Date().getMonth(), year: new Date().getFullYear() };

  // Populate services
  populateServices();
  bmUpdateStep(1);

  document.getElementById('bookingModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBooking() {
  document.getElementById('bookingModal').classList.remove('active');
  document.body.style.overflow = '';
}

function populateServices() {
  const grid = document.getElementById('bmServiceGrid');
  const services = SALON_DATA?.services || [
    { name: 'Coupe Classique', icon: '✂️', price: 25, duration: 30 },
    { name: 'Taille de Barbe', icon: '🪒', price: 15, duration: 20 },
    { name: 'Pack Premium', icon: '💎', price: 55, duration: 60 },
    { name: 'Coloration', icon: '🎨', price: 40, duration: 45 },
    { name: 'Soin Capillaire', icon: '🧴', price: 30, duration: 35 },
    { name: 'Coupe Enfant', icon: '👶', price: 18, duration: 25 },
  ];

  grid.innerHTML = services.map(s => `
    <div class="bm-service-card" data-name="${s.name}" data-icon="${s.icon}" data-price="${s.price}" data-duration="${s.duration}">
      <div class="bm-service-icon">${s.icon}</div>
      <div class="bm-service-name">${s.name}</div>
      <div class="bm-service-price">${s.price}€</div>
      <div class="bm-service-dur">${s.duration} min</div>
    </div>
  `).join('');

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.bm-service-card');
    if (!card) return;
    grid.querySelectorAll('.bm-service-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    bmState.service = {
      name: card.dataset.name,
      icon: card.dataset.icon,
      price: parseInt(card.dataset.price),
      duration: parseInt(card.dataset.duration),
    };
  });
}

function initBookingModal() {
  // Calendar nav
  document.getElementById('bmCalPrev').addEventListener('click', () => {
    bmState.month--;
    if (bmState.month < 0) { bmState.month = 11; bmState.year--; }
    renderBmCalendar();
  });
  document.getElementById('bmCalNext').addEventListener('click', () => {
    bmState.month++;
    if (bmState.month > 11) { bmState.month = 0; bmState.year++; }
    renderBmCalendar();
  });

  // Close on overlay click
  document.getElementById('bookingModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBooking();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBooking();
  });
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_MAP = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function getDayName(date) {
  return DAY_MAP[date.getDay()];
}

function isDayClosed(date) {
  if (!SALON_DATA?.hours) return date.getDay() === 0; // Default: Sunday closed
  const dayName = getDayName(date);
  const h = SALON_DATA.hours[dayName];
  return !h || !h.open;
}

function getOpenHours(date) {
  if (!SALON_DATA?.hours) return { open: '09:00', close: '19:00' };
  const dayName = getDayName(date);
  const h = SALON_DATA.hours[dayName];
  return h || { open: '09:00', close: '19:00' };
}

function renderBmCalendar() {
  const grid = document.getElementById('bmCalGrid');
  const monthEl = document.getElementById('bmCalMonth');

  // Keep day names, remove days
  const dayNames = grid.querySelectorAll('.bm-cal-dayname');
  grid.innerHTML = '';
  dayNames.forEach(dn => grid.appendChild(dn));

  monthEl.textContent = `${MONTH_NAMES[bmState.month]} ${bmState.year}`;

  const firstDay = new Date(bmState.year, bmState.month, 1);
  const lastDay = new Date(bmState.year, bmState.month + 1, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement('div');
    blank.classList.add('bm-cal-day', 'empty');
    grid.appendChild(blank);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dayEl = document.createElement('button');
    dayEl.classList.add('bm-cal-day');
    dayEl.textContent = d;

    const date = new Date(bmState.year, bmState.month, d);

    if (date < today || isDayClosed(date)) {
      dayEl.classList.add('disabled');
    } else {
      dayEl.addEventListener('click', () => {
        grid.querySelectorAll('.bm-cal-day').forEach(el => el.classList.remove('selected'));
        dayEl.classList.add('selected');
        bmState.date = date;
        renderBmTimeSlots();
      });
    }

    if (date.getTime() === today.getTime()) dayEl.classList.add('today');
    if (bmState.date && date.getTime() === bmState.date.getTime()) dayEl.classList.add('selected');

    grid.appendChild(dayEl);
  }
}

function renderBmTimeSlots() {
  const container = document.getElementById('bmTimeSlots');
  const grid = document.getElementById('bmTimeSlotsGrid');
  container.style.display = 'block';
  grid.innerHTML = '';

  const hours = getOpenHours(bmState.date);
  const openH = parseInt(hours.open.split(':')[0]);
  const openM = parseInt(hours.open.split(':')[1]);
  const closeH = parseInt(hours.close.split(':')[0]);
  const closeM = parseInt(hours.close.split(':')[1]);

  const slots = [];
  let h = openH, m = openM;
  while (h < closeH || (h === closeH && m < closeM)) {
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    // Skip lunch break 12:00-13:59
    if (h < 12 || h >= 14) {
      slots.push(timeStr);
    }
    m += 30;
    if (m >= 60) { m = 0; h++; }
  }

  slots.forEach(time => {
    const slotEl = document.createElement('div');
    slotEl.classList.add('bm-timeslot');
    slotEl.textContent = time;
    slotEl.addEventListener('click', () => {
      grid.querySelectorAll('.bm-timeslot').forEach(s => s.classList.remove('selected'));
      slotEl.classList.add('selected');
      bmState.time = time;
    });
    grid.appendChild(slotEl);
  });
}

function bmUpdateStep(step) {
  bmState.step = step;

  document.querySelectorAll('.bm-section').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.section) === step);
  });

  document.querySelectorAll('.bm-step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.remove('active', 'completed');
    if (n === step) s.classList.add('active');
    else if (n < step) s.classList.add('completed');
  });

  document.getElementById('bmPrev').style.display = step === 1 ? 'none' : '';
  document.getElementById('bmNext').textContent = step === 4 ? '✓ Confirmer le RDV' : 'Suivant →';

  if (step === 2) renderBmCalendar();
  if (step === 4) populateConfirmation();
}

function populateConfirmation() {
  document.getElementById('bmConfService').textContent = bmState.service?.name || '-';
  document.getElementById('bmConfDuration').textContent = bmState.service ? bmState.service.duration + ' min' : '-';
  document.getElementById('bmConfTotal').textContent = bmState.service ? bmState.service.price + '€' : '-';

  if (bmState.date) {
    document.getElementById('bmConfDate').textContent = bmState.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  document.getElementById('bmConfTime').textContent = bmState.time || '-';

  const fn = document.getElementById('bmFirstName').value;
  const ln = document.getElementById('bmLastName').value;
  document.getElementById('bmConfName').textContent = fn && ln ? `${fn} ${ln}` : '-';
  document.getElementById('bmConfEmail').textContent = document.getElementById('bmEmail').value || '-';
  document.getElementById('bmConfPhone').textContent = document.getElementById('bmPhone').value || '-';
}

function bmNextStep() {
  if (bmState.step === 1 && !bmState.service) { showToast('Choisissez un service'); return; }
  if (bmState.step === 2 && (!bmState.date || !bmState.time)) { showToast('Choisissez une date et un créneau'); return; }
  if (bmState.step === 3) {
    const fn = document.getElementById('bmFirstName').value.trim();
    const ln = document.getElementById('bmLastName').value.trim();
    const em = document.getElementById('bmEmail').value.trim();
    const ph = document.getElementById('bmPhone').value.trim();
    if (!fn || !ln || !em || !ph) { showToast('Remplissez tous les champs'); return; }
  }
  if (bmState.step === 4) { submitBooking(); return; }
  bmUpdateStep(bmState.step + 1);
}

function bmPrevStep() {
  if (bmState.step > 1) bmUpdateStep(bmState.step - 1);
}

/* ============================================
   SUBMIT BOOKING
   ============================================ */
async function submitBooking() {
  const slug = window.SALON_SLUG;
  const booking = {
    serviceName: bmState.service?.name || '',
    serviceIcon: bmState.service?.icon || '✂️',
    price: bmState.service?.price || 0,
    duration: bmState.service?.duration || 30,
    date: bmState.date.toISOString().split('T')[0],
    time: bmState.time,
    clientName: `${document.getElementById('bmFirstName').value} ${document.getElementById('bmLastName').value}`,
    clientEmail: document.getElementById('bmEmail').value,
    clientPhone: document.getElementById('bmPhone').value,
    notes: document.getElementById('bmNotes').value || '',
  };

  try {
    const endpoint = slug ? `/api/salon/${slug}/book` : '/api/bookings';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
    if (res.ok) console.log('✅ Booking sent');
  } catch (e) {
    console.log('API not available, saved locally');
    const bookings = JSON.parse(localStorage.getItem('barberpro_bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('barberpro_bookings', JSON.stringify(bookings));
  }

  document.getElementById('successModal').classList.add('active');
}

/* ============================================
   TOAST
   ============================================ */
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: var(--color-bg-elevated); color: var(--color-text-primary);
    padding: 0.8rem 1.5rem; border-radius: var(--radius-md);
    border: 1px solid var(--color-warning); box-shadow: var(--shadow-md);
    z-index: 6000; animation: fadeInUp 0.3s ease-out; font-size: 0.88rem;
    display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;
  `;
  toast.innerHTML = `⚠️ ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
