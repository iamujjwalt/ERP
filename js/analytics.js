/**
 * analytics.js - Reports and Data Visualizations
 */
import { db, STORES } from './database.js';
import { UI, notify } from './app.js';
import { exportToPDF, exportToExcel } from './export.js';

let teachers = [];
let routines = [];
let subjects = [];

async function init() {
    setupLayout();
    await loadData();
    renderCharts();
    renderReportTable();
    setupExportButtons();
}

async function loadData() {
    teachers = await db.getAll(STORES.TEACHERS);
    routines = await db.getAll(STORES.ROUTINES);
    subjects = await db.getAll(STORES.SUBJECTS);
}

function calculateWorkload() {
    const workload = {}; // { teacherId: totalPeriods }
    teachers.forEach(t => workload[t.id] = 0);

    routines.forEach(r => {
        Object.values(r.data).forEach(day => {
            Object.values(day).forEach(slot => {
                if (slot.type === 'subject' && slot.teacherId) {
                    if (workload[slot.teacherId] !== undefined) {
                        workload[slot.teacherId]++;
                    }
                }
            });
        });
    });

    return workload;
}

function renderCharts() {
    const workload = calculateWorkload();
    const tNames = teachers.map(t => t.name);
    const tLoads = teachers.map(t => workload[t.id]);

    const ctx1 = document.getElementById('workload-chart');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: tNames,
                datasets: [{
                    label: 'Total Weekly Periods',
                    data: tLoads,
                    backgroundColor: '#6366f1',
                    hoverBackgroundColor: '#4f46e5',
                    borderRadius: 6,
                    barThickness: 12
                }]
            },
            options: {
                responsive: true,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 10, weight: 'bold' },
                        bodyFont: { size: 10 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f8fafc', drawTicks: false },
                        border: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' }
                    },
                    x: { 
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // Subject Chart
    const subLoads = {};
    routines.forEach(r => {
        Object.values(r.data).forEach(day => {
            Object.values(day).forEach(slot => {
                if (slot.type === 'subject' && slot.subjectId) {
                    subLoads[slot.subjectId] = (subLoads[slot.subjectId] || 0) + 1;
                }
            });
        });
    });

    const ctx2 = document.getElementById('subject-period-chart');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: Object.keys(subLoads).map(sid => subjects.find(s => s.id === sid)?.name || sid),
                datasets: [{
                    data: Object.values(subLoads),
                    backgroundColor: [
                        '#6366f1', // Indigo
                        '#0f172a', // Slate 900
                        '#334155', // Slate 700
                        '#64748b', // Slate 500
                        '#94a3b8', // Slate 400
                        '#cbd5e1'  // Slate 300
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { 
                    legend: { 
                        position: 'right',
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

function renderReportTable() {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    const workload = calculateWorkload();

    tbody.innerHTML = teachers.map(t => {
        const load = workload[t.id];
        const status = load > t.maxPeriods * 5 ? 'Overloaded' : load < 10 ? 'Underloaded' : 'Normal';
        const statusColor = status === 'Overloaded' ? 'text-red-600 bg-red-50' : status === 'Underloaded' ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50';

        return `
            <tr>
                <td class="font-mono text-[10px] font-bold text-gray-400">${t.id}</td>
                <td>
                    <p class="font-bold text-gray-900">${t.name}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-bold tracking-tight">${t.level}</p>
                </td>
                <td class="font-bold text-gray-800">${load} Periods</td>
                <td class="text-gray-500">${(t.maxPeriods * 6) - load} slots</td>
                <td class="text-gray-500">0</td>
                <td>
                   <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor}">${status}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function setupExportButtons() {
    document.getElementById('btn-export-pdf').onclick = () => {
        exportToPDF('report-table', 'EduSched_Workload_Report');
    };
    document.getElementById('btn-export-excel').onclick = () => {
        exportToExcel('report-table', 'EduSched_Workload_Report');
    };
}

function setupLayout() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    if (sidebar) sidebar.innerHTML = UI.sidebar;
    if (header) header.innerHTML = UI.header;
    lucide.createIcons();
}

init();
