# FORGE — Progress Log
**Fast Orchestrated Repository & Google-drive Engine**
PRE-PATENT CONFIDENTIAL

---

## May 1, 2026

### Phase 0: Project Setup + Adobe IMS Auth
- Created GitHub repo: github.com/cklein08/forge
- Built Express server (Node.js) on port 8082
- Implemented Adobe IMS Server-to-Server OAuth
  - Client ID: registered in Adobe Developer Console (FORGE EDS Site Generator)
  - Token caching with auto-refresh
  - Org discovery: connected to Tech Marketing Development
  - Profile fetch for user name display
- Landing page with "Sign in with Adobe" button
- Demo mode for testing without credentials

### Phase 1: Brand Brief UI + Swatch Extraction
- Built dark-theme brief editor (project.html)
  - Brand Identity: name, tagline, image upload, logo upload
  - **Swatch Upload**: drag-and-drop zone scans brand image → auto-fills ALL fields
  - Colors: 5 live color pickers with hex inputs + swatch preview strip
  - Typography: font dropdowns (heading + body)
  - Pages: checkbox grid (Home, Products, Plans, About, etc.)
  - Commerce: toggle + product source
  - Content Source: Google Drive URL
  - [Generate Site →] button
- Server-side brand extraction API (/api/extract-brand)
  - Vision AI extraction via OpenRouter (when key available)
  - Fallback: filename-match for known brands (Wolverine, Boost Mobile)
  - Logo auto-crop from swatch top-left quadrant via sharp
- Known brand swatches: Wolverine Mobile (green dark theme), Boost Mobile (orange/purple dark theme)

### Phase 2: Site Generation Engine (Python)
- Built at ~/.hermes/projects/forge/
- brand_brief.py: YAML schema + BrandBrief dataclass
- phase1_brand_tokens.py: CSS :root variables + fonts.css from brief
- phase2_scaffold.py: Full repo structure + fstab.yaml + page HTML generation
- phase3_blocks.py: Block generator (hero, columns, cards, header, footer)
- Sample brief: briefs/wolverine.yaml
- CLI: `python3 src/forge.py --brief wolverine.yaml --client wolverine`
- Generates 25+ files in 0.04 seconds

### Phase 3: Commerce Engine
- commerce.js: localStorage cart + custom events (aem:cart-updated)
- Product list block (PLP): grid with category filters + price sort
- Product detail block (PDP): image + qty + add to cart
- Mini-cart: slide-out drawer, reactive rendering, qty +/-, remove
- Checkout block: order summary + place order + success
- commerce-init.js: header cart icon + badge
- 10 mock products (plans, devices, accessories)
- Toast notifications on add to cart

### Phase 4: Working Prototype — Wolverine
- GitHub: github.com/cklein08/wolverine (52 files)
- Dark green theme (#0A1A0F bg, #1DB954 accents)
- Brand: Wolverine Mobile — "Connect. Evolve. Thrive."
- Pages: Home (hero + columns + cards), Products (PLP), Plans, About, Checkout
- Full shopping flow: browse → add to cart → mini-cart → checkout → place order
- Fragment loading for header/footer (nav.html, footer.html)
- Fixed: hero CSS overlay, dark theme text contrast, UTF-8 charset, header crash

### Phase 5: FORGE Web Platform
- Dashboard with three paths after login:
  - 📋 **Briefs** → brand brief editor (project.html)
  - 💬 **Co-Pilot** → chat interface (copilot.html)
  - 🔗 **Workfront** → import placeholder (workfront.html)
- Consistent nav across all pages: user name + org + sign out
- Product Entitlements bar (hidden for now, ready when needed)
- Sign out clears all localStorage + server token cache

### Phase 6: Co-Pilot Prompt Translation
- Chat-style interface with scope assessment
- Prompt translation engine:
  - 11 mood palettes (luxury, professional, energetic, minimal, dark mode, summer sale, black friday, etc.)
  - 26 color keywords → hex values
  - 10 font families → CSS imports
  - 16 block types detected from natural language
  - Google Doc table structure generation
- Scope badges: Styles, Blocks, Content, Commerce
- Code diff preview in monospace blocks
- [Apply Changes] / [Edit First] / [Cancel] actions

### Phase 13: Sidekick Co-Pilot Plugins
- tools/sidekick/config.json with two plugins
- **✨ Co-Pilot Plugin** (copilot-plugin.html):
  - Full chat interface in Sidekick palette (420×600)
  - Quick prompts: Dark Mode, Professional, Luxury, Testimonials, Flash Sale, Full Hero
  - Scope badges + diff preview + Apply/Cancel
  - Detects current preview page URL
- **🎨 Quick Style Plugin** (quick-style-plugin.html):
  - Button grid palette (320×400)
  - Theme (Dark/Light), Mood (5 presets), Typography (3), Layout (3)
- README with installation instructions

### Sprint 1: xwalk Generation Engine
- **Replaced DA/Google Drive pattern with AEM Cloud + Universal Editor (xwalk)**
- Created `server/generate.js` — full site generation engine:
  - `generateFstab()` — mountpoint to AEM Cloud author (not Google Drive)
  - `generatePaths()` — content path mapping from AEM to site
  - `generateComponentDefinition()` — block definitions for Universal Editor
  - `generateComponentModels()` — field definitions per block (UE property rail)
  - `generateComponentFilters()` — component placement rules
  - `generateCssFromBrief()` — CSS :root vars matching xwalk boilerplate pattern
  - `generateFontsCss()` — Google Fonts import from brief font choices
  - `generateBlocks()` — copies xwalk hero/cards/columns/fragment + _*.json models
  - `generateHelixQuery()` — query index config
  - `generateSidekickConfig()` — Sidekick with FORGE Co-Pilot plugin
  - `generateReadme()` — full README with environment URLs
  - Commerce blocks: product-list, product-detail, minicart, checkout (conditional)
- Copies boilerplate core: aem.js, scripts.js, editor-support.js, editor-support-rte.js
- Outputs to /tmp/forge-{slug}/ with all xwalk config files
- Optional GitHub push via `pushToGitHub()` (gh CLI)

### Sprint 2: Preview Page + Brief Wiring
- Created `public/preview.html` — post-generation preview page:
  - Dark theme, full-width iframe preview
  - Toolbar: Preview, Universal Editor, DA, Live, GitHub, Edit Brief, Regenerate
  - Device-width toggle: Desktop / Tablet (768px) / Mobile (375px)
  - Sidekick install instructions
  - Status bar: file count, block count, commerce status, preview URL
  - Auto-polls project status during generation
- Updated `server/api.js`:
  - POST /api/generate now calls real `generateSite()` from generate.js
  - Returns generated URLs (preview, live, UE, DA, GitHub)
  - Optional GitHub push when brief.pushToGitHub is true
- Updated `public/project.html`:
  - Replaced Google Drive section with AEM Author URL + GitHub Org + Site Name
  - Auto-generates repo slug from brand name
  - AEM Org (IMS) field for Universal Editor URL
  - Push to GitHub toggle
  - Generate button: POSTs to /api/generate, polls status, redirects to preview page
  - Brief saved to localStorage for regeneration

### Sprint 3: Co-Pilot Prompt Engine
- POST /api/copilot endpoint with full prompt-to-change translation
- 11 mood palettes, 26 color keywords, 10 font families, 16 block types
- Scope detection: Styles, Blocks, Content, Commerce, Pages
- CSS :root variable generation from natural language
- Google Doc table structure generation for content blocks
- Code diff preview in chat-style interface
- Apply/Edit/Cancel workflow for generated changes

### Sprint 4: Workfront Brief Import
- Created `server/workfront.js` — Workfront API integration module:
  - `listProjects()` — search Workfront projects by status with field expansion
  - `getProject()` — fetch single project with custom form fields, documents, tasks
  - `mapProjectToBrief()` — maps Workfront parameterValues to FORGE brief JSON:
    - Brand_Name, Campaign_Tagline, Brand_Color_* → colors object
    - Heading_Font, Body_Font → fonts object
    - Theme, Brand_Mood, Enable_Commerce → feature flags
    - Site_Name → clientName slug
- Added API endpoints in `server/api.js`:
  - GET /api/workfront/projects — list projects with brief preview mapping
  - GET /api/workfront/projects/:id — single project + full brief
  - Both use getServiceToken() for IMS auth, with error handling for missing scope
- Rewrote `public/workfront.html` — full Workfront import UI:
  - Search bar with name filter + status dropdown (Current/Planning/Complete/All)
  - Project cards: name, status badge, owner, due date, category, description
  - Click project → brief preview panel with mapped fields:
    - Brand name, tagline, color chips, typography, theme, mood, pages, commerce
  - [Import to Brief Editor] → stores brief in localStorage, redirects to project.html
  - [Generate Directly] → POSTs to /api/generate, polls status, redirects to preview
  - Error state: shows Workfront API setup instructions when scope unavailable
  - Same dark theme as all FORGE pages

---

## Architecture

```
                    FORGE Web UI (:8082)
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
         Briefs      Co-Pilot     Workfront
            │            │            │
            ▼            ▼            ▼
    ┌───────────────────────────────────────┐
    │     FORGE xwalk Generation Engine      │
    │   (Node.js: generate.js + xwalk cfg)   │
    └───────────┬───────────┬───────────────┘
                │           │
         ┌──────┘           └──────┐
         ▼                         ▼
    GitHub Repo              AEM Cloud Author
    (EDS code)               (content via UE)
         │                         │
         └──────────┬──────────────┘
                    ▼
              AEM Edge Delivery
              *.aem.page / *.aem.live
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
       Preview   Universal   Sidekick
     (aem.page)   Editor    Plugins
```

### DA.live Integration
- FORGE runs as a DA.live plugin (Lit web component)
- URL: da.live/app/cklein08/wolverine/tools/forge/forge
- Follows drago-toolkit inventory pattern (DA_SDK, Spectrum CSS)
- Dashboard with 5 cards: Briefs, Swatch Generator, Co-Pilot, Workfront, Preview
- Swatch Generator: enter brand name → generates complete identity (colors, fonts, mood, tagline)
- Every generated site embeds FORGE plugin for in-context iteration

### End-to-End Pipeline (Wired)
- POST /api/generate now runs the full pipeline synchronously:
  1. Generates all site files (CSS, blocks, commerce, xwalk config)
  2. Creates or updates GitHub repo (user chooses new vs existing)
  3. Pushes code to GitHub via gh CLI
  4. Triggers AEM Code Sync (admin.hlx.page/code/...)
  5. Publishes to live CDN (admin.hlx.page/live/...)
  6. Returns all URLs (preview, live, UE, DA, GitHub, FORGE)
- Brief tab has repo mode radio: "Create new" / "Use existing"
- Generated sites include FORGE plugin (tools/forge/) automatically

### Bug Fixes
- _showStatus() method was missing — added with auto-dismiss
- Swatch upload: form field was 'swatch', fixed to 'image' (matches multer)
- Fonts: mapped data.fonts.heading/body (was data.headingFont/bodyFont)
- Co-Pilot: mapped server response (scope→scopes, changes→diffs, assessment→text)
- Generate: handles both sync response and async polling
- DA_SDK: 3s timeout to prevent hanging in standalone mode

## Repos
- **FORGE platform**: github.com/cklein08/forge (da-live-changes + feature/prompt-handling branches)
- **Wolverine prototype**: github.com/cklein08/wolverine (main)

## Tech Stack
- Server: Node.js + Express
- Generation: Node.js xwalk engine (generate.js)
- DA.live Plugin: Lit web component + Spectrum CSS
- Auth: Adobe IMS Server-to-Server OAuth
- Image processing: sharp (logo crop)
- Frontend: Vanilla HTML/CSS/JS (standalone dark theme) + Lit (DA.live light theme)
- Commerce: Vanilla JS, localStorage, Custom Events
- Blocks: EDS `export default function decorate(block)` pattern
- Deployment: gh CLI → Code Sync → CDN publish

## What's Next
- [x] ~~Wire /api/generate to FORGE engine~~ → Node.js xwalk engine, end-to-end
- [x] ~~Google Docs content injection~~ → Replaced with AEM Cloud + Universal Editor
- [x] ~~Live preview iframe~~ → preview.html + DA.live Preview tab
- [x] ~~Workfront brief import~~ → Sprint 4: full import UI + API
- [x] ~~Deploy to *.aem.page~~ → Code Sync + CDN publish wired
- [x] ~~DA.live integration~~ → Lit plugin with all 5 tabs
- [ ] Firefly image generation from brief context (API endpoint exists, needs Firefly scope)
- [ ] Atomic commits (CSS separate from JS)
- [ ] AEM content creation via DA admin API
- [ ] Universal Editor custom plugins
