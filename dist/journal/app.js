const CATEGORIES = ['生活', '学习', '随想', '收藏'];
const STORAGE_KEY = 'zaji.entries.v1';
const SAMPLES = [
  {id:'welcome',title:'给自己留一个慢慢生长的地方',category:'随想',date:'2026-10-05',body:'这是你的第一篇示例记录。\n\n想搭一个小小的网站，装下生活里那些不起眼却舍不得忘记的片段。也许是一句话、一次散步，或终于弄懂的一个问题。\n\n不追求每篇都有结论，也不用每次都写得漂亮。记录本身，就是对日子的一种回应。\n\n你可以点击「编辑记录」改写这篇文章，也可以删除它，从自己的故事开始。',sample:true},
  {id:'walk',title:'散步的时候，允许自己什么也不想',category:'生活',date:'2026-10-04',body:'这是一篇生活记录示例。\n\n傍晚出门走了走，没有目的地。沿着熟悉的路，发现树叶已经悄悄换了颜色。\n\n有时候让生活轻一点，只需要放下手机，认真看看身边。\n\n写作提示：今天看到了什么？有哪些小事，让你觉得这个日子值得记住？',sample:true},
  {id:'learn',title:'学完之后，试着用自己的话讲一遍',category:'学习',date:'2026-10-03',body:'这是一篇学习心得示例。\n\n看懂和学会之间，还隔着一次实际尝试。记笔记的时候，与其照抄定义，不如问自己：它解决了什么问题？我能举出一个自己的例子吗？\n\n我的学习记录可以分成三段：\n· 今天学到的东西\n· 暂时没弄懂的问题\n· 下一次想试试的实践\n\n写作提示：把今天学到的一个知识点，解释给未来的自己。',sample:true},
  {id:'collect',title:'把喜欢的句子，放进自己的口袋',category:'收藏',date:'2026-10-02',body:'这是一篇收藏示例。\n\n喜欢的文章、偶然听到的音乐、想再看一遍的电影，都可以放在这里。\n\n收藏的时候，顺手写下为什么喜欢。以后再翻到它时，就不只是一个标题，而是当时的自己。\n\n写作提示：收藏内容 / 出处链接 / 喜欢的理由。',sample:true},
  {id:'thought',title:'不必把每一种爱好都变成一项任务',category:'随想',date:'2026-10-01',body:'这是一篇随想示例。\n\n有些事，单纯因为喜欢就已经足够了。可以拍一张没有构图的照片，读一本没有做笔记的书，也可以写一段没有结尾的文字。\n\n这里也一样。它是一个可以随便坐坐的地方。\n\n写作提示：最近有什么想法，一直在脑海里打转？',sample:true}
];

function validEntries(value) {
  if (!Array.isArray(value) || value.length > 10000) return false;
  const ids = new Set();
  return value.every(e => {
    if (!e || typeof e.id !== 'string' || !e.id || e.id.length > 100 || ids.has(e.id) || typeof e.title !== 'string' || !e.title.trim() || e.title.length > 100 || typeof e.body !== 'string' || !e.body.trim() || e.body.length > 100000 || !CATEGORIES.includes(e.category) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return false;
    const date = new Date(e.date + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== e.date) return false;
    ids.add(e.id);
    return true;
  });
}
function selectEntries(entries, category, query) {
  const q = query.trim().toLocaleLowerCase();
  return entries.filter(e => (!category || e.category === category) && (!q || (e.title + '\n' + e.body).toLocaleLowerCase().includes(q))).sort((a,b) => b.date.localeCompare(a.date));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function init() {
  const $ = id => document.getElementById(id);
  let entries = structuredClone(SAMPLES), category = '', view = 'home', currentId = null, editingId = null, toastTimer;
  let storageReadable = true;
  function notify(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'),4500); }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!validEntries(parsed)) throw new Error('invalid data');
      entries = parsed;
    }
    if (localStorage.getItem('zaji.theme') === 'dark') document.body.classList.add('dark');
  } catch {
    storageReadable = false;
    notify('无法读取原有记录。请先保留浏览器数据，再导入你的备份。');
  }
  function persist(next) {
    if (!storageReadable) { notify('原有数据读取失败，暂不能覆盖。请先导出当前记录并检查浏览器存储。'); return false; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); entries = next; render(); return true; }
    catch { notify('保存失败：浏览器存储不可用或已满。请先导出备份。'); return false; }
  }
  function counts(c) { return entries.filter(e => e.category === c).length; }
  function render() {
    $('categories').innerHTML = CATEGORIES.map(c => `<button class="category-item ${c} ${category===c?'active':''}" data-category="${c}"><span class="dot"></span>${c}<span class="count">${counts(c)}</span></button>`).join('');
    $('filters').innerHTML = ['',...CATEGORIES].map(c => `<button class="filter ${category===c?'active':''}" data-category="${c}" aria-pressed="${category===c}">${c||'全部'}</button>`).join('');
    const matches = selectEntries(entries,category,$('search').value);
    $('record-count').textContent = `${matches.length} 个片段`;
    $('list-title').textContent = category ? `${category}里的小片段` : '最近留下的痕迹';
    $('records').innerHTML = matches.length ? matches.map((e,i) => `<button class="record ${e.category} ${i===0?'featured':''}" data-entry="${escapeHtml(e.id)}"><div class="record-top"><span class="tag">${e.category}</span>${e.sample?'<span class="sample-tag">示例记录</span>':''}</div><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.body.replace(/\n+/g,' '))}</p><div class="record-bottom"><time datetime="${e.date}">${e.date.replaceAll('-','.')}</time><span>${Math.max(1,Math.ceil(e.body.length/350))} 分钟阅读</span><span class="read">翻开看看 ↗</span></div></button>`).join('') : `<div class="empty"><h3>${$('search').value?'暂时没找到这个片段':'这里，还留着一页空白。'}</h3><p>${$('search').value?'试试其他关键词，或换一个分类。':'点击「写点什么」，留下第一段记录。'}</p></div>`;
    const grouped = Map.groupBy ? Map.groupBy(selectEntries(entries,'',''),e=>e.date.slice(0,7)) : selectEntries(entries,'','').reduce((map,e)=>map.set(e.date.slice(0,7),[...(map.get(e.date.slice(0,7))||[]),e]),new Map());
    $('archive-list').innerHTML = entries.length ? [...grouped].map(([month,items])=>`<section class="archive-month"><h2>${month.replace('-',' 年 ')} 月 <small>(${items.length})</small></h2>${items.map(e=>`<button class="archive-row ${e.category}" data-entry="${escapeHtml(e.id)}"><time>${e.date.slice(5).replace('-','/')}</time><span>${escapeHtml(e.title)}</span><span class="tag">${e.category}</span></button>`).join('')}</section>`).join('') : '<div class="empty">还没有记录，去写下今天的故事吧。</div>';
  }
  function setView(next) {
    view = next;
    for (const name of ['home','archive','about']) $(name+'-view').hidden = name !== view;
    document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
    $('breadcrumb').textContent = `我的小天地 / ${view==='home'?(category||'所有记录'):view==='archive'?'时光归档':'关于这里'}`;
    history.replaceState(null,'','#'+view);
  }
  function openEditor(id = null) {
    editingId = id;
    const entry = entries.find(e=>e.id===id);
    $('editor-label').textContent = entry?'编辑这个片段':'留下一个新片段';
    $('entry-title').value = entry?.title || '';
    $('entry-body').value = entry?.body || '';
    $('entry-category').value = entry?.category || category || '生活';
    $('entry-date').value = entry?.date || localDate();
    $('editor').showModal();
    $('entry-title').focus();
  }
  function openEntry(id) {
    const entry = entries.find(e=>e.id===id);
    if (!entry) return;
    currentId = id;
    $('reader-title').textContent = entry.title;
    $('reader-meta').textContent = `${entry.category} / ${entry.date.replaceAll('-','.')} ${entry.sample?' / 示例记录':''}`;
    $('reader-body').textContent = entry.body;
    $('reader').showModal();
  }
  document.addEventListener('click',event=>{
    const nav = event.target.closest('[data-view]');
    if (nav) { category=''; $('search').value=''; setView(nav.dataset.view); render(); }
    const filter = event.target.closest('[data-category]');
    if (filter) { category=filter.dataset.category; setView('home'); render(); }
    const entry = event.target.closest('[data-entry]');
    if (entry) openEntry(entry.dataset.entry);
    if (event.target.closest('.close-dialog')) {
      const dialog=event.target.closest('dialog');
      if(dialog.id!=='editor'||!editorDirty()||confirm('离开写作？未保存的内容会丢失。')) dialog.close();
    }
  });
  function editorDirty() { const old=entries.find(e=>e.id===editingId); return $('entry-title').value!==(old?.title||'')||$('entry-body').value!==(old?.body||'')||Boolean(old&&($('entry-category').value!==old.category||$('entry-date').value!==old.date)); }
  $('editor').addEventListener('cancel',e=>{if(editorDirty()&&!confirm('离开写作？未保存的内容会丢失。'))e.preventDefault();});
  window.addEventListener('beforeunload',e=>{if($('editor').open&&editorDirty()){e.preventDefault();e.returnValue='';}});
  $('write').onclick = $('hero-write').onclick = () => openEditor();
  $('search').addEventListener('input',render);
  $('entry-form').addEventListener('submit',event=>{
    event.preventDefault();
    const entry={id:editingId||crypto.randomUUID(),title:$('entry-title').value.trim(),body:$('entry-body').value.trim(),category:$('entry-category').value,date:$('entry-date').value,sample:false};
    if(!validEntries([entry])) { notify('请填写有效的标题、正文和日期。'); return; }
    const next=editingId?entries.map(e=>e.id===editingId?entry:e):[entry,...entries];
    if(persist(next)) { $('editor').close(); category='';$('search').value='';setView('home');render();notify('这一刻，记下来了。'); }
  });
  $('edit-entry').onclick=()=>{$('reader').close();openEditor(currentId);};
  $('delete-entry').onclick=()=>{if(confirm('删除这篇记录？删除后无法撤销，建议先导出备份。')&&persist(entries.filter(e=>e.id!==currentId))){$('reader').close();notify('记录已删除。');}};
  $('export').onclick=()=>{
    const blob=new Blob([JSON.stringify({format:'zaji-v1',exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`杂记备份-${localDate()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已导出备份，请妥善保存。');
  };
  $('import').onclick=()=>$('import-file').click();
  $('mobile-export').onclick=()=>$('export').click();
  $('mobile-import').onclick=()=>$('import').click();
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files[0]; if(!file)return;
    try {
      if(file.size>20*1024*1024)throw new Error('size');
      const backup=JSON.parse(await file.text());
      if(backup.format!=='zaji-v1'||!validEntries(backup.entries))throw new Error('format');
      if(!confirm(`导入 ${backup.entries.length} 篇记录并替换当前记录？请先导出当前备份。`))return;
      const clean=backup.entries.map(({id,title,body,category,date,sample})=>({id,title,body,category,date,sample:sample===true}));
      if(persist(clean)){category='';$('search').value='';setView('home');render();notify('备份已恢复。');}
    }catch {notify('导入失败：请选择本站导出的有效 JSON 备份（不超过 20 MB）。');}
    finally {event.target.value='';}
  });
  $('theme').onclick=()=>{
    const dark=document.body.classList.toggle('dark');
    $('theme').setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');
    try{localStorage.setItem('zaji.theme',dark?'dark':'light');}catch{notify('主题已切换，但浏览器无法保存偏好。');}
  };
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!$('editor').open&&!$('reader').open){e.preventDefault();setView('home');$('search').focus();}});
  $('today').textContent = new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
  render();setView(['home','archive','about'].includes(location.hash.slice(1))?location.hash.slice(1):'home');
}
if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = {validEntries,selectEntries,escapeHtml,SAMPLES};
