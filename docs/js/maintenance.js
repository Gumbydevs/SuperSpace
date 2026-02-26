(function () {
  // Client-only maintenance notice.
  // Behavior:
  // - If window.SUPERSPACE_MAINTENANCE === true explicitly, show the modal (override).
  // - If window.SUPERSPACE_MAINTENANCE === false explicitly, never show.
  // - If not set, try a quick reachability check to the server's /status endpoint and
  //   show the modal only if the server is unreachable.

  var messageShownKey = 'superspace_maintenance_shown_v1';

  function isUserSuppressed() {
    try {
      return localStorage && localStorage.getItem(messageShownKey) === '1';
    } catch (e) {
      return false;
    }
  }

  function showModal() {
    var modal = document.getElementById('maintenance-popup');
    if (!modal) return;
    modal.style.display = 'flex';
    // trap focus to modal for accessibility
    var ok = document.getElementById('maintenance-ok-btn');
    if (ok) ok.focus();

    ok.addEventListener('click', function () {
      try {
        if (localStorage) localStorage.setItem(messageShownKey, '1');
      } catch (e) {}
      modal.style.display = 'none';
    });
  }

  function checkServerReachable(timeoutMs) {
    timeoutMs = timeoutMs || 4000;
    return new Promise(function (resolve) {
      try {
        var serverUrl =
          window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
      : (window.SUPERSPACE_ANALYTICS_HOST || window.SUPERSPACE_SERVER_URL || 'https://superspace-server-production.up.railway.app');
        var statusUrl = serverUrl.replace(/\/$/, '') + '/status';
        var controller = new AbortController();
        var timer = setTimeout(function () {
          try {
            controller.abort();
          } catch (e) {}
          resolve(false);
        }, timeoutMs);

        fetch(statusUrl, { method: 'GET', signal: controller.signal, mode: 'cors' })
          .then(function (res) {
            clearTimeout(timer);
            resolve(res.ok);
          })
          .catch(function () {
            clearTimeout(timer);
            resolve(false);
          });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function decideAndMaybeShow() {
    // Only show maintenance modal if explicitly requested by the host or
    // during a controlled maintenance workflow. Do NOT perform the old
    // automatic reachability check (it was causing stale/removed notices to appear).
    if (typeof window.SUPERSPACE_MAINTENANCE !== 'undefined') {
      if (window.SUPERSPACE_MAINTENANCE && !isUserSuppressed()) showModal();
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    decideAndMaybeShow();
  } else {
    document.addEventListener('DOMContentLoaded', decideAndMaybeShow);
  }
})();
