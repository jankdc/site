class SiteHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initTheme();
    this.setupThemeToggle();
  }

  static get observedAttributes() {
    return ['title', 'nav-items'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const title = this.getAttribute('title') || 'Blog';
    const navItemsAttr = this.getAttribute('nav-items');
    const navItems = navItemsAttr ? JSON.parse(navItemsAttr) : [];

    const navHtml = navItems
      .map(item => `<a href="${this.escapeHtml(item.url)}">${this.escapeHtml(item.label)}</a>`)
      .join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 3rem;
          border-bottom: 1px solid var(--border-color, #e5e5e5);
          padding-bottom: 1.5rem;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .site-title {
          font-size: 1rem;
          margin: 0;
          color: var(--text-primary, #1a1a1a);
          font-family: 'IBM Plex Mono', monospace;
        }

        .site-title .accent {
          color: var(--accent-color, hsl(22, 76%, 66%));
        }

        .site-nav {
          display: flex;
          gap: 1.5rem;
          margin-left: auto;
        }

        .site-nav a {
          color: var(--text-secondary, #666666);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s ease;
        }

        .site-nav a:hover {
          color: var(--accent-color, #667eea);
          text-decoration: underline;
        }

        .theme-toggle {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-primary, #1a1a1a);
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .theme-toggle:hover {
          transform: scale(1.1);
        }

        @media (prefers-color-scheme: dark) {
          :host-context(:root[data-theme="dark"]) header {
            border-bottom-color: #333333;
          }

          :host-context(:root[data-theme="dark"]) .site-title {
            color: #ffffff;
          }

          :host-context(:root[data-theme="dark"]) .site-nav a {
            color: #cccccc;
          }

          :host-context(:root[data-theme="dark"]) .theme-toggle {
            color: #ffffff;
          }
        }
      </style>

      <header>
        <div class="header-content">
          <h1 class="site-title">${this.escapeHtml(title)}</h1>
          <nav class="site-nav">
            <a href="/">Home</a>
            ${navHtml}
          </nav>
        </div>
        <button class="theme-toggle" aria-label="Toggle dark mode">🌙</button>
      </header>
    `;
  }

  initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeIcon(theme);
  }

  setupThemeToggle() {
    const toggle = this.shadowRoot.querySelector('.theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => this.toggleTheme());
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    const toggle = this.shadowRoot.querySelector('.theme-toggle');
    if (toggle) {
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('site-header', SiteHeader);
