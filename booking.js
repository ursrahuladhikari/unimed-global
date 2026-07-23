/**
 * UNIMED Global — 2-Step Consultation Booking & Google Calendar Engine (booking.js)
 * Enables 2-step booking flow, real-time time slot availability checks, and 1-click Google Calendar sync.
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    initBookingEngine();
  });

  window.openBookingModal = function(defaultMode) {
    createBookingModalHTML();
    var modal = document.getElementById('unimedBookingModal');
    if (modal) {
      modal.style.display = 'flex';
      goToStep(1);
    }
  };

  window.closeBookingModal = function() {
    var modal = document.getElementById('unimedBookingModal');
    if (modal) modal.style.display = 'none';
  };

  function initBookingEngine() {
    createBookingModalHTML();

    // Intercept all "Book Consultation" / "Schedule a Call" buttons site-wide
    document.querySelectorAll('a, button').forEach(function(el) {
      var text = (el.textContent || '').toLowerCase();
      if (text.includes('book consultation') || text.includes('book a free consultation') || text.includes('schedule a call')) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          openBookingModal();
        });
      }
    });
  }

  var defaultSlots = [
    "09:00 AM",
    "11:30 AM",
    "02:00 PM",
    "04:30 PM"
  ];

  function getBookedConsultations() {
    try {
      var raw = localStorage.getItem('unimed_consultations');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  function getBlockedSlots() {
    try {
      var raw = localStorage.getItem('unimed_blocked_slots');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  function saveConsultation(booking) {
    var list = getBookedConsultations();
    list.push(booking);
    localStorage.setItem('unimed_consultations', JSON.stringify(list));

    // Also push into unimed_leads for unified CRM access
    try {
      var leads = JSON.parse(localStorage.getItem('unimed_leads') || '[]');
      leads.unshift({
        id: 'CON-' + Date.now().toString().slice(-4),
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        country: booking.country + ' (Consultation)',
        neet: booking.mode,
        date: booking.date + ' ' + booking.slot,
        status: 'New',
        message: 'Booked 1-on-1 Consultation slot for ' + booking.date + ' @ ' + booking.slot + ' via ' + booking.mode
      });
      localStorage.setItem('unimed_leads', JSON.stringify(leads));
    } catch(e) {}
  }

  function createBookingModalHTML() {
    if (document.getElementById('unimedBookingModal')) return;

    var target = document.body || document.documentElement;
    if (!target) return;

    var modal = document.createElement('div');
    modal.id = 'unimedBookingModal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 9999999;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      font-family: 'Outfit', sans-serif;
    `;

    var todayStr = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div style="position:relative; width:100%; max-width:540px; background:#1e293b; border:1px solid rgba(255,255,255,0.18); border-radius:28px; padding:32px; box-shadow:0 25px 60px rgba(0,0,0,0.6); color:#ffffff; box-sizing:border-box;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <span style="font-size:0.75rem; font-weight:800; color:#00f2fe; letter-spacing:0.08em; text-transform:uppercase;">UNIMED 1-on-1 Counseling</span>
            <h3 style="margin:4px 0 0 0; font-size:1.4rem; font-weight:800; color:#ffffff;">📅 Book a Free Consultation</h3>
          </div>
          <button type="button" onclick="closeBookingModal()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; width:34px; height:34px; border-radius:50%; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>

        <!-- Step Indicator -->
        <div style="display:flex; gap:8px; margin-bottom:24px;">
          <div id="bookingStepBar1" style="flex:1; height:4px; background:#00f2fe; border-radius:4px; transition:all 0.3s ease;"></div>
          <div id="bookingStepBar2" style="flex:1; height:4px; background:rgba(255,255,255,0.15); border-radius:4px; transition:all 0.3s ease;"></div>
        </div>

        <!-- STEP 1 FORM -->
        <div id="bookingStep1">
          <form onsubmit="handleBookingStep1Submit(event)">
            <div style="display:flex; flex-direction:column; gap:14px;">
              <div>
                <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Full Name *</label>
                <input type="text" id="bkName" required placeholder="e.g. Rahul Sharma" style="width:100%; padding:12px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#ffffff; font-size:0.95rem; box-sizing:border-box;">
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div>
                  <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Email Address *</label>
                  <input type="email" id="bkEmail" required placeholder="rahul@example.com" style="width:100%; padding:12px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#ffffff; font-size:0.95rem; box-sizing:border-box;">
                </div>
                <div>
                  <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">WhatsApp Number *</label>
                  <input type="tel" id="bkPhone" required placeholder="+91 98765 43210" style="width:100%; padding:12px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#ffffff; font-size:0.95rem; box-sizing:border-box;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div>
                  <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Target Country</label>
                  <select id="bkCountry" style="width:100%; padding:12px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#ffffff; font-size:0.95rem; box-sizing:border-box;">
                    <option value="Russia">Russia</option>
                    <option value="Uzbekistan">Uzbekistan</option>
                    <option value="Kazakhstan">Kazakhstan</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Undecided">Undecided / Need Advice</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:4px;">Consultation Mode</label>
                  <select id="bkMode" style="width:100%; padding:12px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#ffffff; font-size:0.95rem; box-sizing:border-box;">
                    <option value="Google Video Call">📹 Google Video Call</option>
                    <option value="Phone Call">📞 Direct Phone Call</option>
                    <option value="Office Visit">🏢 Head Office Visit</option>
                  </select>
                </div>
              </div>

              <button type="submit" style="margin-top:10px; width:100%; padding:14px; background:linear-gradient(135deg, #00f2fe, #3b82f6); border:none; border-radius:14px; color:#0f172a; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 8px 20px rgba(0,242,254,0.3);">
                Proceed to Select Date &amp; Slot →
              </button>
            </div>
          </form>
        </div>

        <!-- STEP 2: DATE & SLOT PICKER -->
        <div id="bookingStep2" style="display:none;">
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:6px;">Select Consultation Date</label>
              <input type="date" id="bkDate" min="${todayStr}" value="${todayStr}" onchange="renderTimeSlots()" style="width:100%; padding:12px; background:#0f172a; border:1px solid rgba(255,255,255,0.2); border-radius:12px; color:#00f2fe; font-weight:700; font-size:1rem; box-sizing:border-box;">
            </div>

            <div>
              <label style="font-size:0.82rem; font-weight:600; color:#94a3b8; display:block; margin-bottom:8px;">Select Available Time Slot</label>
              <div id="bkSlotsContainer" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <!-- Slots populated dynamically -->
              </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:10px;">
              <button type="button" onclick="goToStep(1)" style="flex:1; padding:12px; background:rgba(255,255,255,0.1); border:none; border-radius:12px; color:#ffffff; font-weight:700; cursor:pointer;">← Back</button>
              <button type="button" onclick="confirmConsultationBooking()" style="flex:2; padding:12px; background:linear-gradient(135deg, #22c55e, #16a34a); border:none; border-radius:12px; color:#ffffff; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 8px 20px rgba(34,197,94,0.3);">Confirm &amp; Schedule 📅</button>
            </div>
          </div>
        </div>

        <!-- STEP 3: SUCCESS CONFIRMATION & GOOGLE CALENDAR LINK -->
        <div id="bookingStep3" style="display:none; text-align:center;">
          <div style="font-size:3rem; margin-bottom:10px;">🎉</div>
          <h3 style="margin:0 0 8px 0; font-size:1.3rem; font-weight:800; color:#00f2fe;">Consultation Confirmed!</h3>
          <p style="font-size:0.9rem; color:#94a3b8; line-height:1.5; margin:0 0 20px 0;" id="bkSuccessText">Your appointment has been successfully scheduled.</p>

          <a id="bkGCalLink" href="#" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:14px; background:#ffffff; color:#0f172a; text-decoration:none; font-weight:800; font-size:0.95rem; border-radius:14px; box-shadow:0 8px 25px rgba(255,255,255,0.2); margin-bottom:12px; box-sizing:border-box;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Add to Google Calendar 📅
          </a>

          <button type="button" onclick="closeBookingModal()" style="width:100%; padding:12px; background:rgba(255,255,255,0.1); border:none; border-radius:12px; color:#ffffff; font-weight:700; cursor:pointer;">Done</button>
        </div>

      </div>
    `;

    target.appendChild(modal);
  }

  var selectedSlot = '';
  var currentBookingData = {};

  window.goToStep = function(step) {
    var step1 = document.getElementById('bookingStep1');
    var step2 = document.getElementById('bookingStep2');
    var step3 = document.getElementById('bookingStep3');
    if (step1) step1.style.display = step === 1 ? 'block' : 'none';
    if (step2) step2.style.display = step === 2 ? 'block' : 'none';
    if (step3) step3.style.display = step === 3 ? 'block' : 'none';

    var bar1 = document.getElementById('bookingStepBar1');
    var bar2 = document.getElementById('bookingStepBar2');
    if (bar1) bar1.style.background = '#00f2fe';
    if (bar2) bar2.style.background = step >= 2 ? '#00f2fe' : 'rgba(255,255,255,0.15)';

    if (step === 2) {
      renderTimeSlots();
    }
  };

  window.handleBookingStep1Submit = function(e) {
    if (e) e.preventDefault();
    currentBookingData = {
      name: (document.getElementById('bkName') ? document.getElementById('bkName').value.trim() : ''),
      email: (document.getElementById('bkEmail') ? document.getElementById('bkEmail').value.trim() : ''),
      phone: (document.getElementById('bkPhone') ? document.getElementById('bkPhone').value.trim() : ''),
      country: (document.getElementById('bkCountry') ? document.getElementById('bkCountry').value : 'Russia'),
      mode: (document.getElementById('bkMode') ? document.getElementById('bkMode').value : 'Google Video Call')
    };
    goToStep(2);
  };

  window.renderTimeSlots = function() {
    var container = document.getElementById('bkSlotsContainer');
    if (!container) return;
    var selectedDate = document.getElementById('bkDate') ? document.getElementById('bkDate').value : new Date().toISOString().split('T')[0];

    var booked = getBookedConsultations();
    var blocked = getBlockedSlots();

    var html = '';
    selectedSlot = '';

    defaultSlots.forEach(function(slot) {
      var isBooked = booked.some(function(b) { return b.date === selectedDate && b.slot === slot && b.status !== 'Cancelled'; });
      var isBlocked = blocked.some(function(k) { return k.date === selectedDate && k.slot === slot; });

      if (isBooked || isBlocked) {
        html += `
          <button type="button" disabled style="padding:10px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:10px; color:#f87171; font-size:0.8rem; font-weight:700; cursor:not-allowed; opacity:0.7;">
            🔴 ${slot}<br><span style="font-size:0.7rem; font-weight:400;">(Booked)</span>
          </button>
        `;
      } else {
        var isFirstAvailable = !selectedSlot;
        if (isFirstAvailable) selectedSlot = slot;

        var activeStyle = isFirstAvailable
          ? 'background:linear-gradient(135deg, #00f2fe, #3b82f6); color:#0f172a; border:1px solid #00f2fe;'
          : 'background:rgba(15,23,42,0.8); color:#22c55e; border:1px solid rgba(34,197,94,0.4);';

        html += `
          <button type="button" class="slot-btn" onclick="selectSlot('${slot}', this)" style="padding:10px; ${activeStyle} border-radius:10px; font-size:0.82rem; font-weight:700; cursor:pointer; transition:all 0.2s ease;">
            🟢 ${slot}
          </button>
        `;
      }
    });

    container.innerHTML = html;
  };

  window.selectSlot = function(slot, btnEl) {
    selectedSlot = slot;
    document.querySelectorAll('.slot-btn').forEach(function(btn) {
      btn.style.background = 'rgba(15,23,42,0.8)';
      btn.style.color = '#22c55e';
      btn.style.border = '1px solid rgba(34,197,94,0.4)';
    });
    btnEl.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
    btnEl.style.color = '#0f172a';
    btnEl.style.border = '1px solid #00f2fe';
  };

  window.confirmConsultationBooking = function() {
    if (!selectedSlot) {
      alert('Please select an available time slot.');
      return;
    }

    var selectedDate = document.getElementById('bkDate') ? document.getElementById('bkDate').value : new Date().toISOString().split('T')[0];
    var bookingRecord = {
      id: 'APPT-' + Date.now().toString().slice(-4),
      name: currentBookingData.name || 'Student',
      email: currentBookingData.email || '',
      phone: currentBookingData.phone || '',
      country: currentBookingData.country || 'Russia',
      mode: currentBookingData.mode || 'Google Video Call',
      date: selectedDate,
      slot: selectedSlot,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    saveConsultation(bookingRecord);

    // Build Google Calendar Event URL
    var dateParts = selectedDate.split('-'); // [YYYY, MM, DD]
    var year = dateParts[0];
    var month = dateParts[1];
    var day = dateParts[2];

    var startHour = "100000";
    if (selectedSlot.includes("11:30")) startHour = "113000";
    if (selectedSlot.includes("02:00")) startHour = "140000";
    if (selectedSlot.includes("03:30")) startHour = "153000";
    if (selectedSlot.includes("05:00")) startHour = "170000";
    if (selectedSlot.includes("06:30")) startHour = "183000";

    var startIso = `${year}${month}${day}T${startHour}`;
    var endIso = `${year}${month}${day}T${parseInt(startHour.slice(0,2))+1}${startHour.slice(2)}`;

    var gcalTitle = encodeURIComponent(`UNIMED MBBS Consultation (${bookingRecord.name})`);
    var gcalDetails = encodeURIComponent(`1-on-1 MBBS Admission Consultation with UNIMED Senior Counselor.\n\nStudent: ${bookingRecord.name}\nPhone: ${bookingRecord.phone}\nMode: ${bookingRecord.mode}\nCountry Interest: ${bookingRecord.country}`);
    var gcalLocation = encodeURIComponent(bookingRecord.mode === 'Google Video Call' ? 'Google Meet Video Link' : 'UNIMED Global Head Office');

    var gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${startIso}/${endIso}&details=${gcalDetails}&location=${gcalLocation}`;

    var gcalElem = document.getElementById('bkGCalLink');
    if (gcalElem) gcalElem.href = gcalUrl;

    var textElem = document.getElementById('bkSuccessText');
    if (textElem) textElem.innerHTML = `Dear <strong>${escapeHtml(bookingRecord.name)}</strong>, your consultation is confirmed for <strong>${formatDateDDMMYYYY(selectedDate)}</strong> at <strong>${selectedSlot}</strong> via <strong>${bookingRecord.mode}</strong>.`;

    goToStep(3);
  };

  function formatDateDDMMYYYY(str) {
    if (!str) return '';
    var s = String(str).trim();
    var ymd = s.split('-');
    if (ymd.length === 3 && ymd[0].length === 4) {
      return ymd[2] + '-' + ymd[1] + '-' + ymd[0];
    }
    return str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
