/*!
 * Py v1.0.0 - Polos Tiny HTTP Client Library
 * Production-ready, minimal, readable
 * Author: Ali Musthofa
 * License: MIT
 * Link : https://github.com/alicom13/polos
 */

(function (global) {
  function Py(cfg = {}) {
    const enc = encodeURIComponent;

    const def = {
      timeout: 10000,
      headers: { accept: 'application/json, */*' },
      responseType: 'json',
      throwIfNot2xx: true,
      hooks: { bReq: [], aRes: [], bErr: [] },
      ...cfg
    };

    const reqs = new Map(); let cnt = 0;
    const gid = () => `py_${Date.now()}_${++cnt}_${Math.random().toString(36).slice(2, 9)}`;

    const normalizeHeaders = (h) => Object.fromEntries(Object.entries(h || {}).map(([k, v]) => [k.toLowerCase(), v]));

    const createCombinedSignal = (userSignal, tmoCtrl) => {
      if (!userSignal) {
        return { signal: tmoCtrl.signal, cleanup: () => {} };
      }

      const combinedController = new AbortController();
      const abort = () => combinedController.abort();

      const userAbortHandler = () => combinedController.abort();
      userSignal.addEventListener('abort', userAbortHandler);
      tmoCtrl.signal.addEventListener('abort', abort, { once: true });

      const cleanup = () => {
        userSignal.removeEventListener('abort', userAbortHandler);
      };

      return { signal: combinedController.signal, cleanup };
    };

    const SeriQRecs = (key, val, pKey) => {
      const parts = []; const pref = pKey ? `${pKey}[${key}]` : key;
      if (val === null || val === undefined) return parts;
      if (val instanceof Date) parts.push(`${enc(pref)}=${enc(val.toISOString())}`);
      else if (Array.isArray(val)) val.forEach((v, i) => {
        if (typeof v === 'object') parts.push(...SeriQRecs('', v, `${pref}[${i}]`));
        else parts.push(`${enc(pref)}[${i}]=${enc(v)}`);
      });
      else if (typeof val === 'object') for (const [k, v] of Object.entries(val)) parts.push(...SeriQRecs(k, v, pref));
      else parts.push(`${enc(pref)}=${enc(val)}`);
      return parts;
    };
    const seriQry = prms => Object.entries(prms).flatMap(([k, v]) => SeriQRecs(k, v)).join('&');

    const bUrl = (url, prms) => {
      let u_obj;
      try {
        const isAbs = url.match(/^https?:\/\//);
        if (!isAbs) {
          const base = def.baseURL || (typeof window !== 'undefined' ? window.location.origin : null);
          if (!base) throw new Error(`Relative URL "${url}" requires a baseURL in Node.js/non-browser.`);
          u_obj = new URL(url, base);
        } else u_obj = new URL(url);
        if (prms) u_obj.search = seriQry(prms);
        return u_obj.toString();
      } catch (e) { throw new Error(`Invalid URL: ${url}. ${e.message}`); }
    };

    const appFormRec = (form, data, pKey) => {
      if (!data) return;
      for (const [key, val] of Object.entries(data)) {
        const newKey = pKey ? `${pKey}[${key}]` : key;
        if (val === null || val === undefined) continue;
        else if (val instanceof Date) form.append(newKey, val.toISOString());
        else if (val instanceof Blob || val instanceof File) form.append(newKey, val);
        else if (Array.isArray(val)) val.forEach((x, i) => {
          if (typeof x === 'object') appFormRec(form, x, `${newKey}[${i}]`);
          else form.append(`${newKey}[${i}]`, x);
        });
        else if (typeof val === 'object') appFormRec(form, val, newKey);
        else form.append(newKey, val);
      }
    };

    async function req(mtd, url, data, cfg = {}) {
      const id = gid();
      
      const tmoCtrl = new AbortController();
      const tmoId = setTimeout(() => tmoCtrl.abort(), cfg.timeout ?? def.timeout);
      
      const { signal: sig, cleanup: cleanupSignal } = createCombinedSignal(cfg.signal, tmoCtrl);

      const fHooks = {
        bReq: [...def.hooks.bReq, ...(cfg.hooks?.bReq || [])],
        aRes: [...def.hooks.aRes, ...(cfg.hooks?.aRes || [])],
        bErr: [...def.hooks.bErr, ...(cfg.hooks?.bErr || [])],
      };

      let fConfig = {
        ...def,
        ...cfg,
        mtd, url, data, sig,
        hdr: { ...normalizeHeaders(def.headers), ...normalizeHeaders(cfg.headers) }, 
        prms: cfg.prms,
      };

      reqs.set(id, { ctrl: tmoCtrl, fConfig });

      try {
        if (fHooks.bReq.length > 0) {
          fConfig = fHooks.bReq.reduce((conf, hook) => {
            const nConf = hook(conf);
            return nConf !== undefined ? nConf : conf;
          }, fConfig);
        }

        const hdr = { ...fConfig.hdr };
        
        let bdy, isJsn = false;
        if (['GET', 'HEAD'].includes(mtd)) bdy = undefined;
        else if (data instanceof FormData) bdy = data;
        else if (data !== null && typeof data === 'object') { bdy = JSON.stringify(data); isJsn = true; }
        else bdy = data;

        if (isJsn && !hdr['content-type']) hdr['content-type'] = 'application/json';

        const fRes = await fetch(bUrl(url, fConfig.prms), {
          method: mtd,
          headers: hdr,
          body: bdy,
          signal: sig
        });
        clearTimeout(tmoId);

        let rDat;
        switch (fConfig.responseType) {
          case 'json': try { rDat = await fRes.json(); } catch (e) { throw new Error(`JSON parse error: ${e.message}`); } break;
          case 'text': rDat = await fRes.text(); break;
          case 'blob': rDat = await fRes.blob(); break;
          case 'arraybuffer': rDat = await fRes.arrayBuffer(); break;
          default: rDat = await fRes.text();
        }

        let pyRes = { data: rDat, status: fRes.status, statusText: fRes.statusText, headers: fRes.headers, fConfig, requestId: id };

        if (fHooks.aRes.length > 0) {
          pyRes = fHooks.aRes.reduce((res, hook) => {
            const nRes = hook(res);
            return nRes !== undefined ? nRes : res;
          }, pyRes);
        }
        
        if (fConfig.throwIfNot2xx && !fRes.ok) {
            const err = new Error(fRes.statusText || `Request failed with status ${fRes.status}`);
            err.response = pyRes;
            throw err;
        }

        return pyRes;
      } catch (e) {
        clearTimeout(tmoId);
        
        let err = e;
        if (!e.response) {
            err = new Error(e.name === 'AbortError' ? 'Request cancelled or timeout' : e.message);
            err.requestId = id;
        }

        if (fHooks.bErr.length > 0) {
            const result = fHooks.bErr.reduce((err, hook) => {
                const nRes = hook(err);
                return nRes !== undefined ? nRes : err;
            }, err);

            if (result && result.status !== undefined) return result;
            err = result;
        }

        throw err;
      } finally {
        cleanupSignal();
        reqs.delete(id);
      }
    }

    const get = (url, cfg) => req('GET', url, null, cfg),
          post = (url, data, cfg) => req('POST', url, data, cfg),
          put = (url, data, cfg) => req('PUT', url, data, cfg),
          patch = (url, data, cfg) => req('PATCH', url, data, cfg),
          remove = (url, cfg) => req('DELETE', url, null, cfg);

    const upload = (url, file, { fName = 'file', data, ...cfg } = {}) => { const form = new FormData(); form.append(fName, file); appFormRec(form, data); return req('POST', url, form, cfg); };
    const multiUpload = (url, files, { fName = 'files', data, ...cfg } = {}) => { if (!(files instanceof FileList || Array.isArray(files))) throw new Error('Files must be Array or FileList'); const form = new FormData(); Array.from(files).forEach((f, i) => form.append(`${fName}[${i}]`, f)); appFormRec(form, data); return req('POST', url, form, cfg); };

    const cancel = id => { const r_obj = reqs.get(id); if (r_obj) { r_obj.ctrl?.abort(); reqs.delete(id); return true; } return false; };
    const cancelAll = () => { for (const id of reqs.keys()) cancel(id); };
    
    const create = cfg => Py({
      ...def,
      ...cfg,
      headers: { ...def.headers, ...(cfg?.headers || {}) },
      hooks: {
        bReq: [...def.hooks.bReq, ...(cfg?.hooks?.bReq || [])],
        aRes: [...def.hooks.aRes, ...(cfg?.hooks?.aRes || [])],
        bErr: [...def.hooks.bErr, ...(cfg?.hooks?.bErr || [])],
      }
    });

    return { get, post, put, patch, delete: remove, upload, multiUpload, cancel, cancelAll, create, actReqs: reqs };
  }

  global.Py = Py;
  global.py = Py();
})(typeof window !== 'undefined' ? window : global);
