/**
 * substitution.js - Scientific Substitute Management Logic
 */
import { db, STORES } from './database.js';
import { notify, UI } from './app.js';

// Constants
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// State
let teachers = [];
let classes = [];
let subjects = [];
let routines = [];
let absentTeacherIds = new Set();
let todayDayIndex = 0; // 0 for Sunday
let currentAssignments = {}; // { classId: { slotId: substituteTeacherId } }

async function init() {
    setupLayout();
    await loadInitialData();
    setupToday();
    setupEventListeners();
    renderAbsencePanel();
}

async function loadInitialData() {
    teachers = await db.getAll(STORES.TEACHERS);
    classes = await db.getAll(STORES.CLASSES);
    subjects = await db.getAll(STORES.SUBJECTS);
    routines = await db.getAll(STORES.ROUTINES);
    
    populateAbsentSelect();
}

function setupToday() {
    const today = new Date().getDay();
    // In many JS systems: 0=Sun, 1=Mon, ..., 6=Sat
    // Our DAYS array matches this (assuming Sat is skip)
    todayDayIndex = today === 6 ? 0 : today; // Default to Sunday if Saturday
}

function populateAbsentSelect() {
    const sel = document.getElementById('select-absent-teacher');
    if (!sel) return;
    sel.innerHTML = '<option value="">Choose teacher...</option>' + 
        teachers.filter(t => t.active).map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join('');
}

function setupEventListeners() {
    document.getElementById('btn-add-absence').onclick = () => {
        const sel = document.getElementById('select-absent-teacher');
        const tid = sel.value;
        if (!tid) return;
        absentTeacherIds.add(tid);
        sel.value = '';
        renderAbsencePanel();
        renderAffectedList();
    };

    document.getElementById('btn-auto-assign').onclick = () => {
        autoAssignAll();
        renderAffectedList();
        notify('Auto-assignment complete based on scientific priority rules.', 'success');
    };

    document.getElementById('btn-clear-today').onclick = () => {
        absentTeacherIds.clear();
        currentAssignments = {};
        renderAbsencePanel();
        renderAffectedList();
    };
}

function renderAbsencePanel() {
    const list = document.getElementById('absent-list');
    if (!list) return;

    if (absentTeacherIds.size === 0) {
        list.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No teachers marked absent today.</p>';
        return;
    }

    list.innerHTML = Array.from(absentTeacherIds).map(tid => {
        const t = teachers.find(tr => tr.id === tid);
        return `
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                        ${t ? t.name[0] : '?'}
                    </div>
                    <span class="text-sm font-semibold text-gray-700">${t ? t.name : tid}</span>
                </div>
                <button class="text-red-400 hover:text-red-600 btn-remove-absent" data-id="${tid}">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
    document.querySelectorAll('.btn-remove-absent').forEach(btn => {
        btn.onclick = () => {
            absentTeacherIds.delete(btn.dataset.id);
            renderAbsencePanel();
            renderAffectedList();
        };
    });
}

function renderAffectedList() {
    const list = document.getElementById('affected-periods-list');
    if (!list) return;

    if (absentTeacherIds.size === 0) {
        list.innerHTML = `
            <div class="py-20 text-center opacity-40">
                <i data-lucide="shield-check" class="w-16 h-16 mx-auto mb-4"></i>
                <p class="font-medium">Everything is covered! Select absent teachers to see affected classes.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Find all affected periods today
    const affected = [];
    routines.forEach(routine => {
        const classId = routine.id;
        const dayData = routine.data[todayDayIndex] || {};
        Object.entries(dayData).forEach(([slotId, info]) => {
            if (info.type === 'subject' && absentTeacherIds.has(info.teacherId)) {
                affected.push({
                    classId,
                    slotId,
                    subjectId: info.subjectId,
                    originalTeacherId: info.teacherId,
                    time: getSlotTime(classId, slotId)
                });
            }
        });
    });

    if (affected.length === 0) {
        list.innerHTML = '<p class="text-center py-10 text-gray-500">The absent teachers have no classes scheduled for today.</p>';
        return;
    }

    list.innerHTML = affected.map(item => {
        const targetClass = classes.find(c => c.id === item.classId);
        const sub = subjects.find(s => s.id === item.subjectId);
        const originalT = teachers.find(t => t.id === item.originalTeacherId);
        const currentSubId = (currentAssignments[item.classId] || {})[item.slotId];
        const substituteT = teachers.find(t => t.id === currentSubId);

        return `
            <div class="card !p-0 overflow-hidden flex flex-col md:flex-row">
                <div class="p-4 bg-gray-50 border-r border-gray-100 min-w-[140px] flex flex-col justify-center text-center">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${item.time}</span>
                    <h3 class="font-bold text-blue-600">Grade ${targetClass ? targetClass.grade : '?'}</h3>
                    <p class="text-xs font-bold text-gray-500">${targetClass ? targetClass.section : ''}</p>
                </div>
                
                <div class="flex-1 p-4 flex flex-col md:flex-row gap-6 items-center">
                    <div class="flex-1 w-full">
                        <p class="text-[10px] font-bold text-gray-300 uppercase mb-2">Needs Coverage</p>
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-slate-100 rounded-lg text-slate-500">
                                <i data-lucide="book-open" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <p class="font-bold text-sm">${sub ? sub.name : 'Unknown'}</p>
                                <p class="text-xs text-red-500 font-medium">Was: ${originalT ? originalT.name : 'Unknown'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 w-full">
                        <p class="text-[10px] font-bold text-gray-300 uppercase mb-2">Substitute Assigned</p>
                        <div class="relative">
                            <select class="input-field !py-2 !text-xs font-bold sub-select" data-class="${item.classId}" data-slot="${item.slotId}">
                                <option value="">Draft: Select or Auto-run</option>
                                ${getEligibleSubstitutes(item).map(candidate => `
                                    <option value="${candidate.teacher.id}" ${currentSubId === candidate.teacher.id ? 'selected' : ''}>
                                        ${candidate.teacher.id} - ${candidate.teacher.name} (Score: ${candidate.score})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
    document.querySelectorAll('.sub-select').forEach(sel => {
        sel.onchange = (e) => {
            const { class: cid, slot } = sel.dataset;
            if (!currentAssignments[cid]) currentAssignments[cid] = {};
            currentAssignments[cid][slot] = e.target.value;
        };
    });
}

function getSlotTime(classId, slotId) {
    // Simplified logic, should ideally use the class grade's structure
    return slotId.length > 2 ? 'Special' : `Period ${slotId}`;
}

/**
 * SCIENTIFIC SCORING ENGINE
 */
function getEligibleSubstitutes(item) {
    const targetClass = classes.find(c => c.id === item.classId);
    if (!targetClass) return [];

    const candidates = teachers.filter(t => {
        // 1. Must be Active
        if (!t.active) return false;
        // 2. Must NOT be the original (absent) teacher
        if (absentTeacherIds.has(t.id)) return false;
        // 3. Must be FREE during this period (not teaching in any class)
        if (isTeachingAt(t.id, todayDayIndex, item.slotId)) return false;
        // 4. Must NOT be already assigned a substitution in this same slotId elsewhere (prevent double duty)
        if (isAssignedSubstitutionElsewhere(t.id, item.classId, item.slotId)) return false;

        // 5. Level Rules
        const gradeNum = parseInt(targetClass.grade);
        // Primary (1-3) cannot substitute 4-10
        if (t.level === 'Primary' && gradeNum > 3) return false;
        // Middle (4-7) cannot substitute 8-10
        if (t.level === 'Middle' && gradeNum > 7) return false;
        // Mixed (4-8) cannot substitute 9-10
        if (t.level === 'Mixed' && gradeNum > 8) return false;
        // Senior (8-10) can only teach 8-10
        if (t.level === 'Senior' && gradeNum < 8) return false;

        return true;
    });

    // Score them
    return candidates.map(t => {
        let score = 50; // Starting base score

        // RULE: Incharge Priority
        if (t.incharge) {
            const g = parseInt(targetClass.grade);
            if (t.inchargeCategory === '1-3' && g <= 3) score += 30;
            if (t.inchargeCategory === '4-6' && g >= 4 && g <= 6) score += 30;
            if (t.inchargeCategory === '7-10' && g >= 7) score += 30;
        }

        // RULE: Subject Match
        if (t.subjects.includes(item.subjectId) || (subjects.find(s => s.id === item.subjectId)?.name && t.subjects.some(sj => item.subjectId.includes(sj)))) {
            score += 20;
        }

        // RULE: Fairness (Lower substitution count)
        // Mocking substitution count for now, would ideally fetch from a sub history store
        score -= (Math.random() * 10); // Tie breaker / Mock history

        return { teacher: t, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score);
}

function isTeachingAt(teacherId, dayIdx, slotId) {
    return routines.some(r => {
        const dayData = r.data[dayIdx] || {};
        return dayData[slotId]?.type === 'subject' && dayData[slotId]?.teacherId === teacherId;
    });
}

function isAssignedSubstitutionElsewhere(teacherId, classId, slotId) {
    return Object.entries(currentAssignments).some(([cid, slots]) => {
        return cid !== classId && slots[slotId] === teacherId;
    });
}

function autoAssignAll() {
    currentAssignments = {};
    const affected = [];
    routines.forEach(routine => {
        const classId = routine.id;
        const dayData = routine.data[todayDayIndex] || {};
        Object.entries(dayData).forEach(([slotId, info]) => {
            if (info.type === 'subject' && absentTeacherIds.has(info.teacherId)) {
                affected.push({ classId, slotId, subjectId: info.subjectId, originalTeacherId: info.teacherId });
            }
        });
    });

    affected.forEach(item => {
        const sorted = getEligibleSubstitutes(item);
        if (sorted.length > 0) {
            if (!currentAssignments[item.classId]) currentAssignments[item.classId] = {};
            currentAssignments[item.classId][item.slotId] = sorted[0].teacher.id;
        }
    });
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
