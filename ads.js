/**
 * UNIMED Global — Dynamic Ads & Promotions Script (ads.js)
 * Automatically renders active promotional banners and popup modals managed from admin.html
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    initAdsEngine();
  });

  function initAdsEngine() {
    // Default default campaigns if not set
    var defaultAdState = {
      topBanner: {
        active: true,
        text: "🔥 2026-2027 MBBS Intake Now Open! Free NEET Profile Evaluation & Direct Seat Allocation.",
        badge: "LIMITED OFFER",
        btnText: "Apply Now",
        link: "contact.html",
        bgGradient: "linear-gradient(90deg, #0284c7, #06b6d4, #10b981)"
      },
      popupModal: {
        active: false,
        title: "⚡ Special Scholarship Offer 2026",
        subtitle: "Get up to ₹50,000 Off on Service & Guidance Charges for early registrants!",
        image: "assets/why_choose_us/03_financialclarity.jpeg",
        btnText: "Claim Scholarship Now",
        link: "contact.html?offer=scholarship50k",
        delayMs: 3000
      }
    };

    var savedAdState = null;
    try {
      var raw = localStorage.getItem('unimed_ad_campaigns');
      if (raw) {
        savedAdState = JSON.parse(raw);
      }
    } catch(e) {}

    var ads = savedAdState || defaultAdState;

    // 1. Top Announcement Bar Banner
    if (ads.topBanner && ads.topBanner.active) {
      renderTopBanner(ads.topBanner);
    }

    // 2. Promotional Popup Modal
    if (ads.popupModal && ads.popupModal.active) {
      var modalDismissed = sessionStorage.getItem('unimed_ad_popup_dismissed');
      if (!modalDismissed) {
        setTimeout(function() {
          renderPopupModal(ads.popupModal);
        }, ads.popupModal.delayMs || 2500);
      }
    }
  }

  function renderTopBanner(config) {
    if (document.getElementById('unimedTopAdBanner')) return;

    var banner = document.createElement('div');
    banner.id = 'unimedTopAdBanner';
    banner.style.cssText = `
      position: relative !important;
      z-index: 10000 !important;
      width: 100% !important;
      background: ${config.bgGradient || 'linear-gradient(90deg, #0284c7, #06b6d4, #10b981)'} !important;
      color: #ffffff !important;
      padding: 10px 16px !important;
      font-family: 'Outfit', sans-serif !important;
      font-size: 0.88rem !important;
      font-weight: 600 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 12px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25) !important;
      text-align: center !important;
      flex-wrap: wrap !important;
    `;

    var badgeHtml = config.badge ? `<span style="background:rgba(255,255,255,0.22); padding:3px 10px; border-radius:30px; font-size:0.75rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;">${escapeHtml(config.badge)}</span>` : '';
    var btnHtml = config.btnText ? `<a href="${config.link || 'contact.html'}" style="background:#ffffff; color:#0f172a; padding:4px 14px; border-radius:999px; text-decoration:none; font-weight:800; font-size:0.8rem; transition:transform 0.2s ease, box-shadow 0.2s ease; display:inline-block;">${escapeHtml(config.btnText)} →</a>` : '';

    banner.innerHTML = `
      ${badgeHtml}
      <span>${escapeHtml(config.text)}</span>
      ${btnHtml}
      <button id="closeTopAdBtn" aria-label="Close Announcement" style="background:none; border:none; color:#ffffff; font-size:1.2rem; cursor:pointer; padding:0 6px; line-height:1; opacity:0.85;">✕</button>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    var closeBtn = document.getElementById('closeTopAdBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        banner.remove();
      });
    }
  }

  function renderPopupModal(config) {
    if (document.getElementById('unimedPopupAdModal')) return;

    var overlay = document.createElement('div');
    overlay.id = 'unimedPopupAdModal';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(15, 23, 42, 0.75) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      z-index: 9999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      box-sizing: border-box !important;
      opacity: 0 !important;
      transition: opacity 0.4s ease !important;
    `;

    var imageHtml = config.image ? `<img src="${config.image}" alt="Offer" style="width:100%; height:180px; object-fit:cover; border-radius:16px; margin-bottom:16px;">` : '';

    overlay.innerHTML = `
      <div style="position:relative; width:100%; max-width:440px; background:rgba(24,24,27,0.95); border:1px solid rgba(255,255,255,0.18); border-radius:24px; padding:30px 24px; box-shadow:0 25px 60px rgba(0,0,0,0.6); color:#ffffff; font-family:'Outfit', sans-serif; text-align:center; box-sizing:border-box;">
        <button id="closePopupAdBtn" aria-label="Close" style="position:absolute; top:14px; right:16px; background:rgba(255,255,255,0.1); border:none; color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
        ${imageHtml}
        <h3 style="font-size:1.4rem; font-weight:800; margin:0 0 8px 0; color:#00f2fe; line-height:1.2;">${escapeHtml(config.title)}</h3>
        <p style="font-size:0.92rem; color:#94a3b8; line-height:1.5; margin:0 0 20px 0;">${escapeHtml(config.subtitle)}</p>
        <a href="${config.link || 'contact.html'}" id="claimOfferBtn" style="display:block; width:100%; padding:14px; background:linear-gradient(135deg, #00f2fe, #3b82f6); color:#0f172a; text-decoration:none; font-weight:800; font-size:0.95rem; border-radius:999px; box-shadow:0 8px 24px rgba(0,242,254,0.35); box-sizing:border-box;">${escapeHtml(config.btnText || 'Claim Offer')} →</a>
      </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
    });

    function close() {
      overlay.style.opacity = '0';
      setTimeout(function() { overlay.remove(); }, 400);
      try { sessionStorage.setItem('unimed_ad_popup_dismissed', 'true'); } catch(e) {}
    }

    var closeBtn = document.getElementById('closePopupAdBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    var claimBtn = document.getElementById('claimOfferBtn');
    if (claimBtn) claimBtn.addEventListener('click', close);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
