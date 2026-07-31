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
      var leadObj = {
        id: 'CON-' + Date.now().toString().slice(-4),
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        country: booking.country + ' (Consultation)',
        neet: booking.mode,
        date: booking.date + ' ' + booking.slot,
        status: 'New',
        message: 'Booked 1-on-1 Consultation slot for ' + booking.date + ' @ ' + booking.slot + ' via ' + booking.mode
      };
      leads.unshift(leadObj);
      localStorage.setItem('unimed_leads', JSON.stringify(leads));

      // Save to Cloud Firestore
      if (window.db) {
        window.db.collection('consultations').doc(booking.id).set(booking)
          .then(function() { console.log('🔥 Consultation synced to Cloud Firestore:', booking.id); })
          .catch(function(err) { console.error('⚠️ Firestore consultation save error:', err); });

        window.db.collection('leads').doc(leadObj.id).set(leadObj)
          .then(function() { console.log('🔥 Consultation lead synced to Cloud Firestore:', leadObj.id); })
          .catch(function(err) { console.error('⚠️ Firestore lead save error:', err); });
      }
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
      background: rgba(2, 6, 23, 0.75);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      z-index: 9999999;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      font-family: 'Outfit', sans-serif;
    `;

    var todayStr = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div style="position:relative; width:100%; max-width:540px; background:rgba(15, 23, 42, 0.88); border:1.5px solid rgba(255, 255, 255, 0.18); border-radius:28px; padding:36px; box-shadow:0 30px 80px rgba(0, 0, 0, 0.7); color:#ffffff; box-sizing:border-box; backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);">
        
        <!-- Header -->
        <div style="position:relative; display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
          <div>
            <div style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; background:linear-gradient(135deg, rgba(0,242,254,0.12), rgba(59,130,246,0.12)); border:1px solid rgba(0,242,254,0.3); border-radius:100px; margin-bottom:10px;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#00f2fe; box-shadow:0 0 8px #00f2fe;"></span>
              <span style="font-size:0.72rem; font-weight:800; color:#00f2fe; letter-spacing:0.1em; text-transform:uppercase;">1-ON-1 ADMISSION COUNSELING</span>
            </div>
            <h3 style="margin:0; font-size:1.5rem; font-weight:800; color:#ffffff; font-family:'Outfit', sans-serif; display:flex; align-items:center; gap:10px; line-height:1.2;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg, rgba(0,242,254,0.2), rgba(59,130,246,0.2)); border:1px solid rgba(0,242,254,0.4); color:#00f2fe; flex-shrink:0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <span>Book a Free Consultation</span>
            </h3>
          </div>
          <button type="button" onclick="closeBookingModal()" class="bk-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- High-End Step Indicator Badges -->
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:28px; background:rgba(15,23,42,0.5); padding:6px; border-radius:16px; border:1px solid rgba(255,255,255,0.08);">
          <div id="bookingStepBadge1" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 12px; border-radius:12px; background:rgba(0,242,254,0.15); border:1px solid rgba(0,242,254,0.4); color:#00f2fe; font-size:0.8rem; font-weight:800; transition:all 0.3s ease;">
            <span style="width:20px; height:20px; border-radius:50%; background:#00f2fe; color:#0f172a; display:inline-flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:900;">1</span>
            <span>Student Details</span>
          </div>
          <div id="bookingStepBadge2" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 12px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; font-size:0.8rem; font-weight:700; transition:all 0.3s ease;">
            <span style="width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,0.15); color:#ffffff; display:inline-flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:800;">2</span>
            <span>Date &amp; Time Slot</span>
          </div>
        </div>

        <!-- STEP 1 FORM -->
        <div id="bookingStep1">
          <form onsubmit="handleBookingStep1Submit(event)">
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div>
                <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">Full Name *</label>
                <input type="text" id="bkName" required placeholder="e.g. Rahul Sharma" style="width:100%; padding:14px 16px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:14px; color:#ffffff; font-size:0.95rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none;">
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div>
                  <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">Email Address *</label>
                  <input type="email" id="bkEmail" required placeholder="rahul@example.com" style="width:100%; padding:14px 16px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:14px; color:#ffffff; font-size:0.95rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none;">
                </div>
                <div>
                  <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">WhatsApp Number *</label>
                  <input type="tel" id="bkPhone" required placeholder="+919876543210 or 9876543210" oninput="sanitizeBkPhone(this)" style="width:100%; padding:14px 16px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:14px; color:#ffffff; font-size:0.95rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div>
                  <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">Target Country</label>
                  <select id="bkCountry" style="width:100%; padding:14px 16px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:14px; color:#ffffff; font-size:0.95rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none;">
                    <option value="Russia">Russia</option>
                    <option value="Uzbekistan">Uzbekistan</option>
                    <option value="Kazakhstan">Kazakhstan</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Undecided">Undecided / Need Advice</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">Consultation Mode</label>
                  <select id="bkMode" style="width:100%; padding:14px 16px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:14px; color:#ffffff; font-size:0.95rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none;">
                    <option value="Google Video Call">📹 Google Video Call</option>
                    <option value="Phone Call">📞 Direct Phone Call</option>
                    <option value="Office Visit">🏢 Head Office Visit</option>
                  </select>
                </div>
              </div>

              <div style="margin-top:10px;">
                <button type="submit" class="form-submit-btn" style="--icon-shift: -255px; --mobile-icon-shift: -185px;">
                  <span class="cta-btn-text">Proceed to Select Date &amp; Slot</span>
                  <span class="cta-btn-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- STEP 2: DATE & SLOT PICKER -->
        <div id="bookingStep2" style="display:none;">
          <div style="display:flex; flex-direction:column; gap:18px;">
            <div>
              <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">Select Consultation Date</label>
              <div style="position:relative; width:100%;">
                <input type="date" id="bkDate" min="${todayStr}" value="${todayStr}" onchange="renderTimeSlots()" style="width:100%; padding:14px 46px 14px 16px; background:rgba(15,23,42,0.6); border:1px solid rgba(0,242,254,0.4); border-radius:14px; color:#00f2fe; font-weight:700; font-size:1rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none; color-scheme:dark;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); pointer-events:none; filter:drop-shadow(0 0 6px rgba(0,242,254,0.5));">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>

            <div>
              <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:10px; letter-spacing:0.02em;">Select Available Time Slot</label>
              <div id="bkSlotsContainer" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <!-- Slots populated dynamically -->
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
              <button type="button" onclick="confirmConsultationBooking()" class="form-submit-btn" style="width:100% !important;">
                <span class="cta-btn-text">Confirm &amp; Schedule Slot</span>
                <span class="cta-btn-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </span>
              </button>
              <button type="button" onclick="goToStep(1)" class="bk-back-btn" style="width:100% !important; justify-content:center !important; padding:10px !important;"><span class="back-arrow">←</span> <span>Back to Step 1</span></button>
            </div>
          </div>
        </div>

        <!-- STEP 3: SUCCESS CONFIRMATION & GOOGLE CALENDAR LINK -->
        <div id="bookingStep3" style="display:none; text-align:center;">
          <div style="font-size:3rem; margin-bottom:12px;">🎉</div>
          <h3 style="margin:0 0 8px 0; font-size:1.4rem; font-weight:800; color:var(--color-accent, #00f2fe);">Consultation Confirmed!</h3>
          <p style="font-size:0.92rem; color:#94a3b8; line-height:1.55; margin:0 0 24px 0;" id="bkSuccessText">Your appointment has been successfully scheduled.</p>

          <a id="bkGCalLink" href="#" target="_blank" class="form-submit-btn" style="text-decoration:none; margin-bottom:14px; background:rgba(255,255,255,0.95) !important; color:#0f172a !important;">
            <span class="cta-btn-text" style="color:#0f172a !important;">Add to Google Calendar 📅</span>
            <span class="cta-btn-icon" style="background:#0f172a !important; color:#ffffff !important;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </span>
          </a>

          <button type="button" onclick="closeBookingModal()" style="width:100%; padding:14px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:100px; color:#ffffff; font-weight:700; font-size:0.9rem; cursor:pointer;">Done</button>
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

    var b1 = document.getElementById('bookingStepBadge1');
    var b2 = document.getElementById('bookingStepBadge2');
    if (b1) {
      if (step === 1) {
        b1.style.background = 'rgba(0,242,254,0.15)';
        b1.style.border = '1px solid rgba(0,242,254,0.4)';
        b1.style.color = '#00f2fe';
      } else {
        b1.style.background = 'rgba(34,197,94,0.15)';
        b1.style.border = '1px solid rgba(34,197,94,0.4)';
        b1.style.color = '#4ade80';
      }
    }
    if (b2) {
      if (step === 2) {
        b2.style.background = 'rgba(0,242,254,0.15)';
        b2.style.border = '1px solid rgba(0,242,254,0.4)';
        b2.style.color = '#00f2fe';
      } else {
        b2.style.background = 'rgba(255,255,255,0.04)';
        b2.style.border = '1px solid rgba(255,255,255,0.08)';
        b2.style.color = '#94a3b8';
      }
    }

    if (step === 2) {
      renderTimeSlots();
    }
  };

  window.sanitizeBkPhone = function(inputEl) {
    if (!inputEl) return;
    var val = inputEl.value;
    var hasPlus = val.startsWith('+');
    var digitsOnly = val.replace(/[^0-9]/g, '');
    if (hasPlus) {
      inputEl.value = '+' + digitsOnly;
    } else {
      inputEl.value = digitsOnly;
    }
  };

  function validateBkPhone(phoneStr) {
    if (!phoneStr) return { valid: false, message: 'Please enter a valid phone number.' };

    var trimmed = String(phoneStr).trim();
    var hasPlus = trimmed.startsWith('+');
    var digitsOnly = trimmed.replace(/[^0-9]/g, '');

    if (digitsOnly.length === 0) {
      return { valid: false, message: '⚠️ Invalid Phone Number: Alphabets are not allowed. Please enter numbers only.' };
    }

    if (hasPlus) {
      if (digitsOnly.length < 11 || digitsOnly.length > 14) {
        return { valid: false, message: '⚠️ Invalid Phone Number: Phone number with country code must contain country code + 10 digits (e.g. +919876543210 or +9779876543210).' };
      }
    } else {
      if (digitsOnly.length !== 10) {
        return { valid: false, message: '⚠️ Invalid Phone Number: Phone number without country code must be EXACTLY 10 digits.' };
      }
    }

    return { valid: true, formatted: hasPlus ? ('+' + digitsOnly) : digitsOnly };
  }

  window.handleBookingStep1Submit = function(e) {
    if (e) e.preventDefault();
    var phoneVal = (document.getElementById('bkPhone') ? document.getElementById('bkPhone').value.trim() : '');
    var phoneCheck = validateBkPhone(phoneVal);
    if (!phoneCheck.valid) {
      alert(phoneCheck.message);
      return;
    }

    currentBookingData = {
      name: (document.getElementById('bkName') ? document.getElementById('bkName').value.trim() : ''),
      email: (document.getElementById('bkEmail') ? document.getElementById('bkEmail').value.trim() : ''),
      phone: phoneCheck.formatted,
      country: (document.getElementById('bkCountry') ? document.getElementById('bkCountry').value : 'Russia'),
      mode: (document.getElementById('bkMode') ? document.getElementById('bkMode').value : 'Google Video Call')
    };
    goToStep(2);
  };

  function parseSlotTime(slotStr) {
    var parts = slotStr.trim().split(' ');
    var time = parts[0].split(':');
    var hour = parseInt(time[0], 10);
    var min = parseInt(time[1], 10);
    var ampm = (parts[1] || 'AM').toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return { hour: hour, min: min };
  }

  function isSlotPassed(selectedDateStr, slotStr) {
    var now = new Date();
    var localYear = now.getFullYear();
    var localMonth = String(now.getMonth() + 1).padStart(2, '0');
    var localDay = String(now.getDate()).padStart(2, '0');
    var todayStr = `${localYear}-${localMonth}-${localDay}`;

    if (selectedDateStr < todayStr) return true;
    if (selectedDateStr > todayStr) return false;

    var slotTime = parseSlotTime(slotStr);
    var currentHour = now.getHours();
    var currentMin = now.getMinutes();

    if (currentHour > slotTime.hour) return true;
    if (currentHour === slotTime.hour && currentMin >= slotTime.min) return true;

    return false;
  }

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
      var isPassed = isSlotPassed(selectedDate, slot);

      if (isBooked || isBlocked || isPassed) {
        var label = isBooked ? '(Booked)' : (isBlocked ? '(Blocked)' : '(Time Passed)');
        html += `
          <button type="button" disabled style="padding:12px 14px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); border-radius:14px; color:#f87171; font-size:0.82rem; font-weight:700; cursor:not-allowed; opacity:0.65;">
            🔴 ${slot}<br><span style="font-size:0.7rem; font-weight:400;">${label}</span>
          </button>
        `;
      } else {
        var isFirstAvailable = !selectedSlot;
        if (isFirstAvailable) selectedSlot = slot;

        var activeStyle = isFirstAvailable
          ? 'background:rgba(34,197,94,0.25); color:#ffffff; border:1.5px solid #22c55e; box-shadow:0 0 20px rgba(34,197,94,0.35);'
          : 'background:rgba(15,23,42,0.6); color:#94a3b8; border:1px solid rgba(255,255,255,0.15);';

        html += `
          <button type="button" class="slot-btn" onclick="selectSlot('${slot}', this)" style="padding:12px 14px; ${activeStyle} border-radius:14px; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.3s cubic-bezier(0.16,1,0.3,1);">
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
      btn.style.background = 'rgba(15,23,42,0.6)';
      btn.style.color = '#94a3b8';
      btn.style.border = '1px solid rgba(255,255,255,0.15)';
      btn.style.boxShadow = 'none';
    });
    btnEl.style.background = 'rgba(34,197,94,0.25)';
    btnEl.style.color = '#ffffff';
    btnEl.style.border = '1.5px solid #22c55e';
    btnEl.style.boxShadow = '0 0 20px rgba(34,197,94,0.35)';
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
