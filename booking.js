(function () {
  'use strict';

  /* ============================================================
     SETTINGS - change these to match Nkechi's real schedule
     ============================================================ */
  var CONFIG = {
    // Treatment menu. options = [minutes, price]. Edit names, descriptions and prices here.
    menu: [
      { group: 'Relaxation & Therapeutic', items: [
        { name: 'Relaxation Massage', desc: 'Smooth, rhythmic gliding strokes designed to soothe your nervous system, boost circulation, and deeply unwind.', options: [[60, 110], [90, 150]] },
        { name: 'Therapeutic Massage', desc: 'Clinical manipulation targeted at strain injuries, postural misalignment, and joint mobility.', options: [[60, 110]] },
        { name: 'Prenatal Massage', desc: 'Soothing, supportive posture therapy for expectant mothers to ease lower back and hip strain.', options: [[60, 130]] },
        { name: 'Craniosacral Therapy Massage', desc: 'An ultra-gentle treatment focused on releasing tension in the head, neck, and spine. It calms the nervous system and helps relieve headaches and mental exhaustion.', options: [[60, 100]] },
        { name: 'Hot Stone Massage', desc: 'Warm stones and soothing massage to melt muscle tension and promote deep relaxation.', options: [[60, 140]] },
        { name: 'Express / Foot Massage', desc: 'A focused short session for localized fatigue and foot pressure points.', options: [[30, 60]] }
      ]},
      { group: 'Deep Tissue & Sports', items: [
        { name: 'Deep Tissue Massage', featured: true, desc: 'Realigns the body by addressing chronic patterns of tension and breaking down stubborn knots (adhesions) that restrict movement and cause discomfort.', options: [[60, 130], [90, 165], [120, 260]] },
        { name: 'Express Deep Tissue: Neck & Back', desc: 'Targets the neck, shoulders, and upper and lower back, where we hold the most daily tension. Ideal for desk-work tightness and stress-related stiffness.', options: [[30, 65]] },
        { name: 'Deep Tissue + Myofascial Cupping', desc: 'A high-performance session to decompress the fascia and release chronic postural strain, for that unlocked feeling in the body.', options: [[110, 200]] },
        { name: 'Sports Massage + Revitalizing Foot Ritual', desc: 'Focused on lactic acid flush and structural recovery, with reflex-point work to ground the body and support healing.', options: [[60, 160]] },
        { name: 'Hot Stone Deep Tissue Massage', desc: 'Deep tissue work combined with the warmth of heated stones.', options: [[60, 150]] }
      ]},
      { group: 'Specialty Care', items: [
        { name: 'TMJ Intra-Oral Therapy', desc: 'Focused release for jaw tension, headaches, and grinding.', options: [[45, 95], [60, 110]] },
        { name: 'Constipation & Visceral Therapy', desc: 'A non-invasive, specialized abdominal treatment to support digestive health. By working with the organs and surrounding fascia, it helps relieve discomfort and restore natural motility.', options: [[60, 90]] }
      ]},
      { group: 'Rituals & Occasions', items: [
        { name: 'Organic Botanical Scrub', desc: 'A full-body exfoliation with scrubs and botanical oils to polish away dull skin, leaving you radiant and deeply hydrated.', options: [[60, 100]] },
        { name: 'The Deluxe Retreat', desc: 'The ultimate head-to-toe reset for birthdays and special occasions, with specialized care for the scalp, the feet, and the mind.', options: [[120, 250]] }
      ]}
    ],

    // Working hours by weekday: 0 = Sunday ... 6 = Saturday. Use null for a day off.
    // Times are 24h. The last slot starts one slot-length before "end"
    // (start 9, end 17 gives 9:00 AM to 4:00 PM start times).
    // PLACEHOLDER HOURS - replace with her real ones.
    hours: {
      0: null,
      1: { start: 9, end: 17 },
      2: { start: 9, end: 17 },
      3: { start: 9, end: 17 },
      4: { start: 9, end: 17 },
      5: { start: 9, end: 17 },
      6: null
    },

    slotMinutes: 60,        // length of each time slot
    minNoticeHours: 24,     // how far ahead a request must be made
    maxDaysAhead: 60,       // how far into the future people can book
    closedDates: []         // days off, e.g. ['2026-12-25', '2026-12-26']
  };

  /* ============================================================
     Code below - no need to edit
     ============================================================ */
  var form = document.getElementById('bk-form');
  if (!form) return;

  var els = {
    treatments: document.getElementById('bk-treatments'),
    month: document.getElementById('bk-month'),
    days: document.getElementById('bk-days'),
    prev: document.getElementById('bk-prev'),
    next: document.getElementById('bk-next'),
    times: document.getElementById('bk-times'),
    summary: document.getElementById('bk-summary'),
    status: document.getElementById('bk-status')
  };

  var now = new Date();
  var state = {
    treatment: null,
    date: null,
    time: null,
    view: new Date(now.getFullYear(), now.getMonth(), 1)
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  // Local date key (avoids the UTC shift that toISOString causes)
  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function timeLabel(totalMinutes) {
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    var suffix = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + pad(m) + ' ' + suffix;
  }

  function prettyDate(d) {
    return d.toLocaleDateString('en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function slotsFor(date) {
    var hours = CONFIG.hours[date.getDay()];
    if (!hours || CONFIG.closedDates.indexOf(dateKey(date)) !== -1) return [];

    var earliest = Date.now() + CONFIG.minNoticeHours * 3600 * 1000;
    var out = [];
    for (var m = hours.start * 60; m + CONFIG.slotMinutes <= hours.end * 60; m += CONFIG.slotMinutes) {
      var start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, m);
      out.push({ label: timeLabel(m), disabled: start.getTime() < earliest });
    }
    return out;
  }

  function dayIsBookable(date) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var last = new Date(today);
    last.setDate(last.getDate() + CONFIG.maxDaysAhead);
    if (date < today || date > last) return false;
    return slotsFor(date).some(function (s) { return !s.disabled; });
  }

  /* ---------- Step 1: treatments ---------- */
  function treatmentLabel(item, opt) {
    return item.name + ' - ' + opt[0] + ' min ($' + opt[1] + ')';
  }

  function selectTreatment(label) {
    state.treatment = label;
    renderTreatments();
    updateSummary();
  }

  function renderTreatments() {
    els.treatments.innerHTML = '';
    CONFIG.menu.forEach(function (g) {
      var heading = document.createElement('p');
      heading.className = 'bk-group';
      heading.textContent = g.group;
      els.treatments.appendChild(heading);

      g.items.forEach(function (item) {
        item.options.forEach(function (opt) {
          var label = treatmentLabel(item, opt);
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'bk-treat' + (state.treatment === label ? ' selected' : '');
          btn.setAttribute('aria-pressed', state.treatment === label ? 'true' : 'false');

          var title = document.createElement('strong');
          title.textContent = item.name;
          var meta = document.createElement('span');
          meta.textContent = opt[0] + ' min \u2022 $' + opt[1];

          btn.appendChild(title);
          btn.appendChild(meta);
          btn.addEventListener('click', function () { selectTreatment(label); });
          els.treatments.appendChild(btn);
        });
      });
    });
  }

  /* ---------- Treatments & Rates section (page menu) ---------- */
  function renderMenu() {
    var root = document.getElementById('menu-root');
    if (!root) return;
    root.innerHTML = '';

    CONFIG.menu.forEach(function (g) {
      var title = document.createElement('h3');
      title.className = 'menu-group-title';
      title.textContent = g.group;
      root.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'treatments-grid menu-grid';

      g.items.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'treatment-card' + (item.featured ? ' featured' : '');

        if (item.featured) {
          var ribbon = document.createElement('div');
          ribbon.className = 'card-ribbon';
          ribbon.textContent = 'Most Requested';
          card.appendChild(ribbon);
        }

        var body = document.createElement('div');
        var h = document.createElement('h3');
        h.className = 'card-title';
        h.textContent = item.name;
        var p = document.createElement('p');
        p.className = 'card-desc';
        p.textContent = item.desc;
        body.appendChild(h);
        body.appendChild(p);
        card.appendChild(body);

        var list = document.createElement('div');
        list.className = 'menu-options';
        item.options.forEach(function (opt) {
          var row = document.createElement('button');
          row.type = 'button';
          row.className = 'menu-opt';
          var len = document.createElement('span');
          len.textContent = opt[0] + ' minutes';
          var price = document.createElement('strong');
          price.textContent = '$' + opt[1];
          row.appendChild(len);
          row.appendChild(price);
          row.setAttribute('aria-label', 'Request ' + item.name + ', ' + opt[0] + ' minutes, $' + opt[1]);
          row.addEventListener('click', function () {
            selectTreatment(treatmentLabel(item, opt));
            document.getElementById('booking-portal').scrollIntoView({ behavior: 'smooth' });
          });
          list.appendChild(row);
        });
        card.appendChild(list);
        grid.appendChild(card);
      });
      root.appendChild(grid);
    });
  }

  /* ---------- Step 2: calendar ---------- */
  function renderCalendar() {
    var v = state.view;
    els.month.textContent = v.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
    els.days.innerHTML = '';

    var leading = v.getDay();
    var daysInMonth = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();

    for (var i = 0; i < leading; i++) {
      els.days.appendChild(document.createElement('span'));
    }

    for (var d = 1; d <= daysInMonth; d++) {
      (function (day) {
        var date = new Date(v.getFullYear(), v.getMonth(), day);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bk-day';
        btn.textContent = day;
        btn.setAttribute('aria-label', prettyDate(date));

        if (!dayIsBookable(date)) btn.disabled = true;
        if (state.date && dateKey(state.date) === dateKey(date)) btn.classList.add('selected');

        btn.addEventListener('click', function () {
          state.date = date;
          state.time = null;
          renderCalendar();
          renderTimes();
          updateSummary();
        });
        els.days.appendChild(btn);
      })(d);
    }

    // Month navigation limits
    var thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    els.prev.disabled = v.getTime() <= thisMonth.getTime();

    var limit = new Date();
    limit.setDate(limit.getDate() + CONFIG.maxDaysAhead);
    els.next.disabled = new Date(v.getFullYear(), v.getMonth() + 1, 1) > limit;
  }

  els.prev.addEventListener('click', function () {
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1);
    renderCalendar();
  });
  els.next.addEventListener('click', function () {
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1);
    renderCalendar();
  });

  /* ---------- Step 3: times ---------- */
  function renderTimes() {
    els.times.innerHTML = '';

    if (!state.date) {
      var hint = document.createElement('p');
      hint.className = 'bk-hint';
      hint.textContent = 'Select a day to see available times.';
      els.times.appendChild(hint);
      return;
    }

    slotsFor(state.date).forEach(function (slot) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bk-time' + (state.time === slot.label ? ' selected' : '');
      btn.textContent = slot.label;
      btn.disabled = slot.disabled;
      btn.setAttribute('aria-pressed', state.time === slot.label ? 'true' : 'false');
      btn.addEventListener('click', function () {
        state.time = slot.label;
        renderTimes();
        updateSummary();
      });
      els.times.appendChild(btn);
    });
  }

  /* ---------- Summary line ---------- */
  function updateSummary() {
    var parts = [];
    if (state.treatment) parts.push(state.treatment);
    if (state.date) parts.push(prettyDate(state.date));
    if (state.time) parts.push(state.time);
    els.summary.textContent = parts.length ? 'Your request: ' + parts.join(', ') : '';
  }

  function setStatus(message, type) {
    els.status.textContent = message;
    els.status.className = 'bk-status' + (type ? ' ' + type : '');
  }

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var f = form.elements;

    if (!state.treatment) return setStatus('Please choose a treatment.', 'err');
    if (!state.date) return setStatus('Please pick a day.', 'err');
    if (!state.time) return setStatus('Please pick a time.', 'err');
    if (!f.name.value.trim() || !f.phone.value.trim() || !f.email.value.trim()) {
      return setStatus('Please fill in your name, phone and email.', 'err');
    }
    if (!f.email.checkValidity()) return setStatus('Please enter a valid email address.', 'err');
    if (!f.consent.checked) return setStatus('Please agree to be contacted so we can confirm your request.', 'err');

    var payload = {
      access_key: f.access_key.value,
      subject: 'Booking request: ' + state.treatment + ' - ' + prettyDate(state.date) + ' at ' + state.time,
      from_name: 'Lux Picssage Website',
      botcheck: f.botcheck.checked,
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      treatment: state.treatment,
      requested_date: prettyDate(state.date),
      requested_time: state.time,
      insurance: f.insurance.value,
      notes: f.notes.value.trim() || '(none)'
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setStatus('Sending your request...', '');

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) throw new Error(data.message || 'Request failed');
        form.reset();
        state.treatment = null;
        state.date = null;
        state.time = null;
        renderTreatments();
        renderCalendar();
        renderTimes();
        updateSummary();
        setStatus('Request sent. Nkechi will contact you to confirm your appointment.', 'ok');
      })
      .catch(function () {
        setStatus('The request could not be sent. Please call 780-818-5904 or email Luxpicssage@gmail.com.', 'err');
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });

  /* ---------- Start ---------- */
  renderMenu();
  renderTreatments();
  renderCalendar();
  renderTimes();
})();
