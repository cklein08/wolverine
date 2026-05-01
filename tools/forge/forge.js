/* FORGE v2.1 - updated 2026-05-01 */
/**
 * FORGE — DA.live Lit plugin
 * Brand-identity-driven EDS site generator.
 */
import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { daFetch as daFetchDirect } from 'https://da.live/nx/utils/daFetch.js';

const EL_NAME = 'forge-app';

const AVAILABLE_PAGES = [
  'home', 'about', 'products', 'services', 'blog',
  'contact', 'pricing', 'faq', 'careers', 'portfolio',
];

const FONT_OPTIONS = [
  'System Default', 'Inter', 'Roboto', 'Open Sans', 'Lato',
  'Montserrat', 'Poppins', 'Playfair Display', 'Merriweather',
  'Source Sans Pro', 'Raleway', 'Oswald', 'PT Sans',
];

const QUICK_PROMPTS = [
  'Make the hero section more impactful',
  'Add a testimonials block',
  'Change the color scheme to be warmer',
  'Make the navigation sticky',
  'Add a call-to-action banner',
  'Improve mobile responsiveness',
];

class ForgeApp extends LitElement {
  static properties = {
    activeTab: { type: String },
    brief: { type: Object },
    generating: { type: Boolean },
    generationLog: { type: Array },
    previewUrl: { type: String },
    chatMessages: { type: Array },
    siteUrls: { type: Object },
    context: { type: Object },
    authenticated: { type: Boolean },
    _swatchPreview: { type: String, state: true },
    _logoPreview: { type: String, state: true },
    _chatInput: { type: String, state: true },
    _sendingChat: { type: Boolean, state: true },
    _deviceMode: { type: String, state: true },
    _statusMsg: { type: Object, state: true },
    _progress: { type: Number, state: true },
    _swatchResult: { type: Object, state: true },
    _swatchGenerating: { type: Boolean, state: true },
    _swatchStatus: { type: Object, state: true },
    _swatchBrandInput: { type: String, state: true },
  };

  /* Render into light DOM so forge.css applies */
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.activeTab = 'dashboard';
    this.brief = {
      brandName: '',
      tagline: '',
      mood: '',
      colors: {
        primary: '#0265dc',
        secondary: '#2c2c2c',
        accent: '#067a00',
        background: '#ffffff',
        text: '#2c2c2c',
        light: '#f8f8f8',
        dark: '#1a1a1a',
      },
      fonts: { heading: 'System Default', body: 'System Default', headingWeight: '700' },
      pages: ['home', 'about', 'contact'],
      commerce: false,
      commerceSource: '',
      commerceUrl: '',
      imageStyle: '',
      aemAuthorUrl: '',
      githubOrg: '',
      siteName: '',
      createNewRepo: true,
    };
    this.generating = false;
    this.generationLog = [];
    this.previewUrl = '';
    this.chatMessages = [];
    this.siteUrls = {};
    this.context = null;
    this.authenticated = false;
    this._swatchPreview = '';
    this._logoPreview = '';
    this._chatInput = '';
    this._sendingChat = false;
    this._deviceMode = 'desktop';
    this._statusMsg = null;
    this._progress = 0;
    this._swatchResult = null;
    this._swatchGenerating = false;
    this._swatchStatus = null;
    this._swatchBrandInput = '';
    this._apiBase = null;
  }

  get apiBase() {
    return this._apiBase || 'http://localhost:8082';
  }

  /* ------------------------------------------------------------------ */
  /*  Tab switching                                                      */
  /* ------------------------------------------------------------------ */
  _selectTab(tab) {
    this.activeTab = tab;
  }

  /* ------------------------------------------------------------------ */
  /*  Brief helpers                                                      */
  /* ------------------------------------------------------------------ */
  _showStatus(text, type = 'info') {
    this._statusMsg = { type, text };
    if (type === 'success' || type === 'info') {
      setTimeout(() => { if (this._statusMsg?.text === text) { this._statusMsg = null; this.requestUpdate(); } }, 5000);
    }
  }

  _updateBrief(field, value) {
    this.brief = { ...this.brief, [field]: value };
  }

  _updateColor(key, value) {
    this.brief = {
      ...this.brief,
      colors: { ...this.brief.colors, [key]: value },
    };
  }

  _updateFont(key, value) {
    this.brief = {
      ...this.brief,
      fonts: { ...this.brief.fonts, [key]: value },
    };
  }

  _togglePage(page) {
    const pages = [...this.brief.pages];
    const idx = pages.indexOf(page);
    if (idx >= 0) pages.splice(idx, 1);
    else pages.push(page);
    this.brief = { ...this.brief, pages };
  }

  _toggleCommerce() {
    this.brief = { ...this.brief, commerce: !this.brief.commerce };
  }

  /* ------------------------------------------------------------------ */
  /*  Swatch upload                                                      */
  /* ------------------------------------------------------------------ */
  _openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => this._handleSwatchUpload(e);
    input.click();
  }

  _openLogoPicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target?.files?.[0];
      if (file) this._logoPreview = URL.createObjectURL(file);
    };
    input.click();
  }

  async _handleSwatchUpload(e) {
    const file = e.target?.files?.[0];
    if (!file) return;

    this._swatchPreview = URL.createObjectURL(file);
    this._statusMsg = { type: 'info', text: '🔍 Scanning swatch for brand tokens…' };

    try {
      const formData = new FormData();
      formData.append('image', file);
      const resp = await fetch(`${this.apiBase}/api/extract-brand`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      // Fill brief from extracted data
      if (data.brandName) this._updateBrief('brandName', data.brandName);
      if (data.tagline) this._updateBrief('tagline', data.tagline);
      if (data.colors) {
        const c = { ...this.brief.colors };
        if (data.colors.primary) c.primary = data.colors.primary;
        if (data.colors.secondary) c.secondary = data.colors.secondary;
        if (data.colors.accent) c.accent = data.colors.accent;
        if (data.colors.background) c.background = data.colors.background;
        if (data.colors.text) c.text = data.colors.text;
        this.brief = { ...this.brief, colors: c };
      }
      if (data.fonts?.heading) this._updateFont('heading', data.fonts.heading);
      if (data.fonts?.body) this._updateFont('body', data.fonts.body);
      if (data.darkTheme !== undefined) this._updateBrief('darkTheme', data.darkTheme);
      if (data.mood) this._updateBrief('mood', data.mood);
      if (data.logoUrl) this._logoPreview = `${this.apiBase}${data.logoUrl}`;

      this._statusMsg = { type: 'success', text: '✅ Brand tokens extracted! Review and adjust below.' };
    } catch (err) {
      this._statusMsg = { type: 'error', text: `❌ Extraction failed: ${err.message}` };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Generate site                                                      */
  /* ------------------------------------------------------------------ */
  async _generateSite() {
    this.generating = true;
    this.generationLog = [{ text: 'Starting site generation…', done: false }];
    this._statusMsg = null;
    this._progress = 5;

    try {
      // Start generation
      const resp = await fetch(`${this.apiBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.brief,
          clientName: this.brief.siteName || this.brief.brandName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'site',
          githubOrg: this.brief.githubOrg || this.context?.org || 'cklein08',
        }),
      });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();

      if (data.error) throw new Error(data.error);

      // If server returns result directly
      if (data.urls || data.siteUrls) {
        this._progress = 55;
        this.siteUrls = data.urls || data.siteUrls;
        this.previewUrl = this.siteUrls.preview || '';
        this.generationLog = [...this.generationLog, { text: `✅ Site generated: ${data.outputDir || ''}`, done: true }];
        this.generationLog = [...this.generationLog, { text: `📁 ${data.fileCount || 'Files'} created`, done: true }];

        // Store pages and push content to DA if we have daFetch
        if (data.pages?.length) {
          this._generatedPages = data.pages;
          this.generationLog = [...this.generationLog, { text: `📄 ${data.pages.length} content pages ready`, done: true }];
          // Push to DA content store via client-side auth
          await this._createDAContent(data);
        }
      }

      // If server queues and returns projectId, poll for status
      if (data.projectId && !data.urls) {
        this.generationLog = [...this.generationLog, { text: `Queued: ${data.projectId}`, done: false }];
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          attempts++;
          try {
            const poll = await fetch(`${this.apiBase}/api/projects/${data.projectId}`);
            const status = await poll.json();
            if (status.log) {
              this.generationLog = status.log.map(l => ({ text: l, done: true }));
            }
            if (status.status === 'complete') {
              this.siteUrls = status.urls || status.siteUrls || {};
              this.previewUrl = this.siteUrls.preview || '';
              break;
            }
            if (status.status === 'error') throw new Error(status.error || 'Generation failed');
          } catch (e) { if (attempts >= 30) throw e; }
        }
      }

      this._progress = 100;
      this.generating = false;
      this._showStatus('Site generation complete!', 'success');
      if (this.previewUrl) this._selectTab('preview');
    } catch (err) {
      this._progress = 0;
      this.generating = false;
      this._showStatus(`Generation failed: ${err.message}`, 'error');
      this.generationLog = [...this.generationLog, { text: `❌ ${err.message}`, done: false }];
    }
  }

  /* ------------------------------------------------------------------ */
  /*  DA Content Creation                                                */
  /* ------------------------------------------------------------------ */
  async _createDAContent(data) {
    // Prefer the SDK-provided daFetch (injected by DA.live shell when running
    // as a plugin). Fall back to the directly-imported daFetch, which works
    // standalone as long as the user is logged into DA.live in this browser
    // (it reads the IMS token via localStorage 'nx-ims' / loadIms()).
    const fetch = this._daFetch || daFetchDirect;

    const org = this.brief.githubOrg || this.context?.org || 'cklein08';
    const repoSlug = this.brief.siteName || this.brief.brandName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'site';
    const adminOrigin = 'https://admin.da.live';
    const pages = data.pages || this._generatedPages || [];

    if (!pages.length) return;

    this._progress = 65;
    this.generationLog = [...this.generationLog, { text: `📤 Pushing ${pages.length} pages to DA (${org}/${repoSlug})…`, done: false }];

    let pushed = 0;
    for (const page of pages) {
      try {
        // Match the DA SDK's own saveToDa: PUT multipart/form-data with a `data` blob.
        // path: 'index.html' → /source/{org}/{repo}/index.html
        const url = `${adminOrigin}/source/${org}/${repoSlug}/${page.path}`;
        const form = new FormData();
        form.append('data', new Blob([page.html], { type: 'text/html' }), page.path);
        const resp = await fetch(url, { method: 'PUT', body: form });
        if (resp.ok) {
          pushed++;
        } else {
          const body = await resp.text().catch(() => '');
          console.warn(`[FORGE] DA push failed ${page.path}: ${resp.status} ${body.slice(0, 120)}`);
        }
      } catch (err) {
        console.warn(`[FORGE] DA push error ${page.path}:`, err);
      }
    }

    if (pushed === 0) {
      this.generationLog = [...this.generationLog,
        { text: '⚠️ DA upload failed — make sure you are logged into da.live in this browser and try again.', done: true },
      ];
      return;
    }

    this.generationLog = [...this.generationLog,
      { text: `✅ Pushed ${pushed}/${pages.length} pages to DA content store`, done: true },
    ];

    // Trigger EDS preview for every uploaded page so *.aem.page is populated.
    // This must run AFTER the DA upload — the preview pipeline reads source
    // from content.da.live and will 404 if content isn't there yet.
    const previewPaths = Array.from(new Set([
      '/',
      ...pages.map(p => {
        const slug = p.path.replace(/\.html$/, '').replace(/^\/+/, '');
        return `/${slug === 'index' ? '' : slug}`.replace(/\/$/, '') || '/';
      }),
    ]));

    this._progress = 85;
    this.generationLog = [...this.generationLog,
      { text: `🔄 Triggering EDS preview for ${previewPaths.length} paths…`, done: false },
    ];

    let previewed = 0;
    for (const path of previewPaths) {
      try {
        const res = await globalThis.fetch(
          `https://admin.hlx.page/preview/${org}/${repoSlug}/main${path || '/'}`,
          { method: 'POST' },
        );
        if (res.ok) previewed++;
      } catch { /* non-fatal */ }
    }

    this.generationLog = [...this.generationLog,
      { text: `✅ Preview triggered for ${previewed}/${previewPaths.length} paths — site is live on aem.page`, done: true },
    ];
  }

  /* ------------------------------------------------------------------ */
  /*  Co-pilot                                                           */
  /* ------------------------------------------------------------------ */
  async _sendPrompt(text) {
    if (!text?.trim()) return;
    const userMsg = text.trim();
    this._chatInput = '';
    this.chatMessages = [...this.chatMessages, { role: 'user', text: userMsg }];
    this._sendingChat = true;

    try {
      const resp = await fetch(`${this.apiBase}/api/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          brief: this.brief,
          org: this.context?.org || this.brief.githubOrg,
          repo: this.context?.repo || this.brief.siteName,
        }),
      });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();

      // Map server response { scope, assessment, changes } to UI format
      const scopes = [];
      if (data.scope) {
        if (data.scope.styles) scopes.push('styles');
        if (data.scope.blocks) scopes.push('blocks');
        if (data.scope.content) scopes.push('content');
        if (data.scope.commerce) scopes.push('commerce');
        if (data.scope.pages) scopes.push('pages');
      }
      const diffs = (data.changes || []).map(c => ({
        file: c.file || '',
        changes: (c.diff || c.description || '').split('\n').map(line => ({
          type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context',
          line,
        })),
      }));

      this.chatMessages = [
        ...this.chatMessages,
        {
          role: 'assistant',
          text: data.assessment || data.message || data.response || 'Done.',
          scopes,
          diffs,
        },
      ];
      if (data.previewUrl) this.previewUrl = data.previewUrl;
    } catch (err) {
      this.chatMessages = [
        ...this.chatMessages,
        { role: 'assistant', text: `Error: ${err.message}` },
      ];
    }
    this._sendingChat = false;
  }

  _handleChatKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._sendPrompt(this._chatInput);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render: Tabs                                                       */
  /* ------------------------------------------------------------------ */
  _renderTabs() {
    const tabs = [
      { id: 'brief', label: '📋 Brief' },
      { id: 'copilot', label: '🤖 Co-Pilot' },
      { id: 'preview', label: '👁 Preview' },
    ];
    return html`
      <div class="forge-tabs">
        <div class="forge-tabs__tablist-wrap">
          <div class="forge-tabs__tablist" role="tablist">
            ${tabs.map(
              (t) => html`
                <button
                  class="forge-tabs__tab"
                  role="tab"
                  aria-selected="${this.activeTab === t.id}"
                  @click=${() => this._selectTab(t.id)}
                >${t.label}</button>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Render: Brief tab                                                  */
  /* ------------------------------------------------------------------ */
  _renderBriefTab() {
    const b = this.brief;
    const colors = b.colors || {};
    const fonts = b.fonts || {};
    const headingFont = fonts.heading || 'System Default';
    const bodyFont = fonts.body || 'System Default';
    const headingWeight = fonts.headingWeight || '700';

    const COLOR_LABELS = {
      primary: 'Primary', secondary: 'Secondary', accent: 'Accent',
      background: 'Background', text: 'Text', light: 'Light', dark: 'Dark',
    };

    return html`
      <div class="forge-tabs__panel" ?hidden=${this.activeTab !== 'brief'}>

        <!-- ── Brand Swatch ─────────────────────────────────────────── -->
        <div class="forge__field">
          <label class="forge__label">Brand Swatch</label>
          <div
            class="forge__upload-zone"
            @click=${() => this._openFilePicker()}
            @dragover=${(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; e.currentTarget.classList.add('forge__upload-zone--drag'); }}
            @dragleave=${(e) => e.currentTarget.classList.remove('forge__upload-zone--drag')}
            @drop=${(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('forge__upload-zone--drag');
              const file = e.dataTransfer.files?.[0];
              if (file) this._handleSwatchUpload({ target: { files: [file] } });
            }}
          >
            ${this._swatchPreview
              ? html`<img class="forge__upload-preview" src="${this._swatchPreview}" alt="Swatch preview" />`
              : html`<span>📎 Click or drag & drop a brand swatch image — colors and fonts will be auto-extracted</span>`
            }
          </div>
          ${this._swatchPreview ? html`
            <button class="forge__btn forge__btn--ghost" style="font-size:12px;margin-top:6px;" @click=${(e) => { e.stopPropagation(); this._swatchPreview = ''; }}>Clear swatch</button>
          ` : nothing}
        </div>

        <!-- ── Logo ─────────────────────────────────────────────────── -->
        <div class="forge__field">
          <label class="forge__label">Logo</label>
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            ${this._logoPreview ? html`
              <img src="${this._logoPreview}" style="max-width:160px;max-height:80px;border-radius:6px;border:1px solid var(--spectrum-gray-200);background:var(--spectrum-gray-75);padding:8px;" alt="Logo preview" />
            ` : html`
              <div style="width:160px;height:80px;border-radius:6px;border:2px dashed var(--spectrum-gray-300);display:flex;align-items:center;justify-content:center;color:var(--spectrum-gray-500);font-size:12px;text-align:center;padding:8px;">
                No logo yet
              </div>
            `}
            <button class="forge__btn forge__btn--ghost" style="font-size:12px;" @click=${() => this._openLogoPicker()}>
              ${this._logoPreview ? 'Replace logo' : '📁 Upload logo'}
            </button>
          </div>
        </div>

        <hr class="forge__divider" />

        <!-- ── Identity ──────────────────────────────────────────────── -->
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="forge__field" style="flex:2;min-width:200px;">
            <label class="forge__label">Brand Name</label>
            <input
              class="forge__input"
              type="text"
              .value=${b.brandName}
              @input=${(e) => this._updateBrief('brandName', e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div class="forge__field" style="flex:3;min-width:200px;">
            <label class="forge__label">Tagline</label>
            <input
              class="forge__input"
              type="text"
              .value=${b.tagline}
              @input=${(e) => this._updateBrief('tagline', e.target.value)}
              placeholder="Building the future, one pixel at a time"
            />
          </div>
        </div>

        <div class="forge__field">
          <label class="forge__label">Brand Mood / Personality</label>
          <select
            class="forge__select"
            .value=${b.mood}
            @change=${(e) => this._updateBrief('mood', e.target.value)}
          >
            <option value="">Select mood…</option>
            ${['Bold & Energetic', 'Calm & Trustworthy', 'Elegant & Luxurious', 'Playful & Fun', 'Modern & Minimal', 'Warm & Friendly', 'Professional & Serious', 'Creative & Innovative'].map(
              (m) => html`<option value="${m}" ?selected=${b.mood === m}>${m}</option>`
            )}
          </select>
        </div>

        <hr class="forge__divider" />

        <!-- ── Colors ────────────────────────────────────────────────── -->
        <div class="forge__field">
          <label class="forge__label">Brand Colors</label>
          <div class="forge__color-row">
            ${Object.entries(colors).map(
              ([key, val]) => html`
                <div class="forge__color-field">
                  <input
                    class="forge__color-input"
                    type="color"
                    .value=${val}
                    @input=${(e) => this._updateColor(key, e.target.value)}
                  />
                  <input
                    class="forge__color-hex"
                    type="text"
                    .value=${val}
                    @change=${(e) => this._updateColor(key, e.target.value)}
                  />
                  <span style="font-size:11px;color:var(--spectrum-gray-600);text-transform:capitalize">${COLOR_LABELS[key] || key}</span>
                </div>
              `,
            )}
          </div>
          <!-- Live color swatch strip -->
          <div style="display:flex;gap:4px;margin-top:10px;padding:8px;background:var(--spectrum-gray-75);border-radius:6px;">
            ${Object.entries(colors).map(([key, val]) => html`
              <div style="flex:1;height:32px;border-radius:4px;background:${val};border:1px solid var(--spectrum-gray-200);" title="${COLOR_LABELS[key] || key}: ${val}"></div>
            `)}
          </div>
        </div>

        <hr class="forge__divider" />

        <!-- ── Typography ────────────────────────────────────────────── -->
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="forge__field" style="flex:2;min-width:180px;">
            <label class="forge__label">Heading Font</label>
            <select
              class="forge__select"
              @change=${(e) => this._updateFont('heading', e.target.value)}
            >
              ${FONT_OPTIONS.map((f) => html`<option ?selected=${headingFont === f}>${f}</option>`)}
            </select>
          </div>
          <div class="forge__field" style="flex:2;min-width:180px;">
            <label class="forge__label">Body Font</label>
            <select
              class="forge__select"
              @change=${(e) => this._updateFont('body', e.target.value)}
            >
              ${FONT_OPTIONS.map((f) => html`<option ?selected=${bodyFont === f}>${f}</option>`)}
            </select>
          </div>
          <div class="forge__field" style="flex:1;min-width:120px;">
            <label class="forge__label">Heading Weight</label>
            <select
              class="forge__select"
              @change=${(e) => this._updateFont('headingWeight', e.target.value)}
            >
              ${['400', '500', '600', '700', '800', '900'].map(
                (w) => html`<option value="${w}" ?selected=${headingWeight === w}>${w}</option>`
              )}
            </select>
          </div>
        </div>
        <!-- Typography live preview -->
        <div style="padding:16px;background:${colors.background || '#ffffff'};border-radius:6px;margin-bottom:16px;border:1px solid var(--spectrum-gray-200);">
          <div style="font-family:${headingFont},sans-serif;font-size:22px;font-weight:${headingWeight};color:${colors.text || colors.primary || '#1a1a1a'};margin-bottom:6px;">
            ${b.brandName || 'Brand Name'} — Heading
          </div>
          <div style="font-family:${bodyFont},sans-serif;font-size:14px;color:${colors.text || '#444'};line-height:1.6;">
            ${b.tagline || 'This is how your body copy will look across all pages. Clear, readable, on-brand.'}
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;">
            <div style="padding:6px 14px;background:${colors.primary || '#0265dc'};color:#fff;border-radius:4px;font-size:13px;font-weight:600;font-family:${bodyFont},sans-serif;">Primary CTA</div>
            <div style="padding:6px 14px;background:${colors.accent || '#067a00'};color:#fff;border-radius:4px;font-size:13px;font-weight:600;font-family:${bodyFont},sans-serif;">Accent CTA</div>
          </div>
        </div>

        <hr class="forge__divider" />

        <!-- ── Pages ─────────────────────────────────────────────────── -->
        <div class="forge__field">
          <label class="forge__label">Pages</label>
          <div class="forge__pages-grid">
            ${AVAILABLE_PAGES.map(
              (p) => html`
                <label class="forge__page-card ${b.pages.includes(p) ? 'forge__page-card--selected' : ''}">
                  <input
                    type="checkbox"
                    .checked=${b.pages.includes(p)}
                    @change=${() => this._togglePage(p)}
                  />
                  <span style="text-transform:capitalize">${p}</span>
                </label>
              `,
            )}
          </div>
        </div>

        <hr class="forge__divider" />

        <!-- ── Images ────────────────────────────────────────────────── -->
        <div class="forge__field">
          <label class="forge__label">Image Style</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${['Photography', 'Illustration', 'Mixed', 'Minimal / Icon-only'].map((style) => html`
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:6px 12px;border-radius:6px;border:1px solid ${b.imageStyle === style ? 'var(--spectrum-blue-700)' : 'var(--spectrum-gray-300)'};background:${b.imageStyle === style ? 'var(--spectrum-blue-100)' : 'transparent'};transition:all 0.15s;">
                <input type="radio" name="image-style" value="${style}"
                  ?checked=${b.imageStyle === style}
                  @change=${() => this._updateBrief('imageStyle', style)}
                  style="display:none;" />
                ${style}
              </label>
            `)}
          </div>
          <p style="font-size:12px;color:var(--spectrum-gray-500);margin:6px 0 0;">
            Controls the visual treatment of hero images, cards, and media blocks generated for the site.
          </p>
        </div>

        <hr class="forge__divider" />

        <!-- ── Commerce ──────────────────────────────────────────────── -->
        <div class="forge__field">
          <div
            class="forge__toggle ${b.commerce ? 'forge__toggle--on' : ''}"
            @click=${() => this._toggleCommerce()}
          >
            <div class="forge__toggle-switch"></div>
            <span>Enable Commerce (product catalog, cart)</span>
          </div>
        </div>

        ${b.commerce ? html`
          <div style="padding:16px;background:var(--spectrum-gray-75);border-radius:8px;border:1px solid var(--spectrum-gray-200);margin-bottom:16px;">
            <div class="forge__field" style="margin-bottom:12px;">
              <label class="forge__label">Data Source</label>
              <select
                class="forge__select"
                @change=${(e) => this._updateBrief('commerceSource', e.target.value)}
              >
                <option value="">Select source…</option>
                <option value="google-sheets" ?selected=${b.commerceSource === 'google-sheets'}>Google Sheets</option>
                <option value="manual" ?selected=${b.commerceSource === 'manual'}>Manual Entry</option>
                <option value="adobe-commerce" ?selected=${b.commerceSource === 'adobe-commerce'}>Adobe Commerce (Magento)</option>
              </select>
            </div>
            ${b.commerceSource === 'google-sheets' ? html`
              <div class="forge__field" style="margin-bottom:0;">
                <label class="forge__label">Google Sheets URL</label>
                <input
                  class="forge__input"
                  type="url"
                  .value=${b.commerceUrl || ''}
                  @input=${(e) => this._updateBrief('commerceUrl', e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                />
              </div>
            ` : nothing}
            ${b.commerceSource === 'adobe-commerce' ? html`
              <div class="forge__field" style="margin-bottom:0;">
                <label class="forge__label">Adobe Commerce / Magento URL</label>
                <input
                  class="forge__input"
                  type="url"
                  .value=${b.commerceUrl || ''}
                  @input=${(e) => this._updateBrief('commerceUrl', e.target.value)}
                  placeholder="https://your-store.example.com"
                />
              </div>
            ` : nothing}
            ${b.commerceSource === 'manual' ? html`
              <p style="font-size:12px;color:var(--spectrum-gray-500);margin:0;">
                Product catalog will be set up in DA.live using a spreadsheet block after generation.
              </p>
            ` : nothing}
          </div>
        ` : nothing}

        <hr class="forge__divider" />

        <!-- ── Deployment ─────────────────────────────────────────────── -->
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="forge__field" style="flex:1;min-width:200px;">
            <label class="forge__label">GitHub Org</label>
            <input
              class="forge__input"
              type="text"
              .value=${b.githubOrg || this.context?.org || ''}
              @input=${(e) => this._updateBrief('githubOrg', e.target.value)}
              placeholder="cklein08"
            />
          </div>
          <div class="forge__field" style="flex:1;min-width:200px;">
            <label class="forge__label">Site Name (repo)</label>
            <input
              class="forge__input"
              type="text"
              .value=${b.siteName || this.context?.repo || ''}
              @input=${(e) => this._updateBrief('siteName', e.target.value)}
              placeholder="my-brand-site"
            />
          </div>
        </div>

        <!-- Repository mode -->
        <div class="forge__field">
          <label class="forge__label">Repository</label>
          <div style="display:flex;gap:16px;margin-bottom:8px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
              <input type="radio" name="repo-mode" value="new"
                ?checked=${this.brief.createNewRepo !== false}
                @change=${() => this._updateBrief('createNewRepo', true)} />
              Create new repository
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
              <input type="radio" name="repo-mode" value="existing"
                ?checked=${this.brief.createNewRepo === false}
                @change=${() => this._updateBrief('createNewRepo', false)} />
              Use existing repository
            </label>
          </div>
          <div style="font-size:12px;color:#888;margin-top:2px;">
            ${this.brief.createNewRepo !== false
              ? html`Will create <strong>${b.githubOrg || this.context?.org || 'cklein08'}/${b.siteName || b.brandName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'site'}</strong> on GitHub`
              : html`Will push to existing repo <strong>${b.githubOrg || this.context?.org || 'cklein08'}/${b.siteName || b.brandName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'site'}</strong>`}
          </div>
        </div>

        <!-- Generate button -->
        <div class="forge__btn-row">
          <button
            class="forge__btn forge__btn--primary"
            ?disabled=${this.generating}
            @click=${() => this._generateSite()}
          >
            ${this.generating
              ? html`<span class="forge__spinner"></span> Generating…`
              : '🚀 Generate Site'}
          </button>
        </div>

        <!-- Progress bar -->
        ${this.generating || this._progress > 0 ? html`
          <div class="forge__progress-wrap">
            <div class="forge__progress-bar" style="width:${this._progress}%"></div>
          </div>
        ` : nothing}

        <!-- Generation log -->
        ${this.generationLog.length
          ? html`
              <div class="forge__gen-log">
                ${this.generationLog.map(
                  (l) => html`<div class="forge__gen-log-line ${l.done ? 'forge__gen-log-line--done' : ''}">${l.text}</div>`,
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Render: Co-Pilot tab                                               */
  /* ------------------------------------------------------------------ */
  _renderCopilotTab() {
    return html`
      <div class="forge-tabs__panel" ?hidden=${this.activeTab !== 'copilot'}>
        <p class="forge__lead">
          Describe changes in natural language. FORGE will figure out the scope and apply edits.
        </p>

        <!-- Quick prompts -->
        <div class="forge__quick-prompts">
          ${QUICK_PROMPTS.map(
            (p) => html`
              <button
                class="forge__quick-btn"
                @click=${() => this._sendPrompt(p)}
                ?disabled=${this._sendingChat}
              >${p}</button>
            `,
          )}
        </div>

        <!-- Chat messages -->
        <div class="forge__chat-area">
          ${this.chatMessages.length === 0
            ? html`<p style="color:var(--spectrum-gray-500);text-align:center;margin:40px 0;">No messages yet. Try a quick prompt or type below.</p>`
            : this.chatMessages.map(
                (m) => html`
                  <div class="forge__chat-msg forge__chat-msg--${m.role}">
                    <div>${m.text}</div>
                    ${m.scopes?.length
                      ? html`
                          <div class="forge__scope-badges">
                            ${m.scopes.map(
                              (s) => html`<span class="forge__scope-badge forge__scope-badge--${s}">${s}</span>`,
                            )}
                          </div>
                        `
                      : nothing}
                    ${m.diffs?.length
                      ? m.diffs.map(
                          (d) => html`
                            <div class="forge__diff-block">
                              <div class="forge__diff-file">${d.file || ''}</div>
                              ${(d.changes || []).map(
                                (c) => html`<div class="${c.type === 'add' ? 'forge__diff-add' : c.type === 'remove' ? 'forge__diff-remove' : ''}">${c.line}</div>`,
                              )}
                            </div>
                          `,
                        )
                      : nothing}
                  </div>
                `,
              )}
          ${this._sendingChat
            ? html`<div class="forge__chat-msg forge__chat-msg--assistant"><span class="forge__spinner"></span> Thinking…</div>`
            : nothing}
        </div>

        <!-- Input -->
        <div class="forge__chat-input-row">
          <input
            class="forge__chat-input"
            type="text"
            placeholder="Describe what you want to change…"
            .value=${this._chatInput}
            @input=${(e) => { this._chatInput = e.target.value; }}
            @keydown=${(e) => this._handleChatKeydown(e)}
            ?disabled=${this._sendingChat}
          />
          <button
            class="forge__btn forge__btn--blue"
            ?disabled=${this._sendingChat || !this._chatInput?.trim()}
            @click=${() => this._sendPrompt(this._chatInput)}
          >Send</button>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Render: Preview tab                                                */
  /* ------------------------------------------------------------------ */
  _renderPreviewTab() {
    const urls = this.siteUrls || {};
    const links = [
      { label: '🔗 Preview', url: urls.preview || this.previewUrl },
      { label: '📝 DA', url: urls.da },
      { label: '🌐 Live', url: urls.live },
      { label: '🐙 GitHub', url: urls.github },
      { label: '🔨 FORGE', url: urls.forge },
    ].filter((l) => l.url);

    return html`
      <div class="forge-tabs__panel" ?hidden=${this.activeTab !== 'preview'}>
        ${this.previewUrl
          ? html`
              <div class="forge__preview-wrap">
                <div class="forge__preview-toolbar">
                  <span style="font-weight:600;font-size:13px;">Site Preview</span>
                  <div class="forge__device-btns">
                    ${['desktop', 'tablet', 'mobile'].map(
                      (d) => html`
                        <button
                          class="forge__device-btn ${this._deviceMode === d ? 'forge__device-btn--active' : ''}"
                          @click=${() => { this._deviceMode = d; }}
                        >${d === 'desktop' ? '🖥' : d === 'tablet' ? '📱' : '📲'} ${d}</button>
                      `,
                    )}
                  </div>
                </div>
                <iframe
                  class="forge__preview-iframe ${this._deviceMode !== 'desktop' ? `forge__preview-iframe--${this._deviceMode}` : ''}"
                  src="${this.previewUrl}"
                ></iframe>
              </div>
              <div class="forge__links-row">
                ${links.map(
                  (l) => html`<a class="forge__link-btn" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`,
                )}
              </div>
            `
          : html`
              <div style="text-align:center;padding:60px 20px;color:var(--spectrum-gray-500);">
                <p style="font-size:48px;margin:0 0 16px;">🏗️</p>
                <p style="font-size:16px;margin:0;">No preview yet. Generate a site from the Brief tab first.</p>
              </div>
            `}
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Main render                                                        */
  /* ------------------------------------------------------------------ */
  _renderSwatchTab() {
    const sr = this._swatchResult;
    const bgColor = sr?.colors?.background || '#ffffff';
    const textColor = sr?.colors?.text || '#1a1a1a';
    const headingFont = sr?.fonts?.heading || sr?.headingFont || 'Inter';
    const bodyFont = sr?.fonts?.body || sr?.bodyFont || 'Inter';

    return html`
      <div style="max-width:640px;">
        <h2 style="font-size:18px;font-weight:700;color:var(--spectrum-gray-900);margin:0 0 6px;">🎨 Swatch Generator</h2>
        <p style="color:var(--spectrum-gray-600);font-size:14px;margin:0 0 24px;line-height:1.5;">
          Generate a complete brand identity from a name, or upload an existing brand swatch image to auto-extract colors, fonts, and mood.
        </p>

        <!-- ── Option A: generate from name ─────────────────────────── -->
        <div style="padding:20px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--spectrum-gray-800);margin-bottom:12px;letter-spacing:0.02em;">GENERATE FROM BRAND NAME</div>
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <div class="forge__field" style="flex:1;margin-bottom:0;">
              <input
                class="forge__input"
                type="text"
                placeholder="e.g. Wolverine Mobile, Boost Mobile, Acme Corp"
                .value=${this._swatchBrandInput}
                @input=${(e) => { this._swatchBrandInput = e.target.value; }}
                @keydown=${(e) => { if (e.key === 'Enter') this._generateSwatch(); }}
                ?disabled=${this._swatchGenerating}
              />
            </div>
            <button
              class="forge__btn forge__btn--primary"
              @click=${() => this._generateSwatch()}
              ?disabled=${this._swatchGenerating || !this._swatchBrandInput.trim()}
              style="white-space:nowrap;"
            >
              ${this._swatchGenerating ? html`<span class="forge__spinner"></span> Generating…` : '🎨 Generate'}
            </button>
          </div>
        </div>

        <!-- ── Option B: upload image ────────────────────────────────── -->
        <div style="padding:20px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:600;color:var(--spectrum-gray-800);margin-bottom:12px;letter-spacing:0.02em;">EXTRACT FROM BRAND SWATCH IMAGE</div>
          <div
            class="forge__upload-zone"
            style="min-height:90px;"
            @click=${() => this._openSwatchImagePicker()}
            @dragover=${(e) => { e.preventDefault(); e.currentTarget.classList.add('forge__upload-zone--drag'); }}
            @dragleave=${(e) => e.currentTarget.classList.remove('forge__upload-zone--drag')}
            @drop=${(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('forge__upload-zone--drag');
              const file = e.dataTransfer.files?.[0];
              if (file) this._extractSwatchFromImage(file);
            }}
          >
            ${this._swatchGenerating && !this._swatchBrandInput.trim()
              ? html`<span class="forge__spinner"></span> Scanning image…`
              : html`<span>📎 Click or drag & drop a brand swatch image — AI will extract colors, fonts, logo, and mood</span>`
            }
          </div>
        </div>

        <!-- ── Status ─────────────────────────────────────────────────── -->
        ${this._swatchStatus ? html`
          <div class="forge__status forge__status--${this._swatchStatus.type}" style="margin-bottom:16px;">
            ${this._swatchStatus.text}
          </div>
        ` : nothing}

        <!-- ── Result ─────────────────────────────────────────────────── -->
        ${sr ? html`
          <div style="padding:20px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h3 style="font-size:15px;font-weight:700;margin:0;color:var(--spectrum-gray-900);">Generated Brand Identity</h3>
              ${sr.source ? html`<span style="font-size:11px;color:var(--spectrum-gray-500);padding:2px 8px;background:var(--spectrum-gray-200);border-radius:99px;">${sr.source}</span>` : nothing}
            </div>

            <!-- Meta grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;margin-bottom:16px;">
              <div><span style="color:var(--spectrum-gray-600);">Brand</span><br><strong>${sr.brandName || '—'}</strong></div>
              <div><span style="color:var(--spectrum-gray-600);">Theme</span><br><strong>${sr.darkTheme ? '🌙 Dark' : '☀️ Light'}</strong></div>
              <div><span style="color:var(--spectrum-gray-600);">Tagline</span><br><strong>${sr.tagline || '—'}</strong></div>
              <div><span style="color:var(--spectrum-gray-600);">Mood</span><br><strong style="text-transform:capitalize;">${sr.mood || '—'}</strong></div>
              <div><span style="color:var(--spectrum-gray-600);">Heading Font</span><br><strong>${headingFont}</strong></div>
              <div><span style="color:var(--spectrum-gray-600);">Body Font</span><br><strong>${bodyFont}</strong></div>
            </div>

            <!-- Color palette -->
            <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
              ${Object.entries(sr.colors || {}).map(([name, hex]) => html`
                <div style="text-align:center;min-width:52px;flex:1;">
                  <div style="height:44px;border-radius:6px;background:${hex};border:1px solid var(--spectrum-gray-300);cursor:pointer;"
                    title="${name}: ${hex}"
                    @click=${() => { navigator.clipboard?.writeText(hex); }}
                  ></div>
                  <div style="font-size:10px;color:var(--spectrum-gray-500);margin-top:3px;text-transform:capitalize;">${name}</div>
                  <div style="font-size:10px;color:var(--spectrum-gray-700);font-weight:600;">${hex}</div>
                </div>
              `)}
            </div>

            <!-- Font + color live preview -->
            <div style="padding:16px;background:${bgColor};border-radius:6px;border:1px solid var(--spectrum-gray-200);margin-bottom:16px;">
              <div style="font-family:${headingFont},sans-serif;font-size:22px;font-weight:700;color:${textColor};margin-bottom:6px;">
                ${sr.brandName || 'Brand Name'}
              </div>
              <div style="font-family:${bodyFont},sans-serif;font-size:14px;color:${textColor};opacity:0.85;line-height:1.6;margin-bottom:12px;">
                ${sr.tagline || 'Your tagline appears here. This is body text in your brand font.'}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <div style="padding:6px 14px;background:${sr.colors?.primary || '#0265dc'};color:#fff;border-radius:4px;font-size:13px;font-weight:600;font-family:${bodyFont},sans-serif;">Primary CTA</div>
                <div style="padding:6px 14px;background:${sr.colors?.accent || '#067a00'};color:#fff;border-radius:4px;font-size:13px;font-weight:600;font-family:${bodyFont},sans-serif;">Accent CTA</div>
                <div style="padding:6px 14px;background:${sr.colors?.secondary || '#2c2c2c'};color:#fff;border-radius:4px;font-size:13px;font-weight:600;font-family:${bodyFont},sans-serif;">Secondary</div>
              </div>
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="forge__btn forge__btn--primary" @click=${() => this._applySwatchToBrief()}>Apply to Brief →</button>
              <button class="forge__btn forge__btn--blue" @click=${() => { this._applySwatchToBrief(); setTimeout(() => this._generateSite(), 50); }}>Apply & Generate Site 🚀</button>
              <button class="forge__btn forge__btn--ghost" @click=${() => { this._swatchResult = null; this._swatchStatus = null; }}>Clear</button>
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  async _generateSwatch() {
    const brandName = this._swatchBrandInput.trim();
    if (!brandName) { this._swatchStatus = { type: 'error', text: 'Enter a brand name first.' }; return; }

    this._swatchGenerating = true;
    this._swatchStatus = { type: 'info', text: `🎨 Generating brand identity for "${brandName}"…` };
    this._swatchResult = null;

    try {
      const resp = await fetch(this.apiBase + '/api/generate-swatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName }),
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      this._swatchResult = d;
      this._swatchStatus = { type: 'success', text: '✅ Brand identity generated! Review and apply below.' };
    } catch (err) {
      this._swatchStatus = { type: 'error', text: `❌ ${err.message}` };
    }
    this._swatchGenerating = false;
  }

  async _extractSwatchFromImage(file) {
    if (!file) return;
    this._swatchGenerating = true;
    this._swatchStatus = { type: 'info', text: '🔍 Scanning image for brand tokens…' };
    this._swatchResult = null;

    const previewUrl = URL.createObjectURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const resp = await fetch(`${this.apiBase}/api/extract-brand`, { method: 'POST', body: formData });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      this._swatchResult = data;
      if (data.logoUrl) this._logoPreview = `${this.apiBase}${data.logoUrl}`;
      this._swatchStatus = { type: 'success', text: '✅ Brand tokens extracted! Review and apply below.' };
    } catch (err) {
      this._swatchStatus = { type: 'error', text: `❌ Extraction failed: ${err.message}` };
      URL.revokeObjectURL(previewUrl);
    }
    this._swatchGenerating = false;
  }

  _openSwatchImagePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => this._extractSwatchFromImage(e.target?.files?.[0]);
    input.click();
  }

  _applySwatchToBrief() {
    if (!this._swatchResult) return;
    const d = this._swatchResult;
    if (d.brandName) this._updateBrief('brandName', d.brandName);
    if (d.tagline) this._updateBrief('tagline', d.tagline);
    if (d.mood) this._updateBrief('mood', d.mood);
    if (d.colors) this.brief = { ...this.brief, colors: { ...this.brief.colors, ...d.colors } };
    if (d.fonts?.heading || d.headingFont) this._updateFont('heading', d.fonts?.heading || d.headingFont);
    if (d.fonts?.body || d.bodyFont) this._updateFont('body', d.fonts?.body || d.bodyFont);
    if (d.fonts?.headingWeight) this._updateFont('headingWeight', d.fonts.headingWeight);
    if (d.darkTheme !== undefined) this._updateBrief('darkTheme', d.darkTheme);
    this._selectTab('brief');
    this._showStatus('Brand identity applied to brief!', 'success');
  }

  _renderWorkfrontTab() {
    return html`
      <div style="max-width:600px;">
        <h2 style="font-size:18px;font-weight:700;color:var(--spectrum-gray-900);margin:0 0 8px;">🔗 Workfront Import</h2>
        <p style="color:var(--spectrum-gray-600);font-size:14px;margin:0 0 24px;line-height:1.5;">
          Import a campaign brief from Adobe Workfront. Project metadata — brand colors, assets, goals — will be mapped to your FORGE brief automatically.
        </p>
        <div class="forge__field">
          <label class="forge__label">Workfront Project ID or URL</label>
          <input type="text" class="forge__input" id="wf-project-id" placeholder="e.g. 6789abcd1234ef567890 or paste project URL">
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="forge__btn forge__btn--primary" @click=${() => this._importFromWorkfront()}>Import Project</button>
          <button class="forge__btn" @click=${() => this._browseWorkfront()}>Browse Projects</button>
        </div>
        <div id="wf-status" style="margin-top:16px;font-size:13px;"></div>
        ${this._wfProjects ? html`
          <div style="margin-top:20px;">
            <h3 style="font-size:14px;font-weight:600;margin:0 0 12px;">Available Projects</h3>
            ${this._wfProjects.map(p => html`
              <div style="padding:12px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:6px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s;"
                @click=${() => this._selectWfProject(p)}
                @mouseover=${(e) => e.currentTarget.style.borderColor = 'var(--spectrum-blue-800)'}
                @mouseout=${(e) => e.currentTarget.style.borderColor = 'var(--spectrum-gray-200)'}>
                <div style="font-weight:600;color:var(--spectrum-gray-900);">${p.name}</div>
                <div style="font-size:12px;color:var(--spectrum-gray-500);margin-top:4px;">
                  ${p.status || ''} · ${p.owner || ''} ${p.dueDate ? '· Due ' + p.dueDate : ''}
                </div>
              </div>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  async _browseWorkfront() {
    const status = this.renderRoot.querySelector('#wf-status');
    if (status) status.innerHTML = '<span style="color:var(--spectrum-gray-500);">Loading projects...</span>';
    try {
      const resp = await fetch(this.apiBase + '/api/workfront/projects');
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      this._wfProjects = d.projects || [];
      this.requestUpdate();
      if (status) status.innerHTML = '<span style="color:#16a34a;">' + this._wfProjects.length + ' projects found</span>';
    } catch (err) {
      if (status) status.innerHTML = '<span style="color:#dc2626;">❌ ' + err.message + '</span>';
    }
  }

  async _importFromWorkfront() {
    const input = this.renderRoot.querySelector('#wf-project-id');
    const id = input?.value?.trim();
    if (!id) { this._showStatus('Enter a project ID or URL', 'error'); return; }
    const status = this.renderRoot.querySelector('#wf-status');
    if (status) status.innerHTML = '<span style="color:var(--spectrum-gray-500);">Importing...</span>';
    try {
      const resp = await fetch(this.apiBase + '/api/workfront/projects/' + encodeURIComponent(id));
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      if (d.brief) {
        this.brief = { ...this.brief, ...d.brief };
        this._selectTab('brief');
        this._showStatus('Workfront brief imported!', 'success');
      }
    } catch (err) {
      if (status) status.innerHTML = '<span style="color:#dc2626;">❌ ' + err.message + '</span>';
    }
  }

  _selectWfProject(project) {
    this.brief = { ...this.brief, ...project.brief };
    this._selectTab('brief');
    this._showStatus('Project "' + project.name + '" imported to brief!', 'success');
  }

  _renderDashboard() {
    if (this.activeTab !== 'dashboard') return nothing;
    return html`
      <div style="padding:24px 0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
          <div class="forge__card" @click=${() => this._selectTab('brief')} style="cursor:pointer;padding:24px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;text-align:center;transition:border-color 0.2s,box-shadow 0.2s;">
            <div style="font-size:36px;margin-bottom:12px;">📋</div>
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--spectrum-gray-900);">Briefs</h3>
            <p style="margin:0;font-size:13px;color:var(--spectrum-gray-600);line-height:1.5;">
              Start from a brand brief — define colors, fonts, pages, and generate a complete EDS site.
            </p>
          </div>
          <div class="forge__card" @click=${() => this._selectTab('swatch')} style="cursor:pointer;padding:24px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;text-align:center;transition:border-color 0.2s,box-shadow 0.2s;">
            <div style="font-size:36px;margin-bottom:12px;">🎨</div>
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--spectrum-gray-900);">Swatch Generator</h3>
            <p style="margin:0;font-size:13px;color:var(--spectrum-gray-600);line-height:1.5;">
              Upload a brand swatch image — auto-extract colors, fonts, logo, and mood to populate your brief.
            </p>
          </div>
          <div class="forge__card" @click=${() => this._selectTab('copilot')} style="cursor:pointer;padding:24px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;text-align:center;transition:border-color 0.2s,box-shadow 0.2s;">
            <div style="font-size:36px;margin-bottom:12px;">💬</div>
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--spectrum-gray-900);">Co-Pilot</h3>
            <p style="margin:0;font-size:13px;color:var(--spectrum-gray-600);line-height:1.5;">
              Iterate with natural language — modify CSS, add pages, change mood, inject features via prompts.
            </p>
          </div>
          <div class="forge__card" @click=${() => this._selectTab('workfront')} style="cursor:pointer;padding:24px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;text-align:center;transition:border-color 0.2s,box-shadow 0.2s;">
            <div style="font-size:36px;margin-bottom:12px;">🔗</div>
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--spectrum-gray-900);">Workfront</h3>
            <p style="margin:0;font-size:13px;color:var(--spectrum-gray-600);line-height:1.5;">
              Import a campaign brief from Workfront — auto-map project metadata to site components.
            </p>
          </div>
          <div class="forge__card" @click=${() => this._selectTab('preview')} style="cursor:pointer;padding:24px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;text-align:center;transition:border-color 0.2s,box-shadow 0.2s;">
            <div style="font-size:36px;margin-bottom:12px;">🖥️</div>
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--spectrum-gray-900);">Preview</h3>
            <p style="margin:0;font-size:13px;color:var(--spectrum-gray-600);line-height:1.5;">
              View your generated site — preview in iframe, open in Universal Editor, DA, or publish to live.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <h1 class="forge__title">🔨 FORGE</h1>
      <p class="forge__lead">
        Brand-identity-driven site generator for Adobe Edge Delivery Services.
        ${this.context
          ? html` <span style="font-size:12px;color:var(--spectrum-gray-500);">(${this.context.org}/${this.context.repo})</span>`
          : nothing}
      </p>

      ${this._statusMsg
        ? html`<div class="forge__status forge__status--${this._statusMsg.type}">${this._statusMsg.text}</div>`
        : nothing}

      ${this.activeTab === 'dashboard'
        ? this._renderDashboard()
        : html`
          <div style="margin-bottom:16px;">
            <button class="forge__btn forge__btn--ghost" @click=${() => this._selectTab('dashboard')} style="font-size:13px;">← Back to Dashboard</button>
          </div>
          ${this.activeTab === 'swatch' ? this._renderSwatchTab() : nothing}
          ${this.activeTab === 'workfront' ? this._renderWorkfrontTab() : nothing}
          ${['brief','copilot','preview'].includes(this.activeTab) ? html`
            ${this._renderTabs()}
            ${this._renderBriefTab()}
            ${this._renderCopilotTab()}
            ${this._renderPreviewTab()}
          ` : nothing}
        `}
    `;
  }
}

customElements.define(EL_NAME, ForgeApp);

/* -------------------------------------------------------------------- */
/*  DA.live SDK bootstrap                                                */
/* -------------------------------------------------------------------- */

export default async function init(el) {
  let context = null;
  let daFetch = null;
  try {
    // DA_SDK hangs forever when loaded outside DA.live shell — race with a timeout
    const sdk = await Promise.race([
      DA_SDK,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    context = sdk.context ?? null;
    daFetch = sdk.actions?.daFetch ?? null;
  } catch { /* standalone or timeout — continue without DA context */ }

  const cmp = document.createElement(EL_NAME);
  if (context) cmp.context = context;
  if (daFetch) cmp._daFetch = daFetch;
  el.replaceChildren();
  el.append(cmp);
}

function boot() {
  const root = document.getElementById('forge-root');
  if (!root) return;
  Promise.resolve(init(root)).catch((err) => {
    root.replaceChildren();
    const p = document.createElement('p');
    p.textContent = `Could not start FORGE: ${err?.message ?? err}`;
    p.style.cssText = 'padding:1rem;font-family:system-ui,sans-serif';
    root.append(p);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
