/*!
 * PdTables v2.0 - API Integrated Virtual Table
 * Callback pattern - Flexible UI integration
 * (c) 2025 - License: MIT
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
            api: null, // { load, create, update, delete }
            autoLoad: false,
            columns: [], // [{ key: 'id', label: 'ID' }, ...]
            ...options
        };
        
        // Callbacks
        this.callbacks = {
            onAddClick: options.onAddClick || (() => {}),
            onEditClick: options.onEditClick || (() => {}),
            onDeleteClick: options.onDeleteClick || (() => {}),
            onSuccess: options.onSuccess || (() => {}),
            onError: options.onError || ((err) => console.error(err)),
            onLoad: options.onLoad || (() => {}),
            ...options.callbacks
        };
        
        this.state = {
            scrollTop: 0,
            searchText: '',
            selected: new Set(),
            searchTimeout: null,
            loading: false
        };
        
        this.dom = {};
        this.init();
    }
    
    async init() {
        this.injectCSS();
        this.createWrapper();
        this.createControls();
        this.createBody();
        this.attachEvents();
        
        if (this.config.autoLoad && this.config.api?.load) {
            await this.loadData();
        } else {
            this.render();
        }
    }
    
    injectCSS() {
        if (document.getElementById('pd-tables-css')) return;
        const style = document.createElement('style');
        style.id = 'pd-tables-css';
        style.textContent = `.pd-wrap{border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-family:system-ui,sans-serif;overflow:auto;position:relative}.pd-ctrl{padding:12px;background:#f7fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;flex-wrap:wrap}.pd-search{flex:1;min-width:200px;padding:8px 12px;border:1px solid #cbd5e0;border-radius:4px}.pd-btn{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-size:14px;transition:opacity .2s}.pd-btn:hover{opacity:.8}.pd-btn:disabled{opacity:.5;cursor:not-allowed}.pd-btn-add{background:#4299e1;color:#fff}.pd-btn-copy{background:#48bb78;color:#fff}.pd-btn-export{background:#9f7aea;color:#fff}.pd-count{background:#718096;color:#fff;padding:4px 10px;border-radius:12px;font-size:12px;margin-left:auto;display:none}.pd-table{width:100%;border-collapse:collapse}.pd-table th{background:#edf2f7;padding:12px;text-align:left;font-weight:600;position:sticky;top:0;z-index:1}.pd-table td{padding:12px;border-bottom:1px solid #e2e8f0}.pd-table input[type=checkbox]{cursor:pointer}.pd-act{padding:4px 8px;font-size:12px;margin:2px;border-radius:3px;border:none;cursor:pointer;transition:opacity .2s}.pd-act:hover{opacity:.8}.pd-edit{background:#fbbf24;color:#000}.pd-del{background:#f56565;color:#fff}.pd-loading{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;z-index:100}.pd-spinner{width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#4299e1;border-radius:50%;animation:pdSpin 1s linear infinite}.pd-striped tbody tr:nth-child(even){background:#fafafa}.pd-hover tbody tr:hover{background:#ebf8ff}@keyframes pdSpin{to{transform:rotate(360deg)}}`;
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
        
        if (this.config.selectable) {
            const btnCopy = document.createElement('button');
            btnCopy.className = 'pd-btn pd-btn-copy';
            btnCopy.innerHTML = '<span style="font-family:monospace">⎘</span> Copy';
            btnCopy.dataset.action = 'copy';
            ctrl.appendChild(btnCopy);
            
            this.dom.counter = document.createElement('span');
            this.dom.counter.className = 'pd-count';
            ctrl.appendChild(this.dom.counter);
        }
        
        const btnExport = document.createElement('button');
        btnExport.className = 'pd-btn pd-btn-export';
        btnExport.textContent = '↓ CSV';
        btnExport.dataset.action = 'export';
        ctrl.appendChild(btnExport);
        
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
            const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;
            if (action === 'add') this.handleAdd();
            if (action === 'copy') this.copySelected();
            if (action === 'export') this.exportCSV();
            if (action === 'edit') {
                const idx = parseInt(target.dataset.idx);
                const row = this.data[idx];
                this.handleEdit(idx, row);
            }
            if (action === 'delete') {
                const idx = parseInt(target.dataset.idx);
                const row = this.data[idx];
                this.handleDelete(idx, row);
            }
        });
    }
    
    // ==================== RENDERING ====================
    
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
                Object.values(row).some(cell => 
                    String(cell).toLowerCase().includes(this.state.searchText)
                )
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
                const id = row.id || row[0] || absIdx;
                const td = document.createElement('td');
                td.innerHTML = `<input type="checkbox" data-select="row" data-id="${id}" ${this.state.selected.has(id) ? 'checked' : ''}>`;
                tr.appendChild(td);
            }
            
            // Render cells based on columns config or auto-detect
            if (this.config.columns.length) {
                this.config.columns.forEach(col => {
                    const td = document.createElement('td');
                    const value = row[col.key];
                    if (this.state.searchText) {
                        td.innerHTML = this.highlight(value, this.state.searchText);
                    } else {
                        td.textContent = value;
                    }
                    tr.appendChild(td);
                });
            } else {
                // Auto-detect: render all properties or array items
                const values = Array.isArray(row) ? row : Object.values(row);
                values.forEach(cell => {
                    const td = document.createElement('td');
                    if (this.state.searchText) {
                        td.innerHTML = this.highlight(cell, this.state.searchText);
                    } else {
                        td.textContent = cell;
                    }
                    tr.appendChild(td);
                });
            }
            
            // Action buttons
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
    
    // ==================== SELECTION ====================
    
    selectAll(checked) {
        const visible = this.filtered.slice(
            Math.floor(this.state.scrollTop / this.config.rowHeight),
            Math.floor(this.state.scrollTop / this.config.rowHeight) + this.config.visibleRows
        );
        visible.forEach(row => {
            const id = row.id || row[0] || this.data.indexOf(row);
            checked ? this.state.selected.add(id) : this.state.selected.delete(id);
        });
        this.render();
    }
    
    updateUI() {
        if (this.config.selectable && this.dom.counter) {
            const count = this.state.selected.size;
            this.dom.counter.textContent = count ? `${count} selected` : '';
            this.dom.counter.style.display = count ? 'block' : 'none';
            
            const selectAll = this.table.querySelector('[data-select="all"]');
            if (selectAll) {
                const visibleChecks = this.dom.tbody.querySelectorAll('[data-select="row"]');
                const checkedCount = this.dom.tbody.querySelectorAll('[data-select="row"]:checked').length;
                selectAll.checked = visibleChecks.length > 0 && checkedCount === visibleChecks.length;
                selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleChecks.length;
            }
        }
    }
    
    copySelected() {
        const selected = this.data.filter(row => {
            const id = row.id || row[0] || this.data.indexOf(row);
            return this.state.selected.has(id);
        });
        
        if (!selected.length) {
            this.callbacks.onError('No data selected');
            return;
        }
        
        const text = selected.map(row => 
            (Array.isArray(row) ? row : Object.values(row)).join('\t')
        ).join('\n');
        
        navigator.clipboard.writeText(text)
            .then(() => this.callbacks.onSuccess(`${selected.length} rows copied`))
            .catch(() => this.callbacks.onError('Copy failed'));
    }
    
    // ==================== CRUD HANDLERS ====================
    
    handleAdd() {
        this.callbacks.onAddClick((newData) => {
            if (this.config.api?.create) {
                this.createRow(newData);
            } else {
                this.data.push(newData);
                this.render();
                this.callbacks.onSuccess('Data added');
            }
        });
    }
    
    handleEdit(index, rowData) {
        this.callbacks.onEditClick(index, rowData, (updatedData) => {
            if (this.config.api?.update) {
                this.updateRow(index, updatedData);
            } else {
                this.data[index] = updatedData;
                this.render();
                this.callbacks.onSuccess('Data updated');
            }
        });
    }
    
    handleDelete(index, rowData) {
        this.callbacks.onDeleteClick(index, rowData, (confirmed) => {
            if (!confirmed) return;
            
            if (this.config.api?.delete) {
                this.deleteRow(index, rowData);
            } else {
                this.data.splice(index, 1);
                this.render();
                this.callbacks.onSuccess('Data deleted');
            }
        });
    }
    
    // ==================== API METHODS ====================
    
    async loadData() {
        if (!this.config.api?.load) return;
        
        this.showLoading(true);
        try {
            const response = await fetch(this.config.api.load);
            if (!response.ok) throw new Error('Load failed');
            
            const data = await response.json();
            this.data = Array.isArray(data) ? data : [];
            this.filtered = [...this.data];
            this.render();
            this.callbacks.onLoad(this.data);
        } catch (error) {
            this.callbacks.onError('Failed to load data: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async createRow(newData) {
        if (!this.config.api?.create) return;
        
        this.showLoading(true);
        try {
            const response = await fetch(this.config.api.create, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            
            if (!response.ok) throw new Error('Create failed');
            
            const result = await response.json();
            this.data.push(result.data || newData);
            this.render();
            this.callbacks.onSuccess('Data created successfully');
        } catch (error) {
            this.callbacks.onError('Failed to create: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async updateRow(index, updatedData) {
        if (!this.config.api?.update) return;
        
        const row = this.data[index];
        const id = row.id || row[0];
        const url = this.config.api.update.replace(':id', id);
        
        this.showLoading(true);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) throw new Error('Update failed');
            
            this.data[index] = updatedData;
            this.render();
            this.callbacks.onSuccess('Data updated successfully');
        } catch (error) {
            this.callbacks.onError('Failed to update: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async deleteRow(index, rowData) {
        if (!this.config.api?.delete) return;
        
        const id = rowData.id || rowData[0];
        const url = this.config.api.delete.replace(':id', id);
        
        this.showLoading(true);
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
            
            this.data.splice(index, 1);
            this.render();
            this.callbacks.onSuccess('Data deleted successfully');
        } catch (error) {
            this.callbacks.onError('Failed to delete: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    // ==================== UTILITIES ====================
    
    showLoading(show) {
        this.state.loading = show;
        
        if (show && !this.dom.loading) {
            this.dom.loading = document.createElement('div');
            this.dom.loading.className = 'pd-loading';
            this.dom.loading.innerHTML = '<div class="pd-spinner"></div>';
            this.dom.wrapper.appendChild(this.dom.loading);
        } else if (!show && this.dom.loading) {
            this.dom.loading.remove();
            this.dom.loading = null;
        }
    }
    
    exportCSV(filename = 'data.csv') {
        if (!this.filtered.length) {
            this.callbacks.onError('No data to export');
            return;
        }
        
        const rows = this.filtered.map(row => {
            const values = Array.isArray(row) ? row : Object.values(row);
            return values.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
        });
        
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        this.callbacks.onSuccess('CSV exported');
    }
    
    // ==================== PUBLIC API ====================
    
    refresh() {
        if (this.config.api?.load) {
            this.loadData();
        } else {
            this.render();
        }
    }
    
    updateData(newData) {
        this.data = Array.isArray(newData) ? newData : [];
        this.filtered = [...this.data];
        this.render();
    }
    
    addRow(row) {
        if (Array.isArray(row) || typeof row === 'object') {
            this.data.push(row);
            this.render();
        }
    }
    
    clearSelection() {
        this.state.selected.clear();
        this.updateUI();
    }
    
    getSelectedData() {
        return this.data.filter(row => {
            const id = row.id || row[0] || this.data.indexOf(row);
            return this.state.selected.has(id);
        });
    }
    
    destroy() {
        if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
        clearTimeout(this.state.searchTimeout);
        if (this.dom.wrapper?.parentNode) {
            this.dom.wrapper.parentNode.insertBefore(this.table, this.dom.wrapper);
            this.dom.wrapper.remove();
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.PdTables = PdTables;
}
