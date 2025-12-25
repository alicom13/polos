/*!
 * PdTables v1.0.0 - Virtual Table Ringan + CRUD + Checkbox
 * (c) 2025 - Single File Solution
 * License: MIT
 */

class PdTables {
    constructor(table, data, options = {}) {
        this.table = typeof table === 'string' ? document.querySelector(table) : table;
        this.dataAsli = Array.isArray(data) ? data : [];
        this.dataTersaring = [...this.dataAsli];
        
        this.config = {
            tinggi: 400,
            lebarBaris: 42,
            barisTampil: 25,
            virtualScroll: true,
            bisaCari: true,
            bisaPilih: false,
            ...options
        };
        
        this.state = {
            halaman: 0,
            scrollAtas: 0,
            teksCari: '',
            terpilih: new Set()
        };
        
        this.dom = {};
        this.init();
    }
    
    init() {
        this.buatCSS();
        this.buatPembungkus();
        this.buatKontrol();
        this.buatBadan();
        this.pasangEvent();
        this.render();
    }
    
    buatCSS() {
        if (!document.querySelector('#pd-tables-css')) {
            const style = document.createElement('style');
            style.id = 'pd-tables-css';
            style.textContent = `
                .pd-wrapper { border:1px solid #e2e8f0; border-radius:6px; background:white; font-family:sans-serif; }
                .pd-kontrol { padding:12px; background:#f7fafc; border-bottom:1px solid #e2e8f0; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
                .pd-cari { flex:1; min-width:200px; padding:8px 12px; border:1px solid #cbd5e0; border-radius:4px; }
                .pd-btn { padding:8px 16px; border:none; border-radius:4px; cursor:pointer; font-size:14px; }
                .pd-btn-tambah { background:#4299e1; color:white; }
                .pd-btn-copy { background:#48bb78; color:white; }
                .pd-counter { background:#718096; color:white; padding:2px 8px; border-radius:10px; font-size:12px; display:none; margin-left:auto; }
                .pd-table { width:100%; border-collapse:collapse; }
                .pd-table th { background:#edf2f7; padding:12px; text-align:left; font-weight:600; }
                .pd-table td { padding:12px; border-bottom:1px solid #e2e8f0; }
                .pd-table input[type="checkbox"] { cursor:pointer; }
                .pd-btn-aksi { padding:4px 8px; font-size:12px; margin:2px; border-radius:3px; border:none; cursor:pointer; }
                .pd-btn-edit { background:#fbbf24; color:#000; }
                .pd-btn-hapus { background:#f56565; color:white; }
                .pd-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
                .pd-modal-content { background:white; padding:20px; border-radius:8px; min-width:300px; max-width:500px; }
                .pd-input { width:100%; padding:8px; margin:8px 0; border:1px solid #cbd5e0; border-radius:4px; }
                .pd-toast { position:fixed; bottom:20px; right:20px; background:#2d3748; color:white; padding:12px 24px; border-radius:6px; animation:pdFadeOut 3s; }
                @keyframes pdFadeOut { 0%,70% { opacity:1; } 100% { opacity:0; } }
                .pd-bergaris tr:nth-child(even) { background:#fafafa; }
                .pd-hover tr:hover { background:#ebf8ff; }
            `;
            document.head.appendChild(style);
        }
    }
    
    buatPembungkus() {
        this.dom.wrapper = document.createElement('div');
        this.dom.wrapper.className = 'pd-wrapper';
        this.dom.wrapper.style.height = `${this.config.tinggi}px`;
        this.table.parentNode.insertBefore(this.dom.wrapper, this.table);
        this.dom.wrapper.appendChild(this.table);
        this.table.classList.add('pd-table');
        if (this.config.bergaris) this.table.classList.add('pd-bergaris');
        if (this.config.hover) this.table.classList.add('pd-hover');
    }
    
    buatKontrol() {
        const kontrol = document.createElement('div');
        kontrol.className = 'pd-kontrol';
        
        // Pencarian
        if (this.config.bisaCari) {
            this.dom.pencarian = document.createElement('input');
            this.dom.pencarian.type = 'text';
            this.dom.pencarian.className = 'pd-cari';
            this.dom.pencarian.placeholder = 'Cari...';
            kontrol.appendChild(this.dom.pencarian);
        }
        
        // Tombol Tambah
        const btnTambah = document.createElement('button');
        btnTambah.className = 'pd-btn pd-btn-tambah';
        btnTambah.textContent = '+ Tambah Data';
        btnTambah.onclick = () => this.tambahForm();
        kontrol.appendChild(btnTambah);
        
        // Tombol Copy Terpilih
        const btnCopy = document.createElement('button');
        btnCopy.className = 'pd-btn pd-btn-copy';
        btnCopy.textContent = '📋 Copy Terpilih';
        btnCopy.onclick = () => this.copyTerpilih();
        kontrol.appendChild(btnCopy);
        
        // Counter
        this.dom.counter = document.createElement('span');
        this.dom.counter.className = 'pd-counter';
        kontrol.appendChild(this.dom.counter);
        
        this.dom.wrapper.insertBefore(kontrol, this.table);
    }
    
    buatBadan() {
        if (!this.table.tBodies.length) this.table.createTBody();
        this.dom.tbody = this.table.tBodies[0];
        
        // Header checkbox jika bisa pilih
        if (this.config.bisaPilih && this.table.tHead) {
            const header = this.table.tHead.rows[0];
            const th = document.createElement('th');
            th.style.width = '50px';
            th.innerHTML = '<input type="checkbox" id="pd-select-all" title="Pilih semua di halaman ini">';
            header.insertBefore(th, header.firstChild);
        }
        
        // Spacer untuk virtual scroll
        if (this.config.virtualScroll) {
            this.dom.spacer = document.createElement('div');
            this.dom.spacer.className = 'pd-spacer';
            this.dom.wrapper.appendChild(this.dom.spacer);
        }
    }
    
    pasangEvent() {
        // Virtual scroll
        if (this.config.virtualScroll) {
            this.dom.wrapper.addEventListener('scroll', (e) => {
                this.state.scrollAtas = e.target.scrollTop;
                this.render();
            });
        }
        
        // Pencarian
        if (this.config.bisaCari && this.dom.pencarian) {
            this.dom.pencarian.addEventListener('input', (e) => {
                this.state.teksCari = e.target.value.toLowerCase();
                this.render();
            });
        }
        
        // Event delegation untuk checkbox
        this.dom.wrapper.addEventListener('change', (e) => {
            if (e.target.id === 'pd-select-all') {
                this.selectAllPage(e.target.checked);
            }
            if (e.target.classList.contains('pd-row-check')) {
                const id = e.target.dataset.id;
                e.target.checked ? this.state.terpilih.add(id) : this.state.terpilih.delete(id);
                this.updateUI();
            }
        });
    }
    
    render() {
        // Filter data
        this.filterData();
        
        // Hitung range virtual
        const start = this.config.virtualScroll ? 
            Math.floor(this.state.scrollAtas / this.config.lebarBaris) : 0;
        const end = start + this.config.barisTampil;
        
        // Ambil data untuk ditampilkan
        this.dataTampil = this.dataTersaring.slice(start, end);
        
        // Render table
        this.renderTable(start);
        
        // Update UI
        this.updateUI();
    }
    
    filterData() {
        if (this.state.teksCari) {
            this.dataTersaring = this.dataAsli.filter(row => 
                row.some(cell => String(cell).toLowerCase().includes(this.state.teksCari))
            );
        } else {
            this.dataTersaring = [...this.dataAsli];
        }
    }
    
    renderTable(startIndex) {
        this.dom.tbody.innerHTML = '';
        
        this.dataTampil.forEach((row, idxRelatif) => {
            const idxAbsolut = startIndex + idxRelatif;
            const tr = document.createElement('tr');
            
            // Checkbox jika bisa pilih
            if (this.config.bisaPilih) {
                const id = row[0] || idxAbsolut;
                const td = document.createElement('td');
                td.innerHTML = `
                    <input type="checkbox" class="pd-row-check" 
                           data-id="${id}"
                           ${this.state.terpilih.has(id) ? 'checked' : ''}>
                `;
                tr.appendChild(td);
            }
            
            // Data cells
            row.forEach((cell, colIdx) => {
                const td = document.createElement('td');
                if (colIdx === 1 && this.state.teksCari) {
                    // Highlight hasil pencarian
                    td.innerHTML = this.highlight(cell, this.state.teksCari);
                } else {
                    td.textContent = cell;
                }
                tr.appendChild(td);
            });
            
            // Action buttons
            const tdAksi = document.createElement('td');
            tdAksi.innerHTML = `
                <button class="pd-btn-aksi pd-btn-edit" onclick="pdTablesInstance.edit(${idxAbsolut})">Edit</button>
                <button class="pd-btn-aksi pd-btn-hapus" onclick="pdTablesInstance.hapus(${idxAbsolut})">Hapus</button>
            `;
            tr.appendChild(tdAksi);
            
            this.dom.tbody.appendChild(tr);
        });
        
        // Update virtual scroll spacer
        if (this.config.virtualScroll) {
            this.dom.spacer.style.height = `${this.dataTersaring.length * this.config.lebarBaris}px`;
            this.dom.tbody.style.transform = `translateY(${startIndex * this.config.lebarBaris}px)`;
        }
    }
    
    highlight(text, query) {
        if (!query || !text) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return String(text).replace(regex, '<mark style="background:#fefcbf">$1</mark>');
    }
    
    // ===== CHECKBOX SYSTEM =====
    selectAllPage(checked) {
        const ids = this.dataTampil.map(row => row[0] || this.dataTersaring.indexOf(row));
        ids.forEach(id => {
            checked ? this.state.terpilih.add(id) : this.state.terpilih.delete(id);
        });
        this.updateUI();
    }
    
    updateUI() {
        // Update counter
        const count = this.state.terpilih.size;
        this.dom.counter.textContent = count ? `${count} data terpilih` : '';
        this.dom.counter.style.display = count ? 'inline-block' : 'none';
        
        // Update select-all checkbox
        const selectAll = document.getElementById('pd-select-all');
        if (selectAll) {
            const ids = this.dataTampil.map(row => row[0] || this.dataTersaring.indexOf(row));
            selectAll.checked = ids.every(id => this.state.terpilih.has(id));
            selectAll.indeterminate = ids.some(id => this.state.terpilih.has(id)) && 
                                      !ids.every(id => this.state.terpilih.has(id));
        }
    }
    
    getDataTerpilih() {
        return this.dataAsli.filter(row => {
            const id = row[0] || this.dataAsli.indexOf(row);
            return this.state.terpilih.has(id);
        });
    }
    
    copyTerpilih() {
        const data = this.getDataTerpilih();
        if (data.length === 0) {
            this.toast('⚠️ Pilih data dulu!');
            return;
        }
        
        const text = data.map(row => row.join('\t')).join('\n');
        navigator.clipboard.writeText(text)
            .then(() => this.toast(`✅ ${data.length} data dicopy`))
            .catch(() => this.toast('❌ Gagal copy'));
    }
    
    // ===== CRUD =====
    tambahForm() {
        this.modal(`
            <h3>Tambah Data Baru</h3>
            <input type="text" id="pd-input-baru" class="pd-input" placeholder="Masukkan data...">
            <div style="margin-top:15px; text-align:right;">
                <button class="pd-btn" onclick="pdTablesInstance.simpanBaru()">Simpan</button>
            </div>
        `, 'pd-modal-tambah');
    }
    
    simpanBaru() {
        const input = document.getElementById('pd-input-baru');
        if (input.value.trim()) {
            const newData = [
                Date.now(),
                input.value.trim(),
                new Date().toLocaleDateString('id-ID')
            ];
            this.dataAsli.push(newData);
            this.render();
            this.toast('✅ Data ditambahkan');
            this.closeModal('pd-modal-tambah');
        }
    }
    
    edit(index) {
        if (this.dataAsli[index]) {
            const data = this.dataAsli[index];
            this.modal(`
                <h3>Edit Data</h3>
                <input type="text" id="pd-input-edit" class="pd-input" value="${data[1] || ''}">
                <div style="margin-top:15px; text-align:right;">
                    <button class="pd-btn" onclick="pdTablesInstance.simpanEdit(${index})">Update</button>
                </div>
            `, 'pd-modal-edit');
        }
    }
    
    simpanEdit(index) {
        const input = document.getElementById('pd-input-edit');
        if (input.value.trim() && this.dataAsli[index]) {
            this.dataAsli[index][1] = input.value.trim();
            this.render();
            this.toast('✅ Data diupdate');
            this.closeModal('pd-modal-edit');
        }
    }
    
    hapus(index) {
        if (confirm('Yakin hapus data ini?')) {
            this.dataAsli.splice(index, 1);
            this.render();
            this.toast('✅ Data dihapus');
        }
    }
    
    // ===== UTILITIES =====
    modal(content, id = 'pd-modal') {
        this.closeModal(id);
        
        const modal = document.createElement('div');
        modal.className = 'pd-modal';
        modal.id = id;
        modal.innerHTML = `
            <div class="pd-modal-content">
                ${content}
                <button onclick="this.closest('.pd-modal').remove()" 
                        style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:20px; cursor:pointer;">
                    ×
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    closeModal(id) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
    }
    
    toast(message) {
        const toast = document.createElement('div');
        toast.className = 'pd-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ===== PUBLIC API =====
    updateData(newData) {
        this.dataAsli = Array.isArray(newData) ? newData : [];
        this.render();
    }
    
    tambahData(item) {
        if (Array.isArray(item)) {
            this.dataAsli.push(item);
            this.render();
        }
    }
    
    exportCSV(filename = 'data.csv') {
        const data = this.dataTersaring;
        if (data.length === 0) {
            this.toast('⚠️ Tidak ada data');
            return;
        }
        
        let csv = 'ID,Nama,Tanggal\n';
        data.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    
    clearSelection() {
        this.state.terpilih.clear();
        this.updateUI();
    }
    
    destroy() {
        if (this.dom.wrapper && this.dom.wrapper.parentNode) {
            this.dom.wrapper.parentNode.insertBefore(this.table, this.dom.wrapper);
            this.dom.wrapper.parentNode.removeChild(this.dom.wrapper);
        }
        this.table.classList.remove('pd-table', 'pd-bergaris', 'pd-hover');
    }
}

// Auto-initialize dan export global
if (typeof window !== 'undefined') {
    window.PdTables = PdTables;
    
    // Auto-init untuk table dengan data-pdt
    window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('table[data-pdt]').forEach(table => {
            const dataSrc = table.dataset.src;
            if (dataSrc) {
                try {
                    const data = JSON.parse(dataSrc);
                    window.pdTablesInstance = new PdTables(table, data, {
                        bisaPilih: table.dataset.selectable === 'true',
                        bisaCari: true,
                        virtualScroll: true
                    });
                } catch (e) {
                    console.error('PdTables: Gagal parse data', e);
                }
            }
        });
    });
}
