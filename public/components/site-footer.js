class SiteFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['nav-items'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
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

        footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 3rem;
          border-top: 1px solid var(--border-color, #e5e5e5);
          padding-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary, #666666);
        }

        .footer-left {
          flex: 1;
        }

        .footer-right {
          display: flex;
          gap: 1.5rem;
        }

        .footer-right a {
          color: var(--text-secondary, #666666);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-right a:hover {
          color: var(--accent-color, #667eea);
          text-decoration: underline;
        }

        @media (prefers-color-scheme: dark) {
          :host-context(:root[data-theme="dark"]) footer {
            border-top-color: #333333;
            color: #cccccc;
          }

          :host-context(:root[data-theme="dark"]) .footer-right a {
            color: #cccccc;
          }
        }
      </style>

      <footer>
        <div class="footer-left">
          Made with <span style="color: #ff6b6b;">❤</span> by Jan Karlo Dela Cruz
        </div>
        <nav class="footer-right">
          <a href="/">Home</a>
          ${navHtml}
        </nav>
      </footer>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('site-footer', SiteFooter);
