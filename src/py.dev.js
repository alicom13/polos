/*!
 * Py v1.0.0 - Polos Tiny HTTP Client Library
 * Production-ready, minimal, readable
 * Author: Ali Musthofa
 * License: MIT
 * Link : https://github.com/alicom13/polos
 */
(function(global){
  function Py(Config={}){
    const defaults={timeout:10000,headers:{accept:'application/json'},responseType:'json',...Config};
    const activeRequests=new Map();let counter=0;
    const genId=()=>`py_${Date.now()}_${++counter}_${Math.random().toString(36).slice(2,9)}`;

    /**
     * serializeQueryRec
     * Rekursif mengubah object/array menjadi query string.
     * Array of objects menggunakan indeks eksplisit.
     * Date dikonversi ke ISO string.
     */
    const serializeQueryRec=(key,value,parentKey)=>{
      const parts=[];const prefix=parentKey?`${parentKey}[${key}]`:key;
      if(value===null||value===undefined) return parts;
      if(value instanceof Date) parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(value.toISOString())}`);
      else if(Array.isArray(value)) value.forEach((v,i)=>{
        if(typeof v==='object') parts.push(...serializeQueryRec('',v,`${prefix}[${i}]`));
        else parts.push(`${encodeURIComponent(prefix)}[${i}]=${encodeURIComponent(v)}`);
      });
      else if(typeof value==='object') for(const [k,v] of Object.entries(value)) parts.push(...serializeQueryRec(k,v,prefix));
      else parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(value)}`);
      return parts;
    };

    /**
     * serializeQuery
     * Wrapper untuk serializeQueryRec, menerima object dan menghasilkan query string.
     */
    const serializeQuery=params=>Object.entries(params).flatMap(([k,v])=>serializeQueryRec(k,v)).join('&');
    /**
     * buildUrl
     * Membuat URL lengkap termasuk query string.
     * Memastikan baseURL tersedia di Node.js untuk relative URL.
     */
    const buildUrl=(url,params)=>{
      let u;
      try{
        const isAbs=url.match(/^https?:\/\//);
        if(!isAbs){
          const base=defaults.baseURL||(typeof window!=='undefined'?window.location.origin:null);
          if(!base) throw new Error(`Relative URL "${url}" requires a baseURL in Node.js/non-browser.`);
          u=new URL(url,base);
        } else u=new URL(url);
        if(params) u.search=serializeQuery(params);
        return u.toString();
      }catch(e){throw new Error(`Invalid URL: ${url}. ${e.message}`);}
    };
    /**
     * appendFormRec
     * Rekursif menambahkan data object/array ke FormData.
     * Konsisten dengan serializeQueryRec, array of objects dengan indeks eksplisit.
     * Date dikonversi ke ISO string.
     */
    const appendFormRec=(form,data,parentKey)=>{
      if(!data) return;
      for(const [k,v] of Object.entries(data)){
        const key=parentKey?`${parentKey}[${k}]`:k;
        if(v===null||v===undefined) continue;
        else if(v instanceof Date) form.append(key,v.toISOString());
        else if(v instanceof Blob||v instanceof File) form.append(key,v);
        else if(Array.isArray(v)) v.forEach((x,i)=>{
          if(typeof x==='object') appendFormRec(form,x,`${key}[${i}]`);
          else form.append(`${key}[${i}]`,x);
        });
        else if(typeof v==='object') appendFormRec(form,v,key);
        else form.append(key,v);
      }
    };
    /**
     * req
     * Fungsi inti untuk semua request HTTP.
     * Params:
     *   method: GET, POST, PUT, PATCH, DELETE
     *   url: endpoint
     *   data: object, FormData, File, atau string
     *   cfg: konfigurasi tambahan, termasuk headers, params, timeout, signal, responseType
     * Return:
     *   Object {data, status, statusText, headers, config, requestId}
     */
    async function req(method,url,data,cfg={}){
      const id=genId();
      const controller=cfg.signal?null:new AbortController();
      const signal=cfg.signal||controller.signal;
      const cfgFinal={...defaults,...cfg,method,url,data,signal,headers:{...defaults.headers,...(cfg.headers||{})},params:cfg.params};
      activeRequests.set(id,{controller,cfgFinal});
      let timeoutId;if(controller) timeoutId=setTimeout(()=>controller.abort(),cfgFinal.timeout);

      try{
        const headers={...cfgFinal.headers};
        let body=['GET','HEAD'].includes(method)?undefined:data instanceof FormData?data:(data!==null&&typeof data==='object'?JSON.stringify(data):data);
        if(body&&!headers['content-type']&&!((data instanceof FormData))) headers['content-type']='application/json';

        const res=await fetch(buildUrl(url,cfgFinal.params),{method,headers,body,signal});
        if(timeoutId) clearTimeout(timeoutId);

        let resData;
        switch(cfgFinal.responseType){
          case'json':try{resData=await res.json()}catch(e){throw new Error(`JSON parse error: ${e.message}`)};break;
          case'text':resData=await res.text();break;
          case'blob':resData=await res.blob();break;
          case'arraybuffer':resData=await res.arrayBuffer();break;
          default:resData=await res.text();
        }

        return {data:resData,status:res.status,statusText:res.statusText,headers:res.headers,config:cfgFinal,requestId:id};
      }catch(e){if(timeoutId) clearTimeout(timeoutId);const err=new Error(e.name==='AbortError'?'Request cancelled or timeout':e.message);err.requestId=id;throw err;}
      finally{activeRequests.delete(id);}
    }
    // HTTP method wrappers
    const get=(u,cfg)=>req('GET',u,null,cfg),
          post=(u,d,cfg)=>req('POST',u,d,cfg),
          put=(u,d,cfg)=>req('PUT',u,d,cfg),
          patch=(u,d,cfg)=>req('PATCH',u,d,cfg),
          remove=(u,cfg)=>req('DELETE',u,null,cfg);
    /**
     * upload
     * Mengirim file tunggal dengan FormData.
     * fieldName: nama key file di server, default 'file'
     * data: object tambahan akan ditambahkan ke FormData
     * multiUpload
     * Mengirim banyak file sekaligus dengan FormData.
     * fieldName: nama key array file, default 'files'
     * data: object tambahan akan ditambahkan ke FormData
     */
    const upload=(url,file,{fieldName='file',data,...cfg}={})=>{const form=new FormData();form.append(fieldName,file);appendFormRec(form,data);return req('POST',url,form,cfg);};
    const multiUpload=(url,files,{fieldName='files',data,...cfg}={})=>{if(!(files instanceof FileList||Array.isArray(files)))throw new Error('Files must be Array or FileList');const form=new FormData();Array.from(files).forEach((f,i)=>form.append(`${fieldName}[${i}]`,f));appendFormRec(form,data);return req('POST',url,form,cfg);};

    /**
     * cancel,cancelAll
     * Membatalkan request berdasarkan requestId, dan Semua request
     */
    const cancel=id=>{const r=activeRequests.get(id);if(r){r.controller?.abort();activeRequests.delete(id);return true}return false};
    const cancelAll=()=>{for(const id of activeRequests.keys()) cancel(id)};
    /**
     * create
     * Membuat instance baru dengan konfigurasi berbeda
     */
    const create=c=>Py({...defaults,...c,headers:{...defaults.headers,...(c?.headers||{})}});
    return {get,post,put,patch,delete:remove,upload,multiUpload,cancel,cancelAll,create,activeRequests};
  }
  global.Py=Py;
  global.py=Py();
})(typeof window!=='undefined'?window:global);
