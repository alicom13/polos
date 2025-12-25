/**
 * PdTables v1.0.0 - Virtual Table Ringan
 * by @pd
 * MIT License
 */

class PdTables {
    constructor(table, data, options = {}) {
        // Validation
        if (!table) throw new Error('PdTables: Element table diperlukan');
        this.table = typeof table === 'string' ? document.querySelector(table) : table;
        if (!this.table) throw new Error('PdTables: Table tidak ditemukan');
        
        // Configuration
        this.config = {
            tinggi: 400,
            lebarBaris: 42,
            barisTampil: 25,
            ukuranHalaman: 50,
            virtualScroll: true,
            bisaSortir: true,
            bisaCari: true,
            bisaPilih: false,
            bergaris: true,
            hover: true,
            headerTetap: true,
            placeholderCari: 'Cari...',
            teksKosong: 'Tidak ada data',
            teksMemuat: 'Memuat...',
            ...options
        };
        
        // Data
        this.dataAsli = Array.isArray(data) ? data : [];
        this.dataTersaring = [...this.dataAsli];
        this.dataTampil = [];
        
        // State
        this.state = {
            halaman: 0,
            totalHalaman: 0,
            scrollAtas: 0,
            kolomSortir: null,
            arahSortir: 'naik',
            teksCari: '',
            barisTerpilih: new Set()
        };
        
        // DOM
        this.dom = {
            pembungkus: null,
            pencarian: null,
            badan: null,
            spacer: null,
            footer: null,
            info: null,
            pagination: null
        };
        
        this.init();
    }
    
    init() {
        this.buatPembungkus();
        this.buatKontrol();
        this.buatBadan();
        this.buatFooter();
        this.pasangEvent();
        this.render();
    }
    
    buatPembungkus() {
        // Hapus wrapper lama jika ada
        if (this.table.parentNode.classList.contains('pd-wrapper')) {
            this.table.parentNode.remove();
        }
        
        this.dom.pembungkus = document.createElement('div');
        this.dom.pembungkus.className = 'pd-wrapper';
        this.dom.pembungkus.style.height = `${this.config.tinggi}px`;
        
        // Sisipkan wrapper
        this.table.parentNode.insertBefore(this.dom.pembungkus, this.table);
        this.dom.pembungkus.appendChild(this.table);
        
        // Tambah class ke table
        this.table.classList.add('pd-table');
        if (this.config.bergaris) this.table.classList.add('pd-bergaris');
        if (this.config.hover) this.table.classList.add('pd-hover');
        if (this.config.headerTetap) this.table.classList.add('pd-header-tetap');
    }
    
    buatKontrol() {
        // Kontainer kontrol
        const kontrol = document.createElement('div');
        kontrol.className = 'pd-kontrol';
        
        // Input pencarian
        if (this.config.bisaCari) {
            this.dom.pencarian = document.createElement('input');
            this.dom.pencarian.type = 'text';
            this.dom.pencarian.className = 'pd-cari';
            this.dom.pencarian.placeholder = this.config.placeholderCari;
            this.dom.pencarian.autocomplete = 'off';
            kontrol.appendChild(this.dom.pencarian);
        }
        
        this.dom.pembungkus.insertBefore(kontrol, this.table);
    }
    
    buatBadan() {
        // Pastikan tbody ada
        if (!this.table.tBodies.length) {
            this.table.createTBody();
        }
        
        this.dom.badan = this.table.tBodies[0];
        
        // Spacer untuk virtual scroll
        if (this.config.virtualScroll) {
            this.dom.spacer = document.createElement('div');
            this.dom.spacer.className = 'pd-spacer';
            this.dom.pembungkus.appendChild(this.dom.spacer);
        }
    }
    
    buatFooter() {
        this.dom.footer = document.createElement('div');
        this.dom.footer.className = 'pd-footer';
        
        // Info
        this.dom.info = document.createElement('div');
        this.dom.info.className = 'pd-info';
        this.dom.footer.appendChild(this.dom.info);
        
        this.dom.pembungkus.appendChild(this.dom.footer);
    }
    
    pasangEvent() {
        // Scroll virtual
        if (this.config.virtualScroll) {
            this.dom.pembungkus.addEventListener('scroll', (e) => {
                this.state.scrollAtas = e.target.scrollTop;
                this.render();
            });
        }
        
        // Pencarian
        if (this.config.bisaCari && this.dom.pencarian) {
            this.dom.pencarian.addEventListener('input', (e) => {
                this.state.teksCari = e.target.value.toLowerCase();
                this.state.halaman = 0;
                this.render();
            });
        }
        
        // Sortir header
        if (this.config.bisaSortir && this.table.tHead) {
            const headers = this.table.tHead.rows[0].cells;
            Array.from(headers).forEach((th, index) => {
                th.classList.add('pd-bisa-sortir');
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => this.sortirKolom(index));
            });
        }
    }
    
    render() {
        // Update data tersaring
        this.updateDataTersaring();
        
        // Hitung pagination jika perlu
        this.hitungPagination();
        
        // Ambil data untuk ditampilkan
        this.ambilDataTampil();
        
        // Kosongkan badan tabel
        this.dom.badan.innerHTML = '';
        
        // Render baris
        this.renderBaris();
        
        // Update info
        this.updateInfo();
        
        // Update posisi scroll virtual
        if (this.config.virtualScroll) {
            this.updateSpacer();
            this.dom.badan.style.transform = `translateY(${this.awalIndex() * this.config.lebarBaris}px)`;
        }
    }
    
    updateDataTersaring() {
        if (!this.state.teksCari) {
            this.dataTersaring = [...this.dataAsli];
        } else {
            this.dataTersaring = this.dataAsli.filter(baris => {
                return baris.some(sel => 
                    String(sel).toLowerCase().includes(this.state.teksCari)
                );
            });
        }
        
        // Apply sortir jika ada
        if (this.state.kolomSortir !== null) {
            this.sortirData();
        }
    }
    
    sortirData() {
        const kolom = this.state.kolomSortir;
        const arah = this.state.arahSortir === 'naik' ? 1 : -1;
        
        this.dataTersaring.sort((a, b) => {
            const valA = a[kolom];
            const valB = b[kolom];
            
            // Coba numeric
            const numA = Number(valA);
            const numB = Number(valB);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return arah * (numA - numB);
            }
            
            // String compare
            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            return arah * strA.localeCompare(strB);
        });
    }
    
    sortirKolom(index) {
        if (this.state.kolomSortir === index) {
            this.state.arahSortir = this.state.arahSortir === 'naik' ? 'turun' : 'naik';
        } else {
            this.state.kolomSortir = index;
            this.state.arahSortir = 'naik';
        }
        
        // Update indikator sortir
        this.updateIndikatorSortir();
        
        // Sortir dan render
        this.sortirData();
        this.render();
    }
    
    updateIndikatorSortir() {
        if (!this.table.tHead) return;
        
        const headers = this.table.tHead.rows[0].cells;
        
        // Hapus semua indikator
        Array.from(headers).forEach(th => {
            th.classList.remove('pd-sortir-naik', 'pd-sortir-turun');
        });
        
        // Tambah indikator ke kolom aktif
        if (this.state.kolomSortir !== null) {
            const th = headers[this.state.kolomSortir];
            th.classList.add(`pd-sortir-${this.state.arahSortir}`);
        }
    }
    
    ambilDataTampil() {
        const awal = this.awalIndex();
        const akhir = this.akhirIndex();
        this.dataTampil = this.dataTersaring.slice(awal, akhir);
    }
    
    awalIndex() {
        if (this.config.virtualScroll) {
            return Math.floor(this.state.scrollAtas / this.config.lebarBaris);
        }
        return this.state.halaman * this.config.ukuranHalaman;
    }
    
    akhirIndex() {
        const awal = this.awalIndex();
        
        if (this.config.virtualScroll) {
            return awal + this.config.barisTampil + 5; // Buffer
        }
        
        return Math.min(awal + this.config.ukuranHalaman, this.dataTersaring.length);
    }
    
    renderBaris() {
        const fragment = document.createDocumentFragment();
        
        this.dataTampil.forEach((barisData, indexRelatif) => {
            const indexAbsolut = this.awalIndex() + indexRelatif;
            const tr = this.buatBaris(barisData, indexAbsolut);
            fragment.appendChild(tr);
        });
        
        this.dom.badan.appendChild(fragment);
    }
    
    buatBaris(barisData, index) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;
        
        // Warna bergaris
        if (this.config.bergaris && index % 2 === 0) {
            tr.classList.add('pd-genap');
        }
        
        // Buat sel
        barisData.forEach((isiSel, indexSel) => {
            const td = document.createElement('td');
            
            // Highlight pencarian
            if (this.state.teksCari) {
                td.innerHTML = this.highlightTeks(isiSel, this.state.teksCari);
            } else {
                td.textContent = isiSel;
            }
            
            tr.appendChild(td);
        });
        
        return tr;
    }
    
    highlightTeks(teks, query) {
        if (!query || !teks) return teks;
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return String(teks).replace(regex, '<mark class="pd-highlight">$1</mark>');
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    hitungPagination() {
        this.state.totalHalaman = Math.ceil(this.dataTersaring.length / this.config.ukuranHalaman);
        
        if (this.state.halaman >= this.state.totalHalaman) {
            this.state.halaman = Math.max(0, this.state.totalHalaman - 1);
        }
    }
    
    updateInfo() {
        if (!this.dom.info) return;
        
        const total = this.dataTersaring.length;
        const awal = this.awalIndex() + 1;
        const akhir = Math.min(this.akhirIndex(), total);
        
        if (total === 0) {
            this.dom.info.textContent = this.config.teksKosong;
        } else {
            this.dom.info.textContent = 
                `Menampilkan ${awal}-${akhir} dari ${total} data`;
            
            if (this.state.teksCari && this.dataTersaring.length !== this.dataAsli.length) {
                this.dom.info.textContent += ` (disaring dari ${this.dataAsli.length})`;
            }
        }
    }
    
    updateSpacer() {
        if (!this.dom.spacer) return;
        const tinggiTotal = this.dataTersaring.length * this.config.lebarBaris;
        this.dom.spacer.style.height = `${tinggiTotal}px`;
    }
    
    // ============ PUBLIC API ============
    
    updateData(dataBaru) {
        if (!Array.isArray(dataBaru)) {
            console.error('PdTables: Data harus array');
            return;
        }
        
        this.dataAsli = dataBaru;
        this.dataTersaring = [...dataBaru];
        this.state.halaman = 0;
        this.state.teksCari = '';
        this.state.barisTerpilih.clear();
        
        if (this.dom.pencarian) {
            this.dom.pencarian.value = '';
        }
        
        this.render();
    }
    
    tambahBaris(barisData) {
        if (!Array.isArray(barisData)) {
            console.error('PdTables: Baris harus array');
            return;
        }
        
        this.dataAsli.push(barisData);
        this.dataTersaring.push(barisData);
        this.render();
    }
    
    hapusBaris(index) {
        if (index < 0 || index >= this.dataAsli.length) {
            console.error('PdTables: Index tidak valid');
            return;
        }
        
        this.dataAsli.splice(index, 1);
        this.dataTersaring = [...this.dataAsli];
        this.state.barisTerpilih.delete(index);
        this.render();
    }
    
    keHalaman(halaman) {
        if (halaman < 0 || halaman >= this.state.totalHalaman) return;
        
        this.state.halaman = halaman;
        
        if (this.dom.pembungkus) {
            this.dom.pembungkus.scrollTop = 0;
            this.state.scrollAtas = 0;
        }
        
        this.render();
    }
    
    eksporCSV(namaFile = 'data.csv') {
        if (this.dataTersaring.length === 0) return;
        
        let csv = '';
        
        // Header
        if (this.table.tHead) {
            const headers = Array.from(this.table.tHead.rows[0].cells)
                .map(th => `"${th.textContent}"`)
                .join(',');
            csv += headers + '\n';
        }
        
        // Data
        this.dataTersaring.forEach(baris => {
            const barisCSV = baris.map(sel => 
                `"${String(sel).replace(/"/g, '""')}"`
            ).join(',');
            csv += barisCSV + '\n';
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = namaFile;
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    refresh() {
        this.render();
    }
    
    destroy() {
        if (this.dom.pembungkus && this.dom.pembungkus.parentNode) {
            this.dom.pembungkus.parentNode.insertBefore(this.table, this.dom.pembungkus);
            this.dom.pembungkus.parentNode.removeChild(this.dom.pembungkus);
        }
        
        this.table.classList.remove('pd-table', 'pd-bergaris', 'pd-hover', 'pd-header-tetap');
    }
    
    getStats() {
        return {
            totalBaris: this.dataAsli.length,
            barisTersaring: this.dataTersaring.length,
            barisTampil: this.dataTampil.length,
            halaman: this.state.halaman,
            totalHalaman: this.state.totalHalaman,
            kolomSortir: this.state.kolomSortir,
            arahSortir: this.state.arahSortir
        };
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.PdTables = PdTables;
    
    // Auto-init dengan atribut data
    window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('table[data-pdt]').forEach(table => {
            const dataSrc = table.dataset.src;
            if (dataSrc) {
                try {
                    const data = JSON.parse(dataSrc);
                    new PdTables(table, data);
                } catch (e) {
                    console.error('PdTables: Gagal parse data', e);
                }
            }
        });
    });
}
