/**
 * app.js - Main dashboard logic and shared UI interactions
 */
import { db } from './database.js';

// Initialize Lucide Icons
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Common UI Elements
export const UI = {
  sidebar: `
    <div class="flex h-20 items-center gap-3 px-6 shrink-0">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-500/20">E</div>
      <div class="flex flex-col">
        <span class="text-sm font-bold tracking-tight text-white uppercase leading-none">EduSched</span>
        <span class="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Pro Builder</span>
      </div>
    </div>
    <nav class="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
      <a href="/" data-path="/" class="nav-link">
        <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
        <span>Dashboard</span>
      </a>
      <a href="/teachers.html" data-path="/teachers.html" class="nav-link">
        <i data-lucide="users" class="w-5 h-5"></i>
        <span>Teachers</span>
      </a>
      <a href="/classes.html" data-path="/classes.html" class="nav-link">
        <i data-lucide="school" class="w-5 h-5"></i>
        <span>Classes & Sections</span>
      </a>
      <a href="/subjects.html" data-path="/subjects.html" class="nav-link">
        <i data-lucide="book-open" class="w-5 h-5"></i>
        <span>Subjects</span>
      </a>
      <div class="pt-6 pb-2">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Management</div>
        <a href="/routine.html" data-path="/routine.html" class="nav-link">
          <i data-lucide="calendar" class="w-5 h-5"></i>
          <span>Routine Builder</span>
        </a>
        <a href="/substitution.html" data-path="/substitution.html" class="nav-link">
          <i data-lucide="zap" class="w-5 h-5"></i>
          <span>Substitutes</span>
          <span id="sub-badge" class="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white hidden">0</span>
        </a>
      </div>
      <div class="pt-6 pb-2">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Analysis</div>
        <a href="/reports.html" data-path="/reports.html" class="nav-link">
          <i data-lucide="pie-chart" class="w-5 h-5"></i>
          <span>Reports</span>
        </a>
      </div>
    </nav>
    <div class="mt-auto border-t border-slate-800 p-6 shrink-0">
      <div class="rounded-xl bg-slate-800/50 p-4 text-xs">
        <p class="mb-2 font-semibold text-slate-500 uppercase tracking-wider">System Status</p>
        <div class="flex items-center gap-2 text-emerald-400 font-medium">
          <div class="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
          IndexedDB Synced
        </div>
      </div>
    </div>
  `,
  header: `
    <div class="flex flex-col">
      <h1 class="text-xl font-bold text-slate-900 tracking-tight" id="header-title">EduSched Pro</h1>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5" id="header-subtitle">Academic Overview</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="hidden sm:flex items-center gap-2 text-right mr-4 font-mono text-[11px] font-bold text-slate-400">
        <i data-lucide="clock" class="w-3 h-3 text-indigo-500"></i>
        <span id="current-time">00:00:00</span>
      </div>
      <button class="flex items-center justify-center h-10 w-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
        <i data-lucide="bell" class="w-4 h-4 text-slate-500"></i>
      </button>
      <div class="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm overflow-hidden ring-2 ring-white">
        <span class="text-xs font-bold text-slate-500">AD</span>
      </div>
    </div>
  `
};

// Application State
export const state = {
  teachers: [],
  classes: [],
  subjects: [],
  routines: [],
  substitutions: []
};

// Global Notifications
export const notify = (message, type = 'info') => {
  if (typeof Toastify !== 'undefined') {
    Toastify({
      text: message,
      duration: 3000,
      close: true,
      gravity: "top",
      position: "right",
      stopOnFocus: true,
      className: `toast-${type}`,
      style: {
        background: type === 'error' ? '#ef4444' : type === 'success' ? '#6366f1' : '#1e293b',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    }).showToast();
  } else {
    alert(message);
  }
};

// Load Initial Data
async function loadData() {
  state.teachers = await db.getAll('teachers');
  state.classes = await db.getAll('classes');
  state.subjects = await db.getAll('subjects');
  state.routines = await db.getAll('routines');
  state.substitutions = await db.getAll('substitutions');
}

// Update Dashboard Stats
async function updateStats() {
  const tCount = document.getElementById('stat-total-teachers');
  const pCount = document.getElementById('stat-present-teachers');
  const aCount = document.getElementById('stat-absent-teachers');
  const activePeriods = document.getElementById('stat-active-periods');
  
  if (tCount) tCount.textContent = state.teachers.length;
  if (pCount) pCount.textContent = Math.round(state.teachers.length * 0.9);
  if (aCount) aCount.textContent = state.teachers.length - Math.round(state.teachers.length * 0.9);
  
  let running = 0;
  state.routines.forEach(r => {
    Object.values(r.data).forEach(day => {
        Object.values(day).forEach(slot => {
            if (slot.type === 'subject') running++;
        });
    });
  });
  if (activePeriods) activePeriods.textContent = running;
}

function initDashboard() {
  const ctx1 = document.getElementById('loadChart');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
          label: 'System Load',
          data: [65, 78, 62, 85, 74, 55],
          borderColor: '#6366f1',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderWidth: 3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { 
          y: { display: false }, 
          x: { 
            grid: { display: false },
            ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' },
            border: { display: false }
          } 
        }
      }
    });
  }

  const ctx2 = document.getElementById('subjectChart');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Math', 'Science', 'English', 'Nepali', 'Social'],
        datasets: [{
          data: [12, 19, 15, 10, 8],
          backgroundColor: ['#6366f1', '#0f172a', '#334155', '#64748b', '#94a3b8'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: { size: 10, weight: 'bold' },
              color: '#64748b'
            }
          } 
        }
      }
    });
  }
}

// Initialize Sidebar & Header
function setupLayout() {
  const sidebarEl = document.getElementById('sidebar');
  const headerEl = document.getElementById('header');
  
  if (sidebarEl) sidebarEl.innerHTML = UI.sidebar;
  if (headerEl) headerEl.innerHTML = UI.header;
  
  // Mark Active Link
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    const path = link.getAttribute('data-path');
    if (currentPath === path || (currentPath === '/index.html' && path === '/')) {
      link.classList.add('active');
    }
  });

  // Time display
  setInterval(() => {
    const clock = document.getElementById('current-time');
    if (clock) {
      clock.textContent = new Date().toLocaleTimeString();
    }
  }, 1000);
}

// Main Init
document.addEventListener('DOMContentLoaded', async () => {
  setupLayout();
  initIcons();
  await loadData();
  updateStats();
  
  if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '') {
    initDashboard();
  }
});
