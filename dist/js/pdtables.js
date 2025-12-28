/*!
 * PdTables v2.0 - Optimized Virtual Table + CRUD
 * (c) 2025 - Single File Solution
 * License: MIT
 */

class PdTables {
    constructor(table, data, options = {}) {
        this.table = typeof table === 'string' ? document.querySelector(table) : table;
        this.id = 'pdt_' + Date.now();
        this.data = Array.isArray(data) ? data : [];
        this.filtered = [...this.data];
        
        this.config = {
            height: 400,
            rowHeight: 42,
            visibleRows: 25,
            virtualScroll: true,
            searchable: true,
            selectable: false,
            striped: false,
            hover: true,
            ...options
        };
        
        this.state = {
            scrollTop: 0,
            searchText: '',
            selected: new Set(),
            searchTimeout: null
        };
        
        this.dom = {};
        this.init();
    }
    
    init() {
        this.injectCSS();
        this.createWrapper();
        this.createControls();
        this.createBody();
        this.attachEvents();
        this.render();
    }
    
    injectCSS() {
        if (document.getElementById('pd-tables-css')) return;
        const style = document.createElement('style');
        style.id = 'pd-tables-css';
        style.textContent = `.pd-wrap{border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-family:system-ui,sans-serif;overflow:auto}.pd-ctrl{padding:12px;background:#f7fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;flex-wrap:wrap}.pd-search{flex:1;min-width:200px;padding:8px 12px;border:1px solid #cbd5e0;border-radius:4px}.pd-btn{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-size:14px;transition:opacity .2s}.pd-btn:hover{opacity:.8}.pd-btn-add{background:#4299e1;color:#fff}.pd-btn-copy{background:#48bb78;color:#fff}.pd-count{background:#718096;color:#fff;padding:4px 10px;border-radius:12px;font-size:12px;margin-left:auto;display:none}.pd-table{width:100%;border-collapse:collapse}.pd-table th{background:#edf2f7;padding:12px;text-align:left;font-weight:600;position:sticky;top:0;z-index:1}.pd-table td{padding:12px;border-bottom:1px solid #e2e8f0}.pd-table input[type=checkbox]{cursor:pointer}.pd-act{padding:4px 8px;font-size:12px;margin:2px;border-radius:3px;border:none;cursor:pointer}.pd-edit{background:#fbbf24;color:#000}.pd-del{background:#f56565;color:#fff}.pd-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.pd-modal-content{background:#fff;padding:24px;border-radius:8px;min-width:300px;max-width:500px;position:relative}.pd-input{width:100%;padding:8px;margin:8px 0;border:1px solid #cbd5e0;border-radius:4px;box-sizing:border-box}.pd-toast{position:fixed;bottom:20px;right:20px;background:#2d3748;color:#fff;padding:12px 24px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.3);animation:pdFade 3s}.pd-striped tbody tr:nth-child(even){background:#fafafa}.pd-hover tbody tr:hover{background:#ebf8ff}@keyframes pdFade{0%,70%{opacity:1}100%{opacity:0}}`;
        document.head.appendChild(style);
    }
    
    createWrapper() {
        this.dom.wrapper = document.createElement('div');
        this.dom.wrapper.className = 'pd-wrap';
        this.dom.wrapper.style.height = this.config.height + 'px';
        this.table.parentNode.insertBefore(this.dom.wrapper, this.table);
        this.dom.wrapper.appendChild(this.table);
        this.table.className = 'pd-table' + 
            (this.config.striped ? ' pd-striped' : '') + 
            (this.config.hover ? ' pd-hover' : '');
    }
    
    createControls() {
        const ctrl = document.createElement('div');
        ctrl.className = 'pd-ctrl';
        
        if (this.config.searchable) {
            this.dom.search = document.createElement('input');
            this.dom.search.type = 'text';
            this.dom.search.className = 'pd-search';
            this.dom.search.placeholder = 'Search...';
            ctrl.appendChild(this.dom.search);
        }
        
        const btnAdd = document.createElement('button');
        btnAdd.className = 'pd-btn pd-btn-add';
        btnAdd.textContent = '+ Add';
        btnAdd.dataset.action = 'add';
        ctrl.appendChild(btnAdd);
        
        const btnCopy = document.createElement('button');
        btnCopy.className = 'pd-btn pd-btn-copy';
        btnCopy.innerHTML = '<span style="font-family:monospace">⎘</span> Copy';
        btnCopy.dataset.action = 'copy';
        ctrl.appendChild(btnCopy);
        
        this.dom.counter = document.createElement('span');
        this.dom.counter.className = 'pd-count';
        ctrl.appendChild(this.dom.counter);
        
        this.dom.wrapper.insertBefore(ctrl, this.table);
    }
    
    createBody() {
        if (!this.table.tBodies.length) this.table.createTBody();
        this.dom.tbody = this.table.tBodies[0];
        
        if (this.config.selectable && this.table.tHead) {
            const th = document.createElement('th');
            th.style.width = '50px';
            th.innerHTML = '<input type="checkbox" data-select="all">';
            this.table.tHead.rows[0].insertBefore(th, this.table.tHead.rows[0].firstChild);
        }
    }
    
    attachEvents() {
        // Virtual scroll
        if (this.config.virtualScroll) {
            this.dom.wrapper.addEventListener('scroll', () => {
                if (this.scrollRAF) return;
                this.scrollRAF = requestAnimationFrame(() => {
                    this.state.scrollTop = this.dom.wrapper.scrollTop;
                    this.render();
                    this.scrollRAF = null;
                });
            });
        }
        
        // Debounced search
        if (this.config.searchable && this.dom.search) {
            this.dom.search.addEventListener('input', (e) => {
                clearTimeout(this.state.searchTimeout);
                this.state.searchTimeout = setTimeout(() => {
                    this.state.searchText = e.target.value.toLowerCase();
                    this.render();
                }, 300);
            });
        }
        
        // Event delegation
        this.dom.wrapper.addEventListener('click', (e) => {
            const target = e.target;
            
            // Select all
            if (target.dataset.select === 'all') {
                this.selectAll(target.checked);
            }
            
            // Row checkbox
            if (target.dataset.select === 'row') {
                const id = target.dataset.id;
                target.checked ? this.state.selected.add(id) : this.state.selected.delete(id);
                this.updateUI();
            }
            
            // Actions
            const action = target.dataset.action;
            if (action === 'add') this.showAddModal();
            if (action === 'copy') this.copySelected();
            if (action === 'edit') this.showEditModal(parseInt(target.dataset.idx));
            if (action === 'delete') this.delete(parseInt(target.dataset.idx));
            if (action === 'modal-close') this.closeModal();
        });
        
        // Modal backdrop close
        this.dom.wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('pd-modal')) this.closeModal();
        });
    }
    
    render() {
        this.filterData();
        
        const start = this.config.virtualScroll ? 
            Math.floor(this.state.scrollTop / this.config.rowHeight) : 0;
        const end = start + this.config.visibleRows;
        
        const visible = this.filtered.slice(start, end);
        this.renderRows(visible, start);
        this.updateUI();
    }
    
    filterData() {
        if (this.state.searchText) {
            this.filtered = this.data.filter(row => 
                row.some(cell => String(cell).toLowerCase().includes(this.state.searchText))
            );
        } else {
            this.filtered = [...this.data];
        }
    }
    
    renderRows(rows, startIdx) {
        const fragment = document.createDocumentFragment();
        
        rows.forEach((row, relIdx) => {
            const absIdx = startIdx + relIdx;
            const tr = document.createElement('tr');
            
            if (this.config.selectable) {
                const id = row[0] || absIdx;
                const td = document.createElement('td');
                td.innerHTML = `<input type="checkbox" data-select="row" data-id="${id}" ${this.state.selected.has(id) ? 'checked' : ''}>`;
                tr.appendChild(td);
            }
            
            row.forEach((cell, colIdx) => {
                const td = document.createElement('td');
                if (colIdx === 1 && this.state.searchText) {
                    td.innerHTML = this.highlight(cell, this.state.searchText);
                } else {
                    td.textContent = cell;
                }
                tr.appendChild(td);
            });
            
            const tdAct = document.createElement('td');
            tdAct.innerHTML = `
                <button class="pd-act pd-edit" data-action="edit" data-idx="${absIdx}">Edit</button>
                <button class="pd-act pd-del" data-action="delete" data-idx="${absIdx}">Del</button>
            `;
            tr.appendChild(tdAct);
            
            fragment.appendChild(tr);
        });
        
        this.dom.tbody.innerHTML = '';
        this.dom.tbody.appendChild(fragment);
        
        if (this.config.virtualScroll) {
            const totalHeight = this.filtered.length * this.config.rowHeight;
            this.dom.tbody.style.transform = `translateY(${startIdx * this.config.rowHeight}px)`;
            this.table.style.height = totalHeight + 'px';
        }
    }
    
    highlight(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return String(text).replace(regex, '<mark style="background:#fef3c7">$1</mark>');
    }
    
    selectAll(checked) {
        const visible = this.filtered.slice(
            Math.floor(this.state.scrollTop / this.config.rowHeight),
            Math.floor(this.state.scrollTop / this.config.rowHeight) + this.config.visibleRows
        );
        visible.forEach(row => {
            const id = row[0] || this.data.indexOf(row);
            checked ? this.state.selected.add(id) : this.state.selected.delete(id);
        });
        this.render();
    }
    
    updateUI() {
        const count = this.state.selected.size;
        this.dom.counter.textContent = count ? `${count} selected` : '';
        this.dom.counter.style.display = count ? 'block' : 'none';
        
        const selectAll = this.table.querySelector('[data-select="all"]');
        if (selectAll) {
            const allChecked = this.dom.tbody.querySelectorAll('[data-select="row"]:checked').length === 
                              this.dom.tbody.querySelectorAll('[data-select="row"]').length;
            selectAll.checked = allChecked;
        }
    }
    
    copySelected() {
        const selected = this.data.filter(row => this.state.selected.has(row[0] || this.data.indexOf(row)));
        if (!selected.length) return this.toast('⚠ Select data first');
        
        const text = selected.map(row => row.join('\t')).join('\n');
        navigator.clipboard.writeText(text)
            .then(() => this.toast(`✓ ${selected.length} rows copied`))
            .catch(() => this.toast('✕ Copy failed'));
    }
    
    showAddModal() {
        this.modal(`
            <h3>Add New Data</h3>
            <input type="text" id="${this.id}-input" class="pd-input" placeholder="Enter data...">
            <div style="margin-top:15px;text-align:right">
                <button class="pd-btn" data-action="save-new">Save</button>
            </div>
        `);
        
        document.getElementById(`${this.id}-input`)?.focus();
        
        const saveBtn = document.querySelector('[data-action="save-new"]');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const input = document.getElementById(`${this.id}-input`);
                if (input?.value.trim()) {
                    this.data.push([Date.now(), input.value.trim(), new Date().toLocaleDateString()]);
                    this.render();
                    this.toast('✓ Data added');
                    this.closeModal();
                }
            };
        }
    }
    
    showEditModal(idx) {
        const row = this.data[idx];
        if (!row) return;
        
        this.modal(`
            <h3>Edit Data</h3>
            <input type="text" id="${this.id}-edit" class="pd-input" value="${row[1] || ''}">
            <div style="margin-top:15px;text-align:right">
                <button class="pd-btn" data-action="save-edit">Update</button>
            </div>
        `);
        
        document.getElementById(`${this.id}-edit`)?.focus();
        
        const saveBtn = document.querySelector('[data-action="save-edit"]');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const input = document.getElementById(`${this.id}-edit`);
                if (input?.value.trim()) {
                    this.data[idx][1] = input.value.trim();
                    this.render();
                    this.toast('✓ Data updated');
                    this.closeModal();
                }
            };
        }
    }
    
    delete(idx) {
        if (confirm('Delete this data?')) {
            this.data.splice(idx, 1);
            this.render();
            this.toast('✓ Data deleted');
        }
    }
    
    modal(content) {
        this.closeModal();
        const modal = document.createElement('div');
        modal.className = 'pd-modal';
        modal.innerHTML = `
            <div class="pd-modal-content">
                ${content}
                <button data-action="modal-close" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:20px;cursor:pointer">×</button>
            </div>
        `;
        document.body.appendChild(modal);
        this.dom.modal = modal;
    }
    
    closeModal() {
        if (this.dom.modal) {
            this.dom.modal.remove();
            this.dom.modal = null;
        }
    }
    
    toast(msg) {
        const toast = document.createElement('div');
        toast.className = 'pd-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // Public API
    updateData(newData) {
        this.data = Array.isArray(newData) ? newData : [];
        this.render();
    }
    
    addRow(row) {
        if (Array.isArray(row)) {
            this.data.push(row);
            this.render();
        }
    }
    
    exportCSV(filename = 'data.csv') {
        if (!this.filtered.length) return this.toast('⚠ No data');
        
        const csv = this.filtered.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    
    clearSelection() {
        this.state.selected.clear();
        this.updateUI();
    }
    
    destroy() {
        if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
        clearTimeout(this.state.searchTimeout);
        if (this.dom.wrapper?.parentNode) {
            this.dom.wrapper.parentNode.insertBefore(this.table, this.dom.wrapper);
            this.dom.wrapper.remove();
        }
        this.closeModal();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.PdTables = PdTables;
    window.pdTablesInstances = window.pdTablesInstances || new Map();
    
    // Auto-init
    const autoInit = () => {
        document.querySelectorAll('table[data-pdt]').forEach(table => {
            const dataSrc = table.dataset.src;
            if (dataSrc) {
                try {
                    const data = JSON.parse(dataSrc);
                    const instance = new PdTables(table, data, {
                        selectable: table.dataset.selectable === 'true',
                        searchable: true,
                        virtualScroll: true
                    });
                    window.pdTablesInstances.set(table, instance);
                } catch (e) {
                    console.error('PdTables init error:', e);
                }
            }
        });
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}
