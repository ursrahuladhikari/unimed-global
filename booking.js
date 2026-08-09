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
                    <option value="Undecided">Undecided / Need Advice</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:0.82rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:6px; letter-spacing:0.02em;">Consultation Mode</label>
                  <select id="bkMode" style="width:100%; padding:14px 16px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:14px; color:#ffffff; font-size:0.95rem; font-family:'Outfit', sans-serif; box-sizing:border-box; outline:none;">
                    <option value="Google Meet - Video Call">📹 Google Meet - Video Call</option>
                    <option value="WhatsApp Video Call">💬 WhatsApp Video Call</option>
                    <option value="Personal Office Visit">🏢 Personal Office Visit</option>
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
      mode: (document.getElementById('bkMode') ? document.getElementById('bkMode').value : 'Google Meet - Video Call')
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
      mode: currentBookingData.mode || 'Google Meet - Video Call',
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
    var gcalLocation = encodeURIComponent(bookingRecord.mode.includes('Google') ? 'Google Meet Video Link' : (bookingRecord.mode.includes('WhatsApp') ? 'WhatsApp Video Call Link' : 'UNIMED Global Head Office'));

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

  // Toggle Custom Intake Manual Input Field
  window.toggleCustomIntake = function(selectEl) {
    if (!selectEl) return;
    var container = selectEl.parentElement;
    var customInput = container ? container.querySelector('#enqIntakeCustom') : document.getElementById('enqIntakeCustom');
    if (!customInput) return;

    if (selectEl.value === 'Custom') {
      customInput.style.display = 'block';
      customInput.required = true;
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.required = false;
      customInput.value = '';
    }
  };

  // Global Enquiry Form Handler for University Detail Pages
  window.handleEnquiry = function(e) {
    if (e) e.preventDefault();
    var form = (e && e.target) ? e.target : document.getElementById('enquiryForm');
    if (!form) return;

    var nameEl = form.querySelector('#enqName') || document.getElementById('enqName');
    var phoneEl = form.querySelector('#enqPhone') || document.getElementById('enqPhone');
    var emailEl = form.querySelector('#enqEmail') || document.getElementById('enqEmail');
    var uniEl = form.querySelector('#enqUniversity') || document.getElementById('enqUniversity');
    var neetEl = form.querySelector('#enqNeet') || document.getElementById('enqNeet');
    var intakeEl = form.querySelector('#enqIntake') || document.getElementById('enqIntake');
    var remarksEl = form.querySelector('#enqRemarks') || document.getElementById('enqRemarks');

    var name = nameEl ? nameEl.value.trim() : '';
    var phone = phoneEl ? phoneEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';
    var university = uniEl ? uniEl.value.trim() : 'Medical University';
    var neet = neetEl ? neetEl.value.trim() : '';
    var intake = intakeEl ? intakeEl.value : '';
    var remarks = remarksEl ? remarksEl.value.trim() : '';

    if (intake === 'Custom') {
      var customIntakeEl = form.querySelector('#enqIntakeCustom') || document.getElementById('enqIntakeCustom');
      intake = customIntakeEl ? customIntakeEl.value.trim() : '';
      if (!intake) {
        alert('Please enter your custom preferred intake.');
        if (customIntakeEl) customIntakeEl.focus();
        return;
      }
    }

    var phoneCheck = validateBkPhone(phone);
    if (!phoneCheck.valid) {
      alert(phoneCheck.message);
      return;
    }
    phone = phoneCheck.formatted;

    if (neet !== '') {
      var neetNum = parseInt(neet, 10);
      if (isNaN(neetNum) || neetNum < 0 || neetNum > 720) {
        alert('⚠️ Invalid NEET Score: The NEET UG maximum score is 720 marks. Please enter a valid score between 0 and 720.');
        return;
      }
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      var textSpan = submitBtn.querySelector('.cta-btn-text') || submitBtn;
      textSpan.innerHTML = 'Submitting Request... ⏳';
    }

    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

    var leadObj = {
      id: 'ENQ-' + Math.floor(1000 + Math.random() * 9000),
      name: name || 'Student',
      email: email || 'N/A',
      phone: phone || 'N/A',
      country: university + (intake ? ' (' + intake + ')' : ''),
      neet: neet || 'N/A',
      message: 'Intake: ' + intake + (remarks ? ' | Remarks: ' + remarks : ''),
      university: university,
      remarks: remarks,
      date: dateStr,
      status: 'New'
    };

    try {
      var existingLeads = JSON.parse(localStorage.getItem('unimed_leads') || '[]');
      existingLeads.unshift(leadObj);
      localStorage.setItem('unimed_leads', JSON.stringify(existingLeads));
    } catch(err) {}

    if (window.db) {
      window.db.collection('leads').doc(leadObj.id).set(leadObj)
        .then(function() { console.log('🔥 Lead synced to Cloud Firestore:', leadObj.id); })
        .catch(function(err) { console.error('⚠️ Firestore lead save error:', err); });
    }

    setTimeout(function() {
      form.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      form.style.opacity = '0';
      form.style.transform = 'translateY(-10px) scale(0.96)';

      setTimeout(function() {
        form.style.display = 'none';

        var card = form.parentElement;
        var oldBox = document.getElementById('enquirySuccessBox');
        if (oldBox) oldBox.remove();

        var successBox = document.createElement('div');
        successBox.id = 'enquirySuccessBox';
        successBox.className = 'enquiry-success-anim';
        successBox.innerHTML = `
          <div class="success-card-inner">
            <div class="success-icon-wrap">
              <div class="success-ring-pulse"></div>
              <div class="success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            <h3 class="success-title">🎉 Counselling Request Booked!</h3>
            <p class="success-desc">
              Thank you <strong>${escapeHtml(name)}</strong>! Our expert counselor has received your request for <strong>${escapeHtml(university)}</strong> and will call you at <strong>${escapeHtml(phone)}</strong> shortly.
            </p>

            <div class="success-details-pill">
              <div class="success-detail-row">
                <span class="detail-label">🎓 University:</span>
                <span class="detail-val">${escapeHtml(university)}</span>
              </div>
              ${neet ? `
              <div class="success-detail-row">
                <span class="detail-label">📊 NEET Score:</span>
                <span class="detail-val">${escapeHtml(neet)} / 720</span>
              </div>` : ''}
              ${intake ? `
              <div class="success-detail-row">
                <span class="detail-label">📅 Intake:</span>
                <span class="detail-val">${escapeHtml(intake)}</span>
              </div>` : ''}
              ${remarks ? `
              <div class="success-detail-row" style="flex-direction:column; align-items:flex-start; gap:4px; margin-top:4px;">
                <span class="detail-label">💬 Remarks:</span>
                <span class="detail-val" style="font-size:0.8rem; font-weight:500; font-style:italic; word-break:break-word;">"${escapeHtml(remarks)}"</span>
              </div>` : ''}
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px; width:100%;">
              <a href="https://wa.me/919163654664?text=Hi%20UNIMED%20Global,%20I%20just%20submitted%20a%20counselling%20request%20for%20${encodeURIComponent(university)}" target="_blank" rel="noopener" class="sidebar-wa-btn" style="margin-top:0;">
                <span class="cta-btn-text">Instant WhatsApp Connect</span>
                <span class="cta-btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </span>
              </a>
              <button type="button" onclick="resetEnquiryForm()" style="background:none; border:1px solid var(--color-glass-border); border-radius:12px; color:var(--color-text-muted); padding:10px; font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.2s ease;">Submit Another Inquiry</button>
            </div>
          </div>
        `;

        card.appendChild(successBox);

        requestAnimationFrame(function() {
          successBox.classList.add('active');
        });

        triggerConfetti(successBox);
      }, 400);
    }, 600);
  };

  window.resetEnquiryForm = function() {
    var successBox = document.getElementById('enquirySuccessBox');
    var form = document.getElementById('enquiryForm');
    if (successBox) successBox.remove();
    if (form) {
      form.reset();
      form.style.display = 'block';
      var customInput = form.querySelector('#enqIntakeCustom');
      if (customInput) {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
      }
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        var textSpan = submitBtn.querySelector('.cta-btn-text') || submitBtn;
        textSpan.innerHTML = 'Book Free Counselling';
      }
      requestAnimationFrame(function() {
        form.style.opacity = '1';
        form.style.transform = 'none';
      });
    }
  };

  function triggerConfetti(container) {
    if (!container) return;
    var colors = ['#00f2fe', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
    for (var i = 0; i < 30; i++) {
      var particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.top = '30px';
      particle.style.left = '50%';
      var angle = Math.random() * Math.PI * 2;
      var velocity = 60 + Math.random() * 90;
      var dx = Math.cos(angle) * velocity + 'px';
      var dy = (Math.sin(angle) * velocity + 40) + 'px';
      var rot = (Math.random() * 720 - 360) + 'deg';
      particle.style.setProperty('--dx', dx);
      particle.style.setProperty('--dy', dy);
      particle.style.setProperty('--rot', rot);
      container.appendChild(particle);
    }
  }
})();

