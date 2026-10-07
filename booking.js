(function () {
  'use strict';

  /* ============================================================
     SETTINGS - change these to match Nkechi's real schedule
     ============================================================ */
  var CONFIG = {
    treatments: [
      { name: 'Deep Tissue Massage',    length: '60 min', price: '$130' },
      { name: 'Therapeutic Massage',    length: '60 min', price: '$110' },
      { name: 'Prenatal Massage',       length: '60 min', price: '$130' },
      { name: 'Relaxation Massage',     length: '60 min', price: '$110' },
      { name: 'Express / Foot Massage', length: '30 min', price: '$60'  }
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
  function renderTreatments() {
    els.treatments.innerHTML = '';
    CONFIG.treatments.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bk-treat' + (state.treatment === t.name ? ' selected' : '');
      btn.setAttribute('aria-pressed', state.treatment === t.name ? 'true' : 'false');

      var title = document.createElement('strong');
      title.textContent = t.name;
      var meta = document.createElement('span');
      meta.textContent = t.length + ' \u2022 ' + t.price;

      btn.appendChild(title);
      btn.appendChild(meta);
      btn.addEventListener('click', function () {
        state.treatment = t.name;
        renderTreatments();
        updateSummary();
      });
      els.treatments.appendChild(btn);
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
  renderTreatments();
  renderCalendar();
  renderTimes();
})();
