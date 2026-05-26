/**
 * Runtime segment visibility for saved personalization metadata (no edit chrome).
 * Loads on *.aem.page when blocks include data-forge-personalization.
 *
 * Preview: ?forge-preview-segment=seg-device-upgrade
 * Production: integrate with AJO Edge Decisioning / Web SDK identity (see docs/PERSONALIZATION-FLOWS.md).
 */
(function () {
  const VARIANT_ATTR = 'data-forge-variant';

  function segmentFromContext() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('forge-preview-segment') ||
      params.get('forge-segment') ||
      window.__forgeResolvedSegmentId ||
      ''
    );
  }

  function syncBlock(blockEl, segmentId) {
    const raw = blockEl.getAttribute('data-forge-personalization');
    if (!raw) return;
    let config;
    try {
      config = JSON.parse(raw);
    } catch {
      return;
    }
    if (!config.enabled) return;

    const shells = [...blockEl.querySelectorAll(`:scope > [${VARIANT_ATTR}]`)];
    if (!shells.length) return;

    let matched = false;
    for (const shell of shells) {
      const aud = shell.dataset.forgeVariantAudience || '';
      const isDefault = shell.getAttribute(VARIANT_ATTR) === 'default' || !aud;
      const show =
        !segmentId || segmentId === 'seg-all-visitors'
          ? isDefault
          : aud === segmentId || shell.getAttribute(VARIANT_ATTR) === segmentId;
      if (show) {
        shell.removeAttribute('hidden');
        matched = true;
      } else {
        shell.setAttribute('hidden', '');
      }
    }
    if (!matched && segmentId) {
      const def = shells.find((s) => s.getAttribute(VARIANT_ATTR) === 'default');
      def?.removeAttribute('hidden');
    }
  }

  function run() {
    const segmentId = segmentFromContext();
    document.querySelectorAll('[data-forge-personalization]').forEach((el) => syncBlock(el, segmentId));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.addEventListener('forge:preview-segment', run);
})();
