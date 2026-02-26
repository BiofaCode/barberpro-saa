/* ============================================
   BARBER PRO - Main Application Logic
   Dynamically branded per salon
   ============================================ */

// Salon data loaded from API
let SALON_DATA = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Load salon data if we're on a salon-specific page
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

  // Initialize all modules
  initNavbar();
  initParticles();
  initCounters();
  initScrollReveal();
  initBookingSystem();
});

/* ============================================
   DYNAMIC SALON BRANDING
   ============================================ */
function applySalonBranding(salon) {
  // Apply colors
  if (salon.branding) {
    const b = salon.branding;
    document.documentElement.style.setProperty('--color-primary', b.primaryColor || '#C9A96E');
    document.documentElement.style.setProperty('--color-primary-light', b.accentColor || '#D4B97E');
    // Update glow too
    const hex = b.primaryColor || '#C9A96E';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--color-primary-glow', `rgba(${r},${g},${bl},0.3)`);
    document.documentElement.style.setProperty('--color-primary-dark', b.accentColor || '#A88B52');
  }

  // Apply salon name + logo
  const logoEl = document.querySelector('.nav-logo-text');
  const logoIcon = document.querySelector('.nav-logo-icon');
  if (salon.logo) {
    if (logoIcon) logoIcon.innerHTML = `<img src="${salon.logo}" alt="${salon.name}" style="width:36px;height:36px;object-fit:cover;border-radius:8px">`;
  }
  if (logoEl) logoEl.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');

  // Hero content
  const heroTitle = document.querySelector('.hero h1');
  const heroSub = document.querySelector('.hero-description');
  if (heroTitle && salon.branding?.heroTitle) {
    heroTitle.innerHTML = salon.branding.heroTitle;
  }
  if (heroSub && salon.branding?.heroSubtitle) heroSub.textContent = salon.branding.heroSubtitle;

  // Page title
  document.title = `${salon.name} | Réservation en ligne`;

  // Update services dynamically
  updateServicesFromSalon(salon);

  // Update footer dynamically
  updateFooterFromSalon(salon);
}

function updateFooterFromSalon(salon) {
  // Update footer logo
  const footerLogo = document.querySelector('.footer-brand .nav-logo-text');
  if (footerLogo) footerLogo.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');

  // Update footer description
  const footerDesc = document.querySelector('.footer-brand > p');
  if (footerDesc) footerDesc.textContent = salon.description || `${salon.name} — Votre salon de coiffure premium.`;

  // Update hours in footer
  const hoursColumn = document.querySelectorAll('.footer-column')[1]; // 2nd column = Horaires
  if (hoursColumn && salon.hours) {
    const dayLabels = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

    // Group consecutive days with same hours
    const lines = [];
    let i = 0;
    while (i < days.length) {
      const d = days[i];
      const h = salon.hours[d];
      if (!h || !h.open) {
        lines.push(`<li><a href="#">${dayLabels[d]} : Fermé</a></li>`);
        i++;
      } else {
        // Find consecutive days with same hours
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
    hoursColumn.innerHTML = `<h4>Horaires</h4><ul>${lines.join('')}</ul>`;
  }

  // Update contact in footer
  const contactColumn = document.querySelectorAll('.footer-column')[2]; // 3rd column = Contact
  if (contactColumn) {
    const items = [];
    if (salon.phone) items.push(`<li><a href="tel:${salon.phone.replace(/\s/g, '')}">📞 ${salon.phone}</a></li>`);
    if (salon.email) items.push(`<li><a href="mailto:${salon.email}">✉️ ${salon.email}</a></li>`);
    if (salon.address) items.push(`<li><a href="#">📍 ${salon.address}</a></li>`);
    if (items.length > 0) contactColumn.innerHTML = `<h4>Contact</h4><ul>${items.join('')}</ul>`;
  }
}

function updateServicesFromSalon(salon) {
  if (!salon.services || salon.services.length === 0) return;

  // Update service cards in booking section
  const serviceGrid = document.querySelector('.service-select-grid');
  if (serviceGrid) {
    serviceGrid.innerHTML = salon.services.map(s => `
      <div class="service-select-card" data-service="${s._id || s.name}" data-price="${s.price}" data-duration="${s.duration}">
        <div class="service-select-icon">${s.icon}</div>
        <div class="service-select-name">${s.name}</div>
        <div class="service-select-price">${s.price}€</div>
        <div class="service-select-duration">${s.duration} min</div>
      </div>
    `).join('');
  }

  // Update services showcase section
  const servicesGrid = document.querySelector('.services-grid');
  if (servicesGrid) {
    servicesGrid.innerHTML = salon.services.map(s => `
      <div class="service-card reveal">
        <div class="service-icon">${s.icon}</div>
        <h3 class="service-name">${s.name}</h3>
        <p class="service-desc">${s.description}</p>
        <div class="service-meta">
          <span class="service-price">${s.price}€</span>
          <span class="service-duration">${s.duration} min</span>
        </div>
      </div>
    `).join('');
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile menu
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
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
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.width = (2 + Math.random() * 4) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
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
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 60;
  const suffix = target >= 1000 ? '+' : '+';

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current) + suffix;
  }, 30);
}

/* ============================================
   SCROLL REVEAL ANIMATIONS
   ============================================ */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(reveal => observer.observe(reveal));
}

/* ============================================
   BOOKING SYSTEM
   ============================================ */
function initBookingSystem() {
  const state = {
    currentStep: 1,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
  };

  const serviceNames = {
    coupe: 'Coupe Classique',
    barbe: 'Taille de Barbe',
    premium: 'Pack Premium',
    coloration: 'Coloration',
    soin: 'Soin Capillaire',
    enfant: 'Coupe Enfant'
  };

  // Service Selection (event delegation for dynamic cards)
  function bindServiceCards() {
    const grid = document.querySelector('.service-select-grid');
    if (!grid) return;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.service-select-card');
      if (!card) return;
      grid.querySelectorAll('.service-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedService = {
        id: card.dataset.service,
        name: card.querySelector('.service-select-name')?.textContent || card.dataset.service,
        icon: card.querySelector('.service-select-icon')?.textContent || '✂️',
        price: parseInt(card.dataset.price),
        duration: parseInt(card.dataset.duration)
      };
    });
  }
  bindServiceCards();

  // Calendar
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('calendarMonth');

    // Clear existing days (but keep day names)
    const dayNames = grid.querySelectorAll('.calendar-day-name');
    grid.innerHTML = '';
    dayNames.forEach(dn => grid.appendChild(dn));

    monthDisplay.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;

    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fill in blank days (Monday = 0)
    let startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) {
      const blank = document.createElement('div');
      blank.classList.add('calendar-day', 'empty');
      grid.appendChild(blank);
    }

    // Fill in days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dayEl = document.createElement('button');
      dayEl.classList.add('calendar-day');
      dayEl.textContent = d;

      const date = new Date(state.currentYear, state.currentMonth, d);
      const dayOfWeek = date.getDay();

      // Disable past dates and Sundays
      if (date < today || dayOfWeek === 0) {
        dayEl.classList.add('disabled');
      } else {
        dayEl.addEventListener('click', () => {
          grid.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
          dayEl.classList.add('selected');
          state.selectedDate = date;
          renderTimeSlots();
        });
      }

      // Mark today
      if (date.getTime() === today.getTime()) {
        dayEl.classList.add('today');
      }

      // Mark selected
      if (state.selectedDate && date.getTime() === state.selectedDate.getTime()) {
        dayEl.classList.add('selected');
      }

      grid.appendChild(dayEl);
    }
  }

  document.getElementById('calendarPrev').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) {
      state.currentMonth = 11;
      state.currentYear--;
    }
    renderCalendar();
  });

  document.getElementById('calendarNext').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) {
      state.currentMonth = 0;
      state.currentYear++;
    }
    renderCalendar();
  });

  function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    const grid = document.getElementById('timeSlotsGrid');
    container.style.display = 'block';
    grid.innerHTML = '';

    const slots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
    ];

    // Simulate some unavailable slots
    const unavailable = new Set(['12:00', '15:00', '16:30']);

    slots.forEach(time => {
      const slotEl = document.createElement('div');
      slotEl.classList.add('time-slot');
      slotEl.textContent = time;

      if (unavailable.has(time)) {
        slotEl.classList.add('unavailable');
      } else {
        slotEl.addEventListener('click', () => {
          grid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          slotEl.classList.add('selected');
          state.selectedTime = time;
        });
      }

      grid.appendChild(slotEl);
    });
  }

  // Step Navigation
  const prevBtn = document.getElementById('bookingPrev');
  const nextBtn = document.getElementById('bookingNext');

  function updateStep(step) {
    state.currentStep = step;

    // Update sections
    document.querySelectorAll('.booking-section').forEach(sec => {
      sec.classList.toggle('active', parseInt(sec.dataset.section) === step);
    });

    // Update step indicators
    document.querySelectorAll('.booking-step').forEach(s => {
      const stepNum = parseInt(s.dataset.step);
      s.classList.remove('active', 'completed');
      if (stepNum === step) s.classList.add('active');
      else if (stepNum < step) s.classList.add('completed');
    });

    // Update buttons
    prevBtn.style.display = step === 1 ? 'none' : '';
    nextBtn.textContent = step === 4 ? '✓ Confirmer le RDV' : 'Suivant →';

    // Populate confirmation
    if (step === 4) {
      populateConfirmation();
    }

    // Render calendar when reaching step 2
    if (step === 2) {
      renderCalendar();
    }
  }

  function populateConfirmation() {
    document.getElementById('confirmService').textContent = state.selectedService?.name || '-';
    document.getElementById('confirmDuration').textContent = state.selectedService ? state.selectedService.duration + ' min' : '-';
    document.getElementById('confirmTotal').textContent = state.selectedService ? state.selectedService.price + '€' : '-';

    if (state.selectedDate) {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      document.getElementById('confirmDate').textContent = state.selectedDate.toLocaleDateString('fr-FR', options);
    }
    document.getElementById('confirmTime').textContent = state.selectedTime || '-';

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    document.getElementById('confirmName').textContent = firstName && lastName ? `${firstName} ${lastName}` : '-';
    document.getElementById('confirmEmail').textContent = document.getElementById('email').value || '-';
    document.getElementById('confirmPhone').textContent = document.getElementById('phone').value || '-';
  }

  nextBtn.addEventListener('click', () => {
    // Validation
    if (state.currentStep === 1 && !state.selectedService) {
      showToast('Veuillez sélectionner un service');
      return;
    }
    if (state.currentStep === 2 && (!state.selectedDate || !state.selectedTime)) {
      showToast('Veuillez choisir une date et un créneau horaire');
      return;
    }
    if (state.currentStep === 3) {
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      if (!firstName || !lastName || !email || !phone) {
        showToast('Veuillez remplir tous les champs obligatoires');
        return;
      }
    }

    if (state.currentStep === 4) {
      // Submit booking
      submitBooking(state);
      return;
    }

    updateStep(state.currentStep + 1);
  });

  prevBtn.addEventListener('click', () => {
    if (state.currentStep > 1) {
      updateStep(state.currentStep - 1);
    }
  });

  // Initialize calendar
  renderCalendar();
}

/* ============================================
   SUBMIT BOOKING
   ============================================ */
async function submitBooking(state) {
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const dateStr = state.selectedDate.toISOString().split('T')[0];
  const slug = window.SALON_SLUG;

  const booking = {
    serviceName: state.selectedService?.name || '',
    serviceId: state.selectedService?.id || '',
    serviceIcon: state.selectedService?.icon || '✂️',
    price: state.selectedService?.price || 0,
    duration: state.selectedService?.duration || 30,
    date: dateStr,
    time: state.selectedTime,
    clientName: `${firstName} ${lastName}`,
    clientEmail: document.getElementById('email').value,
    clientPhone: document.getElementById('phone').value,
    notes: document.getElementById('notes').value || ''
  };

  try {
    const endpoint = slug ? `/api/salon/${slug}/book` : '/api/bookings';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });

    if (response.ok) {
      console.log('✅ Booking sent to API');
    }
  } catch (error) {
    console.log('API not available, booking saved locally');
    const bookings = JSON.parse(localStorage.getItem('barberpro_bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('barberpro_bookings', JSON.stringify(bookings));
  }

  // Show success modal
  document.getElementById('successModal').classList.add('active');
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
    padding: 1rem 1.5rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-warning);
    box-shadow: var(--shadow-md);
    z-index: 3000;
    animation: fadeInUp 0.3s ease-out;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;
  toast.innerHTML = `⚠️ ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ============================================
   SMOOTH SCROLL FOR ANCHOR LINKS
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
