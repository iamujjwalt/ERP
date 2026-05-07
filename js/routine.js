/**
 * routine.js - Smart Routine Builder Logic
 */
import { db, STORES } from './database.js';
import { notify, UI } from './app.js';

// Constants
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TIMINGS = {
    PRIMARY: [ // 1-3
        { id: 1, time: '9:40–10:20', type: 'class' },
        { id: 2, time: '10:20–11:00', type: 'class' },
        { id: 'break', time: '11:00–11:40', type: 'break' },
        { id: 3, time: '11:40–12:20', type: 'class' },
        { id: 4, time: '12:20–1:00', type: 'class' },
        { id: 5, time: '1:00–1:40', type: 'class' },
        { id: 6, time: '1:40–2:20', type: 'class' },
        { id: 7, time: '2:20–3:00', type: 'class' },
        { id: 'snacks', time: '3:00–3:15', type: 'break' },
        { id: 8, time: '3:15–3:55', type: 'class' }
    ],
    MIDDLE: [ // 4-8
        { id: 1, time: '9:40–10:20', type: 'class' },
        { id: 2, time: '10:20–11:00', type: 'class' },
        { id: 3, time: '11:00–11:40', type: 'class' },
        { id: 'break', time: '11:40–12:20', type: 'break' },
        { id: 4, time: '12:20–1:00', type: 'class' },
        { id: 5, time: '1:00–1:40', type: 'class' },
        { id: 6, time: '1:40–2:20', type: 'class' },
        { id: 7, time: '2:20–3:00', type: 'class' },
        { id: 'snacks', time: '3:00–3:15', type: 'break' },
        { id: 8, time: '3:15–3:55', type: 'class' }
    ],
    SENIOR: [ // 9-10
        { id: 1, time: '9:40–10:20', type: 'class' },
        { id: 2, time: '10:20–11:00', type: 'class' },
        { id: 3, time: '11:00–11:40', type: 'class' },
        { id: 4, time: '11:40–12:20', type: 'class' },
        { id: 'lunch', time: '12:20–1:15', type: 'break' },
        { id: 5, time: '1:15–1:55', type: 'class' },
        { id: 6, time: '1:55–2:35', type: 'class' },
        { id: 7, time: '2:35–3:15', type: 'class' },
        { id: 'short', time: '3:15–3:20', type: 'break' },
        { id: 8, time: '3:20–4:00', type: 'class' }
    ]
};

// Elements
const selectClass = document.getElementById('select-class');
const routineWorkspace = document.getElementById('routine-workspace');
const noClassSelected = document.getElementById('no-class-selected');
const routineGrid = document.getElementById('routine-grid');
const periodModal = document.getElementById('period-modal');
const btnSaveRoutine = document.getElementById('btn-save-routine');
const btnCopySunday = document.getElementById('btn-copy-sunday');

// Shared State
let classes = [];
let teachers = [];
let subjects = [];
let routines = [];
let currentClassId = null;
let currentRoutine = {}; // { dayIndex: { slotId: { subjectId, teacherId, type } } }
let activeEditSlot = null; // { dayIndex, slotId }

// Initialization
async function init() {
    setupLayout();
    await loadInitialData();
    setupEventListeners();
    
    // Check for query param
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('class');
    if (classId) {
        selectClass.value = classId;
        handleClassChange(classId);
    }
}

async function loadInitialData() {
    classes = await db.getAll(STORES.CLASSES);
    teachers = await db.getAll(STORES.TEACHERS);
    subjects = await db.getAll(STORES.SUBJECTS);
    routines = await db.getAll(STORES.ROUTINES);
    
    populateClassSelect();
}

function populateClassSelect() {
    selectClass.innerHTML = '<option value="">Select a Class to start</option>' + 
        classes.map(c => `<option value="${c.id}">Grade ${c.grade} - ${c.section}</option>`).join('');
}

function handleClassChange(classId) {
    if (!classId) {
        currentClassId = null;
        routineWorkspace.classList.add('hidden');
        noClassSelected.classList.remove('hidden');
        return;
    }

    currentClassId = classId;
    routineWorkspace.classList.remove('hidden');
    noClassSelected.classList.add('hidden');
    
    // Load class routine from local storage
    const found = routines.find(r => r.id === classId);
    currentRoutine = found ? found.data : {};
    
    renderWorkspace();
}

function getTimeStructure(grade) {
    const g = parseInt(grade);
    if (g >= 1 && g <= 3) return TIMINGS.PRIMARY;
    if (g >= 4 && g <= 8) return TIMINGS.MIDDLE;
    return TIMINGS.SENIOR;
}

function renderWorkspace() {
    const targetClass = classes.find(c => c.id === currentClassId);
    if (!targetClass) return;

    const structure = getTimeStructure(targetClass.grade);
    
    routineGrid.innerHTML = DAYS.map((day, dIdx) => `
        <div class="flex-1 min-w-[200px] flex flex-col gap-3">
            <div class="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm border-b-4 border-b-blue-600">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${day}</span>
            </div>
            <div data-day="${dIdx}" class="space-y-3">
                ${structure.map(slot => {
                    const saved = (currentRoutine[dIdx] || {})[slot.id] || null;
                    const isOccupied = !!saved;
                    const type = saved?.type || slot.type;
                    
                    let content = '';
                    let bgColor = 'bg-white border-dashed';
                    let borderColor = 'border-gray-200';
                    let textColor = 'text-gray-400';

                    if (isOccupied) {
                        if (type === 'subject') {
                            const sub = subjects.find(s => s.id === saved.subjectId);
                            const teacher = teachers.find(t => t.id === saved.teacherId);
                            bgColor = 'bg-white border-2 border-l-4 border-l-blue-600 shadow-sm';
                            borderColor = 'border-blue-100';
                            textColor = 'text-gray-900';
                            content = `
                                <div class="font-bold text-sm truncate">${sub ? sub.name : 'Unknown Subject'}</div>
                                <div class="text-[10px] text-gray-400 font-bold uppercase truncate">${teacher ? teacher.name : 'No Teacher'}</div>
                            `;
                        } else if (type === 'lunch') {
                            bgColor = 'bg-orange-50 border-orange-100 text-orange-700 font-bold text-xs flex flex-col items-center justify-center';
                            content = '<i data-lucide="coffee" class="w-4 h-4 mb-1 opacity-40"></i> LUNCH';
                        } else if (type === 'break') {
                            bgColor = 'bg-purple-50 border-purple-100 text-purple-700 font-bold text-xs flex flex-col items-center justify-center';
                            content = '<i data-lucide="clock" class="w-4 h-4 mb-1 opacity-40"></i> BREAK';
                        }
                    } else if (slot.type !== 'class') {
                        // Default slots like original lunch/break
                        if (slot.type === 'break') {
                            bgColor = 'bg-slate-50 border-slate-200 text-slate-400 font-bold text-[10px] flex items-center justify-center';
                            content = 'BREAK';
                        } else if (slot.type === 'lunch') {
                            bgColor = 'bg-slate-50 border-slate-200 text-slate-400 font-bold text-[10px] flex items-center justify-center';
                            content = 'LUNCH';
                        }
                    }

                    return `
                        <div data-slot="${slot.id}" class="period-slot p-3 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${bgColor} ${borderColor} ${textColor} flex flex-col justify-center gap-1 group">
                            <div class="flex items-center justify-between pointer-events-none">
                                <span class="text-[10px] font-bold text-gray-300">${slot.time}</span>
                                ${isOccupied ? `
                                    <button class="text-gray-300 hover:text-red-500 transition-colors">
                                        <i data-lucide="edit-2" class="w-3 h-3"></i>
                                    </button>
                                ` : ''}
                            </div>
                            ${content || '<span class="text-xs opacity-40">Click to add</span>'}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
    attachSlotListeners();
}

function attachSlotListeners() {
    document.querySelectorAll('.period-slot').forEach(el => {
        el.onclick = () => {
            const dayIndex = el.parentElement.dataset.day;
            const slotId = el.dataset.slot;
            openPeriodModal(dayIndex, slotId);
        };
    });
}

function setupEventListeners() {
    selectClass.onchange = (e) => handleClassChange(e.target.value);
    
    btnCopySunday.onclick = () => {
        if (!currentRoutine[0]) {
            notify('Please fill out Sunday first!', 'error');
            return;
        }
        for (let i = 1; i <= 5; i++) {
            currentRoutine[i] = JSON.parse(JSON.stringify(currentRoutine[0]));
        }
        renderWorkspace();
        notify('Routine copied to all days. Make sure to save!', 'success');
    };

    btnSaveRoutine.onclick = async () => {
        if (!currentClassId) return;
        
        // Scientific Validation
        const conflicts = validateRoutine();
        if (conflicts.length > 0) {
            if (!confirm(`Warning: Found ${conflicts.length} conflicts (e.g. teachers in 2 places). Save anyway?`)) {
                console.log(conflicts);
                return;
            }
        }

        await db.add(STORES.ROUTINES, { id: currentClassId, data: currentRoutine });
        notify('Routine saved successfully!', 'success');
    };

    document.getElementById('close-period-modal').onclick = closePeriodModal;
    document.getElementById('save-period').onclick = savePeriodData;
    document.getElementById('clear-period').onclick = () => {
        if (activeEditSlot) {
            delete currentRoutine[activeEditSlot.dayIndex][activeEditSlot.slotId];
            closePeriodModal();
            renderWorkspace();
        }
    };

    document.querySelectorAll('.slot-type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.slot-type-btn').forEach(b => b.classList.remove('border-blue-600', 'bg-blue-50'));
            btn.classList.add('border-blue-600', 'bg-blue-50');
            const type = btn.dataset.type;
            const subSel = document.getElementById('subject-selector');
            if (type === 'subject') subSel.classList.remove('hidden');
            else subSel.classList.add('hidden');
        };
    });

    document.getElementById('p-subject').onchange = (e) => {
        const subId = e.target.value;
        const sub = subjects.find(s => s.id === subId);
        const tSel = document.getElementById('p-teacher');
        tSel.innerHTML = '<option value="">Select Teacher</option>';
        if (sub) {
            (sub.assignedTeachers || []).forEach(tid => {
                const t = teachers.find(tr => tr.id === tid);
                if (t) tSel.innerHTML += `<option value="${t.id}">${t.name}</option>`;
            });
        }
    };
}

function openPeriodModal(dayIndex, slotId) {
    activeEditSlot = { dayIndex, slotId };
    const dayName = DAYS[dayIndex];
    document.getElementById('period-info').textContent = `${dayName} | Slot ${slotId}`;
    
    // Fill subject/teacher dropdowns
    const subSel = document.getElementById('p-subject');
    subSel.innerHTML = '<option value="">Select Subject</option>' + 
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    // Load existing data if any
    const existing = (currentRoutine[dayIndex] || {})[slotId];
    const typeBtns = document.querySelectorAll('.slot-type-btn');
    const subBlock = document.getElementById('subject-selector');
    
    if (existing) {
        const typeBtn = Array.from(typeBtns).find(b => b.dataset.type === existing.type);
        typeBtn.click();
        if (existing.type === 'subject') {
            subSel.value = existing.subjectId;
            // trigger change to load teachers
            subSel.dispatchEvent(new Event('change'));
            document.getElementById('p-teacher').value = existing.teacherId;
        }
    } else {
        // default to subject
        typeBtns[0].click();
    }

    periodModal.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
    periodModal.querySelector('.sm\\:rounded-3xl').classList.remove('translate-y-full');
}

function closePeriodModal() {
    periodModal.querySelector('.sm\\:rounded-3xl').classList.add('translate-y-full');
    setTimeout(() => {
        periodModal.classList.add('invisible', 'opacity-0', 'pointer-events-none');
    }, 300);
}

function savePeriodData() {
    if (!activeEditSlot) return;
    
    const type = document.querySelector('.slot-type-btn.border-blue-600').dataset.type;
    const data = { type };
    
    if (type === 'subject') {
        data.subjectId = document.getElementById('p-subject').value;
        data.teacherId = document.getElementById('p-teacher').value;
        if (!data.subjectId || !data.teacherId) {
            notify('Please select both subject and teacher', 'error');
            return;
        }
    }

    if (!currentRoutine[activeEditSlot.dayIndex]) {
        currentRoutine[activeEditSlot.dayIndex] = {};
    }
    currentRoutine[activeEditSlot.dayIndex][activeEditSlot.slotId] = data;
    
    closePeriodModal();
    renderWorkspace();
}

/**
 * SCIENTIFIC VALIDATION
 * Detect conflicts across all classes' routines saved in database.
 */
function validateRoutine() {
    const conflicts = [];
    const allRoutines = routines.filter(r => r.id !== currentClassId).concat({ id: currentClassId, data: currentRoutine });
    
    // 1. Teacher Conflict (Same teacher in multiple classes at same time)
    // Structure: map[dayIdx][slotId][teacherId] = classId
    const teacherUsage = {};

    allRoutines.forEach(routine => {
        const classId = routine.id;
        const data = routine.data;
        
        Object.entries(data).forEach(([dayIdx, daySlots]) => {
            Object.entries(daySlots).forEach(([slotId, info]) => {
                if (info.type === 'subject' && info.teacherId) {
                    if (!teacherUsage[dayIdx]) teacherUsage[dayIdx] = {};
                    if (!teacherUsage[dayIdx][slotId]) teacherUsage[dayIdx][slotId] = {};
                    
                    if (teacherUsage[dayIdx][slotId][info.teacherId]) {
                        if (classId === currentClassId) {
                            const otherClass = teacherUsage[dayIdx][slotId][info.teacherId];
                            conflicts.push(`Teacher ${info.teacherId} is already in ${otherClass} on ${DAYS[dayIdx]} Slot ${slotId}`);
                        }
                    } else {
                        teacherUsage[dayIdx][slotId][info.teacherId] = classId;
                    }
                }
            });
        });
    });

    return conflicts;
}

function setupLayout() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    if (sidebar) sidebar.innerHTML = UI.sidebar;
    if (header) header.innerHTML = UI.header;
    lucide.createIcons();
    
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
