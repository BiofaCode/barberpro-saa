/* ============================================
   Calcul des créneaux proposés au client (page de réservation + popup).
   Fonction pure, partagée navigateur / Node (tests : tests/slots.test.js).

   Réglages du salon (salon.bookingSettings) :
   - interval : « tous les combien » on propose un horaire (5 à 60 min, défaut 30)
   - minGap   : trou minimum accepté entre deux RDV (0 = pas de règle).
                Ex. 30 → pas de coupe à 10h si la précédente finit à 9h45 (15 min perdues).
   En plus de la grille, on propose toujours l'horaire qui suit pile la fin d'un RDV
   (et celui qui finit pile au début du suivant) pour que les RDV s'enchaînent.
   ============================================ */
(function (root) {
  function toMin(t) {
    const [h, m] = String(t).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  function toHHMM(n) {
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  }

  /**
   * @param {object} o
   * @param {string} o.open   'HH:MM'
   * @param {string} o.close  'HH:MM'
   * @param {number} o.duration  durée de la prestation (min)
   * @param {number} [o.interval=30]
   * @param {number} [o.minGap=0]
   * @param {{start:string,duration:number}[]} [o.busy]  RDV + blocages du jour
   * @param {number|null} [o.nowMin]  minutes écoulées aujourd'hui (null si autre jour)
   * @returns {string[]} horaires 'HH:MM' triés
   */
  function computeSlots(o) {
    const open = toMin(o.open);
    const close = toMin(o.close);
    const duration = Math.max(5, Number(o.duration) || 30);
    const interval = Math.max(5, Number(o.interval) || 30);
    const minGap = Math.max(0, Number(o.minGap) || 0);
    const nowMin = o.nowMin == null ? null : Number(o.nowMin);
    const busy = (o.busy || [])
      .map(b => ({ s: toMin(b.start), e: toMin(b.start) + (Number(b.duration) || 30) }))
      .filter(b => b.e > b.s);

    const cand = new Set();
    for (let t = open; t + duration <= close; t += interval) cand.add(t);
    for (const b of busy) {
      cand.add(b.e);            // juste après un RDV
      cand.add(b.s - duration); // finit pile quand le suivant commence
    }

    const out = [];
    for (const start of cand) {
      const end = start + duration;
      if (start < open || end > close) continue;
      if (nowMin != null && start <= nowMin) continue;
      if (busy.some(b => start < b.e && end > b.s)) continue;

      if (minGap > 0) {
        let prevEnd = open, nextStart = close;
        for (const b of busy) {
          if (b.e <= start && b.e > prevEnd) prevEnd = b.e;
          if (b.s >= end && b.s < nextStart) nextStart = b.s;
        }
        // Le temps déjà passé aujourd'hui n'est pas un « trou » à combler.
        const gapBefore = nowMin != null && prevEnd <= nowMin ? 0 : start - prevEnd;
        const gapAfter = nextStart - end;
        const ok = g => g === 0 || g >= minGap;
        // Si la plage libre est trop courte pour éviter un petit trou, on accepte
        // au moins l'horaire collé au RDV précédent (le meilleur possible).
        const leftover = nextStart - prevEnd - duration;
        const unavoidable = leftover < minGap && gapBefore === 0;
        if (!(ok(gapBefore) && ok(gapAfter)) && !unavoidable) continue;
      }
      out.push(start);
    }
    return out.sort((a, b) => a - b).map(toHHMM);
  }

  const api = { computeSlots, toMin, toHHMM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KrenoSlots = api;
})(typeof window !== 'undefined' ? window : this);
