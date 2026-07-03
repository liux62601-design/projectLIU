/* ============================================================
   TechTutorial Pro — Tutorial Center SPA Engine
   Hash-based routing, structured content rendering, search
   ============================================================ */
(function() {
  'use strict';

  let tutorials = [];
  let currentTutorial = null;
  let currentTutorialId = null;

  // --- Syntax highlighting (simple keyword-based) ---
  const HIGHLIGHTERS = {
    javascript: function(code) {
      const keywords = ['const','let','var','function','return','if','else','for','while','do','switch','case','break','continue','new','this','class','extends','import','export','from','default','async','await','try','catch','throw','finally','typeof','instanceof','of','in','null','undefined','true','false'];
      return highlightGeneric(code, keywords);
    },
    js: function(code) { return HIGHLIGHTERS.javascript(code); },
    python: function(code) {
      const keywords = ['def','class','return','if','elif','else','for','while','import','from','as','try','except','finally','with','raise','pass','break','continue','in','is','not','and','or','True','False','None','lambda','yield','self'];
      return highlightGeneric(code, keywords);
    },
    c: function(code) {
      const keywords = ['int','char','float','double','void','long','short','unsigned','signed','const','static','extern','volatile','struct','enum','union','typedef','sizeof','return','if','else','for','while','do','switch','case','break','continue','goto','default','include','define','ifdef','ifndef','endif','pragma','NULL','true','false'];
      return highlightGeneric(code, keywords);
    },
    cpp: function(code) {
      const keywords = ['int','char','float','double','void','long','short','unsigned','signed','const','static','extern','volatile','struct','enum','union','typedef','sizeof','return','if','else','for','while','do','switch','case','break','continue','goto','default','include','define','class','public','private','protected','virtual','override','template','typename','namespace','using','new','delete','nullptr','true','false','auto','constexpr'];
      return highlightGeneric(code, keywords);
    },
    bash: function(code) {
      const keywords = ['if','then','else','elif','fi','for','while','do','done','case','esac','in','function','return','exit','export','local','source','echo','cd','ls','mkdir','rm','cp','mv','cat','grep','sed','awk','chmod','chown','sudo','git','npm','npx','docker','curl','wget'];
      return highlightGeneric(code, keywords);
    },
    json: function(code) {
      return code.replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="hl-key">$1</span>:')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="hl-string">$1</span>')
        .replace(/:\s*(\d+\.?\d*)/g, ': <span class="hl-number">$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span class="hl-keyword">$1</span>');
    },
    html: function(code) {
      return code.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="hl-keyword">$2</span>')
        .replace(/(\s+)([\w-]+)(=)/g, '$1<span class="hl-attr">$2</span>$3')
        .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>')
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>');
    },
    css: function(code) {
      return code.replace(/([.#][\w-]+)/g, '<span class="hl-selector">$1</span>')
        .replace(/([\w-]+)\s*:/g, '<span class="hl-attr">$1</span>:')
        .replace(/:\s*([^;]+)/g, ': <span class="hl-value">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    },
    text: function(code) { return escapeHTML(code); }
  };

  function highlightGeneric(code, keywords) {
    let html = escapeHTML(code);
    // Strings
    html = html.replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;)/g, '<span class="hl-string">$1</span>');
    html = html.replace(/(&#39;(?:[^&]|&(?!amp;))*&#39;)/g, '<span class="hl-string">$1</span>');
    html = html.replace(/(`(?:[^`]|``)*`)/g, '<span class="hl-string">$1</span>');
    // Comments
    html = html.replace(/(\/\/.*)/g, '<span class="hl-comment">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
    // Keywords
    keywords.forEach(function(kw) {
      const re = new RegExp('\\b(' + kw + ')\\b', 'g');
      html = html.replace(re, '<span class="hl-keyword">$1</span>');
    });
    // Function calls
    html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="hl-function">$1</span>(');
    return html;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Inline formatting ---
  function parseInline(text) {
    let html = escapeHTML(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    // Links [text](url)
    html = html.replace(/\[\[(.+?)\]\]\((.+?)\)/g, function(m, text, url) {
      const isExternal = url.startsWith('http');
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + url + '"' + target + '>' + text + '</a>';
    });
    // Wiki-style links [[text]](url) or [[text]]
    html = html.replace(/\[\[(.+?)\]\]/g, function(m, text) {
      // Check if it's a tutorial reference
      const slug = text.toLowerCase().replace(/\s+/g, '-');
      return '<a href="#/' + slug + '">' + text + '</a>';
    });
    return html;
  }

  // --- Content rendering ---
  function renderContent(contentArray) {
    const fragment = document.createDocumentFragment();

    contentArray.forEach(function(block) {
      const type = block.type;

      switch (type) {
        case 'heading': {
          const el = document.createElement('h' + (block.level || 2));
          el.id = slugify(block.text);
          el.innerHTML = parseInline(block.text);
          fragment.appendChild(el);
          break;
        }
        case 'paragraph': {
          const el = document.createElement('p');
          el.innerHTML = parseInline(block.text);
          fragment.appendChild(el);
          break;
        }
        case 'code': {
          const wrapper = document.createElement('div');
          wrapper.className = 'code-block-wrapper';

          const langLabel = document.createElement('div');
          langLabel.className = 'code-lang-label';
          langLabel.textContent = block.language || 'text';
          wrapper.appendChild(langLabel);

          const copyBtn = document.createElement('button');
          copyBtn.className = 'copy-btn';
          copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> 复制';
          copyBtn.addEventListener('click', function() {
            TechTutorial.utils.copyToClipboard(block.code).then(function() {
              copyBtn.classList.add('copied');
              copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
              setTimeout(function() {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> 复制';
              }, 2000);
            });
          });
          wrapper.appendChild(copyBtn);

          const pre = document.createElement('pre');
          const code = document.createElement('code');
          code.className = 'language-' + (block.language || 'text');

          const highlighter = HIGHLIGHTERS[block.language] || HIGHLIGHTERS.text;
          code.innerHTML = highlighter(block.code);
          pre.appendChild(code);
          wrapper.appendChild(pre);
          fragment.appendChild(wrapper);
          break;
        }
        case 'list': {
          const el = document.createElement(block.ordered ? 'ol' : 'ul');
          (block.items || []).forEach(function(item) {
            const li = document.createElement('li');
            li.innerHTML = parseInline(item);
            el.appendChild(li);
          });
          fragment.appendChild(el);
          break;
        }
        case 'image': {
          const figure = document.createElement('figure');
          const img = document.createElement('img');
          img.src = block.src;
          img.alt = block.alt || '';
          img.loading = 'lazy';
          img.addEventListener('click', function() {
            // Simple lightbox for tutorial images
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            if (lightbox && lightboxImg) {
              lightboxImg.src = block.src;
              lightboxImg.alt = block.alt || '';
              lightbox.classList.add('open');
            }
          });
          img.style.cursor = 'zoom-in';
          figure.appendChild(img);
          if (block.caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = block.caption;
            figure.appendChild(figcaption);
          }
          fragment.appendChild(figure);
          break;
        }
        case 'table': {
          const table = document.createElement('table');
          if (block.headers) {
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            block.headers.forEach(function(h) {
              const th = document.createElement('th');
              th.textContent = h;
              tr.appendChild(th);
            });
            thead.appendChild(tr);
            table.appendChild(thead);
          }
          if (block.rows) {
            const tbody = document.createElement('tbody');
            block.rows.forEach(function(row) {
              const tr = document.createElement('tr');
              row.forEach(function(cell) {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });
            table.appendChild(tbody);
          }
          fragment.appendChild(table);
          break;
        }
        case 'blockquote': {
          const el = document.createElement('blockquote');
          el.innerHTML = parseInline(block.text || '');
          fragment.appendChild(el);
          break;
        }
        case 'divider': {
          fragment.appendChild(document.createElement('hr'));
          break;
        }
        case 'video': {
          const wrapper = document.createElement('div');
          wrapper.className = 'video-wrapper';

          if (block.src && block.src.includes('youtube.com')) {
            wrapper.innerHTML = '<iframe src="' + escapeHTML(block.src) + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
          } else if (block.src && block.src.includes('bilibili.com')) {
            wrapper.innerHTML = '<iframe src="' + escapeHTML(block.src) + '" frameborder="0" allowfullscreen></iframe>';
          } else if (block.src) {
            const video = document.createElement('video');
            video.src = block.src;
            video.controls = true;
            if (block.poster) video.poster = block.poster;
            wrapper.appendChild(video);
          }
          fragment.appendChild(wrapper);
          break;
        }
        case 'callout': {
          const el = document.createElement('div');
          el.className = 'callout callout-' + (block.calloutType || 'info');
          const iconMap = { info: 'ℹ️', warning: '⚠️', tip: '💡', danger: '🚨' };
          el.innerHTML = '<span class="callout-icon">' + (iconMap[block.calloutType] || 'ℹ️') + '</span><div>' + parseInline(block.text || '') + '</div>';
          fragment.appendChild(el);
          break;
        }
      }
    });

    return fragment;
  }

  // --- Table of Contents ---
  function generateTOC(contentArray) {
    const toc = document.getElementById('toc-nav');
    const tocSidebar = document.getElementById('toc-sidebar');
    if (!toc) return;

    toc.innerHTML = '';
    const headings = contentArray.filter(function(b) { return b.type === 'heading'; });

    headings.forEach(function(h) {
      const a = document.createElement('a');
      a.href = '#' + slugify(h.text);
      a.textContent = h.text;
      a.className = 'toc-link toc-h' + (h.level || 2);
      a.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.getElementById(slugify(h.text));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
      toc.appendChild(a);
    });

    if (tocSidebar) tocSidebar.style.display = headings.length > 0 ? 'block' : 'none';
  }

  // --- Sidebar ---
  function renderSidebar() {
    const sidebar = document.getElementById('tutorial-sidebar');
    if (!sidebar) return;

    // Create or find the tutorial list
    let list = sidebar.querySelector('.tutorial-list-sidebar');
    if (!list) {
      const listSection = document.createElement('div');
      listSection.className = 'sidebar-section';
      listSection.innerHTML = '<div class="sidebar-section-title">教程列表</div>';
      list = document.createElement('ul');
      list.className = 'tutorial-list-sidebar';
      listSection.appendChild(list);
      // Insert after category section or at beginning
      const tagSection = document.getElementById('tag-section');
      if (tagSection) {
        sidebar.insertBefore(listSection, tagSection);
      } else {
        sidebar.appendChild(listSection);
      }
    }
    list.innerHTML = '';

    tutorials.forEach(function(t) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#/' + t.id;
      a.dataset.id = t.id;
      a.innerHTML = '<span class="tutorial-dot"></span>' + escapeHTML(t.title);

      a.addEventListener('click', function(e) {
        e.preventDefault();
        loadTutorial(t.id);
        // Close sidebar on mobile
        sidebar.classList.remove('open');
        // Update active state
        list.querySelectorAll('a').forEach(function(el) { el.classList.remove('active'); });
        a.classList.add('active');
      });
      li.appendChild(a);
      list.appendChild(li);
    });

    // Wire up category filter buttons
    const catList = document.getElementById('cat-list');
    if (catList) {
      catList.querySelectorAll('button[data-cat]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          catList.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          filterByCategory(btn.dataset.cat);
        });
      });
    }

    // Render tags
    const allTags = {};
    tutorials.forEach(function(t) {
      (t.tags || []).forEach(function(tag) {
        allTags[tag] = (allTags[tag] || 0) + 1;
      });
    });

    const tagCloud = document.getElementById('tag-cloud');
    if (tagCloud) {
      tagCloud.innerHTML = '';
      Object.keys(allTags).sort().forEach(function(tag) {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = tag;
        span.addEventListener('click', function() {
          filterByTag(tag);
          // Update active state
          tagCloud.querySelectorAll('.tag-chip').forEach(function(t) { t.classList.remove('active'); });
          span.classList.add('active');
        });
        tagCloud.appendChild(span);
      });
    }
  }

  function filterByCategory(cat) {
    const list = document.querySelector('.tutorial-list-sidebar');
    if (!list) return;
    const items = list.querySelectorAll('a');
    items.forEach(function(a) {
      const t = tutorials.find(function(t) { return t.id === a.dataset.id; });
      if (t) {
        a.parentElement.style.display = (cat === 'all' || t.category === cat) ? '' : 'none';
      }
    });
  }

  function filterByTag(tag) {
    const catList = document.getElementById('cat-list');
    if (catList) {
      catList.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
      const allBtn = catList.querySelector('button[data-cat="all"]');
      if (allBtn) allBtn.classList.add('active');
    }

    const list = document.querySelector('.tutorial-list-sidebar');
    if (!list) return;
    const items = list.querySelectorAll('a');
    items.forEach(function(a) {
      const t = tutorials.find(function(t) { return t.id === a.dataset.id; });
      if (t) {
        a.parentElement.style.display = (t.tags || []).includes(tag) ? '' : 'none';
      }
    });
  }

  // --- Search ---
  function initSearch() {
    const input = document.getElementById('tutorial-search');
    if (!input) return;

    input.addEventListener('input', TechTutorial.utils.debounce(function() {
      const query = input.value.toLowerCase().trim();
      const list = document.querySelector('.tutorial-list-sidebar');
      if (!list) return;
      const items = list.querySelectorAll('a');

      if (!query) {
        items.forEach(function(item) { item.parentElement.style.display = ''; });
        return;
      }

      items.forEach(function(a) {
        const t = tutorials.find(function(t) { return t.id === a.dataset.id; });
        if (t) {
          const matchTitle = t.title.toLowerCase().includes(query);
          const matchDesc = t.description.toLowerCase().includes(query);
          const matchTags = (t.tags || []).some(function(tag) { return tag.toLowerCase().includes(query); });
          a.parentElement.style.display = (matchTitle || matchDesc || matchTags) ? '' : 'none';
        }
      });
    }, 200));
  }

  // --- Load and render tutorial ---
  function loadTutorial(id) {
    currentTutorialId = id;
    const contentArea = document.getElementById('tutorial-content');
    const loadingEl = document.getElementById('tutorial-skeleton');
    const emptyInitial = document.getElementById('tutorial-empty-initial');
    const emptySearch = document.getElementById('tutorial-empty-search');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentArea) contentArea.classList.add('hidden');
    if (emptyInitial) emptyInitial.classList.add('hidden');
    if (emptySearch) emptySearch.classList.add('hidden');

    const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
    const dataPath = basePath + '/data/' + id + '.json';

    fetch(dataPath)
      .then(function(response) {
        if (!response.ok) throw new Error('Tutorial not found');
        return response.json();
      })
      .then(function(data) {
        currentTutorial = data;
        if (loadingEl) loadingEl.classList.add('hidden');
        if (contentArea) contentArea.classList.remove('hidden');

        // Build tutorial header
        const existingHeader = document.querySelector('.tutorial-header');
        if (existingHeader) existingHeader.remove();

        const header = document.createElement('div');
        header.className = 'tutorial-header';
        const difficultyLabels = { beginner: '入门', intermediate: '进阶', advanced: '高级' };
        header.innerHTML =
          '<div class="tutorial-meta">' +
            '<span class="tutorial-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + (data.date || '') + '</span>' +
            '<span class="tutorial-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' + (data.author || '') + '</span>' +
            '<span class="tutorial-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>阅读约 ' + (data.readingTime || 5) + ' 分钟</span>' +
            '<span class="tutorial-meta-item difficulty-badge difficulty-' + (data.difficulty || 'beginner') + '">' + (difficultyLabels[data.difficulty] || '入门') + '</span>' +
          '</div>' +
          '<h1 class="tutorial-title">' + escapeHTML(data.title) + '</h1>' +
          '<p class="tutorial-description">' + escapeHTML(data.description || '') + '</p>';
        contentArea.innerHTML = '';
        contentArea.appendChild(header);

        // Render content
        contentArea.appendChild(renderContent(data.content || []));

        // Update page title
        document.title = data.title + ' — TechTutorial Pro';

        // Generate TOC
        generateTOC(data.content || []);

        // Update prev/next
        updatePrevNext(id);

        // Highlight active in sidebar
        document.querySelectorAll('.tutorial-list-sidebar a').forEach(function(a) {
          a.classList.toggle('active', a.dataset.id === id);
        });

        // Update hash
        if (window.location.hash !== '#/' + id) {
          history.pushState(null, '', '#/' + id);
        }

        // Attach copy buttons to code blocks
        attachCodeBlockHandlers();

        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function(err) {
        console.error('[Tutorial] Load error:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        // Show error in content area
        if (contentArea) {
          contentArea.classList.remove('hidden');
          contentArea.innerHTML = '<div class="tutorial-empty"><h3>加载失败</h3><p>无法加载教程内容，请检查网络连接后重试。</p></div>';
        }
      });
  }

  function attachCodeBlockHandlers() {
    document.querySelectorAll('.code-block-wrapper pre code').forEach(function(codeEl) {
      const pre = codeEl.parentElement;
      const wrapper = pre.parentElement;
      const text = codeEl.textContent;

      // Only add if no copy button exists
      if (!wrapper.querySelector('.copy-btn')) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> 复制';
        copyBtn.addEventListener('click', function() {
          TechTutorial.utils.copyToClipboard(text).then(function() {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
            setTimeout(function() {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> 复制';
            }, 2000);
          });
        });
        wrapper.insertBefore(copyBtn, pre);
      }
    });
  }

  function updatePrevNext(id) {
    const idx = tutorials.findIndex(function(t) { return t.id === id; });
    // Create prev/next nav if it doesn't exist
    let navEl = document.getElementById('tutorial-prev-next');
    if (!navEl) {
      navEl = document.createElement('nav');
      navEl.id = 'tutorial-prev-next';
      navEl.className = 'tutorial-prev-next';
      navEl.innerHTML =
        '<a id="tutorial-prev" class="tutorial-nav-link prev" style="display:none;">' +
          '<span class="nav-label"></span><span class="nav-title"></span></a>' +
        '<a id="tutorial-next" class="tutorial-nav-link next" style="display:none;">' +
          '<span class="nav-label"></span><span class="nav-title"></span></a>';
      const contentArea = document.getElementById('tutorial-content');
      if (contentArea) contentArea.appendChild(navEl);
    }

    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    if (prevBtn) {
      if (idx > 0) {
        const prev = tutorials[idx - 1];
        prevBtn.style.display = '';
        prevBtn.querySelector('.nav-label').textContent = '← 上一篇';
        prevBtn.querySelector('.nav-title').textContent = prev.title;
        prevBtn.onclick = function(e) { e.preventDefault(); loadTutorial(prev.id); };
      } else {
        prevBtn.style.display = 'none';
      }
    }

    if (nextBtn) {
      if (idx < tutorials.length - 1) {
        const next = tutorials[idx + 1];
        nextBtn.style.display = '';
        nextBtn.querySelector('.nav-label').textContent = '下一篇 →';
        nextBtn.querySelector('.nav-title').textContent = next.title;
        nextBtn.onclick = function(e) { e.preventDefault(); loadTutorial(next.id); };
      } else {
        nextBtn.style.display = 'none';
      }
    }
  }

  // --- Routing ---
  function handleRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const id = hash.substring(2).split('?')[0];
      if (id) {
        loadTutorial(id);
      }
    } else if (!hash) {
      // Show first tutorial by default
      if (tutorials.length > 0) {
        loadTutorial(tutorials[0].id);
      }
    }
  }

  // --- Mobile sidebar toggle ---
  function initMobileSidebar() {
    const toggle = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('tutorial-sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', sidebar.classList.contains('open') ? 'true' : 'false');
    });

    // Close sidebar when clicking overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
  }

  // --- Slugify ---
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w一-鿿\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // --- Initialize ---
  function initTutorialCenter() {
    const isTutorialPage = document.getElementById('tutorial-layout');
    if (!isTutorialPage) return;

    // Load index
    const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
    fetch(basePath + '/data/index.json')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        tutorials = data;
        renderSidebar();
        initSearch();
        initMobileSidebar();
        handleRoute();
      })
      .catch(function(err) {
        console.error('[Tutorial] Failed to load index:', err);
      });

    // Handle hash changes
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
  }

  // Export
  window.TechTutorial = window.TechTutorial || {};
  window.TechTutorial.initTutorialCenter = initTutorialCenter;

  // --- Auto-initialize when DOM is ready ---
  function autoInit() {
    if (document.getElementById('tutorial-layout')) {
      initTutorialCenter();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
