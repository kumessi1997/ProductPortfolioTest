const vaultRoot = './';

const BACKEND_URL = (window.location.port === '8000') ? 'http://localhost:5001' : '';

// State
let indexData = {};
let currentPath = '';

// DOM Elements
const navMenu = document.getElementById('nav-menu');
const searchInput = document.getElementById('search-input');
const contentBody = document.getElementById('content-body');
const breadcrumbs = document.getElementById('breadcrumbs');
const pageActions = document.getElementById('page-actions');
const welcomeHTML = contentBody.innerHTML;
let riveInstance = null;

// Utility to parse YAML Frontmatter and main content
function parseMarkdownFile(fileText) {
    let frontmatter = {};
    let content = fileText;

    // Support standard YAML frontmatter with ---
    const fmRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = fileText.match(fmRegex);

    if (match) {
        const yamlString = match[1];
        content = match[2];

        yamlString.split('\n').forEach(line => {
            const splitIndex = line.indexOf(':');
            if (splitIndex > -1) {
                const key = line.slice(0, splitIndex).trim();
                let val = line.slice(splitIndex + 1).trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                frontmatter[key] = val;
            }
        });
    }
    return { frontmatter, content };
}

// Custom Renderer for Marked to handle [[WikiLinks]] and Callouts
const renderer = new marked.Renderer();

// Parse callouts from blockquotes
renderer.blockquote = function ({ text }) {
    let content = text;

    if (content.includes('[!NOTE]')) {
        content = content.replace('[!NOTE]', '<strong class="callout-title"><i class="fa-solid fa-circle-info"></i> Note</strong><br>');
        return `<blockquote class="callout-note">${content}</blockquote>`;
    } else if (content.includes('[!WARNING]')) {
        content = content.replace('[!WARNING]', '<strong class="callout-title"><i class="fa-solid fa-triangle-exclamation"></i> Warning</strong><br>');
        return `<blockquote class="callout-warning">${content}</blockquote>`;
    }
    return `<blockquote>${content}</blockquote>`;
};

// File extensions that should trigger a download link instead of wiki navigation
const DOWNLOADABLE_EXTS = /\.(pdf|pptx?|ppsx?|docx?|xlsx?|xls|csv|zip|rar|7z|svg|png|jpe?g|gif|webp|mp4|mp3|wav|mov)$/i;

// We intercept text parsing to substitute [[Links]]
//   [[Page Name]]                 → wiki-link span (loads page in viewer)
//   [[file:path/to/file.pdf]]     → download-link anchor (force downloads)
//   [[path/to/file.pdf]]          → same as above (auto-detected by extension)
//   [[Page|Alias]] / [[file:...|Alias]]  → custom label after "|"
function preprocessWikiLinks(text) {
    return text.replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (match, linkTarget, alias) => {
        const target = linkTarget.trim();

        // Decide whether this is a downloadable file reference
        let filePath = null;
        if (/^file:/i.test(target)) {
            // Explicit: [[file:raw/foo.pdf]]
            filePath = target.replace(/^file:\s*/i, '').replace(/^\/+/, '');
        } else if (DOWNLOADABLE_EXTS.test(target) && target.includes('/')) {
            // Implicit: [[raw/foo.pdf]] — recognised by binary extension + path separator
            filePath = target.replace(/^\/+/, '');
        }

        if (filePath) {
            const fileName = filePath.split('/').pop();
            const label = alias || fileName;
            const safeUrl = filePath.split('/').map(encodeURIComponent).join('/');
            const href = `${BACKEND_URL}/api/file/${safeUrl}`;
            return `<a class="download-link" href="${href}" title="Download ${filePath}"><i class="fa-solid fa-download"></i> ${label}</a>`;
        }

        // Regular wiki link
        const display = alias || target;
        return `<span class="wiki-link" data-target="${target}">${display}</span>`;
    });
}

function resolveFilePath(targetName) {
    if (targetName.toLowerCase() === 'overview') return `wiki/overview.md`;

    for (const [section, items] of Object.entries(indexData)) {
        const item = items.find(i => i.link === targetName);
        if (item && item.path) {
            return item.path;
        }
    }

    return `wiki/concepts/${targetName}.md`; // Fallback
}

async function loadIndex() {
    try {
        const res = await fetch(`${vaultRoot}wiki/index.md`);
        if (!res.ok) throw new Error('Cannot load index.md. Are you running a local web server (e.g. "python -m http.server")?');
        const text = await res.text();

        const lines = text.split('\n');
        let currentSection = '';
        let currentFolder = '';
        let currentGroup = '';
        indexData = {};

        lines.forEach(line => {
            if (line.startsWith('## ')) {
                currentSection = line.replace('## ', '').trim();
                indexData[currentSection] = [];
                currentFolder = currentSection.toLowerCase();
                currentGroup = '';
            } else if (line.startsWith('#### ')) {
                currentGroup = line.replace('#### ', '').trim();
            } else if (line.startsWith('### ')) {
                currentGroup = '';
            } else if (line.trim().startsWith('`wiki/')) {
                const match = line.match(/`wiki\/(.*)\/`/);
                if (match) {
                    currentFolder = match[1];
                }
            } else if (line.startsWith('- [[') && currentSection) {
                const match = line.match(/- \[\[(.*?)\]\](?: — (.*))?/);
                if (match) {
                    indexData[currentSection].push({
                        link: match[1],
                        desc: match[2] || '',
                        path: `wiki/${currentFolder}/${match[1]}.md`,
                        group: currentGroup
                    });
                }
            }
        });

        renderSidebar();
    } catch (err) {
        contentBody.innerHTML = `<div style="color:#ef4444; padding: 2rem; background: rgba(0,0,0,0.5); border-radius: 8px;">
            <h2><i class="fa-solid fa-triangle-exclamation"></i> System Error</h2>
            <p style="margin-top: 1rem; color: #fff;">${err.message}</p>
            <p style="margin-top: 1rem; color: #fff;">Because of browser security policies (CORS), you must run a local server to access local folders.</p>
            <p style="margin-top: 1rem; color: #fff;">Try running <code>python3 -m http.server</code> in the terminal, then visit <code>http://localhost:8000</code></p>
        </div>`;
    }
}

const SOURCE_BRAND_FIXES = {
    'akabot': 'akaBot', 'akaverse': 'akaVerse', 'akames': 'akaMES',
    'akafortune': 'akaFortune', 'fpt': 'FPT', 'is': 'IS', 'cx': 'CX',
    'ai': 'AI', 'geobase': 'GeoBase', 'lendvero': 'LendVero',
    'vertzero': 'VertZéro', 'vioedu': 'VioEdu', 'codelearn': 'CodeLearn',
    'azinsu': 'AZINSU', 'azladin': 'Azladin', 'utop': 'Utop',
    'procuva': 'Procuva', 'kyta': 'Kyta', 'archivenex': 'ArchiveNex',
    'bss': 'BSS', 'ems': 'EMS', 'esign': 'eSign', 'eid': 'eID',
    'spro': 'SPro', 'vi': 'VI', 'en': 'EN', 'los': 'LOS', 'crm': 'CRM',
    'mbf': 'MBF', 'mvno': 'MVNO', 'mno': 'MNO', 'bfsi': 'BFSI',
    'hrm': 'HRM', 'erp': 'ERP', 'debtcollection': 'Debt Collection',
    'cx': 'CX', 'saas': 'SaaS', 'api': 'API', 'erp': 'ERP',
};

function formatSourceLink(slug) {
    const match = slug.match(/^(\d{4})-(\d{2})-\d{2}_(.+)$/);
    if (!match) return slug;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = `${months[parseInt(match[2]) - 1]} ${match[1]}`;
    const name = match[3]
        .split('-')
        .map(w => SOURCE_BRAND_FIXES[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    return `${name}  ·  ${date}`;
}

function renderNavItem(item, container) {
    const a = document.createElement('a');
    a.className = 'nav-item';
    a.textContent = /^\d{4}-\d{2}-\d{2}_/.test(item.link)
        ? formatSourceLink(item.link)
        : item.link;
    a.title = item.desc;
    a.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        a.classList.add('active');
        const filePath = resolveFilePath(item.link);
        loadPage(filePath, item.link);
    };
    container.appendChild(a);
}

function renderSidebar(filter = '') {
    navMenu.innerHTML = '';
    const lf = filter.toLowerCase();

    for (const [section, items] of Object.entries(indexData)) {
        const filteredItems = items.filter(i =>
            i.link.toLowerCase().includes(lf) ||
            i.desc.toLowerCase().includes(lf) ||
            (i.group && i.group.toLowerCase().includes(lf))
        );

        if (filteredItems.length === 0) continue;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'nav-section';

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'nav-section-title';
        sectionTitle.innerHTML = `<span>${section}</span> <i class="fa-solid fa-chevron-down toggle-icon"></i>`;

        const sectionContent = document.createElement('div');
        sectionContent.className = 'nav-section-content';

        sectionTitle.onclick = () => sectionDiv.classList.toggle('collapsed');
        sectionDiv.appendChild(sectionTitle);

        const hasGroups = filteredItems.some(i => i.group);

        if (hasGroups) {
            // Collect groups
            const groupMap = {};
            filteredItems.forEach(item => {
                const g = item.group || '';
                if (!groupMap[g]) groupMap[g] = [];
                groupMap[g].push(item);
            });

            // Sort group names A-Z (case-insensitive)
            const sortedGroups = Object.keys(groupMap).sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' })
            );

            sortedGroups.forEach(groupName => {
                if (!groupName) {
                    groupMap[groupName].forEach(item => renderNavItem(item, sectionContent));
                    return;
                }

                const groupDiv = document.createElement('div');
                groupDiv.className = 'nav-group';
                // Auto-expand when filtering
                if (filter) groupDiv.classList.add('open');

                const groupTitle = document.createElement('div');
                groupTitle.className = 'nav-group-title';
                groupTitle.innerHTML =
                    `<i class="fa-solid fa-chevron-right nav-group-icon"></i>` +
                    `<span>${groupName}</span>` +
                    `<span class="nav-group-count">${groupMap[groupName].length}</span>`;

                const groupContent = document.createElement('div');
                groupContent.className = 'nav-group-content';

                groupTitle.onclick = () => groupDiv.classList.toggle('open');

                groupMap[groupName].forEach(item => renderNavItem(item, groupContent));

                groupDiv.appendChild(groupTitle);
                groupDiv.appendChild(groupContent);
                sectionContent.appendChild(groupDiv);
            });
        } else {
            filteredItems.forEach(item => renderNavItem(item, sectionContent));
        }

        sectionDiv.appendChild(sectionContent);
        navMenu.appendChild(sectionDiv);
    }
}


async function loadPage(filePath, pageName) {
    try {
        if (currentPath === filePath) return;
        currentPath = filePath;

        if (riveInstance) {
            riveInstance.cleanup();
            riveInstance = null;
        }
        contentBody.innerHTML = `<div style="padding: 2rem; color: var(--text-muted); text-align: center; margin-top: 2rem;">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 1rem;">Loading document...</p>
        </div>`;
        const res = await fetch(`${vaultRoot}${filePath}`);
        if (!res.ok) throw new Error(`Document not found (${res.status})`);

        const rawText = await res.text();
        const { frontmatter, content } = parseMarkdownFile(rawText);

        const breadcrumbSpan = breadcrumbs.querySelector('span');
        if (breadcrumbSpan) breadcrumbSpan.innerHTML = `Wiki / <span>${pageName}</span>`;

        pageActions.innerHTML = '';
        if (frontmatter.source_file) {
            const btn = document.createElement('a');
            btn.href = `${vaultRoot}${frontmatter.source_file}`;
            btn.target = "_blank";
            btn.className = "source-btn";
            btn.innerHTML = `<i class="fa-solid fa-download"></i> Access Source Document`;
            pageActions.appendChild(btn);
        }

        const processedContent = preprocessWikiLinks(content);

        const lowerPageName = pageName.toLowerCase();
        const riveConfigs = {
            'overview': { src: 'Frontend/Asset/mbf.riv', artboard: 'Main', stateMachine: 'State Machine 1', anchor: '70+ sản phẩm.', aspectRatio: '19/6' },
            'akabot': { src: 'Frontend/Asset/akabot_mascot.riv', artboard: 'Main', stateMachine: 'State Machine 1', aspectRatio: '1/1', style: 'max-width: 400px; margin-left: auto; margin-right: auto; margin-top: -2rem; border-radius: 20px;' },
            'vioedu': { src: 'Frontend/Asset/vioedu_mascot.riv', artboard: 'Main', stateMachine: 'State Machine 1', aspectRatio: '1/1', style: 'max-width: 400px; margin-left: auto; margin-right: auto; margin-top: -2rem; border-radius: 20px;' },
            'vertzero': { src: 'Frontend/Asset/vertzero.riv', artboard: 'Main', stateMachine: 'State Machine 1' },
            'vertzéro': { src: 'Frontend/Asset/vertzero.riv', artboard: 'Main', stateMachine: 'State Machine 1' },
            'azladin': { src: 'Frontend/Asset/brochure_azladin.riv', artboard: 'Main', stateMachine: 'State Machine 1' },
            'azinsu': { src: 'Frontend/Asset/azinsu_claim.riv', artboard: 'Main', stateMachine: 'State Machine 1', anchor: '## AI CLAIM sub-product' }
        };

        const pageRive = riveConfigs[lowerPageName];
        if (pageRive) {
            let parts = [];
            let hasDivider = false;

            if (pageRive.anchor) {
                // Split after the specific anchor (e.g., a sub-heading)
                const anchorIndex = processedContent.indexOf(pageRive.anchor);
                if (anchorIndex !== -1) {
                    const splitPoint = anchorIndex + pageRive.anchor.length;
                    parts = [
                        processedContent.slice(0, splitPoint),
                        processedContent.slice(splitPoint)
                    ];
                }
            } else {
                // Default: Try splitting by the first divider or the next section header after Overview
                parts = processedContent.split(/\n---\n/);
                hasDivider = parts.length > 1;

                if (!hasDivider) {
                    const lines = processedContent.split('\n');
                    let splitIndex = -1;
                    let foundOverview = false;

                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes('## Overview')) {
                            foundOverview = true;
                            continue;
                        }
                        if (foundOverview && lines[i].startsWith('## ')) {
                            splitIndex = i;
                            break;
                        }
                    }

                    if (splitIndex !== -1) {
                        parts = [
                            lines.slice(0, splitIndex).join('\n'),
                            lines.slice(splitIndex).join('\n')
                        ];
                    }
                }
            }

            if (parts.length > 1) {
                const headHtml = marked.parse(parts[0], { renderer });
                const restHtml = marked.parse(parts.slice(1).join(hasDivider ? '\n---\n' : '\n'), { renderer });
                contentBody.innerHTML = `
                    ${headHtml}
                    <div class="rive-container" style="margin-top: 2rem; margin-bottom: 2rem; border-radius: 12px; ${pageRive.aspectRatio ? `aspect-ratio: ${pageRive.aspectRatio};` : ''} ${pageRive.style || ''}">
                        <canvas id="rive-canvas"></canvas>
                        <button class="rive-fullscreen-btn" title="Full Screen">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                    </div>
                    ${hasDivider ? '<hr>' : ''}
                    ${restHtml}
                `;
            } else {
                // Fallback: prepend if no logical split point found
                contentBody.innerHTML = `
                    <div class="rive-container" style="margin-top: -3rem; margin-bottom: 2rem; ${pageRive.aspectRatio ? `aspect-ratio: ${pageRive.aspectRatio};` : ''} ${pageRive.style || ''}">
                        <canvas id="rive-canvas"></canvas>
                        <button class="rive-fullscreen-btn" title="Full Screen">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                    </div>
                    ${marked.parse(processedContent, { renderer })}
                `;
            }
            initRive(pageRive.src, pageRive.artboard, pageRive.stateMachine);
        } else {
            contentBody.innerHTML = marked.parse(processedContent, { renderer });
        }

        document.querySelectorAll('.wiki-link').forEach(link => {
            link.addEventListener('click', () => {
                const target = link.getAttribute('data-target');
                const targetPath = resolveFilePath(target);
                loadPage(targetPath, target);
            });
        });

    } catch (err) {
        contentBody.innerHTML = `<div style="color:#ef4444; padding: 2rem; background: rgba(0,0,0,0.5); border-radius: 8px;">
            <h3><i class="fa-solid fa-circle-xmark"></i> Error Loading Document</h3>
            <p style="margin-top: 1rem; color: #fff;">${err.message}</p>
            <p style="margin-top: 0.5rem; color: #94a3b8;">Path attempted: <code>${filePath}</code></p>
        </div>`;
    }
}

document.getElementById('refresh-index').addEventListener('click', loadIndex);
const clearSearch = document.getElementById('clear-search');

searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearch.style.display = val ? 'block' : 'none';
    renderSidebar(val);
});

clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.style.display = 'none';
    renderSidebar('');
    searchInput.focus();
});

marked.setOptions({
    breaks: true,
    gfm: true
});

loadIndex();

// ====== Rive Animation ======
function initRive(src = 'Frontend/Asset/test.riv', artboard = 'Main', stateMachine = 'State Machine 1') {
    const canvas = document.getElementById('rive-canvas');
    if (!canvas) return;

    if (riveInstance) riveInstance.cleanup();

    riveInstance = new rive.Rive({
        src: src,
        canvas: canvas,
        artboard: artboard,
        stateMachines: stateMachine,
        autoplay: true,
        autoBind: true,
        onLoad: () => {
            riveInstance.resizeDrawingSurfaceToCanvas();
        },
    });

    // Handle Fullscreen
    const container = canvas.closest('.rive-container');
    const fsBtn = container?.querySelector('.rive-fullscreen-btn');
    if (fsBtn && container) {
        fsBtn.onclick = () => {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
        };
    }
}

function showWelcomeScreen() {
    contentBody.innerHTML = welcomeHTML;
    const breadcrumbSpan = breadcrumbs.querySelector('span');
    if (breadcrumbSpan) breadcrumbSpan.textContent = 'Home';
    pageActions.innerHTML = '';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    initRive();
}

document.getElementById('home-btn').addEventListener('click', showWelcomeScreen);

document.addEventListener('fullscreenchange', () => {
    if (riveInstance) {
        setTimeout(() => riveInstance.resizeDrawingSurfaceToCanvas(), 100);
    }
});

window.addEventListener('resize', () => {
    if (riveInstance) riveInstance.resizeDrawingSurfaceToCanvas();
});

// Initial load
initRive();
initResizers();
initChatToggle();

// ====== Chat Sidebar Toggle ======
function initChatToggle() {
    const chatToggle = document.getElementById('chat-toggle');
    const app = document.getElementById('app');

    // Check persisted state
    if (localStorage.getItem('chat_hidden') === 'true') {
        app.classList.add('chat-hidden');
    } else {
        chatToggle.classList.add('active');
    }

    chatToggle.addEventListener('click', () => {
        const isHidden = app.classList.toggle('chat-hidden');
        chatToggle.classList.toggle('active');
        localStorage.setItem('chat_hidden', isHidden);

        // Resize Rive if visible
        if (riveInstance) {
            setTimeout(() => riveInstance.resizeDrawingSurfaceToCanvas(), 100);
        }
    });
}

// ====== Sidebar Resizing ======
function initResizers() {
    const leftResizer = document.getElementById('left-resizer');
    const rightResizer = document.getElementById('right-resizer');
    const sidebar = document.getElementById('sidebar');
    const chatSidebar = document.getElementById('chat-sidebar');

    const minWidth = 260;
    const baseWidth = 320;

    function startResizing(e, direction) {
        document.body.style.cursor = 'col-resize';
        const startX = e.clientX;
        const startWidth = direction === 'left' ? sidebar.offsetWidth : chatSidebar.offsetWidth;
        const resizer = direction === 'left' ? leftResizer : rightResizer;
        const appWidth = document.getElementById('app').offsetWidth;

        // Calculate dynamic constraints
        const currentMaxWidth = direction === 'left'
            ? baseWidth * 1.2
            : appWidth * 0.5; // Chat sidebar can reach 50% of workspace

        resizer.classList.add('dragging');

        // Prevent text selection while resizing
        document.body.style.userSelect = 'none';

        let rafId = null;

        function onMouseMove(e) {
            let newWidth;
            if (direction === 'left') {
                newWidth = startWidth + (e.clientX - startX);
            } else {
                newWidth = startWidth - (e.clientX - startX);
            }

            if (newWidth >= minWidth && newWidth <= currentMaxWidth) {
                if (direction === 'left') {
                    sidebar.style.width = `${newWidth}px`;
                } else {
                    chatSidebar.style.width = `${newWidth}px`;
                }
                if (riveInstance) {
                    cancelAnimationFrame(rafId);
                    rafId = requestAnimationFrame(() => riveInstance.resizeDrawingSurfaceToCanvas());
                }
            }
        }

        function onMouseUp() {
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            resizer.classList.remove('dragging');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            // Final resize pass after drag ends
            if (riveInstance) {
                cancelAnimationFrame(rafId);
                riveInstance.resizeDrawingSurfaceToCanvas();
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    if (leftResizer) leftResizer.addEventListener('mousedown', (e) => startResizing(e, 'left'));
    if (rightResizer) rightResizer.addEventListener('mousedown', (e) => startResizing(e, 'right'));
}
