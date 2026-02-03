/**
 * CapCut Template Dashboard - Complete JavaScript Application
 * Tracks CapCut templates with auto-calculated metrics and status suggestions
 */

// ===========================
// Page Initialization
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    // Update last updated timestamp
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = now.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Check if site is accessible
    const statusElement = document.getElementById('siteStatus');
    if (statusElement) {
        // If this code is running, the site is live
        statusElement.textContent = 'Live and Running';
        statusElement.style.color = '#28a745';
    }
});

// ===========================
// Constants & Configuration
// ===========================
const STORAGE_KEY = 'capcut_template_dashboard_v1';
const CATEGORIES = ['Hook', 'Before-After', 'Story'];
const STATUSES = ['Testing', 'Scale', 'Hold', 'Kill'];

// ===========================
// State Management
// ===========================
let templates = [];
let currentSort = { field: 'id', direction: 'asc' };
let filters = {
    category: 'all',
    format: 'all',
    status: 'all',
    search: ''
};

// ===========================
// Data Management Functions
// ===========================

function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            templates = JSON.parse(stored).map(enrichTemplate);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function calculateDaysLive(publishDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const publish = new Date(publishDate);
    publish.setHours(0, 0, 0, 0);
    const diffTime = today - publish;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
}

function calculateExportsPerDay(exportsTotal, daysLive) {
    return daysLive > 0 ? parseFloat((exportsTotal / daysLive).toFixed(2)) : 0;
}

function suggestStatus(daysLive, exportsPerDay) {
    if (daysLive < 3) return 'Testing';
    if (exportsPerDay >= 10) return 'Scale';
    if (exportsPerDay >= 3) return 'Hold';
    return 'Kill';
}

function enrichTemplate(template) {
    const daysLive = calculateDaysLive(template.publishDate);
    const exportsPerDay = calculateExportsPerDay(template.exportsTotal, daysLive);
    const statusSuggestion = suggestStatus(daysLive, exportsPerDay);
    return { ...template, daysLive, exportsPerDay, statusSuggestion };
}

function generateId(category) {
    const prefix = category.charAt(0).toUpperCase();
    const existing = templates
        .filter(t => t.id.startsWith(prefix))
        .map(t => parseInt(t.id.split('-')[1]))
        .filter(n => !isNaN(n));
    const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(2, '0')}`;
}

function saveTemplate(templateData) {
    if (templateData.id) {
        const index = templates.findIndex(t => t.id === templateData.id);
        if (index !== -1) {
            templates[index] = enrichTemplate(templateData);
        }
    } else {
        templateData.id = generateId(templateData.category);
        templates.push(enrichTemplate(templateData));
    }
    saveData();
    render();
}

function deleteTemplate(id) {
    if (confirm('Are you sure you want to delete this template?')) {
        templates = templates.filter(t => t.id !== id);
        saveData();
        render();
    }
}

function duplicateTemplate(id) {
    const original = templates.find(t => t.id === id);
    if (!original) return;
    
    const duplicate = {
        ...original,
        id: null,
        publishDate: new Date().toISOString().split('T')[0],
        exportsTotal: 0,
        title: `${original.title} (Copy)`
    };
    
    delete duplicate.daysLive;
    delete duplicate.exportsPerDay;
    delete duplicate.statusSuggestion;
    
    saveTemplate(duplicate);
}

function applyAllSuggestions() {
    if (confirm('Apply auto-suggested status to all templates?')) {
        templates = templates.map(t => ({
            ...t,
            status: t.statusSuggestion
        })).map(enrichTemplate);
        
        saveData();
        render();
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
        templates = [];
        saveData();
        render();
    }
}

// ===========================
// Import/Export Functions
// ===========================

function exportCSV() {
    if (templates.length === 0) {
        alert('No templates to export');
        return;
    }
    
    const headers = ['ID', 'Title', 'Category', 'Format Family', 'Publish Date', 'Total Exports', 'Days Live', 'Exports/Day', 'Status', 'Hashtags', 'Notes'];
    const rows = templates.map(t => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        t.category,
        `"${t.formatFamily.replace(/"/g, '""')}"`,
        t.publishDate,
        t.exportsTotal,
        t.daysLive,
        t.exportsPerDay,
        t.status,
        `"${(t.hashtags || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csv, 'capcut-templates.csv', 'text/csv');
}

function exportJSON() {
    if (templates.length === 0) {
        alert('No templates to export');
        return;
    }
    
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        templates: templates.map(t => ({
            id: t.id,
            title: t.title,
            category: t.category,
            formatFamily: t.formatFamily,
            publishDate: t.publishDate,
            exportsTotal: t.exportsTotal,
            status: t.status,
            hashtags: t.hashtags || '',
            notes: t.notes || ''
        }))
    };
    
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'capcut-templates-backup.json', 'application/json');
}

function importJSON(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.templates || !Array.isArray(data.templates)) {
                throw new Error('Invalid file format');
            }
            
            const merge = confirm('Merge with existing templates? OK=merge, Cancel=replace');
            
            if (!merge) {
                templates = [];
            }
            
            data.templates.forEach(t => {
                if (!t.title || !t.category || !t.formatFamily || !t.publishDate || t.exportsTotal === undefined) {
                    console.warn('Skipping invalid template:', t);
                    return;
                }
                
                if (templates.find(existing => existing.id === t.id)) {
                    t.id = null;
                }
                
                saveTemplate(t);
            });
            
            alert(`Successfully imported ${data.templates.length} templates`);
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ===========================
// Filtering & Sorting
// ===========================

function getFilteredTemplates() {
    return templates.filter(t => {
        if (filters.category !== 'all' && t.category !== filters.category) return false;
        if (filters.format !== 'all' && t.formatFamily !== filters.format) return false;
        if (filters.status !== 'all' && t.status !== filters.status) return false;
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            const matchTitle = t.title.toLowerCase().includes(search);
            const matchNotes = (t.notes || '').toLowerCase().includes(search);
            if (!matchTitle && !matchNotes) return false;
        }
        
        return true;
    });
}

function sortTemplates(templatesList) {
    return [...templatesList].sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function updateSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    render();
}

function clearFilters() {
    filters = { category: 'all', format: 'all', status: 'all', search: '' };
    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterFormat').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterSearch').value = '';
    render();
}

// ===========================
// Analytics & Weekly Review
// ===========================

function calculateSummary() {
    const total = templates.length;
    const totalExports = templates.reduce((sum, t) => sum + t.exportsTotal, 0);
    const avgExports = total > 0 ? (templates.reduce((sum, t) => sum + t.exportsPerDay, 0) / total).toFixed(2) : 0;
    
    const countByStatus = STATUSES.reduce((acc, status) => {
        acc[status] = templates.filter(t => t.status === status).length;
        return acc;
    }, {});
    
    return { total, totalExports, avgExports, ...countByStatus };
}

function generateWeeklyReview() {
    const eligibleForScale = templates.filter(t => 
        (t.status === 'Testing' || t.status === 'Hold') && 
        t.statusSuggestion === 'Scale'
    );
    
    const candidatesToKill = templates.filter(t => 
        t.status !== 'Kill' && t.statusSuggestion === 'Kill'
    );
    
    const top5 = [...templates]
        .sort((a, b) => b.exportsPerDay - a.exportsPerDay)
        .slice(0, 5);
    
    const formatStats = {};
    templates.forEach(t => {
        if (!formatStats[t.formatFamily]) {
            formatStats[t.formatFamily] = { count: 0, totalExports: 0 };
        }
        formatStats[t.formatFamily].count++;
        formatStats[t.formatFamily].totalExports += t.exportsTotal;
    });
    
    const formatStatsArray = Object.entries(formatStats).map(([family, stats]) => ({
        family,
        count: stats.count,
        totalExports: stats.totalExports,
        avgExportsPerDay: (templates.filter(t => t.formatFamily === family)
            .reduce((sum, t) => sum + t.exportsPerDay, 0) / stats.count).toFixed(2)
    })).sort((a, b) => b.totalExports - a.totalExports);
    
    return { eligibleForScale, candidatesToKill, top5, formatStats: formatStatsArray };
}

// ===========================
// UI Rendering Functions
// ===========================

function renderSummary() {
    const summary = calculateSummary();
    document.getElementById('summaryTotal').textContent = summary.total;
    document.getElementById('summaryExports').textContent = summary.totalExports.toLocaleString();
    document.getElementById('summaryAvgExports').textContent = summary.avgExports;
    document.getElementById('summaryScale').textContent = summary.Scale;
    document.getElementById('summaryHold').textContent = summary.Hold;
    document.getElementById('summaryTesting').textContent = summary.Testing;
    document.getElementById('summaryKill').textContent = summary.Kill;
}

function renderWeeklyReview() {
    const review = generateWeeklyReview();
    
    const scaleEl = document.getElementById('reviewScale');
    if (review.eligibleForScale.length === 0) {
        scaleEl.innerHTML = '<div class="review-empty">No templates ready to scale</div>';
    } else {
        scaleEl.innerHTML = review.eligibleForScale.map(t => `
            <div class="review-item">
                <strong>${t.id} - ${t.title}</strong>
                <small>${t.exportsPerDay} exports/day (${t.daysLive} days live)</small>
            </div>
        `).join('');
    }
    
    const killEl = document.getElementById('reviewKill');
    if (review.candidatesToKill.length === 0) {
        killEl.innerHTML = '<div class="review-empty">No templates to kill</div>';
    } else {
        killEl.innerHTML = review.candidatesToKill.map(t => `
            <div class="review-item">
                <strong>${t.id} - ${t.title}</strong>
                <small>${t.exportsPerDay} exports/day (${t.daysLive} days live)</small>
            </div>
        `).join('');
    }
    
    const top5El = document.getElementById('reviewTop5');
    if (review.top5.length === 0) {
        top5El.innerHTML = '<div class="review-empty">No templates yet</div>';
    } else {
        top5El.innerHTML = review.top5.map((t, i) => `
            <div class="review-item">
                <strong>#${i + 1} - ${t.id} - ${t.title}</strong>
                <small>${t.exportsPerDay} exports/day (${t.exportsTotal} total)</small>
            </div>
        `).join('');
    }
    
    const formatsEl = document.getElementById('reviewFormats');
    if (review.formatStats.length === 0) {
        formatsEl.innerHTML = '<div class="review-empty">No format families yet</div>';
    } else {
        formatsEl.innerHTML = review.formatStats.map(f => `
            <div class="review-item">
                <strong>${f.family}</strong>
                <small>${f.count} templates • ${f.totalExports} exports • ${f.avgExportsPerDay} avg/day</small>
            </div>
        `).join('');
    }
}

function renderFormatFilter() {
    const formatSelect = document.getElementById('filterFormat');
    const formats = [...new Set(templates.map(t => t.formatFamily))].sort();
    
    formatSelect.innerHTML = '<option value="all">All Formats</option>' +
        formats.map(f => `<option value="${f}">${f}</option>`).join('');
    
    formatSelect.value = filters.format;
}

function renderTable() {
    const tbody = document.getElementById('templatesTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('templatesTable');
    
    const filtered = getFilteredTemplates();
    const sorted = sortTemplates(filtered);
    
    if (sorted.length === 0) {
        tbody.innerHTML = '';
        emptyState.hidden = false;
        table.style.display = 'none';
        return;
    }
    
    emptyState.hidden = true;
    table.style.display = 'table';
    
    tbody.innerHTML = sorted.map(t => {
        const suggestionText = t.status !== t.statusSuggestion ? 
            `<br><small style="color: var(--color-warning);">💡 Suggests: ${t.statusSuggestion}</small>` : '';
        
        return `
            <tr data-id="${t.id}">
                <td><strong>${t.id}</strong></td>
                <td>${escapeHtml(t.title)}</td>
                <td>${t.category}</td>
                <td>${escapeHtml(t.formatFamily)}</td>
                <td>${formatDate(t.publishDate)}</td>
                <td>${t.exportsTotal.toLocaleString()}</td>
                <td>${t.daysLive}</td>
                <td><strong>${t.exportsPerDay}</strong></td>
                <td>
                    <span class="status-badge status-${t.status}">${t.status}</span>
                    ${suggestionText}
                </td>
                <td>
                    <div class="template-actions">
                        <button class="btn btn-small btn-secondary" onclick="editTemplate('${t.id}')">✏️ Edit</button>
                        <button class="btn btn-small btn-secondary" onclick="duplicateTemplate('${t.id}')">📋 Dup</button>
                        <button class="btn btn-small btn-danger" onclick="deleteTemplate('${t.id}')">🗑️ Del</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.templates-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === currentSort.field) {
            th.classList.add(`sort-${currentSort.direction}`);
        }
    });
}

function render() {
    renderSummary();
    renderWeeklyReview();
    renderFormatFilter();
    renderTable();
}

// ===========================
// Modal Management
// ===========================

function openTemplateModal(template = null) {
    const modal = document.getElementById('templateModal');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = template ? 'Edit Template' : 'Add Template';
    
    document.getElementById('formId').value = template?.id || '';
    document.getElementById('formTitle').value = template?.title || '';
    document.getElementById('formCategory').value = template?.category || '';
    document.getElementById('formFormatFamily').value = template?.formatFamily || '';
    document.getElementById('formPublishDate').value = template?.publishDate || new Date().toISOString().split('T')[0];
    document.getElementById('formExportsTotal').value = template?.exportsTotal || 0;
    document.getElementById('formStatus').value = template?.status || 'Testing';
    document.getElementById('formHashtags').value = template?.hashtags || '';
    document.getElementById('formNotes').value = template?.notes || '';
    
    updateStatusSuggestion();
    
    modal.hidden = false;
    modal.querySelector('input:not([type="hidden"])').focus();
}

function closeTemplateModal() {
    const modal = document.getElementById('templateModal');
    modal.hidden = true;
    document.getElementById('templateForm').reset();
}

function updateStatusSuggestion() {
    const publishDate = document.getElementById('formPublishDate').value;
    const exportsTotal = parseInt(document.getElementById('formExportsTotal').value) || 0;
    const suggestionEl = document.getElementById('formStatusSuggestion');
    
    if (!publishDate) {
        suggestionEl.textContent = '';
        return;
    }
    
    const daysLive = calculateDaysLive(publishDate);
    const exportsPerDay = calculateExportsPerDay(exportsTotal, daysLive);
    const suggestion = suggestStatus(daysLive, exportsPerDay);
    
    suggestionEl.textContent = `💡 Suggestion: ${suggestion} (${daysLive} days, ${exportsPerDay} exports/day)`;
}

function editTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (template) {
        openTemplateModal(template);
    }
}

// ===========================
// Utility Functions
// ===========================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ===========================
// Event Listeners
// ===========================

function initEventListeners() {
    // Header actions
    document.getElementById('btnAddTemplate').addEventListener('click', () => openTemplateModal());
    document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
    document.getElementById('btnExportJSON').addEventListener('click', exportJSON);
    document.getElementById('btnImportJSON').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('btnClearData').addEventListener('click', clearAllData);
    
    // File input for import
    document.getElementById('fileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importJSON(file);
        e.target.value = '';
    });
    
    // Weekly review toggle
    document.getElementById('reviewToggle').addEventListener('click', function() {
        const content = document.getElementById('reviewContent');
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        content.hidden = isExpanded;
    });
    
    // Filters
    document.getElementById('filterCategory').addEventListener('change', (e) => {
        filters.category = e.target.value;
        render();
    });
    
    document.getElementById('filterFormat').addEventListener('change', (e) => {
        filters.format = e.target.value;
        render();
    });
    
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        filters.status = e.target.value;
        render();
    });
    
    document.getElementById('filterSearch').addEventListener('input', (e) => {
        filters.search = e.target.value;
        render();
    });
    
    document.getElementById('btnApplySuggestions').addEventListener('click', applyAllSuggestions);
    document.getElementById('btnClearFilters').addEventListener('click', clearFilters);
    
    // Table sorting
    document.querySelectorAll('.templates-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            updateSort(field);
        });
    });
    
    // Modal
    document.getElementById('modalClose').addEventListener('click', closeTemplateModal);
    document.getElementById('btnCancelForm').addEventListener('click', closeTemplateModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeTemplateModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('templateModal').hidden) {
            closeTemplateModal();
        }
    });
    
    // Form submission
    document.getElementById('templateForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            id: document.getElementById('formId').value || null,
            title: document.getElementById('formTitle').value.trim(),
            category: document.getElementById('formCategory').value,
            formatFamily: document.getElementById('formFormatFamily').value.trim(),
            publishDate: document.getElementById('formPublishDate').value,
            exportsTotal: parseInt(document.getElementById('formExportsTotal').value),
            status: document.getElementById('formStatus').value,
            hashtags: document.getElementById('formHashtags').value.trim(),
            notes: document.getElementById('formNotes').value.trim()
        };
        
        saveTemplate(formData);
        closeTemplateModal();
    });
    
    // Update suggestion when relevant fields change
    ['formPublishDate', 'formExportsTotal'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateStatusSuggestion);
    });
}

// ===========================
// Initialization
// ===========================

function init() {
    loadData();
    initEventListeners();
    render();
    console.log('CapCut Template Dashboard initialized');
    console.log(`Loaded ${templates.length} templates`);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Make functions globally accessible for inline event handlers
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.duplicateTemplate = duplicateTemplate;
