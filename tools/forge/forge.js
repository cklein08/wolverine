/**
 * FORGE — DA.live Lit plugin
 * Brand-identity-driven EDS site generator.
 */
import { LitElement, html, css, nothing } from '../../deps/lit/dist/index.js';
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
    this.activeTab = 'brief';
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

  async _handleSwatchUpload(e) {
    const file = e.target?.files?.[0];
    if (!file) return;

    this._swatchPreview = URL.createObjectURL(file);
    this._statusMsg = { type: 'info', text: 'Extracting brand tokens from swatch…' };

    try {
      const formData = new FormData();
      formData.append('swatch', file);
      const resp = await fetch(`${this.apiBase}/api/extract-brand`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();

      // Fill brief from extracted data
      if (data.brandName) this._updateBrief('brandName', data.brandName);
      if (data.tagline) this._updateBrief('tagline', data.tagline);
      if (data.colors) {
        const c = { ...this.brief.colors };
        if (data.colors.primary) c.primary = data.colors.primary;
        if (data.colors.secondary) c.secondary = data.colors.secondary;
        if (data.colors.accent) c.accent = data.colors.accent;
        if (data.colors.background) c.background = data.colors.background;
        if (data.colors.surface) c.surface = data.colors.surface;
        this.brief = { ...this.brief, colors: c };
      }
      if (data.headingFont) this._updateBrief('headingFont', data.headingFont);
      if (data.bodyFont) this._updateBrief('bodyFont', data.bodyFont);

      this._statusMsg = { type: 'success', text: 'Brand tokens extracted successfully.' };
    } catch (err) {
      this._statusMsg = { type: 'error', text: `Extraction failed: ${err.message}` };
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
  render() {
    return html`
      <h1 class="forge__title">🔥 FORGE</h1>
      <p class="forge__lead">
        Brand-identity-driven site generator for Adobe Edge Delivery Services.
        ${this.context
          ? html` <span style="font-size:12px;color:var(--spectrum-gray-500);">(${this.context.org}/${this.context.repo})</span>`
          : nothing}
      </p>

      ${this._statusMsg
        ? html`<div class="forge__status forge__status--${this._statusMsg.type}">${this._statusMsg.text}</div>`
        : nothing}

      ${this._renderTabs()}
      ${this._renderBriefTab()}
      ${this._renderCopilotTab()}
      ${this._renderPreviewTab()}
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
    const sdk = await DA_SDK;
    context = sdk.context ?? null;
  } catch { /* standalone */ }

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
