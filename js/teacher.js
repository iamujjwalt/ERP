/**
 * teacher.js - Teacher Management Logic
 */
import { db, STORES } from './database.js';
import { notify, UI } from './app.js';

// Elements
const teacherTableBody = document.getElementById('teacher-table-body');
const teacherForm = document.getElementById('teacher-form');
const teacherModal = document.getElementById('teacher-modal');
const modalOverlay = teacherModal?.querySelector('.bg-slate-900\\/40');
const modalContent = teacherModal?.querySelector('.max-w-xl');
const btnAddTeacher = document.getElementById('btn-add-teacher');
const btnCancelForm = document.getElementById('cancel-form');
const btnCloseModal = document.getElementById('close-modal');
const btnSubmitForm = document.getElementById('submit-form');
const inchargeCheckbox = document.getElementById('t-incharge');
const inchargeCategory = document.getElementById('t-incharge-cat');

let teachers = [];

// Initialize
async function init() {
    setupEventListeners();
    await loadTeachers();
    renderTeachers();
    setupLayout();
    lucide.createIcons();
}

async function loadTeachers() {
    teachers = await db.getAll(STORES.TEACHERS);
}

function renderTeachers(filterText = '', filterLevel = '', filterStatus = '') {
    if (!teacherTableBody) return;

    const filtered = teachers.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(filterText.toLowerCase()) || 
                             t.id.toLowerCase().includes(filterText.toLowerCase()) ||
                             t.subjects.some(s => s.toLowerCase().includes(filterText.toLowerCase()));
        
        const matchesLevel = filterLevel === '' || t.level === filterLevel;
        const matchesStatus = filterStatus === '' || String(t.active) === filterStatus;
        
        return matchesSearch && matchesLevel && matchesStatus;
    });

    teacherTableBody.innerHTML = filtered.length ? filtered.map(t => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="font-mono text-xs font-bold text-gray-500">${t.id}</td>
            <td>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                        ${t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                        <p class="font-semibold text-gray-900">${t.name}</p>
                        <p class="text-[10px] text-gray-400 font-medium">${t.phone || 'No phone'}</p>
                    </div>
                </div>
            </td>
            <td>
                <span class="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                    ${t.level}
                </span>
                ${t.incharge ? `
                    <span class="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase ml-1">
                        Incharge: ${t.inchargeCategory}
                    </span>
                ` : ''}
            </td>
            <td>
                <div class="flex flex-wrap gap-1 max-w-xs">
                    ${t.subjects.map(s => `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">${s}</span>`).join('')}
                </div>
            </td>
            <td class="text-center font-bold text-gray-700">${t.maxPeriods}</td>
            <td>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    ${t.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg btn-edit" data-id="${t.id}">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg btn-delete" data-id="${t.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') : `
        <tr>
            <td colspan="7" class="py-12 text-center">
                <div class="flex flex-col items-center opacity-40">
                    <i data-lucide="user-plus" class="w-12 h-12 mb-3"></i>
                    <p class="text-sm font-medium">No teachers found matching criteria.</p>
                </div>
            </td>
        </tr>
    `;
    
    lucide.createIcons();
    attachRowListeners();
}

function attachRowListeners() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => editTeacher(btn.dataset.id);
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => deleteTeacher(btn.dataset.id);
    });
}

function setupEventListeners() {
    btnAddTeacher?.addEventListener('click', openModal);
    btnCloseModal?.addEventListener('click', closeModal);
    btnCancelForm?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', closeModal);
    
    btnSubmitForm?.addEventListener('click', () => {
        teacherForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });

    inchargeCheckbox?.addEventListener('change', (e) => {
        inchargeCategory.disabled = !e.target.checked;
        if (!e.target.checked) inchargeCategory.value = '';
    });

    teacherForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(teacherForm);
        const data = Object.fromEntries(formData.entries());
        
        // Post-process data
        data.incharge = inchargeCheckbox.checked;
        data.active = data.active === 'true';
        data.maxPeriods = parseInt(data.maxPeriods);
        data.subjects = data.subjects ? data.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
        
        const editId = document.getElementById('edit-id').value;
        
        try {
            await db.add(STORES.TEACHERS, data);
            notify(`Teacher ${editId ? 'updated' : 'added'} successfully!`, 'success');
            closeModal();
            await loadTeachers();
            renderTeachers();
        } catch (err) {
            notify('Error saving teacher. Check ID uniqueness.', 'error');
        }
    });

    // Filtering
    document.getElementById('teacher-search')?.addEventListener('input', (e) => {
        renderTeachers(e.target.value, document.getElementById('filter-level').value, document.getElementById('filter-status').value);
    });
    document.getElementById('filter-level')?.addEventListener('change', (e) => {
        renderTeachers(document.getElementById('teacher-search').value, e.target.value, document.getElementById('filter-status').value);
    });
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
        renderTeachers(document.getElementById('teacher-search').value, document.getElementById('filter-level').value, e.target.value);
    });
}

function openModal() {
    teacherForm.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('t-id').disabled = false;
    document.getElementById('modal-title').textContent = 'Add Teacher';
    inchargeCategory.disabled = true;
    
    teacherModal.classList.remove('invisible', 'opacity-0');
    teacherModal.classList.add('visible', 'opacity-100');
    teacherModal.classList.remove('pointer-events-none');
    modalContent.classList.remove('translate-x-full');
}

function closeModal() {
    modalContent.classList.add('translate-x-full');
    setTimeout(() => {
        teacherModal.classList.add('invisible', 'opacity-0');
        teacherModal.classList.add('pointer-events-none');
    }, 300);
}

async function editTeacher(id) {
    const t = await db.getById(STORES.TEACHERS, id);
    if (!t) return;

    openModal();
    document.getElementById('modal-title').textContent = 'Edit Teacher';
    document.getElementById('edit-id').value = id;
    document.getElementById('t-id').value = id;
    document.getElementById('t-id').disabled = true;
    document.getElementById('t-name').value = t.name;
    document.getElementById('t-gender').value = t.gender;
    document.getElementById('t-phone').value = t.phone || '';
    document.getElementById('t-level').value = t.level;
    document.getElementById('t-max-periods').value = t.maxPeriods;
    document.getElementById('t-subjects').value = t.subjects.join(', ');
    document.getElementById('t-active').value = String(t.active);
    
    inchargeCheckbox.checked = t.incharge;
    inchargeCategory.disabled = !t.incharge;
    inchargeCategory.value = t.inchargeCategory || '';
}

async function deleteTeacher(id) {
    if (confirm('Are you sure you want to delete this teacher? This may affect existing routines.')) {
        await db.delete(STORES.TEACHERS, id);
        notify('Teacher deleted successfully', 'info');
        await loadTeachers();
        renderTeachers();
    }
}

// Sidebar/Header injection
function setupLayout() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    if (sidebar) sidebar.innerHTML = UI.sidebar;
    if (header) header.innerHTML = UI.header;
    
    // Time & Link highlights
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-path') === currentPath) {
            link.classList.add('bg-blue-600', 'text-white');
            link.classList.remove('text-slate-400');
        }
    });

    setInterval(() => {
        const clock = document.getElementById('current-time');
        if (clock) clock.textContent = new Date().toLocaleTimeString();
    }, 1000);
}

// Go
init();
