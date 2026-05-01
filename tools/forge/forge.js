/**
 * FORGE — DA.live Lit plugin
 * Brand-identity-driven EDS site generator.
 */
import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

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
      colors: { primary: '#0265dc', secondary: '#2c2c2c', accent: '#067a00', background: '#ffffff', surface: '#f8f8f8' },
      headingFont: 'System Default',
      bodyFont: 'System Default',
      pages: ['home', 'about', 'contact'],
      commerce: false,
      aemAuthorUrl: '',
      githubOrg: '',
      siteName: '',
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
  _updateBrief(field, value) {
    this.brief = { ...this.brief, [field]: value };
  }

  _updateColor(key, value) {
    this.brief = {
      ...this.brief,
      colors: { ...this.brief.colors, [key]: value },
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
      if (data.fonts?.heading) this._updateBrief('headingFont', data.fonts.heading);
      if (data.fonts?.body) this._updateBrief('bodyFont', data.fonts.body);
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

    try {
      const resp = await fetch(`${this.apiBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: this.brief,
          org: this.context?.org || this.brief.githubOrg,
          repo: this.context?.repo || this.brief.siteName,
        }),
      });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);

      // Try streaming (NDJSON) or fall back to plain JSON
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('ndjson') || contentType.includes('stream')) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              this.generationLog = [
                ...this.generationLog,
                { text: msg.message || msg.step || JSON.stringify(msg), done: !!msg.done },
              ];
              if (msg.previewUrl) this.previewUrl = msg.previewUrl;
              if (msg.siteUrls) this.siteUrls = msg.siteUrls;
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await resp.json();
        this.generationLog = [
          ...this.generationLog,
          { text: 'Site generated successfully.', done: true },
        ];
        if (data.previewUrl) this.previewUrl = data.previewUrl;
        if (data.siteUrls) this.siteUrls = data.siteUrls;
      }

      this.generating = false;
      this._statusMsg = { type: 'success', text: 'Site generation complete!' };
      // Auto-switch to preview tab if we have a URL
      if (this.previewUrl) this.activeTab = 'preview';
    } catch (err) {
      this.generating = false;
      this._statusMsg = { type: 'error', text: `Generation failed: ${err.message}` };
      this.generationLog = [
        ...this.generationLog,
        { text: `Error: ${err.message}`, done: false },
      ];
    }
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

      this.chatMessages = [
        ...this.chatMessages,
        {
          role: 'assistant',
          text: data.message || data.response || 'Done.',
          scopes: data.scopes || [],
          diffs: data.diffs || [],
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

    return html`
      <div class="forge-tabs__panel" ?hidden=${this.activeTab !== 'brief'}>
        <!-- Swatch upload -->
        <div class="forge__field">
          <label class="forge__label">Brand Swatch</label>
          <div
            class="forge__upload-zone ${this._swatchPreview ? '' : ''}"
            @click=${() => this._openFilePicker()}
          >
            ${this._swatchPreview
              ? html`<img class="forge__upload-preview" src="${this._swatchPreview}" alt="Swatch preview" />`
              : html`<span>📎 Click to upload a brand swatch image — colors and fonts will be auto-extracted</span>`
            }
          </div>
        </div>

        <!-- Logo preview -->
        ${this._logoPreview ? html`
          <div class="forge__field">
            <label class="forge__label">Logo (extracted from swatch)</label>
            <div style="display:flex;align-items:center;gap:16px;">
              <img src="${this._logoPreview}" style="max-width:150px;max-height:100px;border-radius:6px;border:1px solid var(--spectrum-gray-200);">
              <div>
                <button class="forge__btn forge__btn--ghost" style="font-size:12px;" @click=${() => this._openLogoPicker()}>Upload different logo</button>
              </div>
            </div>
          </div>
        ` : nothing}

        <hr class="forge__divider" />

        <!-- Brand name + tagline -->
        <div class="forge__field">
          <label class="forge__label">Brand Name</label>
          <input
            class="forge__input"
            type="text"
            .value=${b.brandName}
            @input=${(e) => this._updateBrief('brandName', e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div class="forge__field">
          <label class="forge__label">Tagline</label>
          <input
            class="forge__input"
            type="text"
            .value=${b.tagline}
            @input=${(e) => this._updateBrief('tagline', e.target.value)}
            placeholder="Building the future, one pixel at a time"
          />
        </div>

        <!-- Colors -->
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
                  <span style="font-size:11px;color:var(--spectrum-gray-600);text-transform:capitalize">${key}</span>
                </div>
              `,
            )}
          </div>
          <!-- Live color swatch strip -->
          <div style="display:flex;gap:4px;margin-top:10px;padding:8px;background:var(--spectrum-gray-75);border-radius:6px;">
            ${Object.entries(colors).map(([key, val]) => html`
              <div style="flex:1;height:32px;border-radius:4px;background:${val};border:1px solid var(--spectrum-gray-200);" title="${key}: ${val}"></div>
            `)}
          </div>
        </div>

        <!-- Fonts -->
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="forge__field" style="flex:1;min-width:200px;">
            <label class="forge__label">Heading Font</label>
            <select
              class="forge__select"
              .value=${b.headingFont}
              @change=${(e) => this._updateBrief('headingFont', e.target.value)}
            >
              ${FONT_OPTIONS.map((f) => html`<option ?selected=${b.headingFont === f}>${f}</option>`)}
            </select>
          </div>
          <div class="forge__field" style="flex:1;min-width:200px;">
            <label class="forge__label">Body Font</label>
            <select
              class="forge__select"
              .value=${b.bodyFont}
              @change=${(e) => this._updateBrief('bodyFont', e.target.value)}
            >
              ${FONT_OPTIONS.map((f) => html`<option ?selected=${b.bodyFont === f}>${f}</option>`)}
            </select>
          </div>
        </div>
        <!-- Font preview -->
        <div style="padding:12px;background:var(--spectrum-gray-75);border-radius:6px;margin-bottom:16px;">
          <div style="font-family:${b.headingFont || 'Inter'},sans-serif;font-size:20px;font-weight:700;color:var(--spectrum-gray-900);margin-bottom:4px;">
            ${b.brandName || 'Brand Name'} — Heading Preview
          </div>
          <div style="font-family:${b.bodyFont || 'Inter'},sans-serif;font-size:14px;color:var(--spectrum-gray-700);line-height:1.5;">
            ${b.tagline || 'Your tagline will appear here. This is how body text looks with your chosen font.'}
          </div>
        </div>

        <!-- Pages -->
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

        <!-- Commerce toggle -->
        <div class="forge__field">
          <div
            class="forge__toggle ${b.commerce ? 'forge__toggle--on' : ''}"
            @click=${() => this._toggleCommerce()}
          >
            <div class="forge__toggle-switch"></div>
            <span>Enable Commerce (product catalog, cart)</span>
          </div>
        </div>

        <hr class="forge__divider" />

        <!-- Deployment settings -->
        <div class="forge__field">
          <label class="forge__label">AEM Author URL (optional)</label>
          <input
            class="forge__input"
            type="text"
            .value=${b.aemAuthorUrl}
            @input=${(e) => this._updateBrief('aemAuthorUrl', e.target.value)}
            placeholder="https://author-pXXXX-eYYYY.adobeaemcloud.com"
          />
        </div>
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
      { label: '✏️ Universal Editor', url: urls.ue },
      { label: '📝 DA', url: urls.da },
      { label: '🌐 Live', url: urls.live },
      { label: '🐙 GitHub', url: urls.github },
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
    return html`
      <div style="max-width:600px;">
        <h2 style="font-size:18px;font-weight:700;color:var(--spectrum-gray-900);margin:0 0 8px;">🎨 Swatch Generator</h2>
        <p style="color:var(--spectrum-gray-600);font-size:14px;margin:0 0 24px;line-height:1.5;">
          Upload a brand identity image or style guide. FORGE will scan it and extract colors, fonts, logo, and mood — then auto-populate your brief.
        </p>
        <div class="forge__upload-zone" style="padding:48px 24px;text-align:center;border:2px dashed var(--spectrum-gray-300);border-radius:8px;cursor:pointer;transition:border-color 0.2s;"
          @click=${() => this.renderRoot.querySelector('#swatch-input').click()}
          @dragover=${(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--spectrum-blue-800)'; }}
          @dragleave=${(e) => { e.currentTarget.style.borderColor = 'var(--spectrum-gray-300)'; }}
          @drop=${(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--spectrum-gray-300)'; const f = e.dataTransfer.files[0]; if (f) this._processSwatch(f); }}>
          <div style="font-size:48px;margin-bottom:12px;">🎨</div>
          <div style="font-size:14px;color:var(--spectrum-gray-700);font-weight:600;">Drop your brand swatch here</div>
          <div style="font-size:13px;color:var(--spectrum-gray-500);margin-top:4px;">or click to browse</div>
          <input type="file" id="swatch-input" accept="image/*" style="display:none;"
            @change=${(e) => { const f = e.target.files[0]; if (f) this._processSwatch(f); }}>
        </div>
        <div id="swatch-preview" style="margin-top:16px;"></div>
        <div id="swatch-status" style="margin-top:12px;font-size:13px;"></div>
        ${this._swatchResult ? html`
          <div style="margin-top:24px;padding:20px;background:var(--spectrum-gray-50);border:1px solid var(--spectrum-gray-200);border-radius:8px;">
            <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;color:var(--spectrum-gray-900);">Extracted Brand Tokens</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
              <div><strong>Brand:</strong> ${this._swatchResult.brandName || '—'}</div>
              <div><strong>Tagline:</strong> ${this._swatchResult.tagline || '—'}</div>
              <div><strong>Mood:</strong> ${this._swatchResult.mood || '—'}</div>
              <div><strong>Theme:</strong> ${this._swatchResult.darkTheme ? 'Dark' : 'Light'}</div>
              <div><strong>Heading Font:</strong> ${this._swatchResult.fonts?.heading || '—'}</div>
              <div><strong>Body Font:</strong> ${this._swatchResult.fonts?.body || '—'}</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              ${Object.entries(this._swatchResult.colors || {}).map(([name, hex]) => html`
                <div style="text-align:center;">
                  <div style="width:40px;height:40px;border-radius:6px;background:${hex};border:1px solid var(--spectrum-gray-300);"></div>
                  <div style="font-size:10px;color:var(--spectrum-gray-500);margin-top:4px;">${name}</div>
                  <div style="font-size:10px;color:var(--spectrum-gray-700);font-weight:600;">${hex}</div>
                </div>
              `)}
            </div>
            ${this._swatchResult.logoUrl ? html`
              <div style="margin-top:16px;">
                <strong style="font-size:13px;">Logo (extracted):</strong>
                <img src="${this.apiBase}${this._swatchResult.logoUrl}" style="display:block;max-width:150px;max-height:100px;margin-top:8px;border-radius:6px;border:1px solid var(--spectrum-gray-200);">
              </div>
            ` : nothing}
            <div style="margin-top:20px;display:flex;gap:8px;">
              <button class="forge__btn forge__btn--primary" @click=${() => this._applySwatchToBrief()}>Apply to Brief →</button>
              <button class="forge__btn forge__btn--ghost" @click=${() => { this._swatchResult = null; this.requestUpdate(); }}>Clear</button>
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  async _processSwatch(file) {
    const preview = this.renderRoot.querySelector('#swatch-preview');
    const status = this.renderRoot.querySelector('#swatch-status');
    if (preview) {
      const url = URL.createObjectURL(file);
      preview.innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:200px;border-radius:8px;">';
    }
    if (status) {
      status.innerHTML = '<span style="color:var(--spectrum-gray-500);">🔍 Scanning swatch for brand tokens...</span>';
    }
    const fd = new FormData();
    fd.append('image', file);
    try {
      const resp = await fetch(this.apiBase + '/api/extract-brand', { method: 'POST', body: fd });
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      this._swatchResult = d;
      this.requestUpdate();
      if (status) status.innerHTML = '<span style="color:#16a34a;">✅ Brand tokens extracted! Review below.</span>';
    } catch (err) {
      if (status) status.innerHTML = '<span style="color:#dc2626;">❌ ' + err.message + '</span>';
    }
  }

  _applySwatchToBrief() {
    if (!this._swatchResult) return;
    const d = this._swatchResult;
    if (d.brandName) this.brief = { ...this.brief, brandName: d.brandName };
    if (d.tagline) this.brief = { ...this.brief, tagline: d.tagline };
    if (d.colors) this.brief = { ...this.brief, colors: { ...this.brief.colors, ...d.colors } };
    if (d.fonts) this.brief = { ...this.brief, fonts: { ...this.brief.fonts, ...d.fonts } };
    if (d.darkTheme !== undefined) this.brief = { ...this.brief, darkTheme: d.darkTheme };
    if (d.mood) this.brief = { ...this.brief, mood: d.mood };
    this._selectTab('brief');
    this._showStatus('Brand tokens applied to brief!', 'success');
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
  try {
    // DA_SDK hangs forever when loaded outside DA.live shell — race with a timeout
    const sdk = await Promise.race([
      DA_SDK,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    context = sdk.context ?? null;
  } catch { /* standalone or timeout — continue without DA context */ }

  const cmp = document.createElement(EL_NAME);
  if (context) cmp.context = context;
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
