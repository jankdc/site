# CLAUDE.md

- Minimal static site generator
- @package.json for tooling
- Use `tree -I 'node_modules|dist|.git' --dirsfirst -L 3` to get project structure
- @build.js is the main build script
- Create a web component instead of duplicating HTML between pages
- Create a common stylesheet instead of duplicating CSS between pages
- Create a common JS file instead of duplicating JS between pages
- Except for the markdown styling, avoid adding styles to tags
- Verify changes using the chrome-devtools MCP
- Site is available usually in http://localhost:3000
