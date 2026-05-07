/**
 * class.js - Class & Section Management Logic
 */
import { db, STORES } from './database.js';
import { notify, UI } from './app.js';

const classesGrid = document.getElementById('classes-grid');
const classForm = document.getElementById('class-form');
const classModal = document.getElementById('class-modal');
const modalOverlay = classModal?.querySelector('.bg-slate-900\\/40');
const modalContent = classModal?.querySelector('.max-w-xl');
const btnAddClass = document.getElementById('btn-add-class');
const btnCancelForm = document.getElementById('cancel-form');
const btnCloseModal = document.getElementById('close-modal');
const btnSubmitForm = document.getElementById('submit-form');
const teacherSelect = document.getElementById('c-teacher');

let classes = [];
let teachers = [];

async function init() {
    setupEventListeners();
    await loadInitialData();
    renderClasses();
    setupLayout();
    lucide.createIcons();
}

async function loadInitialData() {
    classes = await db.getAll(STORES.CLASSES);
    teachers = await db.getAll(STORES.TEACHERS);
    
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Select Teacher</option>' + 
            teachers.map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join('');
    }
}

function renderClasses() {
    if (!classesGrid) return;

    if (classes.length === 0) {
        classesGrid.innerHTML = `
            <div class="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                <i data-lucide="school" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3 class="text-lg font-bold text-gray-400">No Classes Defined</h3>
                <p class="text-gray-500 mb-6">Start by adding your school's classes and sections.</p>
                <button onclick="document.getElementById('btn-add-class').click()" class="btn-primary">Add Your First Class</button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    classesGrid.innerHTML = classes.map(c => {
        const classTeacher = teachers.find(t => t.id === c.classTeacher);
        return `
            <div class="card group hover:border-blue-200 transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Grade ${c.grade}</h3>
                        <p class="text-blue-600 font-bold tracking-tight">${c.section}</p>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg btn-edit" data-id="${c.id}">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg btn-delete" data-id="${c.id}">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                            <i data-lucide="user-tie" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[10px] uppercase font-bold text-gray-400">Class Teacher</p>
                            <p class="text-sm font-semibold truncate text-gray-700">${classTeacher ? classTeacher.name : 'Not Assigned'}</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="flex-1">
                            <p class="text-[10px] uppercase font-bold text-gray-400 mb-1">Room</p>
                            <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase">${c.room || 'N/A'}</span>
                        </div>
                        <div>
                            <button onclick="location.href='/routine.html?class=${c.id}'" class="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                                View Routine <i data-lucide="arrow-right" class="w-3 h-3"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
    attachListeners();
}

function attachListeners() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => editClass(btn.dataset.id);
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => deleteClass(btn.dataset.id);
    });
}

function setupEventListeners() {
    btnAddClass?.addEventListener('click', openModal);
    btnCloseModal?.addEventListener('click', closeModal);
    btnCancelForm?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', closeModal);
    btnSubmitForm?.addEventListener('click', () => classForm.dispatchEvent(new Event('submit')));

    classForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(classForm);
        const data = Object.fromEntries(formData.entries());
        
        const editId = document.getElementById('edit-id').value;
        data.id = editId || `GRADE-${data.grade}-${data.section.toUpperCase()}`;
        
        await db.add(STORES.CLASSES, data);
        notify(`Class ${editId ? 'updated' : 'added'} successfully!`, 'success');
        closeModal();
        await loadInitialData();
        renderClasses();
    });
}

function openModal() {
    classForm.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('c-grade').disabled = false;
    document.getElementById('c-section').disabled = false;
    document.getElementById('modal-title').textContent = 'Add Class';
    
    classModal.classList.remove('invisible', 'opacity-0');
    classModal.classList.add('visible', 'opacity-100');
    classModal.classList.remove('pointer-events-none');
    modalContent.classList.remove('translate-x-full');
}

function closeModal() {
    modalContent.classList.add('translate-x-full');
    setTimeout(() => {
        classModal.classList.add('invisible', 'opacity-0');
        classModal.classList.add('pointer-events-none');
    }, 300);
}

async function editClass(id) {
    const c = await db.getById(STORES.CLASSES, id);
    if (!c) return;

    openModal();
    document.getElementById('modal-title').textContent = 'Edit Class';
    document.getElementById('edit-id').value = id;
    document.getElementById('c-grade').value = c.grade;
    document.getElementById('c-grade').disabled = true;
    document.getElementById('c-section').value = c.section;
    document.getElementById('c-section').disabled = true;
    document.getElementById('c-teacher').value = c.classTeacher;
    document.getElementById('c-room').value = c.room;
}

async function deleteClass(id) {
    if (confirm('Delete this class? This will also remove its routine data.')) {
        await db.delete(STORES.CLASSES, id);
        notify('Class deleted', 'info');
        await loadInitialData();
        renderClasses();
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
