/** True when URL is a campaign/segment landing (email, SMS, push deep link). */
export function hasForgeSegmentParam(loc = window.location) {
  const params = new URLSearchParams(loc.search || '');
  return Boolean(params.get('forge-preview-segment') || params.get('forge-segment'));
}
