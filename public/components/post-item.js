class PostItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['title', 'href', 'date'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const title = this.getAttribute('title') || '';
    const href = this.getAttribute('href') || '#';
    const date = this.getAttribute('date') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .post-item {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          font-family: 'IBM Plex Mono', monospace;
        }

        .post-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .post-title {
          margin: 0;
          font-size: 1.1em;
          line-height: 1.6;
        }

        .post-title a {
          color: var(--text-secondary);
          text-decoration: underline;
        }

        .post-title a:hover {
          text-decoration: underline;
          text-decoration-color: var(--accent-color);
          text-decoration-thickness: 3px;
        }

        .post-date {
          color: #999;
          font-size: 0.9em;
          margin: 0.25rem 0 0 0;
          line-height: 1.6;
        }
      </style>

      <div class="post-item">
        <h3 class="post-title"><a href="${this.escapeHtml(href)}">${this.escapeHtml(title)}</a></h3>
        <p class="post-date">${this.escapeHtml(date)}</p>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('post-item', PostItem);
