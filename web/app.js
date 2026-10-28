/* DAYBOARD 1.0.1 — dependency-free frontend; Tauri SQLite + browser fallback. */
'use strict';
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const ROOT = $('#app');
const NATIVE = !!window.__TAURI__?.core?.invoke;
const STORAGE_KEY = 'dayboard.v1.state';
const ui = {page:'today',tag:'all',priority:'all',search:'',weekOffset:0,modal:null,quick:null,draft:null,dragId:null,calendar:null,suppressClickUntil:0,widgetTab:'active'};
const STATUS = [{id:'planned',name:'План',css:'status-planned'},{id:'progress',name:'В работе',css:'status-progress'},{id:'waiting',name:'Ожидаю',css:'status-waiting'},{id:'done',name:'Готово',css:'status-done'}];
const PRIORITY = {low:'Низкий',medium:'Средний',high:'Высокий'};
const COLORS = ['#83acfb','#a899ed','#e7b675','#74c3a4','#e59da4','#8bc6d9','#dfacd8'];
const PATHS = {
 'layout':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
 'calendar':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 'inbox':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
 'history':'<path d="M3 12a9 9 0 1 0 2.5-6.2L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
 'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2.1 2.1-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21h-3v-.9a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1-2.1-2.1.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H5v-3h.9a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8L7 8.1 9.1 6l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V4h3v.9a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1L20 8.1l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1h.9v3h-.9a1.6 1.6 0 0 0-1.7 1z" transform="translate(-1 -1) scale(.98)"/>',
 'plus':'<path d="M12 5v14M5 12h14"/>','search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 'pin':'<path d="m16 3 5 5-4 1-3 4v5l-2 3-2-3v-5L6 9 2 8l5-5z"/>',
 'maximize':'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 'minimize':'<path d="M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5"/>',
 'check':'<path d="m5 12 4 4L19 6"/>', 'checkcircle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 'circle':'<circle cx="12" cy="12" r="9"/>', 'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'chevron-left':'<path d="m15 18-6-6 6-6"/>','chevron-right':'<path d="m9 18 6-6-6-6"/>',
 'close':'<path d="M18 6 6 18M6 6l12 12"/>','trash':'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
 'filter':'<path d="M4 6h16M7 12h10M10 18h4"/>','flag':'<path d="M5 21V4m0 1c4-3 9 3 14 0v11c-5 3-10-3-14 0"/>',
 'more':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 'arrow':'<path d="M5 12h14m-6-6 6 6-6 6"/>', 'download':'<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
 'upload':'<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>','alert':'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
 'bolt':'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>', 'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 'target':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 'keyboard':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/>',
 'layers':'<path d="m12 2 9 5-9 5-9-5 9-5zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
 'monitor':'<rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/>',
 'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 'refresh':'<path d="M20 7v5h-5M4 17v-5h5M5 9a8 8 0 0 1 14-2l1 5M4 12a8 8 0 0 0 15 3"/>',
 'external':'<path d="M14 4h6v6m-10 4L20 4M20 14v6H4V4h6"/>',
 'spark':'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>'
};
const icon = (name,cls='')=> `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]||PATHS.circle}</svg>`;
const e = value => String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const id=()=>crypto.randomUUID?.()||('d-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const pad=n=>String(n).padStart(2,'0');
const dateKey=(date=new Date())=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const shiftDay=(key,offset)=>{let d=new Date(`${key}T12:00:00`);d.setDate(d.getDate()+offset);return dateKey(d)};
const localDateTime=d=>`${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const today=()=>dateKey();
const displayDate=(str,opt={})=>str?new Date(str.length===10?str+'T12:00:00':str).toLocaleDateString('ru-RU',opt):'';
const relativeDay=str=>str===today()?'Сегодня':str===shiftDay(today(),1)?'Завтра':displayDate(str,{day:'numeric',month:'short'});
const dd=str=>str?dateKey(new Date(str)):'';
const stamp=()=>new Date().toISOString();
const debounce=(fn,ms)=>{let timer;return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),ms)}};
const baseState=()=>({version:1,tasks:[],tags:[{id:'work',name:'Работа',color:'#83acfb'},{id:'personal',name:'Личное',color:'#74c3a4'},{id:'projects',name:'Проекты',color:'#a899ed'}],history:[],settings:{mode:'full',alwaysOnTop:false,autostart:false,closeToTray:true,notifications:true,startCompact:false,showDone:true,bounds:{full:null,compact:null}}});
function sampleState(){const s=baseState();const data=[['Разобрать приоритеты на сегодня','planned',0,'medium','work','Определить три важнейшие задачи и последовательность их выполнения.'],['Подготовить материалы встречи','progress',0,'high','work','Собрать необходимые материалы и проверить факты перед встречей.'],['Обновить план проекта','planned',0,'medium','projects','Уточнить следующий шаг и записать задачи на текущую неделю.'],['Получить подтверждение','waiting',0,'low','work','Напомнить о договорённости, если ответа не будет к концу дня.'],['Проверить результаты недели','planned',1,'medium','work','Оценить прогресс и перенести незавершённые дела.'],['Выделить время на себя','planned',2,'low','personal','Запланировать прогулку или другое занятие вне работы.'],['Записать идеи','done',0,'low','projects','Добавить интересные мысли в заметки.']];for(let i=0;i<data.length;i++){const [title,status,d,priority,tag,description]=data[i];const t=newTask({title,status,priority,plannedDate:shiftDay(today(),d),description,tags:[tag]}); if(status==='done')t.completedAt=stamp();t.isSample=true;s.tasks.push(t)}s.history.push({id:id(),type:'info',title:'Добро пожаловать в DAYBOARD. Примерные задачи можно удалить в настройках.',at:stamp()});return s;}
function newTask(o={}){const now=stamp();return {id:id(),title:'',description:'',status:'planned',priority:'medium',plannedDate:today(),dueAt:'',remindAt:'',tags:[],checklist:[],position:Date.now()+Math.random(),createdAt:now,updatedAt:now,completedAt:null,deletedAt:null,revision:1,...o}}
let state=baseState();
const active=()=>state.tasks.filter(t=>!t.deletedAt);
const visible=t=>!t.deletedAt&&(ui.tag==='all'||t.tags?.includes(ui.tag))&&(ui.priority==='all'||t.priority===ui.priority)&&(!ui.search||(`${t.title} ${t.description} ${t.tags?.map(key=>tagName(key)).join(' ')}`).toLocaleLowerCase('ru').includes(ui.search.toLocaleLowerCase('ru')));
const tagName=key=>state.tags.find(t=>t.id===key)?.name||key;
const tagColor=key=>state.tags.find(t=>t.id===key)?.color||'#8596aa';
const statusName=key=>STATUS.find(s=>s.id===key)?.name||'План';
const isOverdue=t=>t.status!=='done'&&(t.dueAt&&new Date(t.dueAt).getTime()<Date.now()||t.plannedDate&&t.plannedDate<today());
const onToday=t=>t.plannedDate===today()||dd(t.dueAt)===today()||isOverdue(t)||t.status==='done'&&dd(t.completedAt)===today();
const sortTasks=arr=>arr.sort((a,b)=>(a.position??0)-(b.position??0));
const displayTag=(key)=>`<span class="pill tag" style="background:${tagColor(key)}21;color:${tagColor(key)}"><span class="tag-dot" style="background:${tagColor(key)};width:5px;height:5px"></span>${e(tagName(key))}</span>`;
function updateTask(taskId,patch,historyType){const t=state.tasks.find(x=>x.id===taskId);if(!t)return;const wasDone=t.status==='done';Object.assign(t,patch,{updatedAt:stamp(),revision:(t.revision||0)+1,isSample:false});if(t.status==='done'&&!wasDone){t.completedAt=stamp();log('completed',t.title,t.id)}else if(t.status!=='done'&&wasDone){t.completedAt=null;log('restored',t.title,t.id)}else if(historyType)log(historyType,t.title,t.id);persist();render()}
function log(type,title,taskId){state.history.unshift({id:id(),type,title,taskId,at:stamp()});if(state.history.length>2000)state.history.length=2000}
let nativeSaveQueue=Promise.resolve();
function persist(){if(!NATIVE){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(err){toast('Не удалось сохранить данные: '+err.message)}return}const snapshot=JSON.stringify(state);nativeSaveQueue=nativeSaveQueue.catch(()=>{}).then(()=>window.__TAURI__.core.invoke('save_state',{json:snapshot})).catch(err=>toast('Ошибка сохранения: '+err));}
async function init(){try{if(NATIVE){const json=await window.__TAURI__.core.invoke('load_state');state=json?normalize(JSON.parse(json)):sampleState();if(!json)persist();try{await window.__TAURI__.core.invoke('set_close_to_tray',{enabled:!!state.settings.closeToTray})}catch{}try{const isEnabled=await window.__TAURI__.core.invoke('get_autostart');state.settings.autostart=!!isEnabled}catch{}}else{const raw=localStorage.getItem(STORAGE_KEY);state=raw?normalize(JSON.parse(raw)):sampleState();if(!raw)persist()}}catch(err){console.error('Init failed',err);if(NATIVE){ROOT.innerHTML='<div class="splash"><strong>Ошибка загрузки данных</strong><span>DAYBOARD не может открыть локальную базу. Перезапустите приложение. Данные не будут перезаписаны.</span></div>';return false;}toast('Не удалось загрузить данные. Загружена чистая доска.');state=baseState()}if(NATIVE&&state.settings.mode==='compact')document.body.classList.add('compact');ui.page='today';render();registerEvents();if(NATIVE){try{await window.__TAURI__.core.invoke('set_always_on_top',{enabled:!!state.settings.alwaysOnTop})}catch{} }else{document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()})}window.setInterval(()=>{checkBrowserReminders();if(ui.page==='today'||state.settings.mode==='compact')refreshTimeSensitive()},30_000);return true}
function normalize(raw){const blank=baseState();return {...blank,...raw,tasks:Array.isArray(raw.tasks)?raw.tasks:[],tags:Array.isArray(raw.tags)?raw.tags:blank.tags,history:Array.isArray(raw.history)?raw.history:[],settings:{...blank.settings,...raw.settings,bounds:{...blank.settings.bounds,...raw.settings?.bounds}}}}
function toast(message){const root=$('#toast-zone');const element=document.createElement('div');element.className='toast';element.textContent=message;root.append(element);setTimeout(()=>element.remove(),3800)}
function refreshTimeSensitive(){if(!ui.modal&&!ui.quick){const now=dateKey();if(window.__lastRenderDay!==now){window.__lastRenderDay=now;render()}}}
function checkBrowserReminders(){if(NATIVE||!state.settings.notifications||!('Notification'in window))return;const now=Date.now();for(const t of active()){if(t.status==='done'||!t.remindAt||t.remindedAt===t.remindAt)continue;const when=Date.parse(t.remindAt);if(Number.isFinite(when)&&when<=now&&when>=now-864e5){t.remindedAt=t.remindAt;persist();if(Notification.permission==='granted')new Notification('DAYBOARD • Напоминание',{body:t.title})}}}
function stats(){const ts=active();const todayList=ts.filter(onToday);return{today:todayList.length,doneToday:todayList.filter(t=>t.status==='done').length,progress:todayList.filter(t=>t.status==='progress').length,waiting:ts.filter(t=>t.status==='waiting').length,overdue:ts.filter(t=>isOverdue(t)).length,inbox:ts.filter(t=>!t.plannedDate&&t.status!=='done').length}}
const pageName={today:'Сегодня',week:'План на неделю',inbox:'Входящие',history:'История',settings:'Настройки',trash:'Корзина'};
const pageDescription={today:'Ваши задачи и приоритеты на день',week:'Распределяйте задачи по дням одним движением',inbox:'Всё, что ещё не получило дату',history:'Что удалось сделать и когда',settings:'DAYBOARD под ваш рабочий ритм',trash:'Восстановление удалённых задач'};
function render(){const modalScroll=$('.modal-body')?.scrollTop||0;document.body.classList.toggle('compact',state.settings.mode==='compact');ROOT.innerHTML=state.settings.mode==='compact'?renderWidget():renderDesktop();if(ui.modal)ROOT.insertAdjacentHTML('beforeend',renderEditor());if(ui.quick)ROOT.insertAdjacentHTML('beforeend',renderQuick());if(ui.calendar&&ui.modal)ROOT.insertAdjacentHTML('beforeend',renderCalendar());if(ui.modal&&$('.modal-body'))$('.modal-body').scrollTop=modalScroll;}
function renderDesktop(){let s=stats();return `<div class="app-shell"><aside class="sidebar">
  <div class="brand"><div class="brand-mark">${icon('layout')}</div><div><div class="brand-text">dayboard<span style="color:var(--blue)">.</span></div><div class="brand-sub">WORKSPACE</div></div></div>
  <div class="side-label">Планирование</div><nav class="nav-menu" aria-label="Навигация">
  ${navButton('today','sun','Сегодня',s.today)}${navButton('week','calendar','Неделя',null)}${navButton('inbox','inbox','Входящие',s.inbox)}
  </nav><div class="side-label">Организация</div><nav class="nav-menu">${navButton('history','history','История',null)}${navButton('settings','settings','Настройки',null)}</nav>
  <div class="side-label">Проекты и теги</div><div class="side-tags"><button class="tag-row ${ui.tag==='all'?'selected':''}" data-action="set-tag" data-tag="all">${icon('layers')} Все задачи <span class="tag-count">${active().length}</span></button>${state.tags.map(tag=>`<button class="tag-row ${ui.tag===tag.id?'selected':''}" data-action="set-tag" data-tag="${e(tag.id)}"><i class="tag-dot" style="background:${tag.color}"></i>${e(tag.name)}<span class="tag-count">${active().filter(t=>t.tags?.includes(tag.id)).length}</span></button>`).join('')}<button class="tag-row" data-action="tag-add">${icon('plus')} Новый тег</button></div>
  <div class="sidebar-bottom"><div class="mini-stat"><div class="mini-stat-heading"><span>Прогресс сегодня</span><b>${s.doneToday}/${s.today}</b></div><div class="progress-track"><div class="progress-fill" style="width:${s.today?Math.round(s.doneToday/s.today*100):0}%"></div></div></div><button class="nav-btn" data-action="toggle-mode">${icon('monitor')} Режим виджета ${icon('arrow')}</button><div class="footer-note">DAYBOARD 1.0.1 · ${NATIVE?'LOCAL / SQLITE':'WEB PREVIEW'}</div></div>
</aside><main class="main"><header class="topbar"><div class="page-intro"><div class="eyebrow">${e(displayDate(today(),{weekday:'long',day:'numeric',month:'long'}))}</div><h1>${pageName[ui.page]}</h1><p>${pageDescription[ui.page]}</p></div><div class="top-actions"><button class="icon-btn ${state.settings.alwaysOnTop?'active':''}" data-action="toggle-pin" title="${state.settings.alwaysOnTop?'Открепить окно':'Поверх остальных окон'}" aria-label="Закрепить окно">${icon('pin')}</button><button class="icon-btn" data-action="toggle-mode" title="Режим виджета" aria-label="Режим виджета">${icon('minimize')}</button><button class="primary-btn" data-action="quick" data-status="planned">${icon('plus')} Новая задача</button></div></header>
${renderContent()}</main></div>`}
function navButton(page,ico,title,count){return `<button class="nav-btn ${ui.page===page?'active':''}" data-action="page" data-page="${page}">${icon(ico)} ${title} ${count!=null?`<span class="nav-count">${count}</span>`:''}</button>`}
function renderContent(){if(ui.page==='settings')return renderSettings();if(ui.page==='history')return renderHistory();if(ui.page==='inbox')return renderInbox();if(ui.page==='trash')return renderTrash();return `${renderToolbar()}${ui.page==='week'?renderWeek():renderBoard()}${renderBottom()}`}
function renderToolbar(){return `<div class="toolbar"><div class="view-switch"><button class="switch-btn ${ui.page==='today'?'active':''}" data-action="page" data-page="today">Сегодня</button><button class="switch-btn ${ui.page==='week'?'active':''}" data-action="page" data-page="week">Неделя</button></div>${ui.page==='week'?`<div class="week-nav"><button class="icon-btn" data-action="week-prev" aria-label="Предыдущая неделя">${icon('chevron-left')}</button><span class="week-range">${weekTitle()}</span><button class="icon-btn" data-action="week-next" aria-label="Следующая неделя">${icon('chevron-right')}</button><button class="unplanned-chip" data-action="page" data-page="inbox">Входящие ${stats().inbox}</button></div>`:''}<div class="toolbar-spacer"></div><div class="search-wrap">${icon('search')}<input id="search-input" aria-label="Поиск задач" placeholder="Поиск задач..." value="${e(ui.search)}" autocomplete="off"></div><select id="priority-filter" class="select-compact" aria-label="Фильтр приоритета"><option value="all" ${ui.priority==='all'?'selected':''}>Любой приоритет</option><option value="high" ${ui.priority==='high'?'selected':''}>Высокий</option><option value="medium" ${ui.priority==='medium'?'selected':''}>Средний</option><option value="low" ${ui.priority==='low'?'selected':''}>Низкий</option></select></div>`}
function card(t,small=false){let complete=t.status==='done';let checklist=t.checklist||[];let checked=checklist.filter(c=>c.done).length;return `<div class="task-card ${complete?'is-complete':''}" draggable="true" data-task-id="${e(t.id)}" data-action="edit" data-id="${e(t.id)}" role="button" tabindex="0" aria-label="Открыть задачу: ${e(t.title)}"><div class="task-top"><button class="check-task ${complete?'done':''}" data-action="complete" data-id="${e(t.id)}" aria-label="${complete?'Вернуть задачу':'Отметить выполненной'}">${icon('check')}</button><div style="flex:1;min-width:0"><div class="task-title">${e(t.title)}</div>${!small&&t.description?`<div class="task-description">${e(t.description)}</div>`:''}</div>${t.priority==='high'?`<span title="Высокий приоритет" style="color:var(--red)">${icon('flag')}</span>`:''}</div><div class="task-meta">${(t.tags||[]).slice(0,small?1:2).map(displayTag).join('')}${t.dueAt?`<span class="pill ${isOverdue(t)?'overdue':'due'}">${icon('clock')}${e(displayDate(t.dueAt,{day:'numeric',month:'short'}))}</span>`:''}${checklist.length?`<span class="pill count">${icon('checkcircle')}${checked}/${checklist.length}</span>`:''}</div></div>`}
function renderBoard(){const tasks=active().filter(t=>visible(t)&&onToday(t)&& (state.settings.showDone||t.status!=='done'));const counts=stats();return `<div class="summary-row"><div class="summary-box"><div class="summary-icon">${icon('target')}</div><div><h3>${counts.today-counts.doneToday}</h3><p>Задач осталось на сегодня</p></div></div><div class="summary-box amber"><div class="summary-icon">${icon('clock')}</div><div><h3>${counts.waiting}</h3><p>Ожидают ответа</p></div></div><div class="summary-box green"><div class="summary-icon">${icon('checkcircle')}</div><div><h3>${counts.doneToday}</h3><p>Выполнено сегодня</p></div></div></div><div class="board-scroll"><div class="board">${STATUS.map(st=>`<section class="board-col" data-drop-status="${st.id}"><div class="col-head"><span class="status-dot ${st.css}"></span><span class="col-title">${st.name}</span><span class="col-num">${tasks.filter(t=>t.status===st.id).length}</span></div><div class="task-list">${sortTasks(tasks.filter(t=>t.status===st.id)).map(t=>card(t)).join('')}</div>${tasks.some(t=>t.status===st.id)?'':'<div class="empty-col">Здесь пока пусто.<br>Перетащите задачу сюда.</div>'}<button class="add-in-col" data-action="quick" data-status="${st.id}" data-day="${today()}">${icon('plus')} Добавить задачу</button></section>`).join('')}</div></div>`}
function weekStart(){const d=new Date(today()+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7)+ui.weekOffset*7);return dateKey(d)}
function weekTitle(){const st=weekStart(),end=shiftDay(st,6);return `${displayDate(st,{day:'numeric',month:'short'})} — ${displayDate(end,{day:'numeric',month:'short',year:'numeric'})}`}
function renderWeek(){const st=weekStart();const weekdays=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];return `<div class="board-scroll"><div class="week-board">${weekdays.map((name,i)=>{const date=shiftDay(st,i),tasks=sortTasks(active().filter(t=>visible(t)&&t.plannedDate===date&&(state.settings.showDone||t.status!=='done')));return `<section class="week-day ${date===today()?'today':''}" data-drop-day="${date}"><div class="dayhead"><div><span>${name}</span><strong>${displayDate(date,{day:'numeric',month:'short'})}</strong></div><span class="day-count">${tasks.length}</span></div><div class="task-list">${tasks.map(t=>card(t,true)).join('')}</div>${tasks.length?'':'<div class="day-empty">Нет задач</div>'}<button class="add-in-col" data-action="quick" data-day="${date}" data-status="planned">${icon('plus')} Задача</button></section>`}).join('')}</div><div class="week-lower"><button class="outline-btn" data-action="week-reset">${icon('calendar')} Перейти к текущей неделе</button></div></div>`}
function renderBottom(){return `<footer class="bottom-hint"><span>${icon('bolt')} Изменения сохраняются автоматически · ${NATIVE?'SQLite, на этом компьютере':'Браузерный режим (localStorage)'}</span><span><span class="kbd">Ctrl</span> + <span class="kbd">N</span> новая задача &nbsp; · &nbsp; <span class="kbd">Ctrl</span> + <span class="kbd">F</span> поиск</span></footer>`}
function renderInbox(){const tasks=sortTasks(active().filter(t=>visible(t)&&!t.plannedDate&&t.status!=='done'));return `<div class="toolbar"><div class="search-wrap">${icon('search')}<input id="search-input" placeholder="Поиск задач..." value="${e(ui.search)}"></div><div class="toolbar-spacer"></div><button class="outline-btn" data-action="quick" data-day="none">${icon('plus')} Записать во входящие</button></div><div class="screen-panel"><div class="inbox-list">${tasks.length?tasks.map(t=>`<div class="list-item" data-action="edit" data-id="${e(t.id)}">${icon('inbox')}<div style="flex:1"><div class="task-title">${e(t.title)}</div><div class="secondary-text">${e(statusName(t.status))} · ${e(PRIORITY[t.priority])}</div></div>${(t.tags||[]).slice(0,2).map(displayTag).join('')}<span class="push">${icon('chevron-right')}</span></div>`).join(''):emptyBlock('inbox','Входящие пусты','Сюда попадают задачи, которым ещё не назначен день.')}</div></div>`}
function renderHistory(){const completed=active().filter(t=>t.status==='done'&&visible(t)).sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||''));const groups={};for(const t of completed){const date=dd(t.completedAt)||'Без даты';(groups[date] ||= []).push(t)}return `<div class="toolbar"><div style="font-size:12px;color:#9aacc2">Выполнено задач: <b style="color:#dceaf9">${completed.length}</b></div><div class="toolbar-spacer"></div><button class="outline-btn" data-action="page" data-page="today">${icon('arrow')} Вернуться к доске</button></div><div class="screen-panel"><div class="history-list">${completed.length?Object.entries(groups).map(([date,list])=>`<div class="list-heading">${date==='Без даты'?date:displayDate(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>${list.map(t=>`<div class="list-item" data-action="edit" data-id="${e(t.id)}"><span style="color:var(--green)">${icon('checkcircle')}</span><div style="flex:1"><div class="task-title">${e(t.title)}</div><div class="secondary-text">${t.completedAt?new Date(t.completedAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):''} · ${e(statusName(t.status))}</div></div>${(t.tags||[]).slice(0,2).map(displayTag).join('')}<span style="color:#8298af">${icon('chevron-right')}</span></div>`).join('')}`).join(''):emptyBlock('checkcircle','Пока нет выполненных задач','Завершённые дела появятся здесь с датой и временем выполнения.')}</div></div>`}
function emptyBlock(ico,title,subtitle){return `<div class="empty-screen"><div class="empty-art">${icon(ico)}</div><h2>${title}</h2><p>${subtitle}</p><button class="primary-btn" style="margin:20px auto" data-action="quick">${icon('plus')} Новая задача</button></div>`}
function renderTrash(){const tasks=state.tasks.filter(t=>t.deletedAt).sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));return `<div class="screen-panel" style="padding-top:25px"><div class="inbox-list">${tasks.length?tasks.map(t=>`<div class="list-item"><span style="color:#e08e95">${icon('trash')}</span><div style="flex:1"><div class="task-title">${e(t.title)}</div><div class="secondary-text">Удалено: ${e(displayDate(t.deletedAt,{day:'numeric',month:'short',year:'numeric'}))}</div></div><button class="outline-btn" data-action="restore-deleted" data-id="${e(t.id)}">${icon('refresh')} Вернуть</button><button class="plain-icon" data-action="delete-forever" data-id="${e(t.id)}" title="Удалить навсегда">${icon('close')}</button></div>`).join(''):emptyBlock('trash','Корзина пуста','Здесь будут временно храниться удалённые задачи.')}</div></div>`}
function renderSettings(){const s=state.settings;const setting=(key,label,sub,disabled=false)=>`<div class="setting-row"><div><strong>${label}</strong><small>${sub}</small></div><button role="switch" aria-checked="${!!s[key]}" class="toggle ${s[key]?'on':''}" data-action="setting-toggle" data-key="${key}" ${disabled?'disabled title="Только в установленном Windows-приложении"':''} aria-label="${label}"></button></div>`;return `<div class="screen-panel" style="padding-top:26px"><div class="setting-section"><h2>Окно и поведение</h2><p>Настройки отображения DAYBOARD на рабочем столе Windows.</p>${setting('alwaysOnTop','Всегда поверх окон','Фиксировать DAYBOARD поверх других программ',!NATIVE)}${setting('autostart','Запуск вместе с Windows','Автоматический запуск после входа в систему',!NATIVE)}${setting('startCompact','Компактный режим при запуске','Открывать приложение в виде виджета')}${setting('closeToTray','Сворачивать при закрытии','Продолжать работу и напоминания через системный трей',!NATIVE)}${setting('showDone','Показывать выполненные','Оставлять завершённые карточки на доске')}</div><div class="setting-section"><h2>Напоминания</h2><p>Уведомления доступны без облачных служб.</p>${setting('notifications','Включить уведомления','Показывать напоминания о задачах')}</div><div class="setting-section"><h2>Данные и резервные копии</h2><p>Все данные хранятся локально. Для переноса можно экспортировать JSON и загрузить его на другом компьютере.</p><div class="setting-buttons"><button class="outline-btn" data-action="export">${icon('download')} Экспорт данных</button><button class="outline-btn" data-action="import">${icon('upload')} Импорт JSON</button>${NATIVE?`<button class="outline-btn" data-action="backup">${icon('refresh')} Сделать резервную копию</button>`:''}</div>${NATIVE?`<div class="callout">${icon('checkcircle')} SQLite расположен в каталоге данных приложения. Ежедневные резервные копии создаются автоматически при работающем приложении.</div>`:`<div class="callout">${icon('alert')} Запущена браузерная версия: сохранение в localStorage, без автозапуска и интеграции с треем Windows. Для нативных функций соберите приложение Tauri.</div>`}</div><div class="setting-section"><h2>Мои теги</h2><p>Создавайте группы для проектов и областей жизни. Теги можно назначить каждой карточке.</p><div class="setting-buttons" style="margin:10px 0 17px"><button class="outline-btn" data-action="tag-add">${icon('plus')} Новый тег</button></div>${state.tags.map(tag=>`<div class="setting-row"><div style="display:flex;align-items:center;gap:10px"><span class="tag-dot" style="background:${tag.color};width:11px;height:11px"></span><strong style="margin:0">${e(tag.name)}</strong></div><div style="display:flex;gap:5px"><button class="plain-icon" data-action="tag-rename" data-tag="${e(tag.id)}" title="Переименовать">${icon('more')}</button><button class="plain-icon" data-action="tag-delete" data-tag="${e(tag.id)}" title="Удалить тег">${icon('trash')}</button></div></div>`).join('')}</div><div class="setting-section"><h2>Примерные задачи</h2><p>DAYBOARD поставляется с несколькими демонстрационными карточками. Удаление примеров не влияет на собственные задачи.</p><button class="outline-btn danger" data-action="clear-samples">${icon('trash')} Удалить примеры (${state.tasks.filter(t=>t.isSample&&!t.deletedAt).length})</button></div><div class="setting-section"><h2>Корзина</h2><p>Удалённые задачи можно вернуть или стереть окончательно.</p><button class="outline-btn" data-action="show-trash">${icon('trash')} Открыть корзину (${state.tasks.filter(t=>t.deletedAt).length})</button></div><div class="setting-section"><h2>О программе</h2><p>DAYBOARD 1.0.1 · Windows 11 · Local-first. Без аккаунта, аналитики и фоновой синхронизации.</p><div class="callout">${icon('bolt')} В этой версии нет обязательного сервера. Синхронизация с телефоном запланирована как отдельное расширение.</div></div></div>`}
function renderWidget(){const s=stats(),ts=sortTasks(active().filter(t=>visible(t)&&onToday(t)&&(ui.widgetTab==='done'?t.status==='done':t.status!=='done')));return `<div class="widget-root"><div class="widget-head"><div><div class="widget-title">Сегодня <span style="color:#85adf6">·</span></div><div class="widget-sub">${e(displayDate(today(),{weekday:'long',day:'numeric',month:'long'}))}</div></div><div class="widget-actions"><button class="icon-btn" data-action="quick" title="Создать задачу">${icon('plus')}</button><button class="icon-btn ${state.settings.alwaysOnTop?'active':''}" data-action="toggle-pin" title="Закрепить">${icon('pin')}</button><button class="icon-btn" data-action="toggle-mode" title="Открыть доску">${icon('maximize')}</button></div></div><div class="widget-stats"><div class="widget-percent"><span>Прогресс за день</span><b>${s.doneToday} из ${s.today}</b></div><div class="progress-track" style="margin:0;height:6px"><div class="progress-fill" style="width:${s.today?s.doneToday/s.today*100:0}%"></div></div>${s.overdue?`<div style="font-size:11px;color:var(--amber)">${icon('alert')} ${s.overdue} просрочено</div>`:''}</div><div class="widget-tabs"><button class="widget-tab ${ui.widgetTab==='active'?'active':''}" data-action="widget-tab" data-tab="active">В работе · ${s.today-s.doneToday}</button><button class="widget-tab ${ui.widgetTab==='done'?'active':''}" data-action="widget-tab" data-tab="done">Готово · ${s.doneToday}</button></div><div class="widget-list">${ts.length?ts.map(t=>`<div class="widget-task" data-action="edit" data-id="${e(t.id)}"><button class="check-task ${t.status==='done'?'done':''}" style="margin-top:1px" data-action="complete" data-id="${e(t.id)}">${icon('check')}</button><div style="min-width:0;flex:1"><div class="task-title" style="${t.status==='done'?'text-decoration:line-through;color:#91a2b5':''}">${e(t.title)}</div><div class="task-meta">${(t.tags||[]).slice(0,1).map(displayTag).join('')}<span class="pill count">${e(statusName(t.status))}</span></div></div>${icon('chevron-right')}</div>`).join(''):`<div class="widget-empty">${icon('checkcircle')}${ui.widgetTab==='done'?'Пока ничего не завершено':'Свободный день! Добавьте новую задачу.'}</div>`}</div><div class="widget-footer"><span>${s.waiting} ожидают ответа</span><button class="plain-icon" data-action="toggle-mode" title="Развернуть доску">${icon('arrow')} <span style="font-size:11px">Вся доска</span></button></div></div>`}
// A single, app-styled date picker is shared by planned date, deadline and reminder.
// The inline value can also be edited manually in Russian or ISO notation.
function parseCalendarDay(text){
  const raw=String(text||'').trim();
  let year,month,day;
  let m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){[,year,month,day]=m;}
  else{m=raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);if(!m)return null;[,day,month,year]=m;}
  year=+year;month=+month;day=+day;
  if(year<1900||year>2100||month<1||month>12||day<1||day>31)return null;
  const d=new Date(year,month-1,day,12);
  return d.getFullYear()===year&&d.getMonth()===month-1&&d.getDate()===day?dateKey(d):null;
}
function formatCalendarDay(key){if(!key)return'';const [y,m,d]=key.split('-');return `${d}.${m}.${y}`;}
function calendarKind(field){return field==='plannedDate'?'date':'datetime';}
function calendarValue(field){const raw=ui.draft?.[field];if(!raw)return null;const d=field==='plannedDate'?new Date(raw+'T12:00:00'):new Date(raw);return Number.isFinite(d.getTime())?d:null;}
function renderDateField(field,label){
  const value=calendarValue(field);
  const kind=calendarKind(field);
  const text=value?(kind==='date'?displayDate(ui.draft[field],{day:'numeric',month:'long',year:'numeric'}):value.toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})):'Выбрать дату'+(kind==='datetime'?' и время':'');
  return `<div class="form-field"><span class="form-label">${label}</span><button type="button" class="date-entry ${value?'has-value':''}" data-action="open-date" data-field-name="${field}" aria-haspopup="dialog" aria-label="${label}. ${e(text)}"><span class="date-entry-icon">${icon('calendar')}</span><span class="date-entry-text">${e(text)}</span><span class="date-entry-chevron">${icon('chevron-right')}</span></button></div>`;
}
function openCalendar(field,anchor){
  if(!ui.draft||!['plannedDate','dueAt','remindAt'].includes(field))return;
  const value=calendarValue(field),day=value?dateKey(value):today(),now=new Date();
  const r=anchor?.getBoundingClientRect?.()||{left:20,right:320,top:80,bottom:115};
  const width=Math.min(320,window.innerWidth-16);
  const x=Math.max(8,Math.min(window.innerWidth-width-8,r.left));
  const y=r.bottom+8+450<=window.innerHeight?r.bottom+8:Math.max(8,Math.min(window.innerHeight-450,r.top-452));
  ui.calendar={field,kind:calendarKind(field),text:formatCalendarDay(day),time:value?`${pad(value.getHours())}:${pad(value.getMinutes())}`:'09:00',month:+day.slice(5,7)-1,year:+day.slice(0,4),x,y,error:''};
  render();setTimeout(()=>$('#calendar-manual')?.focus(),0);
}
function renderCalendar(){
  const c=ui.calendar;if(!c)return'';
  const first=new Date(c.year,c.month,1,12),offset=(first.getDay()+6)%7,last=new Date(c.year,c.month+1,0).getDate();
  const selected=parseCalendarDay(c.text),cells=[];
  const days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  for(let i=0;i<offset;i++)cells.push('<span class="calendar-blank"></span>');
  for(let i=1;i<=last;i++){
    const key=`${c.year}-${pad(c.month+1)}-${pad(i)}`;
    cells.push(`<button type="button" class="calendar-day ${key===selected?'selected':''} ${key===today()?'is-today':''}" data-action="calendar-day" data-date="${key}" aria-label="${e(displayDate(key,{day:'numeric',month:'long',year:'numeric'}))}" aria-pressed="${key===selected}">${i}</button>`);
  }
  return `<div class="date-overlay"><button class="date-dismiss" data-action="calendar-close" aria-label="Закрыть календарь"></button><section class="date-popover" role="dialog" aria-label="Выбрать дату${c.kind==='datetime'?' и время':''}" style="--calendar-left:${c.x}px;--calendar-top:${c.y}px"><div class="calendar-header"><span class="calendar-title">${e(new Date(c.year,c.month,1).toLocaleDateString('ru-RU',{month:'long',year:'numeric'}))}</span><div class="calendar-nav"><button type="button" data-action="calendar-prev" aria-label="Предыдущий месяц">${icon('chevron-left')}</button><button type="button" data-action="calendar-next" aria-label="Следующий месяц">${icon('chevron-right')}</button></div></div><div class="calendar-weekdays">${days.map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div><div class="calendar-fields"><label class="calendar-input-group"><span>Дата</span><input id="calendar-manual" inputmode="numeric" autocomplete="off" placeholder="ДД.ММ.ГГГГ" value="${e(c.text)}" aria-label="Дата, ручной ввод"></label>${c.kind==='datetime'?`<label class="calendar-input-group calendar-time"><span>Время</span><input id="calendar-time" inputmode="numeric" autocomplete="off" placeholder="ЧЧ:ММ" value="${e(c.time)}" aria-label="Время, ручной ввод"></label>`:''}</div>${c.error?`<div class="calendar-error" role="alert">${e(c.error)}</div>`:''}<div class="calendar-footer"><button type="button" class="calendar-link" data-action="calendar-clear">Очистить</button><div class="calendar-footer-actions"><button type="button" class="calendar-link" data-action="calendar-today">Сегодня</button><button type="button" class="calendar-apply" data-action="calendar-apply">Применить</button></div></div></section></div>`;
}
function commitCalendar(){
  const c=ui.calendar;if(!c||!ui.draft)return;
  const day=parseCalendarDay(c.text);
  if(!day){c.error='Введите существующую дату: ДД.ММ.ГГГГ';renderCalendarOnly();return;}
  let value=day;
  if(c.kind==='datetime'){
    const m=c.time.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if(!m){c.error='Время в формате ЧЧ:ММ';renderCalendarOnly();return;}
    const [year,month,date]=day.split('-').map(Number);
    value=new Date(year,month-1,date,+m[1],+m[2]).toISOString();
  }
  ui.draft[c.field]=value;ui.calendar=null;render();
}
function renderCalendarOnly(){const overlay=$('.date-overlay');if(overlay){const focused=document.activeElement?.id;overlay.outerHTML=renderCalendar();if(focused)document.getElementById(focused)?.focus();}}
function changeCalendarMonth(delta){
  const c=ui.calendar;if(!c)return;
  const d=new Date(c.year,c.month+delta,1,12);c.month=d.getMonth();c.year=d.getFullYear();c.error='';renderCalendarOnly();
}
function renderEditor(){const t=ui.draft;if(!t)return'';const dateValue=x=>x?localDateTime(new Date(x)):'';return `<div class="modal-shade" data-overlay="editor"><section class="modal-panel" role="dialog" aria-modal="true" aria-label="Карточка задачи"><header class="modal-head"><div><div class="eyebrow">${ui.modal==='new'?'НОВАЯ КАРТОЧКА':'КАРТОЧКА ЗАДАЧИ'}</div><div class="modal-title">${ui.modal==='new'?'Создать задачу':'Редактировать задачу'}</div></div><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button></header><div class="modal-body">
<label class="form-field"><span class="form-label">Название задачи *</span><input class="text-input" data-field="title" id="editor-title" maxlength="180" placeholder="Что нужно сделать?" value="${e(t.title)}" autofocus></label>
<label class="form-field"><span class="form-label">Описание</span><textarea class="text-area" data-field="description" id="editor-description" placeholder="Контекст, идеи, заметки...">${e(t.description)}</textarea></label>
<div class="form-grid"><label class="form-field"><span class="form-label">Статус</span><select class="field-select" data-field="status">${STATUS.map(st=>`<option value="${st.id}" ${t.status===st.id?'selected':''}>${st.name}</option>`).join('')}</select></label><label class="form-field"><span class="form-label">Приоритет</span><select class="field-select" data-field="priority">${Object.entries(PRIORITY).map(([key,name])=>`<option value="${key}" ${t.priority===key?'selected':''}>${name}</option>`).join('')}</select></label></div>
<div class="form-grid">${renderDateField('plannedDate','Запланировано на')}${renderDateField('dueAt','Дедлайн')}</div>
<div>${renderDateField('remindAt','Напоминание')}<span style="display:block;margin-top:7px;font-size:10px;color:#7e91a9">Необязательное поле. В Windows уведомление появится, пока DAYBOARD работает в том числе через трей.</span></div>
<div class="form-field"><span class="form-label">Теги и проекты</span><div class="tag-picker">${state.tags.map(tag=>`<button class="tag-choice ${(t.tags||[]).includes(tag.id)?'selected':''}" data-action="editor-tag" data-tag="${e(tag.id)}"><i class="tag-dot" style="background:${tag.color}"></i>${e(tag.name)} ${(t.tags||[]).includes(tag.id)?icon('check'):''}</button>`).join('')}</div></div>
<div class="form-field"><span class="form-label">Чек-лист ${t.checklist?.length?`· ${t.checklist.filter(x=>x.done).length}/${t.checklist.length}`:''}</span><div class="checklist-edit">${(t.checklist||[]).map((c,i)=>`<div class="check-line"><input type="checkbox" data-check-id="${e(c.id)}" ${c.done?'checked':''} aria-label="Выполнено"><input class="text-input" value="${e(c.text)}" data-check-text="${e(c.id)}" placeholder="Пункт чек-листа" maxlength="200"><button class="plain-icon" data-action="remove-check" data-id="${e(c.id)}" title="Удалить пункт">${icon('close')}</button></div>`).join('')}<button class="subtle-button" data-action="add-check">${icon('plus')} Добавить пункт</button></div></div>
<div class="form-field"><span class="form-label">Создано</span><span style="font-size:11px;color:#869bb6">${e(displayDate(t.createdAt,{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}))}</span></div></div><footer class="modal-foot"><div>${ui.modal!=='new'?`<button class="outline-btn danger" data-action="delete-task" data-id="${e(t.id)}">${icon('trash')} Удалить</button>`:''}</div><div style="display:flex;gap:9px"><button class="outline-btn" data-action="close-modal">Отмена</button><button class="primary-btn" data-action="save-editor">${icon('check')} Сохранить</button></div></footer></section></div>`}
function renderQuick(){const q=ui.quick;return `<div class="modal-shade quick-shade" data-overlay="quick"><div class="quick-panel" role="dialog" aria-modal="true" aria-label="Быстрое добавление задачи"><div class="quick-label">${icon('bolt')} БЫСТРОЕ ДОБАВЛЕНИЕ · ${q.day===null?'Во входящие':relativeDay(q.day)}</div><input class="quick-input" id="quick-input" placeholder="Название новой задачи..." maxlength="180" autofocus autocomplete="off"><div class="quick-bottom"><div class="quick-hint"><span class="kbd">Enter</span> создать · <span class="kbd">Esc</span> отмена</div><button class="primary-btn" data-action="quick-create">${icon('plus')} Создать</button></div></div></div>`}
function openQuick(btn){ui.calendar=null;const raw=btn?.dataset?.day;ui.quick={day:raw==='none'?null:(raw||today()),status:btn?.dataset?.status||'planned'};ui.modal=null;render();setTimeout(()=>$('#quick-input')?.focus(),0)}
function openEditor(taskId){ui.calendar=null;if(taskId==='new'){ui.draft=newTask({plannedDate:ui.page==='inbox'?null:today(),tags:ui.tag==='all'?[]:[ui.tag]});ui.modal='new'}else{const task=state.tasks.find(t=>t.id===taskId);if(!task)return;ui.draft=JSON.parse(JSON.stringify(task));ui.modal=task.id}ui.quick=null;render();setTimeout(()=>$('#editor-title')?.focus(),0)}
function closeOverlays(){if(ui.calendar){ui.calendar=null;render();return}if(ui.modal||ui.quick){ui.modal=null;ui.quick=null;ui.calendar=null;ui.draft=null;render()}}
function makeQuick(){const title=$('#quick-input')?.value.trim();if(!title){$('#quick-input')?.focus();return}const q=ui.quick||{};const task=newTask({title,plannedDate:q.day??null,status:q.status||'planned',tags:ui.tag==='all'?[]:[ui.tag]});if(task.status==='done'){task.completedAt=stamp();log('completed',task.title,task.id)}state.tasks.push(task);ui.quick=null;ui.calendar=null;persist();render();toast('Задача добавлена');}
function saveEditor(){const t=ui.draft;if(!t)return;const title=(t.title||'').trim();if(!title){$('#editor-title')?.focus();toast('Укажите название задачи');return}t.title=title;t.description=(t.description||'').trim();t.checklist=(t.checklist||[]).filter(item=>item.text?.trim()).map(item=>({...item,text:item.text.trim()}));t.updatedAt=stamp();t.revision=(t.revision||0)+1;t.isSample=false;const old=state.tasks.find(x=>x.id===t.id);if(!old){if(t.status==='done'){t.completedAt=stamp();log('completed',t.title,t.id)}state.tasks.push(t);log('created',t.title,t.id)}else{if(old.status!=='done'&&t.status==='done'){t.completedAt=stamp();log('completed',t.title,t.id)}else if(old.status==='done'&&t.status!=='done'){t.completedAt=null;log('restored',t.title,t.id)}else if(old.title!==t.title||old.status!==t.status)log('updated',t.title,t.id);state.tasks[state.tasks.indexOf(old)]=t}ui.modal=null;ui.calendar=null;ui.draft=null;persist();render();toast('Изменения сохранены')}
function removeTask(taskId){const t=state.tasks.find(t=>t.id===taskId);if(!t)return;if(!confirm(`Переместить задачу «${t.title}» в корзину?`))return;t.deletedAt=stamp();t.updatedAt=stamp();log('deleted',t.title,t.id);ui.modal=null;ui.draft=null;persist();render();toast('Задача перемещена в корзину')}
function setSetting(key,val){const s=state.settings;s[key]=val;persist();render();if(NATIVE){try{if(key==='alwaysOnTop')window.__TAURI__.core.invoke('set_always_on_top',{enabled:val}).catch(err=>toast(String(err)));if(key==='autostart')window.__TAURI__.core.invoke('set_autostart',{enabled:val}).catch(err=>{s[key]=!val;persist();render();toast('Не удалось изменить автозапуск: '+err)});if(key==='closeToTray')window.__TAURI__.core.invoke('set_close_to_tray',{enabled:val}).catch(err=>toast(String(err)))}catch(err){toast(String(err))}}else if(key==='notifications'&&val&&'Notification'in window&&Notification.permission==='default')Notification.requestPermission();}
let modeChanging=false;
async function toggleMode(){const mode=state.settings.mode==='compact'?'full':'compact';if(NATIVE){const win=window.__TAURI__.window.getCurrentWindow();modeChanging=true;try{const position=await win.outerPosition(),size=await win.innerSize();state.settings.bounds[state.settings.mode]={x:position.x,y:position.y,width:size.width,height:size.height};const bounds=state.settings.bounds[mode];const dpi=window.__TAURI__.dpi;if(bounds){await win.setSize(new dpi.PhysicalSize(bounds.width,bounds.height));if(await safePosition(bounds))await win.setPosition(new dpi.PhysicalPosition(bounds.x,bounds.y));else await win.center()}else{await win.setSize(new dpi.LogicalSize(mode==='compact'?390:1240,mode==='compact'?650:810));await win.center()}}catch(err){toast('Не удалось изменить окно: '+err)}finally{setTimeout(()=>{modeChanging=false},850)}}state.settings.mode=mode;ui.modal=null;ui.quick=null;persist();render()}
async function safePosition(bounds){if(!NATIVE)return false;try{const mons=await window.__TAURI__.window.availableMonitors();return mons.some(m=>{const a=m.position,b=m.size;return bounds.x<b.width+a.x-80&&bounds.x+bounds.width>a.x+80&&bounds.y<a.y+b.height-60&&bounds.y+bounds.height>a.y+60})}catch{return false}}
const saveWindowBounds=debounce(async()=>{if(!NATIVE||modeChanging)return;try{const win=window.__TAURI__.window.getCurrentWindow();const pos=await win.outerPosition(),size=await win.innerSize();state.settings.bounds[state.settings.mode]={x:pos.x,y:pos.y,width:size.width,height:size.height};persist()}catch{}},1300);
async function restoreWindow(){if(!NATIVE)return;const win=window.__TAURI__.window.getCurrentWindow(),dpi=window.__TAURI__.dpi;try{const desired=state.settings.startCompact?'compact':state.settings.mode;state.settings.mode=desired;const bounds=state.settings.bounds[desired];if(bounds){await win.setSize(new dpi.PhysicalSize(bounds.width,bounds.height));if(await safePosition(bounds))await win.setPosition(new dpi.PhysicalPosition(bounds.x,bounds.y));else await win.center()}else if(desired==='compact'){await win.setSize(new dpi.LogicalSize(390,650));await win.center()}await win.onResized(saveWindowBounds);await win.onMoved(saveWindowBounds);render()}catch(err){console.warn('Restore window:',err)}}
function exportJson(){const json=JSON.stringify(state,null,2);const blob=new Blob([json],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`dayboard-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),12000);toast('Резервная копия экспортирована')}
function importJson(text){try{const incoming=JSON.parse(text);if(!incoming||incoming.version!==1||!Array.isArray(incoming.tasks)||!Array.isArray(incoming.tags)||!Array.isArray(incoming.history)||typeof incoming.settings!=='object')throw new Error('Неизвестный формат файла');if(incoming.tasks.some(t=>!t.id||typeof t.title!=='string'||!STATUS.some(s=>s.id===t.status)))throw new Error('Некорректные задачи');if(!confirm(`Заменить текущие данные импортом (${incoming.tasks.length} задач)? Перед импортом рекомендуется сделать экспорт.`))return;state=normalize(incoming);ui.modal=null;ui.quick=null;ui.tag='all';persist();render();toast('Данные восстановлены')}catch(err){toast('Не удалось импортировать файл: '+err.message)}}
async function runAction(btn){const action=btn.dataset.action,taskId=btn.dataset.id;switch(action){
case 'page':ui.page=btn.dataset.page;ui.modal=null;ui.quick=null;render();break;
case 'quick':openQuick(btn);break;
case 'quick-create':makeQuick();break;
case 'edit':openEditor(taskId);break;
case 'close-modal':closeOverlays();break;
case 'open-date':openCalendar(btn.dataset.fieldName,btn);break;
case 'calendar-close':ui.calendar=null;render();break;
case 'calendar-prev':changeCalendarMonth(-1);break;
case 'calendar-next':changeCalendarMonth(1);break;
case 'calendar-day':ui.calendar.text=formatCalendarDay(btn.dataset.date);ui.calendar.error='';renderCalendarOnly();break;
case 'calendar-today':{const d=today();ui.calendar.text=formatCalendarDay(d);ui.calendar.month=+d.slice(5,7)-1;ui.calendar.year=+d.slice(0,4);renderCalendarOnly();break;}
case 'calendar-clear':ui.draft[ui.calendar.field]=ui.calendar.field==='plannedDate'?null:'';ui.calendar=null;render();break;
case 'calendar-apply':commitCalendar();break;
case 'complete':{const t=state.tasks.find(x=>x.id===taskId);if(t)updateTask(taskId,{status:t.status==='done'?'planned':'done'});break}
case 'toggle-mode':await toggleMode();break;
case 'toggle-pin':setSetting('alwaysOnTop',!state.settings.alwaysOnTop);if(!NATIVE)toast('Закрепление окна доступно в Windows-версии');break;
case 'set-tag':ui.tag=btn.dataset.tag;render();break;
case 'tag-add':{const name=prompt('Название нового тега:')?.trim();if(!name)return;if(state.tags.some(t=>t.name.toLowerCase()===name.toLowerCase())){toast('Такой тег уже есть');return}state.tags.push({id:id(),name:name.slice(0,40),color:COLORS[state.tags.length%COLORS.length]});persist();render();toast('Тег добавлен');break}
case 'tag-rename':{const t=state.tags.find(t=>t.id===btn.dataset.tag);if(!t)return;const name=prompt('Новое название тега:',t.name)?.trim();if(!name)return;t.name=name.slice(0,40);persist();render();break}
case 'tag-delete':{const key=btn.dataset.tag,t=state.tags.find(t=>t.id===key);if(!t)return;if(!confirm(`Удалить тег «${t.name}»? Сами задачи останутся.`))return;state.tags=state.tags.filter(x=>x.id!==key);for(const task of state.tasks)task.tags=(task.tags||[]).filter(x=>x!==key);if(ui.tag===key)ui.tag='all';persist();render();break}

case 'week-prev':ui.weekOffset-=1;render();break;
case 'week-next':ui.weekOffset+=1;render();break;
case 'week-reset':ui.weekOffset=0;render();break;
case 'widget-tab':ui.widgetTab=btn.dataset.tab;render();break;
case 'save-editor':saveEditor();break;
case 'add-check':ui.draft.checklist.push({id:id(),text:'',done:false});render();setTimeout(()=>$$('[data-check-text]').at(-1)?.focus(),0);break;
case 'remove-check':ui.draft.checklist=ui.draft.checklist.filter(x=>x.id!==taskId);render();break;
case 'editor-tag':{const tag=btn.dataset.tag;ui.draft.tags=ui.draft.tags||[];ui.draft.tags=ui.draft.tags.includes(tag)?ui.draft.tags.filter(x=>x!==tag):[...ui.draft.tags,tag];render();break}
case 'delete-task':removeTask(taskId);break;
case 'setting-toggle':setSetting(btn.dataset.key,!state.settings[btn.dataset.key]);break;
case 'export':exportJson();break;
case 'import':$('#import-file').click();break;
case 'backup':if(NATIVE){try{const location=await window.__TAURI__.core.invoke('backup_now');toast('Копия сохранена: '+location)}catch(err){toast('Ошибка копирования: '+err)}}break;
case 'clear-samples':{const count=state.tasks.filter(t=>t.isSample&&!t.deletedAt).length;if(!count)return;if(!confirm(`Удалить ${count} примерных задач?`))return;for(const t of state.tasks)if(t.isSample&&!t.deletedAt)t.deletedAt=stamp();persist();render();toast('Примеры удалены');break}
case 'show-trash':ui.page='trash';render();break;
case 'restore-deleted':{const t=state.tasks.find(t=>t.id===taskId);if(t){t.deletedAt=null;t.updatedAt=stamp();persist();render();toast('Задача восстановлена')}break}
case 'delete-forever':{const t=state.tasks.find(t=>t.id===taskId);if(t&&confirm('Удалить задачу навсегда?')){state.tasks=state.tasks.filter(x=>x.id!==t.id);persist();render()}break}
}}
function moveCard(draggedId,container,beforeId=null){
  const moving=state.tasks.find(t=>t.id===draggedId);
  if(!moving||!container)return;
  const status=container.dataset.dropStatus||moving.status;
  const day=container.dataset.dropDay||moving.plannedDate;
  // The board changes status, the weekly planner changes the scheduled day.
  const patch={};if(container.dataset.dropStatus)patch.status=status;if(container.dataset.dropDay)patch.plannedDate=day;
  const group=sortTasks(active().filter(t=>t.id!==moving.id&&
    (container.dataset.dropStatus?t.status===status&&onToday(t):t.plannedDate===day)));
  const index=beforeId?group.findIndex(t=>t.id===beforeId):-1;
  if(index<0)group.push(moving);else group.splice(index,0,moving);
  // Re-index only the affected column/day, keeping changes stable across restarts.
  const base=Date.now();group.forEach((t,i)=>{t.position=base+i;t.updatedAt=stamp();t.revision=(t.revision||0)+1;});
  const wasDone=moving.status==='done';Object.assign(moving,patch,{isSample:false});
  if(!wasDone&&moving.status==='done'){moving.completedAt=stamp();log('completed',moving.title,moving.id);}
  else if(wasDone&&moving.status!=='done'){moving.completedAt=null;log('restored',moving.title,moving.id);}
  persist();render();
}
function dragTarget(ev){
  const target=ev.target.closest?.('[data-drop-status],[data-drop-day]');
  if(!target)return null;
  const hovering=ev.target.closest?.('.task-card');
  // Drop above the next card when hovering over its upper half, otherwise below it.
  let beforeId=null;
  if(hovering&&hovering.dataset.taskId!==ui.dragId){
    const rect=hovering.getBoundingClientRect();
    const after=ev.clientY>rect.top+rect.height/2;
    if(!after)beforeId=hovering.dataset.taskId;
    else beforeId=hovering.nextElementSibling?.classList.contains('task-card')?hovering.nextElementSibling.dataset.taskId:null;
  }
  return {container:target,beforeId};
}
function registerEvents(){
  document.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-action]');
    if(btn){
      ev.preventDefault();
      if(btn.dataset.action==='edit'&&Date.now()<ui.suppressClickUntil)return;
      runAction(btn).catch(err=>toast(String(err)));
      return;
    }
    if(ev.target.matches('.modal-shade'))closeOverlays();
  });
  document.addEventListener('input',ev=>{
    const target=ev.target;
    if(ui.calendar&&target.id==='calendar-manual'){ui.calendar.text=target.value;ui.calendar.error='';return;}
    if(ui.calendar&&target.id==='calendar-time'){ui.calendar.time=target.value;ui.calendar.error='';return;}
    if(target.id==='search-input'){
      const start=target.selectionStart??target.value.length;ui.search=target.value;render();
      const inp=$('#search-input');inp?.focus();inp?.setSelectionRange(start,start);return;
    }
    if(target.matches('[data-field]')&&ui.draft){ui.draft[target.dataset.field]=target.value;return;}
    if(target.matches('[data-check-text]')&&ui.draft){const entry=ui.draft.checklist.find(x=>x.id===target.dataset.checkText);if(entry)entry.text=target.value;}
  });
  document.addEventListener('change',ev=>{
    const target=ev.target;
    if(target.id==='priority-filter'){ui.priority=target.value;render();}
    if(target.matches('[data-check-id]')&&ui.draft){const item=ui.draft.checklist.find(x=>x.id===target.dataset.checkId);if(item)item.done=target.checked;}
  });
  // Capture shortcuts before WebView2's default actions (including Ctrl+N).
  window.addEventListener('keydown',ev=>{
    if((ev.ctrlKey||ev.metaKey)&&!ev.altKey&&ev.key.toLowerCase()==='n'){
      ev.preventDefault();ev.stopPropagation();
      if(ev.repeat)return;
      if(ui.modal){$('#editor-title')?.focus();toast('Сохраните или закройте текущую карточку');}
      else if(ui.quick){$('#quick-input')?.focus();}
      else openQuick();
      return;
    }
    if(ev.key==='Escape'){
      if(ui.calendar){ev.preventDefault();ui.calendar=null;render();}
      else if(ui.modal||ui.quick){ev.preventDefault();closeOverlays();}
      else if(ui.search){ui.search='';render();}
      return;
    }
    if(ev.key==='Enter'&&ui.calendar&&(ev.target.id==='calendar-manual'||ev.target.id==='calendar-time')){
      ev.preventDefault();commitCalendar();return;
    }
    if(ev.key==='Enter'&&ui.quick&&ev.target.id==='quick-input'){ev.preventDefault();makeQuick();return;}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='f'){
      ev.preventDefault();if(state.settings.mode==='compact'){openEditor('new');return;}
      if(!['today','week','inbox'].includes(ui.page)){ui.page='today';render();}$('#search-input')?.focus();return;
    }
    if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'&&ui.modal){ev.preventDefault();if(ui.calendar)commitCalendar();else saveEditor();return;}
    if(ev.key==='Enter'&&ev.target.matches('.task-card')){ev.preventDefault();openEditor(ev.target.dataset.taskId);}
  },true);
  document.addEventListener('dragstart',ev=>{
    const card=ev.target.closest?.('.task-card');if(!card)return;
    if(ev.target.closest('button,input,textarea,select')){ev.preventDefault();return;}
    ui.dragId=card.dataset.taskId;
    ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',ui.dragId);
    requestAnimationFrame(()=>card.classList.add('dragging'));
  });
  document.addEventListener('dragover',ev=>{
    if(!ui.dragId)return;
    const drop=dragTarget(ev);if(!drop)return;
    ev.preventDefault();ev.dataTransfer.dropEffect='move';
    $$('.drag-over').forEach(x=>x.classList.remove('drag-over'));
    drop.container.classList.add('drag-over');
  });
  document.addEventListener('drop',ev=>{
    const drop=dragTarget(ev);
    $$('.drag-over').forEach(x=>x.classList.remove('drag-over'));
    const draggedId=ui.dragId||ev.dataTransfer?.getData('text/plain');
    if(!drop||!draggedId)return;
    ev.preventDefault();ui.suppressClickUntil=Date.now()+450;ui.dragId=null;
    moveCard(draggedId,drop.container,drop.beforeId);
  });
  document.addEventListener('dragend',()=>{
    ui.dragId=null;ui.suppressClickUntil=Date.now()+220;
    $$('.drag-over,.dragging').forEach(x=>x.classList.remove('drag-over','dragging'));
  });
  $('#import-file').addEventListener('change',async ev=>{
    const file=ev.target.files?.[0];if(file)importJson(await file.text());ev.target.value='';
  });
}
// Native window restoration is handled only after the UI bridge and local state are ready.
init().then(ready=>{if(ready)return restoreWindow()}).catch(err=>{console.error(err);toast('Ошибка запуска: '+err)});
