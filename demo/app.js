// Global state
let projectFiles = {};
let currentFile = null;
let selectedElement = null;

// DOM Elements
const canvas = document.getElementById('canvas');
const fileInput = document.getElementById('file-input');
const importModal = document.getElementById('import-modal');
const dropZone = document.getElementById('drop-zone');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    setupToolButtons();
    setupFileInput();
});

// Drag and Dropunction setupDragAndDrop() {
    // Canvas drop
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('drag-over');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.zip')) {
            handleZipFile(files[0]);
        }
    });

    // Modal drop zone
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.zip')) {
            handleZipFile(files[0]);
            closeModal();
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
}

// File Input
function setupFileInput() {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleZipFile(e.target.files[0]);
        }
    });
}

// Handle ZIP File
async function handleZipFile(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        projectFiles = {};
        
        // Extract files
        for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
                const content = await zipEntry.async('text');
                projectFiles[path] = content;
            }
        }
        
        // Update UI
        updateFileList();
        loadFile(Object.keys(projectFiles)[0]);
        
        showNotification(`Loaded ${Object.keys(projectFiles).length} files`);
    } catch (error) {
        showNotification('Error loading ZIP file', 'error');
        console.error(error);
    }
}

// Update file list in sidebar
function updateFileList() {
    const pagesPanel = document.querySelector('.panel:first-child .panel-content');
    pagesPanel.innerHTML = '';
    
    Object.keys(projectFiles).forEach((path, index) => {
        const div = document.createElement('div');
        div.className = 'page-item' + (index === 0 ? ' active' : '');
        div.textContent = path.split('/').pop();
        div.onclick = () => loadFile(path);
        pagesPanel.appendChild(div);
    });
}

// Load file into canvas
function loadFile(path) {
    currentFile = path;
    const content = projectFiles[path];
    
    document.getElementById('current-file').textContent = path;
    
    // Update active state in sidebar
    document.querySelectorAll('.page-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === path.split('/').pop()) {
            item.classList.add('active');
        }
    });
    
    // Render content based on file type
    if (path.endsWith('.html')) {
        renderHTML(content);
    } else if (path.endsWith('.css')) {
        renderCSS(content);
    } else {
        renderText(content);
    }
}

// Render HTML content
function renderHTML(html) {
    canvas.innerHTML = html;
    canvas.style.background = 'white';
    
    // Make elements editable
    canvas.querySelectorAll('*').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectElement(el);
        });
    });
}

// Render CSS content
function renderCSS(css) {
    canvas.innerHTML = '<pre style="padding: 20px; font-family: monospace; font-size: 12px; overflow: auto;">' + escapeHtml(css) + '</pre>';
    canvas.style.background = '#f5f5f5';
}

// Render text content
function renderText(text) {
    canvas.innerHTML = '<pre style="padding: 20px; font-family: monospace; font-size: 12px; overflow: auto; white-space: pre-wrap;">' + escapeHtml(text) + '</pre>';
    canvas.style.background = '#f5f5f5';
}

// Select element for editing
function selectElement(el) {
    // Remove previous selection
    if (selectedElement) {
        selectedElement.style.outline = '';
    }
    
    selectedElement = el;
    el.style.outline = '2px solid #0d99ff';
    
    // Update properties panel
    updatePropertiesPanel(el);
}

// Update properties panel
function updatePropertiesPanel(el) {
    const computed = window.getComputedStyle(el);
    
    // Position
    document.getElementById('pos-x').value = parseInt(computed.left) || 0;
    document.getElementById('pos-y').value = parseInt(computed.top) || 0;
    
    // Dimensions
    document.getElementById('dim-w').value = parseInt(computed.width) || el.offsetWidth;
    document.getElementById('dim-h').value = parseInt(computed.height) || el.offsetHeight;
    
    // Colors
    document.getElementById('bg-color').value = rgbToHex(computed.backgroundColor) || '#ffffff';
    document.getElementById('text-color').value = rgbToHex(computed.color) || '#000000';
    
    // Typography
    document.getElementById('font-size').value = parseInt(computed.fontSize) || 16;
}

// Tool buttons
function setupToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Export project as ZIP
async function exportProject() {
    const zip = new JSZip();
    
    // Add all files
    for (const [path, content] of Object.entries(projectFiles)) {
        zip.file(path, content);
    }
    
    // Generate and download
    const blob = await zip.generateAsync({type: 'blob'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-export.zip';
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Project exported successfully');
}

// Modal functions
function showModal() {
    importModal.classList.add('active');
}

function closeModal() {
    importModal.classList.remove('active');
}

// Property change handlers
document.getElementById('pos-x')?.addEventListener('change', (e) => {
    if (selectedElement) selectedElement.style.left = e.target.value + 'px';
});

document.getElementById('pos-y')?.addEventListener('change', (e) => {
    if (selectedElement) selectedElement.style.top = e.target.value + 'px';
});

document.getElementById('dim-w')?.addEventListener('change', (e) => {
    if (selectedElement) selectedElement.style.width = e.target.value + 'px';
});

document.getElementById('dim-h')?.addEventListener('change', (e) => {
    if (selectedElement) selectedElement.style.height = e.target.value + 'px';
});

document.getElementById('bg-color')?.addEventListener('input', (e) => {
    if (selectedElement) selectedElement.style.backgroundColor = e.target.value;
});

document.getElementById('text-color')?.addEventListener('input', (e) => {
    if (selectedElement) selectedElement.style.color = e.target.value;
});

document.getElementById('font-size')?.addEventListener('change', (e) => {
    if (selectedElement) selectedElement.style.fontSize = e.target.value + 'px';
});

document.getElementById('font-family')?.addEventListener('change', (e) => {
    if (selectedElement) selectedElement.style.fontFamily = e.target.value;
});

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function rgbToHex(rgb) {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
    
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#ffffff';
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function showNotification(message, type = 'success') {
    // Simple notification
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ff4444' : '#0d99ff'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // V - Select tool
    if (e.key === 'v') {
        document.querySelector('[data-tool="select"]').click();
    }
    // F - Frame tool
    if (e.key === 'f') {
        document.querySelector('[data-tool="frame"]').click();
    }
    // T - Text tool
    if (e.key === 't') {
        document.querySelector('[data-tool="text"]').click();
    }
    // R - Rectangle tool
    if (e.key === 'r') {
        document.querySelector('[data-tool="rectangle"]').click();
    }
});