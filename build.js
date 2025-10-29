import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedFootnote from 'marked-footnote';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, 'src', 'pages');
const LAYOUT_DIR = path.join(__dirname, 'src', 'layout');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');

// Configure marked with syntax highlighting
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));
marked.use(markedFootnote());

// Register Handlebars helper for JSON stringification
Handlebars.registerHelper('json', function(obj) {
  return JSON.stringify(obj || []);
});

async function setup() {
  await fs.emptyDir(DIST_DIR);

  // Copy public directory contents to dist
  await fs.copy(PUBLIC_DIR, DIST_DIR);
}

function compileLayout(layoutName) {
  const layoutPath = path.join(LAYOUT_DIR, `${layoutName}.hbs`);
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
  return Handlebars.compile(layoutContent);
}

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function processPage(filePath, allPages = []) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: pageContent } = matter(content);

  // Check if page should be live (defaults to false if not specified)
  const isLive = data.live === true;

  // Convert markdown to HTML
  const renderedContent = marked(pageContent);

  // Format date if present
  const formattedDate = formatDate(data.date);

  // Apply layout
  const layoutName = data.layout || 'post';
  const layoutTemplate = compileLayout(layoutName);

  // For home page, pass all pages for the posts section
  const templateData = {
    ...data,
    date: formattedDate,
    content: renderedContent,
    navLinks: data.navLinks || [],
    siteTitle: 'neverendingloop',
    ...(layoutName === 'home' && { posts: allPages })
  };

  const finalHtml = layoutTemplate(templateData);

  // Determine output path
  const relativePath = path.relative(PAGES_DIR, filePath);
  const outputPath = path.join(DIST_DIR, relativePath.replace(/\.md$/, '.html'));

  // Only write output if page is live
  if (isLive) {
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Write output
    await fs.writeFile(outputPath, finalHtml);
    console.log(`Generated: ${relativePath.replace(/\.md$/, '.html')}`);
  } else {
    console.log(`Skipped (not live): ${relativePath.replace(/\.md$/, '.html')}`);
  }
}

async function build() {
  await setup();

  const files = await fs.readdir(PAGES_DIR, { recursive: true });
  const mdFiles = [];

  // First pass: collect all markdown files and their metadata
  for (const file of files) {
    const filePath = path.join(PAGES_DIR, file);
    const stat = await fs.stat(filePath);

    if (stat.isFile() && path.extname(file) === '.md') {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);

      mdFiles.push({
        path: file,
        filename: path.basename(file, '.md'),
        title: data.title || file,
        date: data.date,
        formattedDate: formatDate(data.date),
        live: data.live === true
      });
    }
  }

  // Build posts list (exclude index.md and only include live posts)
  const posts = mdFiles
    .filter(f => f.filename !== 'index' && f.live)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Second pass: process all pages
  for (const file of files) {
    const filePath = path.join(PAGES_DIR, file);
    const stat = await fs.stat(filePath);

    if (stat.isFile() && path.extname(file) === '.md') {
      await processPage(filePath, posts);
    }
  }

  console.log('\nBuild complete!');
}

try {
  await build();
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
