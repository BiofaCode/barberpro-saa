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
  initMobileStickyBtn();

  // Retour depuis Stripe Checkout (paiement booking)
  const urlP = new URLSearchParams(window.location.search);
  if (urlP.get('booking_success') === 'true') {
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => showPaymentSuccess(), 300);
  } else if (urlP.get('booking_cancel') === 'true') {
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => showPaymentCancelled(), 300);
  }
});

function showPaymentSuccess() {
  const modal = document.getElementById('bookingModal');
  if (!modal) return;
  document.getElementById('bookingModalBody').style.display = 'none';
  const stepsEl = document.querySelector('.booking-modal-steps');
  const footerEl = document.querySelector('.booking-modal-footer');
  if (stepsEl) stepsEl.style.display = 'none';
  if (footerEl) footerEl.style.display = 'none';
  const successView = document.getElementById('bmSuccessView');
  if (successView) {
    successView.style.display = 'flex';
    successView.innerHTML = `
      <div style="text-align:center;padding:2rem 1rem">
        <div style="font-size:4rem;margin-bottom:1rem;animation:fadeInUp 0.5s ease-out">✅</div>
        <h3 style="margin-bottom:0.5rem;font-size:1.3rem">Paiement reçu — Rendez-vous confirmé !</h3>
        <p style="color:var(--color-text-muted);font-size:0.82rem;margin-bottom:2rem">Vous recevrez une confirmation par email avec tous les détails.</p>
        <button class="btn btn-primary" onclick="closeBooking()" style="margin:0 auto">Parfait, merci ! 🎉</button>
      </div>
    `;
  }
  modal.classList.add('active');
}

function showPaymentCancelled() {
  // Paiement annulé — on ouvre juste le modal de réservation pour qu'ils réessaient
  openBooking();
}

/* ============================================
   SEO / OG META TAGS
   ============================================ */
function updateMetaTags(salon) {
  const setMeta = (prop, content, attr = 'name') => {
    let el = document.querySelector(`meta[${attr}="${prop}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
    el.setAttribute('content', content);
  };
  const desc = salon.description || `Prenez rendez-vous en ligne chez ${salon.name}. Réservation rapide, disponible 24h/24.`;
  const img = salon.branding?.heroImage || salon.logo || '';
  const url = window.location.href;

  // Standard meta
  setMeta('description', desc);

  // Open Graph
  setMeta('og:type', 'website', 'property');
  setMeta('og:title', `${salon.name} | Réservation en ligne`, 'property');
  setMeta('og:description', desc, 'property');
  setMeta('og:url', url, 'property');
  if (img) setMeta('og:image', img, 'property');

  // Twitter Card
  setMeta('twitter:card', img ? 'summary_large_image' : 'summary');
  setMeta('twitter:title', `${salon.name} | Réservation en ligne`);
  setMeta('twitter:description', desc);
  if (img) setMeta('twitter:image', img);

  // Canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = url;
}

/* ============================================
   SALON BRANDING
   ============================================ */
function applySalonBranding(salon) {
  if (salon.branding) {
    const b = salon.branding;
    document.documentElement.style.setProperty('--color-primary', b.primaryColor || '#6366F1');
    document.documentElement.style.setProperty('--color-primary-light', b.accentColor || '#818CF8');
    const hex = b.primaryColor || '#6366F1';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--color-primary-glow', `rgba(${r},${g},${bl},0.3)`);
    document.documentElement.style.setProperty('--color-primary-dark', b.accentColor || '#A88B52');
    if (b.textColor) {
      document.documentElement.style.setProperty('--color-text-primary', b.textColor);
    }
    if (b.backgroundColor) {
      document.documentElement.style.setProperty('--color-bg', b.backgroundColor);
      document.documentElement.style.setProperty('--color-bg-secondary', b.backgroundColor);
      document.body.style.background = b.backgroundColor;
    }
  }

  // Apply hero background image if set
  const heroBgImg = document.getElementById('heroBgImage');
  if (heroBgImg) {
    const heroImg = salon.branding?.heroImage;
    if (heroImg) {
      heroBgImg.src = heroImg;
      heroBgImg.style.display = 'block';
    }
  }

  const logoEl = document.querySelector('.nav-logo-text');
  const salonIcon = salon.branding?.icon || '✂️';
  document.querySelectorAll('.nav-logo-icon').forEach(el => {
    el.innerHTML = salon.logo
      ? `<img src="${salon.logo}" alt="${salon.name}" style="width:36px;height:36px;object-fit:cover;border-radius:8px">`
      : salonIcon;
  });
  if (logoEl) logoEl.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');

  // Update booking CTA button icon
  const ctaBtn = document.querySelector('.booking-cta-card .btn');
  if (ctaBtn) ctaBtn.textContent = `${salonIcon} Réserver Maintenant`;

  // Update favicon dynamically
  const faviconLink = document.getElementById('faviconLink');
  if (faviconLink) {
    faviconLink.href = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E${encodeURIComponent(salonIcon)}%3C/text%3E%3C/svg%3E`;
  }

  const heroTitle = document.querySelector('.hero h1');
  const heroSub = document.querySelector('.hero-description');
  if (heroTitle && salon.branding?.heroTitle) heroTitle.innerHTML = salon.branding.heroTitle;
  if (heroSub && salon.branding?.heroSubtitle) heroSub.textContent = salon.branding.heroSubtitle;

  const stats = salon.branding?.heroStats;
  const statsBlock = document.getElementById('heroStatsBlock');
  if (statsBlock && stats) {
    if (stats.hide) {
      statsBlock.style.display = 'none';
    } else {
      const el1Val = document.getElementById('heroStat1Value');
      const el1Lab = document.getElementById('heroStat1Label');
      if (el1Val) { el1Val.dataset.count = stats.stat1Value || '2500'; el1Val.textContent = '0'; }
      if (el1Lab) el1Lab.textContent = stats.stat1Label || 'Clients satisfaits';

      const el2Val = document.getElementById('heroStat2Value');
      const el2Lab = document.getElementById('heroStat2Label');
      if (el2Val) { el2Val.dataset.count = stats.stat2Value || '8'; el2Val.textContent = '0'; }
      if (el2Lab) el2Lab.textContent = stats.stat2Label || 'Ann\u00e9es d\'exp\u00e9rience';

      const el3Val = document.getElementById('heroStat3Value');
      const el3Lab = document.getElementById('heroStat3Label');
      if (el3Val) { el3Val.dataset.count = stats.stat3Value || '15'; el3Val.textContent = '0'; }
      if (el3Lab) el3Lab.textContent = stats.stat3Label || 'Services uniques';
    }
  }

  document.title = `${salon.name} | Réservation en ligne`;
  updateMetaTags(salon);

  if (salon.services?.length > 0) {
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
      const MAX_VISIBLE = 6;
      const makeCard = (s, hidden) => `
        <div class="service-card reveal active${hidden ? ' service-card-hidden' : ''}" style="${hidden ? 'display:none' : ''}">
          <div class="service-icon">${s.icon}</div>
          <h3>${s.name}</h3>
          <p>${s.description || ''}</p>
          <div class="service-meta">
            <span class="service-price">${s.price} CHF</span>
            <span class="service-duration">⏱ ${s.duration} min</span>
          </div>
        </div>`;
      const extra = salon.services.length - MAX_VISIBLE;
      servicesGrid.innerHTML =
        salon.services.map((s, i) => makeCard(s, i >= MAX_VISIBLE)).join('') +
        (extra > 0 ? `
          <div class="service-card-toggle" style="grid-column:1/-1;text-align:center;margin-top:8px">
            <button id="svcToggleBtn" class="btn btn-outline" onclick="toggleServices(${extra})">
              Voir les ${extra} autres prestations ▾
            </button>
          </div>` : '');
    }
  }

  // Dynamic Gallery
  const gallerySection = document.getElementById('gallery');
  if (gallerySection) {
    const isStarter = salon.subscription?.plan === 'starter' || salon.plan === 'starter';
    if (isStarter) {
      gallerySection.style.display = 'none';
      document.querySelectorAll('a[href="#gallery"]').forEach(el => el.style.display = 'none');
    } else if (salon.gallery?.length > 0) {
      const galleryGrid = gallerySection.querySelector('.gallery-grid');
      if (galleryGrid) {
        galleryGrid.innerHTML = salon.gallery.map(p => `
          <div class="gallery-item">
            <img src="${p.url}" alt="${p.title || 'Photo'}" style="width:100%;height:100%;object-fit:cover">
            <div class="gallery-item-overlay"><span>${p.title || ''}</span></div>
          </div>
        `).join('');
      }
    }
  }

  // Dynamic Testimonials
  const testimonialsSection = document.getElementById('testimonials');
  if (testimonialsSection) {
    const isStarter = salon.subscription?.plan === 'starter' || salon.plan === 'starter';
    if (isStarter) {
      testimonialsSection.style.display = 'none';
      document.querySelectorAll('a[href="#testimonials"]').forEach(el => el.style.display = 'none');
    } else {
      const testimonialsGrid = testimonialsSection.querySelector('.testimonials-grid');
      if (testimonialsGrid) {
        if (salon.testimonials?.length > 0) {
          const stars = n => '★'.repeat(Math.max(0, Math.min(5, n || 5))) + '☆'.repeat(5 - Math.max(0, Math.min(5, n || 5)));
          testimonialsGrid.innerHTML = salon.testimonials.map(t => `
            <div class="testimonial-card reveal active">
              <div class="testimonial-stars">${stars(t.stars)}</div>
              <p class="testimonial-text">"${t.text}"</p>
              <div class="testimonial-author">
                <div class="testimonial-avatar" style="background:linear-gradient(135deg,var(--color-primary),var(--color-primary-dark));display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:var(--color-bg-dark);">
                  ${t.name ? t.name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <div class="testimonial-name">${t.name || 'Client'}</div>
                  <div class="testimonial-role">${t.role || 'Client'}</div>
                </div>
              </div>
            </div>
          `).join('');
          if (salon.testimonials.length > 3) {
            initTestimonialCarousel(testimonialsGrid);
            return; // keep flex carousel layout
          }
        }
        // ≤3 dynamic OR static hardcoded cards → grid layout (no scroll)
        const cols = window.innerWidth < 640 ? '1fr' : 'repeat(auto-fit,minmax(260px,1fr))';
        testimonialsGrid.style.cssText = `display:grid;grid-template-columns:${cols};gap:20px;overflow:visible;scroll-snap-type:none;padding:0`;
      }
    }
  }

  updateFooter(salon);
  renderTeamSection(salon);
  renderMapSection(salon);
  updateAvailabilityBadge(salon);
}

function toggleServices(extra) {
  const hidden = document.querySelectorAll('.service-card-hidden');
  const btn = document.getElementById('svcToggleBtn');
  const isOpen = hidden[0]?.style.display !== 'none';
  hidden.forEach(el => el.style.display = isOpen ? 'none' : '');
  if (btn) btn.innerHTML = isOpen
    ? `Voir les ${extra} autres prestations ▾`
    : `Réduire ▴`;
}

function initTestimonialCarousel(grid) {
  let isHovered = false;

  grid.addEventListener('mouseenter', () => isHovered = true);
  grid.addEventListener('mouseleave', () => isHovered = false);

  // Recalculate dimensions dynamically inside the interval
  setInterval(() => {
    if (isHovered) return;

    const scrollMax = grid.scrollWidth - grid.clientWidth;
    // Scroll by roughly one card width (assuming 3 cards visible)
    const scrollStep = grid.clientWidth / 3;

    if (scrollMax <= 0) return; // Not enough items to scroll

    let newScroll = grid.scrollLeft + scrollStep;

    // If we've hit the end (with a tiny threshold for rounding errors), reset to start
    if (newScroll >= scrollMax - 5) {
      setTimeout(() => { grid.scrollTo({ left: 0, behavior: 'smooth' }); }, 2000);
    } else {
      grid.scrollTo({ left: newScroll, behavior: 'smooth' });
    }
  }, 4000); // 4 seconds delay
}

function updateFooter(salon) {
  const footerLogo = document.querySelector('.footer-brand .nav-logo-text');
  if (footerLogo) footerLogo.innerHTML = salon.name.split(' ').map((w, i) => i === 0 ? w : `<span>${w}</span>`).join(' ');
  const footerDesc = document.querySelector('.footer-brand > p');
  if (footerDesc) footerDesc.textContent = salon.description || `${salon.name} — Votre salon premium.`;

  // Dynamic social media icons
  const footerSocial = document.querySelector('.footer-social');
  if (footerSocial && salon.branding) {
    const b = salon.branding;
    const socials = [];
    if (b.instagram) socials.push(`<a href="${b.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>`);
    if (b.facebook) socials.push(`<a href="${b.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>`);
    if (b.tiktok) socials.push(`<a href="${b.tiktok}" target="_blank" rel="noopener" aria-label="TikTok"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>`);
    if (b.youtube) socials.push(`<a href="${b.youtube}" target="_blank" rel="noopener" aria-label="YouTube"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>`);

    if (socials.length > 0) {
      footerSocial.innerHTML = socials.join('');
      footerSocial.style.display = 'flex';
    } else {
      footerSocial.style.display = 'none';
    }
  }

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
        const raw = e.target.dataset.count;
        const cleanNumber = parseInt(raw.replace(/[^0-9]/g, ''));
        if (isNaN(cleanNumber)) {
          e.target.textContent = raw;
        } else {
          const t = cleanNumber;
          let cur = 0; const inc = t / 60;
          const suffix = raw.replace(/[0-9]/g, ''); // kept non-numbers
          const timer = setInterval(() => { 
            cur += inc; 
            if (cur >= t) { cur = t; clearInterval(timer); } 
            e.target.textContent = Math.floor(cur) + suffix; 
          }, 30);
        }
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

  // Filter employees by service assignment
  if (serviceName) {
    const service = (SALON_DATA?.services || []).find(s => s.name === serviceName);
    if (service && service.assignedEmployees && service.assignedEmployees.length > 0) {
      emps = emps.filter(e => service.assignedEmployees.includes(e._id));
    }
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
  grid.innerHTML = services.map(s => {
    const pm = s.paymentMode || 'none';
    let payBadge = '';
    if (pm === 'deposit') {
      const amt = s.depositType === 'percent' ? `${s.depositAmount || 30}%` : `${s.depositAmount || 20} CHF`;
      payBadge = `<div style="font-size:.7rem;color:var(--color-primary);margin-top:3px;font-weight:500">💳 Acompte ${amt}</div>`;
    } else if (pm === 'full_online') {
      payBadge = `<div style="font-size:.7rem;color:var(--color-primary);margin-top:3px;font-weight:500">💳 Paiement en ligne</div>`;
    }
    return `
    <div class="bm-service-card" data-name="${s.name}" data-icon="${s.icon}" data-price="${s.price}" data-duration="${s.duration}" data-payment-mode="${pm}">
      <div class="bm-service-icon">${s.icon}</div>
      <div class="bm-service-name">${s.name}</div>
      <div class="bm-service-price">${s.price} CHF</div>
      <div class="bm-service-dur">${s.duration} min</div>
      ${payBadge}
    </div>
  `}).join('');
  grid.addEventListener('click', (ev) => {
    const card = ev.target.closest('.bm-service-card'); if (!card) return;
    grid.querySelectorAll('.bm-service-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    bmState.service = { name: card.dataset.name, icon: card.dataset.icon, price: parseInt(card.dataset.price), duration: parseInt(card.dataset.duration), paymentMode: card.dataset.paymentMode || 'none' };
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
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
    const phoneOk = /^[\d\s\+\-\(\)]{7,}$/.test(ph);
    // Clear previous errors
    ['bmFirstName','bmLastName','bmEmail','bmPhone'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.borderColor = ''; el.removeAttribute('data-error'); }
    });
    let hasError = false;
    if (!fn) { markFieldError('bmFirstName'); hasError = true; }
    if (!ln) { markFieldError('bmLastName'); hasError = true; }
    if (!em || !emailOk) { markFieldError('bmEmail', em ? 'Email invalide' : ''); hasError = true; }
    if (!ph || !phoneOk) { markFieldError('bmPhone', ph ? 'Téléphone invalide' : ''); hasError = true; }
    if (hasError) { showToast('Vérifiez les champs en rouge'); return; }
  }
  if (stepId === 'confirm') { submitBooking(); return; }
  goToStep(bmState.stepIdx + 1);
}

function markFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--color-error)';
  el.style.boxShadow = '0 0 0 2px rgba(248,113,113,0.2)';
  // Live-clear on input
  const clear = () => { el.style.borderColor = ''; el.style.boxShadow = ''; el.removeEventListener('input', clear); };
  el.addEventListener('input', clear);
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
  const dayName = DAY_MAP[date.getDay()];

  if (bmState.employee && bmState.employee.id) {
    const emp = (SALON_DATA?.employees || []).find(e => e._id === bmState.employee.id);
    if (emp && emp.hours) return !(emp.hours[dayName]?.open);
  }

  if (!SALON_DATA?.hours) return date.getDay() === 0;
  return !(SALON_DATA.hours[dayName]?.open);
}

function getOpenHours(date) {
  const dayName = DAY_MAP[date.getDay()];

  if (bmState.employee && bmState.employee.id) {
    const emp = (SALON_DATA?.employees || []).find(e => e._id === bmState.employee.id);
    if (emp && emp.hours && emp.hours[dayName]?.open) {
      return emp.hours[dayName];
    }
  }

  if (!SALON_DATA?.hours) return { open: '09:00', close: '19:00' };
  return SALON_DATA.hours[dayName] || { open: '09:00', close: '19:00' };
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
  container.style.display = 'block';
  // Skeleton shimmer while slots render
  grid.innerHTML = Array(8).fill(0).map(() =>
    '<div class="bm-timeslot bm-timeslot-skeleton"></div>'
  ).join('');
  requestAnimationFrame(() => {
  grid.innerHTML = '';

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
  }); // end requestAnimationFrame
}

function populateConfirmation() {
  document.getElementById('bmConfService').textContent = bmState.service?.name || '-';
  document.getElementById('bmConfDuration').textContent = bmState.service ? bmState.service.duration + ' min' : '-';

  // Affiche le bon montant selon le mode de paiement
  const pm = bmState.service?.paymentMode || 'none';
  const price = bmState.service?.price || 0;
  let totalLabel = price + ' CHF';
  if (pm === 'deposit') {
    const s = bmState.service;
    const amt = s.depositType === 'percent' ? Math.ceil(price * (s.depositAmount || 30) / 100) : (s.depositAmount || 20);
    totalLabel = `${price} CHF (acompte ${amt} CHF en ligne, reste sur place)`;
  } else if (pm === 'full_online') {
    totalLabel = `${price} CHF (paiement en ligne)`;
  }
  document.getElementById('bmConfTotal').textContent = totalLabel;

  if (bmState.date) document.getElementById('bmConfDate').textContent = bmState.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('bmConfTime').textContent = bmState.time || '-';
  const fn = document.getElementById('bmFirstName').value, ln = document.getElementById('bmLastName').value;
  document.getElementById('bmConfName').textContent = fn && ln ? `${fn} ${ln}` : '-';
  document.getElementById('bmConfEmail').textContent = document.getElementById('bmEmail').value || '-';
  document.getElementById('bmConfPhone').textContent = document.getElementById('bmPhone').value || '-';

  // Change le bouton si paiement requis
  const nextBtn = document.getElementById('bmNext');
  if (nextBtn && (pm === 'deposit' || pm === 'full_online')) {
    nextBtn.textContent = '💳 Payer maintenant';
  }
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

  const paymentMode = bmState.service?.paymentMode || 'none';

  // Si paiement en ligne requis → Stripe Checkout
  if (slug && (paymentMode === 'deposit' || paymentMode === 'full_online')) {
    try {
      const res = await fetch(`/api/salon/${slug}/payment/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking)
      });
      const data = await res.json();
      if (data.success && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
        return;
      }
      // Si erreur paiement (ex: Stripe non configuré), bascule sur réservation classique
    } catch (e) { /* bascule sur flow classique */ }
  }

  // Flow standard (sans paiement en ligne)
  try {
    const endpoint = slug ? `/api/salon/${slug}/book` : '/api/bookings';
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) });
  } catch (e) {
    const b = JSON.parse(localStorage.getItem('salonpro_bookings') || '[]');
    b.push(booking); localStorage.setItem('salonpro_bookings', JSON.stringify(b));
  }

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
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast'); if (existing) existing.remove();
  const t = document.createElement('div'); t.classList.add('toast');
  const borderColor = type === 'error' ? 'var(--color-error)' : 'var(--color-success)';
  const icon = type === 'error' ? '❌' : '✅';
  const displayMsg = msg.startsWith('🔔') ? msg : `${icon} ${msg}`;
  t.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--color-bg-elevated);color:var(--color-text-primary);padding:0.8rem 1.5rem;border-radius:var(--radius-md);border:1px solid ${borderColor};box-shadow:var(--shadow-lg);z-index:9999;animation:fadeInUp 0.3s ease-out;font-size:0.95rem;white-space:nowrap;font-weight:500;`;
  t.innerHTML = displayMsg; document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s ease'; setTimeout(() => t.remove(), 300); }, 4000);
}

/* ---- Smooth Scroll ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const href = this.getAttribute('href'); if (href === '#') return;
    e.preventDefault(); const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ============================================
   MY BOOKINGS LOGIC
   ============================================ */
function openMyBookings() {
  document.getElementById('myBookingsModal').classList.add('active');
  resetMyBookings();
}

function closeMyBookings() {
  document.getElementById('myBookingsModal').classList.remove('active');
}

function resetMyBookings() {
  document.getElementById('mbLookupView').style.display = 'block';
  document.getElementById('mbOtpView').style.display = 'none';
  document.getElementById('mbListView').style.display = 'none';
  document.getElementById('mbEmail').value = '';
  document.getElementById('mbOtp').value = '';
  document.getElementById('mbError').style.display = 'none';
  document.getElementById('mbOtpError').style.display = 'none';
}

async function requestMyBookingsOtp() {
  const email = document.getElementById('mbEmail').value.trim();
  const errEl = document.getElementById('mbError');
  if (!email || !email.includes('@')) {
    errEl.textContent = 'Veuillez entrer une adresse email valide.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('mbLookupBtn');
  btn.textContent = 'Envoi en cours...';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const res = await fetch(`/api/salon/${window.SALON_SLUG}/my-bookings/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    btn.textContent = 'Recevoir mon code';
    btn.disabled = false;

    if (!data.success) {
      errEl.textContent = data.error || 'Erreur lors de la demande.';
      errEl.style.display = 'block';
      return;
    }

    // Move to OTP step
    document.getElementById('mbLookupView').style.display = 'none';
    document.getElementById('mbOtpView').style.display = 'block';
    document.getElementById('mbOtpEmailDisplay').textContent = email;
    document.getElementById('mbOtp').focus();

    // TEMPORARY: Show code in toast for testing without email
    if (data._devCode) {
      showToast(`🔔 Pour tester, voici votre code : ${data._devCode}`);
    } else {
      showToast('Un code a été envoyé à votre adresse email.');
    }

  } catch (err) {
    btn.textContent = 'Recevoir mon code';
    btn.disabled = false;
    errEl.textContent = 'Erreur de connexion.';
    errEl.style.display = 'block';
  }
}

async function verifyMyBookingsOtp() {
  const email = document.getElementById('mbEmail').value.trim();
  const code = document.getElementById('mbOtp').value.trim();
  const errEl = document.getElementById('mbOtpError');

  if (code.length !== 4) {
    errEl.textContent = 'Veuillez entrer le code à 4 chiffres.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('mbVerifyBtn');
  btn.textContent = 'Vérification...';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const res = await fetch(`/api/salon/${window.SALON_SLUG}/my-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    btn.textContent = 'Vérifier et accéder';
    btn.disabled = false;

    if (!data.success) {
      errEl.textContent = data.error || 'Code invalide ou expiré.';
      errEl.style.display = 'block';
      return;
    }

    // Success: render bookings list
    document.getElementById('mbOtpView').style.display = 'none';
    renderMyBookings(email, data.data);
  } catch (err) {
    btn.textContent = 'Vérifier et accéder';
    btn.disabled = false;
    errEl.textContent = 'Erreur de connexion.';
    errEl.style.display = 'block';
  }
}

function renderMyBookings(email, bookings) {
  document.getElementById('mbLookupView').style.display = 'none';
  document.getElementById('mbListView').style.display = 'block';
  document.getElementById('mbListSubtitle').textContent = `Rendez-vous pour : ${email}`;

  const container = document.getElementById('mbListContainer');
  if (bookings.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:var(--space-xl) 0; color:var(--text-muted)">Aucun rendez-vous trouvé pour cet email.</div>';
    return;
  }

  const statusMap = {
    'confirmed': { label: 'Confirmé', color: 'var(--color-success)' },
    'pending': { label: 'En attente', color: 'var(--color-warning)' },
    'completed': { label: 'Terminé', color: 'var(--color-info)' },
    'cancelled': { label: 'Annulé', color: 'var(--color-error)' }
  };

  container.innerHTML = bookings.map(b => {
    const st = statusMap[b.status] || { label: b.status, color: 'gray' };
    const canCancel = (b.status === 'confirmed' || b.status === 'pending');

    // Format date string from YYYY-MM-DD to DD/MM/YYYY
    let dateStr = b.date;
    try {
      const [y, m, d] = b.date.split('-');
      if (y && m && d) dateStr = `${d}/${m}/${y}`;
    } catch (e) { }

    return `
      <div style="border:1px solid var(--color-bg-elevated); border-radius:var(--radius-md); padding:var(--space-md); background:var(--color-bg-card)">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-sm)">
          <div>
            <div style="font-weight:600; font-size:1.1rem; margin-bottom:4px">${b.serviceIcon} ${b.serviceName}</div>
            <div style="font-size:0.9rem; color:var(--color-text-secondary)">Le ${dateStr} à ${b.time}</div>
          </div>
          <span style="font-size:0.75rem; font-weight:600; padding:4px 8px; border-radius:12px; border:1px solid ${st.color}40; color:${st.color}; background:${st.color}15">
            ${st.label}
          </span>
        </div>
        ${b.employeeName ? `<div style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:8px">👤 Avec ${b.employeeName}</div>` : ''}
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05)">
          <div style="font-weight:700">${b.price} CHF</div>
          ${canCancel ? `<button class="btn btn-sm" style="background:transparent; border:1px solid var(--color-error); color:var(--color-error); padding:6px 12px; font-size:0.8rem" onclick="cancelBooking('${b._id}')">Annuler</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function cancelBooking(id) {
  if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;

  try {
    const res = await fetch(`/api/salon/${window.SALON_SLUG}/bookings/${id}/cancel`, { method: 'PUT' });
    const data = await res.json();

    if (data.success) {
      showToast('Rendez-vous annulé avec succès', 'success');
      verifyMyBookingsOtp(); // Refresh the list using current email/code
    } else {
      showToast(data.error || 'Erreur lors de l\'annulation', 'error');
    }
  } catch (e) {
    showToast('Erreur de connexion', 'error');
  }
}

/* ============================================
   TEAM SECTION
   ============================================ */
function renderTeamSection(salon) {
  const employees = salon.employees;
  const teamSection = document.getElementById('teamSection');
  if (!teamSection) return;

  if (!employees || employees.length === 0) {
    teamSection.style.display = 'none';
    document.querySelectorAll('a[href="#team"]').forEach(el => el.style.display = 'none');
    return;
  }

  const grid = document.getElementById('teamGrid');
  if (!grid) return;

  grid.innerHTML = employees.map(emp => {
    const initials = (emp.name || '?')[0].toUpperCase();
    const avatarHtml = emp.photo
      ? `<img src="${emp.photo}" alt="${emp.name}" loading="lazy">`
      : initials;
    const specialtiesHtml = (emp.specialties || []).length > 0
      ? emp.specialties.map(s => `<span class="team-specialty-tag">${s}</span>`).join('')
      : '<span class="team-specialties">Tous services</span>';

    return `
      <div class="team-card reveal active">
        <div class="team-avatar">${avatarHtml}</div>
        <div class="team-name">${emp.name || 'Professionnel'}</div>
        <div class="team-specialties">${specialtiesHtml}</div>
      </div>
    `;
  }).join('');
}

/* ============================================
   GOOGLE MAPS EMBED
   ============================================ */
function renderMapSection(salon) {
  const mapSection = document.getElementById('mapSection');
  if (!mapSection || !salon.address) {
    if (mapSection) mapSection.style.display = 'none';
    return;
  }

  const encoded = encodeURIComponent(salon.address);
  const mapContainer = document.getElementById('mapEmbed');
  if (mapContainer) {
    mapContainer.innerHTML = `<iframe
      src="https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=0,0&query=${encoded}"
      allowfullscreen
      loading="lazy"
      title="Localisation de ${salon.name || 'notre salon'}"
      style="border:0"
    ></iframe>`;
    // Use Nominatim to geocode and get real bbox
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`)
      .then(r => r.json())
      .then(results => {
        if (!results || !results.length) return;
        const { lat, lon, boundingbox } = results[0];
        const latF = parseFloat(lat), lonF = parseFloat(lon);
        const delta = 0.005;
        const bbox = `${lonF - delta},${latF - delta},${lonF + delta},${latF + delta}`;
        const iframe = mapContainer.querySelector('iframe');
        if (iframe) {
          iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latF},${lonF}`;
        }
      })
      .catch(() => {});
  }
}

/* ============================================
   BADGE "DISPONIBLE AUJOURD'HUI"
   ============================================ */
function updateAvailabilityBadge(salon) {
  const badge = document.getElementById('heroBadge');
  if (!badge) return;

  const today = new Date();
  const dayName = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][today.getDay()];
  const hours = salon.hours?.[dayName];

  // Check if today is a closed date
  const todayStr = today.toISOString().split('T')[0];
  const isClosed = (salon.closedDates || []).some(cd => todayStr >= cd.start && todayStr <= cd.end);

  if (isClosed || !hours?.open) {
    badge.innerHTML = `<span class="pulse" style="background:var(--color-error)"></span> Fermé aujourd'hui`;
    badge.style.borderColor = 'rgba(248, 113, 113, 0.2)';
    badge.style.color = 'var(--color-error)';
    return;
  }

  // Check if currently open
  const now = today.getHours() * 60 + today.getMinutes();
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  if (now >= openMin && now < closeMin) {
    badge.innerHTML = `<span class="pulse"></span> Disponible aujourd'hui — ouvert jusqu'à ${hours.close}`;
    badge.style.borderColor = 'rgba(74, 222, 128, 0.25)';
    badge.style.color = 'var(--color-success)';
  } else if (now < openMin) {
    badge.innerHTML = `<span class="pulse"></span> Ouvre aujourd'hui à ${hours.open}`;
  } else {
    badge.innerHTML = `<span class="pulse" style="background:var(--color-warning)"></span> Fermé — rouvre demain`;
    badge.style.borderColor = 'rgba(251, 191, 36, 0.2)';
    badge.style.color = 'var(--color-warning)';
  }
}

/* ============================================
   MOBILE STICKY BTN — hide when modal open
   ============================================ */
function initMobileStickyBtn() {
  const fab = document.getElementById('mobileStickyBtn');
  if (!fab) return;

  let heroCTAVisible = true;
  let modalOpen = false;

  function updateFAB() {
    if (!heroCTAVisible && !modalOpen) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
  }

  // Hide when hero CTA is visible, show when scrolled past it
  const heroCta = document.querySelector('.hero-actions');
  if (heroCta) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { heroCTAVisible = e.isIntersecting; updateFAB(); });
    }, { threshold: 0.3 });
    io.observe(heroCta);
  }

  // Hide when booking modal opens
  const modal = document.getElementById('bookingModal');
  if (modal) {
    const mo = new MutationObserver(() => {
      modalOpen = modal.classList.contains('active');
      updateFAB();
    });
    mo.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
}
