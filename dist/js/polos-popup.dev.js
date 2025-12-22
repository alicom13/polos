<script>
(function(){
'use strict';

// ==================== CSS ====================
if(!document.querySelector('#polos-popup-css')){
    const css=document.createElement('style');
    css.id='polos-popup-css';
    css.textContent=`
    /* ===== Modal & Popup ===== */
    .popup{position:fixed;top:0;left:0;width:100%;height:100%;display:none;justify-content:center;align-items:center;background:rgba(0,0,0,0.5);z-index:1000;pointer-events:none;}
    .popup.active{display:flex;pointer-events:auto;}
    .popup-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);opacity:0;transition:opacity .3s;}
    .popup.active .popup-backdrop{opacity:1;}
    .pop{background:#fff;border-radius:12px;max-width:90%;max-height:90%;overflow:hidden;transform:translateY(-20px);opacity:0;transition:transform .3s ease,opacity .3s ease;position:relative;}
    .popup.active .pop{transform:translateY(0);opacity:1;}
    .pop-sm{width:400px;}.pop-md{width:600px;}.pop-lg{width:800px;}.pop-xl{width:1000px;}
    .pop-hd{padding:1.5rem;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;background:#f8f9fa;}
    .pop-title{margin:0;font-size:1.25rem;font-weight:600;color:#1a1a1a;}
    .pop-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#6b7280;position:absolute;top:10px;right:10px;z-index:10;}
    .pop-close:hover{color:#374151;}
    .pop-bd{padding:1.5rem;max-height:60vh;overflow-y:auto;}
    .pop-ft{padding:1rem 1.5rem;border-top:1px solid #e9ecef;display:flex;justify-content:flex-end;gap:.75rem;background:#f8f9fa;}

    /* ===== Alert ===== */
    .pa-container{position:fixed;top:20px;right:20px;display:flex;flex-direction:column;gap:10px;z-index:1100;max-width:95%;}
    .pa{padding:12px 16px;border-radius:8px;color:#fff;opacity:0;transform:translateY(-20px);transition:opacity .3s,transform .3s;display:flex;justify-content:space-between;align-items:center;}
    .pa.active{opacity:1;transform:translateY(0);}
    .pa.s{background:#16a34a;}
    .pa.e{background:#dc2626;}
    .pa.i{background:#2563eb;}
    .pa.w{background:#d97706;}
    .pa .pa-close{margin-left:10px;background:none;border:none;color:#fff;font-size:16px;cursor:pointer;}

    /* ===== Toast ===== */
    .pt-container{position:fixed;top:20px;right:20px;display:flex;flex-direction:column;gap:10px;z-index:1200;max-width:95%;}
    .pt{padding:12px 16px;border-radius:8px;color:#374151;background:#fff;box-shadow:0 10px 25px rgba(0,0,0,.15);opacity:0;transform:translateY(-20px);transition:opacity .3s,transform .3s;display:flex;justify-content:space-between;align-items:center;position:relative;}
    .pt.active{opacity:1;transform:translateY(0);}
    .pt .pt-close{background:none;border:none;color:#9ca3af;font-size:16px;cursor:pointer;margin-left:10px;}
    .pt-b{position:absolute;bottom:0;left:0;width:100%;height:3px;overflow:hidden;}
    .pt-p{height:100%;width:100%;animation:ptBar linear forwards;transform-origin:left;}
    .pt.s .pt-p{background:#16a34a;}
    .pt.e .pt-p{background:#dc2626;}
    .pt.i .pt-p{background:#2563eb;}
    .pt.w .pt-p{background:#d97706;}
    .pt:hover .pt-p{animation-play-state:paused;}
    @keyframes ptBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}

    @media(max-width:600px){
        .pop{width:90% !important;}
        .pa-container,.pt-container{right:10px;left:10px;top:10px;}
    }
    `;
    document.head.appendChild(css);
}

// ==================== Containers ====================
let paContainer=document.querySelector('.pa-container');
if(!paContainer){paContainer=document.createElement('div');paContainer.className='pa-container';document.body.appendChild(paContainer);}
let ptContainer=document.querySelector('.pt-container');
if(!ptContainer){ptContainer=document.createElement('div');ptContainer.className='pt-container';document.body.appendChild(ptContainer);}

// ==================== Utils ====================
function generateId(prefix='pop-'){return prefix+Date.now()+'-'+Math.random().toString(36).slice(2,11);}
function removeElement(el){el?.parentNode?.removeChild(el);}
function applyStacking(container){[...container.children].forEach((c,i)=>{c.style.transform=`translateY(${i*10}px)`;});}

// ==================== MODAL ====================
const Modal={
    open(options={}){ 
        const opts={title:'',content:'',size:'md',buttons:[],closeOnBackdrop:true,onClose:null,...options};
        const id=generateId('modal-');
        const popup=document.createElement('div');popup.className='popup';popup.id=id;

        const backdrop=document.createElement('div');backdrop.className='popup-backdrop';popup.appendChild(backdrop);

        const pop=document.createElement('div');pop.className='pop pop-'+opts.size;

        if(opts.title){
            const hd=document.createElement('div');hd.className='pop-hd';
            const h3=document.createElement('h3');h3.className='pop-title';h3.textContent=opts.title;
            hd.appendChild(h3);pop.appendChild(hd);
        }

        const closeBtn=document.createElement('button');closeBtn.className='pop-close';closeBtn.innerHTML='&times;';
        closeBtn.addEventListener('click',()=>Modal.close(id));
        pop.appendChild(closeBtn);

        const bd=document.createElement('div');bd.className='pop-bd';bd.textContent=opts.content;pop.appendChild(bd);

        if(opts.buttons.length>0){
            const ft=document.createElement('div');ft.className='pop-ft';
            opts.buttons.forEach(btn=>{
                const b=document.createElement('button');b.className=btn.class||'btn-primary';
                b.textContent=btn.text||'OK';
                b.addEventListener('click',()=>{
                    if(typeof btn.action==='function') btn.action(id);
                    if(btn.close!==false) Modal.close(id);
                });
                ft.appendChild(b);
            });
            pop.appendChild(ft);
        }

        popup.appendChild(pop);
        document.body.appendChild(popup);

        if(opts.closeOnBackdrop) backdrop.addEventListener('click',()=>Modal.close(id));

        requestAnimationFrame(()=>popup.classList.add('active'));
        popup._onClose=opts.onClose;
        return id;
    },
    close(id){
        const popup=document.getElementById(id);if(!popup)return;
        popup.classList.remove('active');
        setTimeout(()=>{
            removeElement(popup);
            if(popup._onClose) popup._onClose();
        },300);
    },
    closeAll(){document.querySelectorAll('.popup').forEach((p,i)=>setTimeout(()=>Modal.close(p.id),i*100));}
};

// ==================== ALERT ====================
const typeMap={'success':'s','error':'e','warning':'w','info':'i'};
const Alert={
    show(message,type='i',timer=3000){
        const id=generateId('alert-');
        const pa=document.createElement('div');pa.className='pa '+(typeMap[type]||'i');pa.id=id;
        pa.textContent=message;

        const closeBtn=document.createElement('button');closeBtn.className='pa-close';closeBtn.textContent='×';
        closeBtn.addEventListener('click',()=>Alert.close(id));
        pa.appendChild(closeBtn);

        paContainer.appendChild(pa);
        requestAnimationFrame(()=>pa.classList.add('active'));

        applyStacking(paContainer);
        pa._timeout=setTimeout(()=>Alert.close(id),timer);
        return id;
    },
    close(id){
        const el=document.getElementById(id);if(!el)return;
        clearTimeout(el._timeout);
        el.classList.remove('active');
        setTimeout(()=>{removeElement(el);applyStacking(paContainer);},300);
    },
    closeAll(){document.querySelectorAll('.pa').forEach(a=>Alert.close(a.id));}
};

// ==================== TOAST ====================
const Toast={
    show(message,type='i',timer=3000){
        const id=generateId('toast-');
        const pt=document.createElement('div');pt.className='pt '+(typeMap[type]||'i');pt.id=id;
        pt.textContent=message;

        const closeBtn=document.createElement('button');closeBtn.className='pt-close';closeBtn.textContent='×';
        closeBtn.addEventListener('click',()=>Toast.close(id));
        pt.appendChild(closeBtn);

        const bar=document.createElement('div');bar.className='pt-b';
        const progress=document.createElement('div');progress.className='pt-p';
        progress.style.animationDuration=timer+'ms';
        bar.appendChild(progress);
        pt.appendChild(bar);

        ptContainer.appendChild(pt);
        requestAnimationFrame(()=>pt.classList.add('active'));
        applyStacking(ptContainer);
        pt._timeout=setTimeout(()=>Toast.close(id),timer);
        return id;
    },
    close(id){
        const el=document.getElementById(id);if(!el)return;
        clearTimeout(el._timeout);
        el.classList.remove('active');
        setTimeout(()=>{removeElement(el);applyStacking(ptContainer);},300);
    },
    closeAll(){document.querySelectorAll('.pt').forEach(t=>Toast.close(t.id));}
};

// ==================== AUTO HTML INIT ====================
document.addEventListener('DOMContentLoaded',()=>{
    // Modal
    document.querySelectorAll('[data-polos-modal]').forEach(btn=>{
        const targetId=btn.dataset.polosModal;
        btn.addEventListener('click',()=>Modal.open({content:document.querySelector(targetId)?.innerHTML||'',title:btn.dataset.title||''}));
    });

    // Alert
    document.querySelectorAll('[data-polos-alert]').forEach(btn=>{
        const config=JSON.parse(btn.dataset.polosAlert||'{}');
        btn.addEventListener('click',()=>Alert.show(config.message||'',config.type||'i',config.timer||3000));
    });

    // Toast
    document.querySelectorAll('[data-polos-toast]').forEach(btn=>{
        const config=JSON.parse(btn.dataset.polosToast||'{}');
        btn.addEventListener('click',()=>Toast.show(config.message||'',config.type||'i',config.timer||3000));
    });
});

// ==================== GLOBAL ====================
window.PolosPopup={Modal,Alert,Toast};

})();
</script>
