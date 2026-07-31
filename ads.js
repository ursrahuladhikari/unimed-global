/**
 * UNIMED Global — Dynamic Ads & Promotions Script (ads.js)
 * Automatically renders active promotional banners and popup modals managed from admin.html
 * Features Glassmorphism Theme & Session Dismissal Persistence (Resets only on page refresh)
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    initAdsEngine();
  });

  function initAdsEngine() {
    // Detect page refresh (F5 / Reload) to reset dismissed banners on fresh page reload
    try {
      if (window.performance) {
        var navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0 && navEntries[0].type === 'reload') {
          sessionStorage.removeItem('unimed_ad_banner_dismissed');
          sessionStorage.removeItem('unimed_ad_popup_dismissed');
        }
      }
    } catch(e) {}

    // Default campaign fallback state
    var defaultAdState = {
      topBanner: {
        active: true,
        text: "🔥 2026-2027 MBBS Intake Now Open! Free NEET Profile Evaluation & Direct Seat Allocation.",
        badge: "LIMITED OFFER",
        btnText: "Apply Now",
        link: "contact.html"
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

    // 1. Top Announcement Bar Banner (Glass Theme & Session Dismissal)
    var bannerDismissed = sessionStorage.getItem('unimed_ad_banner_dismissed');
    if (!bannerDismissed && ads.topBanner && ads.topBanner.active) {
      renderTopBanner(ads.topBanner);
    }

    // 2. Promotional Popup Modal (Glass Theme & Session Dismissal)
    var modalDismissed = sessionStorage.getItem('unimed_ad_popup_dismissed');
    if (!modalDismissed && ads.popupModal && ads.popupModal.active) {
      setTimeout(function() {
        renderPopupModal(ads.popupModal);
      }, ads.popupModal.delayMs || 2500);
    }
  }

  function renderTopBanner(config) {
    if (document.getElementById('unimedTopAdBanner')) return;

    if (!document.getElementById('topAdBannerStyles')) {
      var styleTag = document.createElement('style');
      styleTag.id = 'topAdBannerStyles';
      styleTag.textContent = `
        .top-ad-banner-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 10px !important;
          background: linear-gradient(135deg, #00f2fe, #3b82f6) !important;
          color: #0f172a !important;
          padding: 4px 4px 4px 18px !important;
          border-radius: 999px !important;
          text-decoration: none !important;
          font-family: 'Outfit', sans-serif !important;
          font-weight: 800 !important;
          font-size: 0.8rem !important;
          box-shadow: 0 4px 15px rgba(0, 242, 254, 0.35) !important;
          position: relative !important;
          overflow: hidden !important;
          cursor: pointer !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .top-ad-banner-btn .top-ad-btn-text {
          order: 1 !important;
          color: #0f172a !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          white-space: nowrap !important;
          display: inline-block !important;
        }

        .top-ad-banner-btn .top-ad-btn-icon {
          order: 2 !important;
          width: 26px !important;
          height: 26px !important;
          border-radius: 50% !important;
          background: #0f172a !important;
          color: #00f2fe !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease, color 0.3s ease !important;
          flex-shrink: 0 !important;
        }

        .top-ad-banner-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(0, 242, 254, 0.5) !important;
        }

        .top-ad-banner-btn:hover .top-ad-btn-text {
          transform: translateX(32px) !important;
        }

        .top-ad-banner-btn:hover .top-ad-btn-icon {
          transform: translateX(-82px) rotate(-45deg) !important;
          background: #ffffff !important;
          color: #0f172a !important;
        }

        .top-ad-banner-btn:active {
          transform: translateY(0) scale(0.97) !important;
        }
      `;
      document.head.appendChild(styleTag);
    }

    var isLightTheme = document.documentElement.classList.contains('light-theme');

    var banner = document.createElement('div');
    banner.id = 'unimedTopAdBanner';
    banner.style.cssText = `
      position: relative !important;
      z-index: 10000 !important;
      width: 100% !important;
      background: ${isLightTheme ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.82)'} !important;
      backdrop-filter: blur(16px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
      border-bottom: 1px solid ${isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)'} !important;
      color: ${isLightTheme ? '#0f172a' : '#ffffff'} !important;
      padding: 10px 20px !important;
      font-family: 'Outfit', sans-serif !important;
      font-size: 0.88rem !important;
      font-weight: 600 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 14px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25) !important;
      text-align: center !important;
      flex-wrap: wrap !important;
      box-sizing: border-box !important;
      transition: opacity 0.3s ease, transform 0.3s ease !important;
    `;

    var badgeHtml = config.badge ? `
      <span style="
        background: linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(59, 130, 246, 0.25)) !important;
        border: 1px solid rgba(0, 242, 254, 0.4) !important;
        color: #00f2fe !important;
        padding: 4px 12px !important;
        border-radius: 30px !important;
        font-size: 0.74rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        backdrop-filter: blur(8px) !important;
      ">${escapeHtml(config.badge)}</span>
    ` : '';

    var targetLink = config.link || 'contact.html';
    var btnHtml = config.btnText ? `
      <button type="button" class="top-ad-banner-btn" data-target-link="${targetLink}">
        <span class="top-ad-btn-text">${escapeHtml(config.btnText)}</span>
        <span class="top-ad-btn-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </span>
      </button>
    ` : '';

    banner.innerHTML = `
      ${badgeHtml}
      <span>${escapeHtml(config.text)}</span>
      ${btnHtml}
      <button id="closeTopAdBtn" aria-label="Close Announcement" style="
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: inherit !important;
        width: 26px !important;
        height: 26px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 0.85rem !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        margin-left: 6px !important;
      ">✕</button>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // Close (✕) button dismisses banner for the session
    var closeBtn = document.getElementById('closeTopAdBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        sessionStorage.setItem('unimed_ad_banner_dismissed', 'true');
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-100%)';
        setTimeout(function() { banner.remove(); }, 300);
      });
    }

    // CTA button — dismiss banner and navigate to target page
    var ctaBtn = banner.querySelector('.top-ad-banner-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function() {
        sessionStorage.setItem('unimed_ad_banner_dismissed', 'true');
        var href = ctaBtn.getAttribute('data-target-link') || 'contact.html';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-100%)';
        setTimeout(function() {
          banner.remove();
          window.location.href = href;
        }, 280);
      });
    }

    // Auto-dismiss if already on the target page
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === (targetLink.split('/').pop() || 'contact.html')) {
      sessionStorage.setItem('unimed_ad_banner_dismissed', 'true');
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-100%)';
      setTimeout(function() { banner.remove(); }, 100);
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
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
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
      <div style="position:relative; width:100%; max-width:440px; background:rgba(30,41,59,0.95); border:1px solid rgba(255,255,255,0.18); border-radius:24px; padding:30px 24px; box-shadow:0 25px 60px rgba(0,0,0,0.6); color:#ffffff; font-family:'Outfit', sans-serif; text-align:center; box-sizing:border-box; backdrop-filter:blur(16px);">
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
