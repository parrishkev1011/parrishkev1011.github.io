// CapCut Template Dashboard JavaScript Application

// LocalStorage management
const storageKey = 'capcut_template_dashboard_v1';
const templates = JSON.parse(localStorage.getItem(storageKey)) || [];

// Template CRUD operations
function createTemplate(template) {
    templates.push(template);
    saveTemplates();
}

function readTemplate(index) {
    return templates[index];
}

function updateTemplate(index, updatedTemplate) {
    templates[index] = updatedTemplate;
    saveTemplates();
}

function deleteTemplate(index) {
    templates.splice(index, 1);
    saveTemplates();
}

function duplicateTemplate(index) {
    const template = readTemplate(index);
    createTemplate({...template, id: Date.now()});
}

function saveTemplates() {
    localStorage.setItem(storageKey, JSON.stringify(templates));
}

// Auto-calculation functions
function calculateDaysLive(template) {
    return Math.floor((new Date() - new Date(template.creationDate)) / (1000 * 60 * 60 * 24));
}

function calculateExportsPerDay(template) {
    return template.exports / calculateDaysLive(template);
}

// Status suggestion logic
function getStatus(template) {
    const daysLive = calculateDaysLive(template);
    const exportsPerDay = calculateExportsPerDay(template);
    if (daysLive < 3) return 'Testing';
    if (daysLive >= 3 && exportsPerDay >= 10) return 'Scale';
    if (exportsPerDay < 3) return 'Kill';
    return 'Hold';
}

// Filtering and sorting functions
function filterTemplates(criteria) {
    return templates.filter(template => template.status === criteria);
}

function sortTemplates(key) {
    return templates.sort((a, b) => a[key] > b[key] ? 1 : -1);
}

// Weekly review analytics
function weeklyReview() {
    const now = new Date();
    // Logic for reviewing templates created in the last week
}

// CSV and JSON import/export
function exportToCSV() {
    // Logic for exporting templates to CSV
}

function importFromCSV(file) {
    // Logic for importing templates from CSV
}

function exportToJSON() {
    const dataStr = JSON.stringify(templates);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'templates.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function importFromJSON(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const importedTemplates = JSON.parse(event.target.result);
        importedTemplates.forEach(template => createTemplate(template));
    };
    reader.readAsText(file);
}

// Modal management with focus trapping
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    modal.querySelector('button.close').focus();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

// Event listeners for UI interactions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app and set event listeners
});

// Making functions globally accessible
window.editTemplate = updateTemplate;
window.deleteTemplate = deleteTemplate;
window.duplicateTemplate = duplicateTemplate;
