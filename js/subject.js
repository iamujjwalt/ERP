/**
 * subject.js - Subject Management Logic
 */
import { db, STORES } from './database.js';
import { notify, UI } from './app.js';

const subjectTableBody = document.getElementById('subject-table-body');
const subjectForm = document.getElementById('subject-form');
const subjectModal = document.getElementById('subject-modal');
const modalOverlay = subjectModal?.querySelector('.bg-slate-900\\/40');
const modalContent = subjectModal?.querySelector('.max-w-xl');
const btnAddSubject = document.getElementById('btn-add-subject');
const btnCancelForm = document.getElementById('cancel-form');
const btnCloseModal = document.getElementById('close-modal');
const btnSubmitForm = document.getElementById('submit-form');
const teachersListDiv = document.getElementById('teachers-list-selection');

let subjects = [];
let teachers = [];

async function init() {
    setupEventListeners();
    await loadInitialData();
    renderSubjects();
    setupLayout();
}

async function loadInitialData() {
    subjects = await db.getAll(STORES.SUBJECTS);
    teachers = await db.getAll(STORES.TEACHERS);
    
    if (teachersListDiv) {
        teachersListDiv.innerHTML = teachers.map(t => `
            <label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                <input type="checkbox" name="teachers" value="${t.id}" class="rounded text-blue-600 focus:ring-blue-500">
                <span class="text-xs font-medium text-gray-700">${t.name}</span>
            </label>
        `).join('') || '<p class="text-xs text-gray-400 col-span-2 text-center py-4">No teachers added yet</p>';
    }
}

function renderSubjects() {
    if (!subjectTableBody) return;

    subjectTableBody.innerHTML = subjects.length ? subjects.map(s => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        ${s.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p class="font-bold text-gray-900">${s.name}</p>
                        <p class="text-[10px] text-gray-400 uppercase font-bold tracking-tight">${s.id}</p>
                    </div>
                </div>
            </td>
            <td class="font-bold text-gray-700">${s.periodsPerWeek} Periods</td>
            <td>
                <div class="flex gap-2">
                    ${s.isPractical ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Practical</span>' : ''}
                    ${s.isDouble ? '<span class="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">Double</span>' : ''}
                </div>
            </td>
            <td>
                <div class="flex -space-x-2">
                    ${(s.assignedTeachers || []).map((tid, index) => {
                        const t = teachers.find(tr => tr.id === tid);
                        if (!t) return '';
                        return `<div class="w-7 h-7 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold" title="${t.name}">${t.name[0]}</div>`;
                    }).join('')}
                </div>
            </td>
            <td class="text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg btn-edit" data-id="${s.id}">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg btn-delete" data-id="${s.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') : `
        <tr>
            <td colspan="5" class="py-12 text-center text-gray-500">No subjects created yet.</td>
        </tr>
    `;
    
    lucide.createIcons();
    attachListeners();
}

function attachListeners() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => editSubject(btn.dataset.id);
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => deleteSubject(btn.dataset.id);
    });
}

function setupEventListeners() {
    btnAddSubject?.addEventListener('click', openModal);
    btnCloseModal?.addEventListener('click', closeModal);
    btnCancelForm?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', closeModal);
    btnSubmitForm?.addEventListener('click', () => subjectForm.dispatchEvent(new Event('submit')));

    subjectForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(subjectForm);
        const data = Object.fromEntries(formData.entries());
        
        // Post-process
        data.isPractical = document.getElementById('s-practical').checked;
        data.isDouble = document.getElementById('s-double').checked;
        data.assignedTeachers = Array.from(document.querySelectorAll('input[name="teachers"]:checked')).map(cb => cb.value);
        data.periodsPerWeek = parseInt(data.periodsPerWeek);
        
        const editId = document.getElementById('edit-id').value;
        
        await db.add(STORES.SUBJECTS, data);
        notify(`Subject ${editId ? 'updated' : 'added'} successfully!`, 'success');
        closeModal();
        await loadInitialData();
        renderSubjects();
    });
}

function openModal() {
    subjectForm.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('s-code').disabled = false;
    document.getElementById('modal-title').textContent = 'Add Subject';
    
    subjectModal.classList.remove('invisible', 'opacity-0');
    subjectModal.classList.add('visible', 'opacity-100');
    subjectModal.classList.remove('pointer-events-none');
    modalContent.classList.remove('translate-x-full');
}

function closeModal() {
    modalContent.classList.add('translate-x-full');
    setTimeout(() => {
        subjectModal.classList.add('invisible', 'opacity-0');
        subjectModal.classList.add('pointer-events-none');
    }, 300);
}

async function editSubject(id) {
    const s = await db.getById(STORES.SUBJECTS, id);
    if (!s) return;

    openModal();
    document.getElementById('modal-title').textContent = 'Edit Subject';
    document.getElementById('edit-id').value = id;
    document.getElementById('s-code').value = id;
    document.getElementById('s-code').disabled = true;
    document.getElementById('s-name').value = s.name;
    document.getElementById('s-periods').value = s.periodsPerWeek;
    document.getElementById('s-practical').checked = s.isPractical;
    document.getElementById('s-double').checked = s.isDouble;
    
    // Check teachers
    document.querySelectorAll('input[name="teachers"]').forEach(cb => {
        cb.checked = (s.assignedTeachers || []).includes(cb.value);
    });
}

async function deleteSubject(id) {
    if (confirm('Delete this subject?')) {
        await db.delete(STORES.SUBJECTS, id);
        notify('Subject deleted', 'info');
        await loadInitialData();
        renderSubjects();
    }
}

function setupLayout() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    if (sidebar) sidebar.innerHTML = UI.sidebar;
    if (header) header.innerHTML = UI.header;
    
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

init();
