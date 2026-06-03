/**
 * Family BYOD landing grid — runs from scripts.js after decorateBlocks.
 */
import { CAMPAIGN_HERO_CSS, createCampaignHeroEl } from './persona-campaign-hero.js';
import { createGreenAiBar, createSingleOfferSection } from './persona-single-offer-dom.js';

const PRIMARY = '#1DB954';
const SECONDARY = '#0E7A3A';
const MINT_PAGE = '#eef8f1';
const MINT_ROW = '#f3fbf6';
const MINT_PILL = '#d8f3e0';
const DARK_PILL = '#1a1a1a';
const HERO_BG = '#0A1A0F';
const LINE_RE = /^(\d+(?:st|nd|rd|th) line|Phone|Plan|Talk|Data boost|Hotspot|Global roaming)\b/i;

function gridPersonaId() {
  const path = (window.location?.pathname || '').replace(/\/$/, '');
  if (path === '/family-texas') return 'family-texas';
  if (path === '/college-student') return 'college-student';
  if (path === '/single-woman-nyc') return 'single-woman-nyc';
  return null;
}

function isFamilyPage() {
  return Boolean(gridPersonaId());
}

function injectFamilyStyles(doc) {
  if (doc.getElementById('forge-family-plans-live')) return;
  const style = doc.createElement('style');
  style.id = 'forge-family-plans-live';
  style.textContent = `
.xwalk-family-plans-page--single-offer{background:#fff!important;width:100%!important}
.xwalk-family-plans-page{background:${MINT_PAGE}!important;width:100%!important}
.xwalk-mockup-white{background:#fff!important;padding:28px 32px 48px!important;max-width:1200px!important;margin:0 auto!important}
.xwalk-mockup-green-bar{background:${PRIMARY}!important;color:#000!important;text-align:center!important;padding:14px 24px!important;font-weight:800!important;display:block!important}
.xwalk-mockup-quote{text-align:center!important;font-style:italic!important;color:${PRIMARY}!important;margin:0 0 28px!important}
.xwalk-mockup-offer-row{display:grid!important;grid-template-columns:1fr minmax(160px,200px)!important;gap:24px!important}
.xwalk-mockup-plan-head{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:16px 20px!important;margin-bottom:24px!important}
.xwalk-mockup-plan-title{margin:0!important;font-weight:900!important;color:#111!important}
.xwalk-mockup-plan-price{color:${PRIMARY}!important}
.xwalk-mockup-plan-pill .xwalk-plan-line-pill{background:${DARK_PILL}!important;color:#fff!important;border-radius:8px!important;padding:12px 18px!important;margin:0!important}
.xwalk-mockup-plan-body{display:grid!important;grid-template-columns:minmax(160px,240px) 1fr!important;gap:32px 40px!important}
.xwalk-mockup-device-footer{display:grid!important;grid-template-columns:1fr 1.4fr!important;align-items:baseline!important;max-width:240px!important;margin:0 auto!important}
.xwalk-mockup-device-name{color:${PRIMARY}!important;font-weight:900!important;margin:0!important}
.xwalk-mockup-device-price{color:#111!important;margin:0!important}
.xwalk-mockup-specs{display:grid!important;grid-template-columns:1fr 1fr!important;gap:24px 40px!important}
.xwalk-mockup-specs li{color:${PRIMARY}!important;font-weight:700!important;list-style:none!important}
.xwalk-mockup-specs li::before{content:"✓ "!important}
.xwalk-mockup-cta{background:${PRIMARY}!important;color:#fff!important;font-weight:900!important;border-radius:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:280px!important;text-decoration:none!important}
.xwalk-family-row{display:grid!important;grid-template-columns:92px 168px minmax(0,1fr)!important;gap:12px 32px!important;align-items:center!important;padding:22px 28px!important;background:${MINT_ROW}!important;width:100%!important;box-sizing:border-box!important}
.xwalk-family-line-label{font-weight:800!important;color:#111!important;font-size:1.0625rem!important}
.xwalk-family-line-price{font-weight:900!important;font-size:1.4rem!important;color:${PRIMARY}!important}
.xwalk-family-was{text-decoration:line-through!important;color:${PRIMARY}!important}
.xwalk-family-now{color:${PRIMARY}!important;font-weight:900!important}
.xwalk-family-off{font-style:italic!important;color:${SECONDARY}!important;margin-left:6px!important}
.xwalk-family-pill--dark{background:${DARK_PILL}!important;color:#fff!important;border-radius:999px!important;padding:14px 24px!important;text-align:center!important;margin:0!important;width:100%!important;box-sizing:border-box!important;font-size:0.8125rem!important;line-height:1.4!important}
.xwalk-family-pill--accent{background:${MINT_PILL}!important;color:${SECONDARY}!important;border:1px solid ${PRIMARY}!important;border-radius:999px!important;padding:14px 24px!important;text-align:center!important;margin:0!important;font-weight:700!important;width:100%!important;box-sizing:border-box!important;font-size:0.8125rem!important;line-height:1.4!important}
.xwalk-family-title{color:${PRIMARY}!important;font-family:"Arial Black",Arial,sans-serif!important;font-size:1.65rem!important;font-weight:900!important;margin:0 0 28px!important}
.xwalk-family-main{background:${MINT_PAGE}!important;padding:36px 40px 56px!important;max-width:1040px!important;margin:0 auto!important}
.xwalk-family-cta{display:inline-block!important;background:${PRIMARY}!important;color:#fff!important;font-size:1.625rem!important;font-weight:900!important;padding:20px 56px!important;border-radius:14px!important;text-decoration:none!important;font-family:"Arial Black",Arial,sans-serif!important}
.xwalk-family-cta-wrap{text-align:center!important;margin:40px 0 0!important}
body.xwalk-persona-offer-page--family-texas main,body.xwalk-persona-offer-page--college-student main,body.xwalk-persona-offer-page--single-woman-nyc main{display:block!important;max-width:none!important;padding:0!important;background:${MINT_PAGE}!important;grid-template-columns:1fr!important}
body.xwalk-persona-offer-page header{display:block!important;visibility:visible!important;z-index:200!important;background:${HERO_BG}!important}
body.xwalk-persona-offer-page header nav,body.xwalk-persona-offer-page header a{color:#fff!important}
.xwalk-family-hero,main>div>p:first-child:has(picture):not(:has(a)):not(.xwalk-campaign-hero *){display:none!important}
${CAMPAIGN_HERO_CSS}
`.trim();
  doc.head.appendChild(style);
}

function paintRow(row, idx) {
  row.style.cssText = `display:grid;grid-template-columns:92px 168px minmax(0,1fr);gap:12px 32px;align-items:center;padding:22px 28px;background:${MINT_ROW};width:100%;box-sizing:border-box;`;
  row.querySelector('.xwalk-family-line-label')?.style.setProperty('color', '#111', 'important');
  row.querySelector('.xwalk-family-line-label')?.style.setProperty('font-weight', '800', 'important');
  row.querySelector('.xwalk-family-line-price')?.style.setProperty('color', PRIMARY, 'important');
  const pill = row.querySelector('.xwalk-family-pill');
  if (pill) {
    pill.style.cssText =
      idx < 2
        ? `margin:0;padding:14px 24px;border-radius:999px;text-align:center;width:100%;background:${DARK_PILL};color:#fff;font-size:0.8125rem;line-height:1.4;box-sizing:border-box;`
        : `margin:0;padding:14px 24px;border-radius:999px;text-align:center;width:100%;background:${MINT_PILL};color:${SECONDARY};font-weight:700;border:1px solid ${PRIMARY};font-size:0.8125rem;line-height:1.4;box-sizing:border-box;`;
  }
}

function isCta(p) {
  return p?.tagName === 'P' && p.querySelector('a') && /shop\s*now/i.test(p.textContent || '');
}
function isLine(p) {
  const t = (p.textContent || '').trim();
  return p?.tagName === 'P' && LINE_RE.test(t);
}

function lineLabelFromParagraph(p) {
  const t = (p.textContent || '').trim();
  const m = t.match(LINE_RE);
  return m ? m[1] : t.split(/\s+\$/)[0].trim();
}

function headlineFromSection(section) {
  const h1 = section.querySelector('h1');
  return h1?.textContent?.trim() || '';
}

function buildFromSection(section) {
  const personaId = gridPersonaId();
  if (!personaId) return null;
  const headline = headlineFromSection(section) || 'Keep your family connected';

  const root = document.createElement('div');
  root.className =
    'xwalk-persona-mockup xwalk-family-plans-page xwalk-family-plans-page--campaign xwalk-family-plans-page--single-offer';
  const hero = createCampaignHeroEl(personaId, headline);
  if (hero) root.append(hero);
  root.append(createGreenAiBar());
  const offer = createSingleOfferSection(personaId, headline);
  if (offer) root.append(offer);
  return root;
}

function findContentRoot(main) {
  if (main.querySelector('.xwalk-family-plans-page .xwalk-mockup-offer-row')) return null;
  if (main.querySelector('.xwalk-family-plans-page .xwalk-family-grid')) return null;
  const roots = [
    ...main.querySelectorAll('.xwalk-family-plans .default-content-wrapper'),
    ...main.querySelectorAll('.xwalk-family-plans > div > div'),
    ...main.querySelectorAll(':scope > .section > div > div'),
    ...main.querySelectorAll(':scope > .section > div'),
    ...main.querySelectorAll(':scope > div'),
  ];
  for (const el of roots) {
    if (el.querySelector('#family-plans--bring-your-own-device, h2')) return el;
    if (/family plans/i.test(el.textContent || '') && el.querySelector('picture, h2')) return el;
  }
  return null;
}

/** @param {HTMLElement} main */
export function decorateFamilyTexasMain(main) {
  const personaId = gridPersonaId();
  if (!personaId || !main) return;

  injectFamilyStyles(document);
  document.body.classList.add('xwalk-persona-offer-page', `xwalk-persona-offer-page--${personaId}`);
  main.classList.remove('xwalk-boost-main');
  main.style.display = 'block';
  main.style.maxWidth = 'none';
  main.style.padding = '0';
  main.style.background = '#fff';

  const existing = main.querySelector('.xwalk-family-plans-page');
  if (existing?.querySelector('.xwalk-mockup-offer-row')) return;

  const section = findContentRoot(main);
  if (!section || section.querySelector('.xwalk-mockup-offer-row')) return;

  const built = buildFromSection(section);
  const host = section.closest('.default-content-wrapper') || section;
  host.replaceChildren(built);

  const block = main.querySelector('.xwalk-family-plans');
  if (block) block.classList.add('xwalk-family-plans-ready');
}
