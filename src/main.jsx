import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

const modes = [
 ['auto','Auto Enhance','Analisis dan perbaiki keseluruhan foto'],
 ['restore','Old Photo Restoration','Pulihkan foto lama, noda, goresan, dan pudar'],
 ['face','Face Restoration','Fokus pada detail wajah dengan tetap menjaga identitas'],
 ['upscale','Ultra Upscale','Perbesar resolusi dan pertajam detail'],
 ['sharp','Sharp & Clear','Kurangi blur, noise, dan artefak kompresi'],
 ['color','Colorize','Warnai foto hitam putih secara natural'],
 ['repair','Photo Repair','Perbaiki pencahayaan dan kerusakan visual']
];
function App(){
 const [file,setFile]=useState(null), [preview,setPreview]=useState(''), [mode,setMode]=useState('auto');
 const [scale,setScale]=useState('2'), [format,setFormat]=useState('png'), [quality,setQuality]=useState(92);
 const [busy,setBusy]=useState(false), [progress,setProgress]=useState('Menunggu foto'), [result,setResult]=useState(null);
 const [history,setHistory]=useState(()=>JSON.parse(localStorage.getItem('aps-history')||'[]'));
 const [tab,setTab]=useState('studio'), [error,setError]=useState(''), [drag,setDrag]=useState(false);
 const [showOriginal,setShowOriginal]=useState(false);
 useEffect(()=>{localStorage.setItem('aps-history',JSON.stringify(history.slice(0,30)))},[history]);
 const choose=f=>{if(!f)return;if(!/^image\\/(jpeg|png|webp)$/.test(f.type)){setError('Format harus JPG, PNG, atau WEBP.');return}if(f.size>20*1024*1024){setError('Ukuran maksimum upload adalah 20 MB.');return}setFile(f);setPreview(URL.createObjectURL(f));setResult(null);setError('')};
 const dimensions=useMemo(()=>preview?'Foto siap diproses':'Unggah foto untuk memulai',[preview]);
 async function process(){
  if(!file){setError('Pilih foto terlebih dahulu.');return}
  setBusy(true);setError('');setResult(null);setProgress('Mengunggah dan menganalisis foto…');
  try{
   const fd=new FormData();fd.append('image',file);fd.append('mode',mode);fd.append('scale',scale);fd.append('format',format);fd.append('quality',String(quality));
   setProgress('Memproses dengan Gemini AI dan image pipeline…');
   const r=await fetch('/api/process',{method:'POST',body:fd});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'Pemrosesan gagal');
   const item={id:Date.now(),name:file.name,original:preview,result:data.imageUrl,created:new Date().toISOString(),width:data.width,height:data.height,cloud:data.cloud||false};
   setResult(item);setHistory(h=>[item,...h]);setProgress('Selesai');
  }catch(e){setError(e.message);setProgress('Gagal diproses')}
  finally{setBusy(false)}
 }
 const download=async url=>{const a=document.createElement('a');a.href=url;a.download=`ai-photo-studio-${Date.now()}.${format}`;document.body.appendChild(a);a.click();a.remove()};
 const current=result?.result;
 return <div className="app">
  <aside className="sidebar"><div className="brand"><div className="brandicon">✦</div><div><b>AI PHOTO</b><span>STUDIO</span></div></div>
   <div className="navlabel">WORKSPACE</div><button className={tab==='studio'?'nav active':'nav'} onClick={()=>setTab('studio')}>▧ <span>Photo Studio</span></button><button className={tab==='history'?'nav active':'nav'} onClick={()=>setTab('history')}>◷ <span>Riwayat</span></button>
   <div className="sidebottom"><div className="gemini">✧ <span>Powered by Gemini AI</span></div><small>Private by design<br/>Local-first storage</small></div>
  </aside>
  <main className="main"><header><div><div className="eyebrow">AI IMAGE WORKSPACE</div><h1>{tab==='studio'?'Pulihkan kualitas foto.':'Riwayat pemrosesan.'}</h1><p>{tab==='studio'?'Ubah foto buram, rusak, atau beresolusi rendah menjadi lebih jernih.':'Lihat kembali hasil foto yang pernah diproses di perangkat ini.'}</p></div><div className="status"><i/> Studio siap</div></header>
  {tab==='studio'?<div className="workspace">
   <section className="panel upload-panel"><div className="sectionhead"><div><h2>01. Unggah foto</h2><p>JPG, PNG atau WEBP · Maksimum 20 MB</p></div><span className="step">01 / 03</span></div>
    <div className={'dropzone '+(drag?'drag':'')} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files[0])}}>
     {preview?<><img className="uploadpreview" src={preview}/><div className="filemeta"><b>{file?.name}</b><span>{(file?.size/1024/1024).toFixed(2)} MB · {dimensions}</span></div><button className="textbtn" onClick={()=>document.getElementById('file').click()}>Ganti foto</button></>:<><div className="uploadicon">↑</div><b>Letakkan foto di sini</b><span>atau pilih dari perangkat Anda</span><button className="outline" onClick={()=>document.getElementById('file').click()}>Pilih Foto</button></>}
     <input id="file" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>choose(e.target.files[0])}/>
    </div>
   </section>
   <section className="panel"><div className="sectionhead"><div><h2>02. Pilih perbaikan AI</h2><p>Pilih jenis peningkatan yang dibutuhkan foto.</p></div><span className="step">02 / 03</span></div>
    <div className="modes">{modes.map(([id,title,desc])=><button key={id} className={'mode '+(mode===id?'selected':'')} onClick={()=>setMode(id)}><span className="modeicon">{({auto:'✧',restore:'▧',face:'◉',upscale:'⤢',sharp:'⌁',color:'◐',repair:'✣'})[id]}</span><span><b>{title}</b><small>{desc}</small></span><span className="radio">{mode===id?'●':'○'}</span></button>)}</div>
   </section>
   <section className="panel"><div className="sectionhead"><div><h2>03. Pengaturan hasil</h2><p>Atur ukuran dan format file keluaran.</p></div><span className="step">03 / 03</span></div>
    <div className="settings"><label>Faktor upscale<select value={scale} onChange={e=>setScale(e.target.value)}><option value="1">Original</option><option value="2">2× Upscale</option><option value="4">4× Upscale</option><option value="8">8× Upscale</option></select></label><label>Format keluaran<select value={format} onChange={e=>setFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WEBP</option></select></label><label className="quality">Kualitas kompresi <b>{quality}%</b><input type="range" min="60" max="100" value={quality} onChange={e=>setQuality(+e.target.value)}/></label></div>
    <button className="primary" disabled={!file||busy} onClick={process}>{busy?<><span className="spinner"/> Memproses foto…</>:'✦  PROSES FOTO DENGAN AI'}</button>
    <div className="progress">{busy&&<div className="bar"><i/></div>}<span>{progress}</span></div>
    {error&&<div className="error">{error}</div>}
   </section>
   {result&&<section className="panel resultpanel"><div className="sectionhead"><div><h2>Hasil restorasi</h2><p>{result.width} × {result.height} px · Siap diunduh</p></div><span className="done">✓ Selesai</span></div>
    <div className="compare"><div className="compareimg"><img src={showOriginal?result.original:current}/><span>{showOriginal?'ORIGINAL':'AI RESULT'}</span></div><button className="switch" onClick={()=>setShowOriginal(!showOriginal)}>⇄ {showOriginal?'Lihat hasil AI':'Lihat foto asli'}</button></div>
    <button className="primary" onClick={()=>download(current)}>↓  DOWNLOAD HASIL</button>
    <p className="hint">Hasil AI dapat menginterpretasikan ulang detail yang hilang. Periksa wajah dan detail penting sebelum digunakan.</p>
   </section>}
  </div>:<section className="panel historypanel"><div className="sectionhead"><div><h2>Foto yang diproses</h2><p>Riwayat disimpan pada browser/perangkat ini.</p></div><button className="textbtn" onClick={()=>{if(confirm('Hapus seluruh riwayat lokal?'))setHistory([])}}>Hapus riwayat</button></div>{history.length===0?<div className="empty">Belum ada foto yang diproses.</div>:<div className="historygrid">{history.map(x=><div className="historyitem" key={x.id}><img src={x.result}/><b>{x.name}</b><small>{new Date(x.created).toLocaleString('id-ID')} · {x.width}×{x.height}</small><a href={x.result} download>Unduh hasil ↗</a></div>)}</div>}</section>}
  <footer>AI PHOTO STUDIO <span>•</span> Gemini-powered image restoration</footer></main>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
