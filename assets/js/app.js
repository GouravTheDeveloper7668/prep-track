if (!window.AUTH_USER && !(sessionStorage.getItem('pt_s') || localStorage.getItem('pt_s'))) location.replace('login.php');
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(m, t = '') { const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m; $('#toasts').append(e); setTimeout(() => e.remove(), 4500) }
load();
const SL = { done: ['All completed', 'fa-check'], partial: ['Partially completed', 'fa-circle-half-stroke'], missed: ['Missed', 'fa-xmark'], rest: ['Rest day', 'fa-bed'], none: ['No plan', 'fa-minus'], holiday: ['Holiday', 'fa-star'], future: ['Scheduled', 'fa-clock'] };
const NAV = [['dashboard', 'Dashboard', 'fa-gauge'], ['today', "Today's Tasks", 'fa-list-check'], ['daily', 'Daily Routine', 'fa-sun'], ['weekly', 'Weekly Routine', 'fa-calendar-week'], ['calendar', 'Calendar', 'fa-calendar-days'], ['subjects', 'Subjects', 'fa-book'], ['analytics', 'Analytics', 'fa-chart-line'], ['holidays', 'Festivals & Holidays', 'fa-star'], ['data', 'JSON Import / Export', 'fa-file-export'], ['settings', 'Settings', 'fa-gear']];
const QUOTES = ['Small steps every day beat big bursts once a month.', 'Discipline is choosing what you want most over what you want now.', 'You don\'t need to be perfect — you need to show up.', 'Every solved problem is a future interview answer.'];
let view = 'dashboard', cal = { y: new Date().getFullYear(), m: new Date().getMonth() }, sel = today(), tf = { q: '', sub: '', st: '', pr: '', sort: 'time' }, charts = {}, rg = { r: '30', from: '', to: '' }, wr = 0, wd = 1, dr = null, td = today();
const sub = id => D.subjects.find(s => s.id === id) || { name: 'Unknown', color: '#888', icon: 'fa-book' }, fh = m => (m / 60).toFixed(1) + 'h', pc = (a, b) => b ? Math.round(a / b * 100) : 0;
const dayList = (a, b) => { const o = []; for (let d = a; d <= b && o.length < 2000; d = addDays(d, 1))o.push(d); return o };
const holOf = d => D.holidays.find(h => h.date === d || (h.annual && h.date.slice(5) === d.slice(5)));
function info(d) {
  const ts = D.tasks.filter(t => t.date === d && t.status !== 'Cancelled'), a = D.ann[d], h = holOf(d), done = ts.filter(t => t.status === 'Completed').length, ty = a && a.type; let s;
  if (ty === 'Rest') s = 'rest'; else if (ty === 'Holiday') s = 'holiday'; else if (!ty && h && h.policy === 'Full Holiday' && !done) s = 'holiday';
  else if (!ty && !ts.length && D.settings.rest.includes(parse(d).getDay())) s = 'rest'; else if (!ts.length) s = h ? 'holiday' : 'none';
  else if (done === ts.length) s = 'done'; else if (done) s = 'partial'; else if (d >= today()) s = 'future'; else s = 'missed';
  return { ts, done, s, h, a, act: ts.reduce((x, t) => x + (+t.actual || 0), 0), plan: ts.reduce((x, t) => x + (+t.duration || 0), 0) }
}
function stats() {
  const t = today(), I = info(t), all = D.tasks.filter(x => x.status !== 'Cancelled'), dn = all.filter(x => x.status === 'Completed').length;
  const wk = dayList(addDays(t, -6), t).flatMap(d => info(d).ts); let st = 0, d = I.done ? t : addDays(t, -1), g = 0; while (g++ < 1000) { const i = info(d); if (i.done > 0) st++; else if (i.s !== 'rest' && i.s !== 'holiday') break; d = addDays(d, -1) }
  const S = D.settings, day = Math.round((parse(t) - parse(S.start)) / 864e5) + 1, hrs = all.reduce((x, y) => x + (+y.actual || 0), 0), rem = all.filter(x => x.status !== 'Completed' && x.date >= t).reduce((x, y) => x + (+y.duration || 0), 0);
  return { I, st, day, left: Math.round((parse(S.target) - parse(t)) / 864e5), hrs, rem, wk: pc(wk.filter(x => x.status === 'Completed').length, wk.length), all: pc(dn, all.length), dn, tot: all.length }
}
function modal(title, html, ok, okText = 'Save') {
  const b = document.createElement('div'); b.className = 'modal-bg'; b.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h2>${title}</h2><div class="mb">${html}</div><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn s" data-x>Cancel</button>${ok ? `<button class="btn" data-ok>${okText}</button>` : ''}</div></div>`;
  const c = () => b.remove(); b.onclick = e => { if (e.target === b || e.target.dataset.x != null) c(); if (e.target.dataset.ok != null && ok(b.querySelector('.mb')) !== false) c() }; document.body.append(b); const i = $('input,select,textarea', b); i && i.focus(); return b
}
const ask = (m, cb, t = 'Confirm') => modal('Please confirm', `<p>${m}</p>`, () => { cb() }, t);
const val = (m, n) => m.querySelector(`[name=${n}]`).value, opt = (a, sel) => a.map(([v, l]) => `<option value="${esc(v)}"${v == sel ? ' selected' : ''}>${esc(l)}</option>`).join(''), subOpt = (s) => opt(D.subjects.filter(x => !x.archived || x.id === s).map(x => [x.id, x.name]), s);
const bar = p => `<div class="bar" role="progressbar" aria-valuenow="${p}"><i style="width:${p}%"></i></div>`;
function taskRow(t) {
  const s = sub(t.subject), cl = t.checklist || [];
  return `<div class="task" style="--c:${s.color}">
    <div class="task-main">
      <input type="checkbox" class="task-check" data-act="tog" data-id="${t.id}" ${t.status === 'Completed' ? 'checked' : ''} aria-label="Complete ${esc(t.title)}">
      <div class="tt">
        <div class="task-title-line">
          <b>${esc(t.title)}</b>${t.sample ? ' <span class="badge sample">sample</span>' : ''}
        </div>
        <div class="mu sm task-meta-line">
          <span style="color:${s.color};font-weight:500"><i class="fa ${s.icon}"></i> ${esc(s.name)}</span>
          <span>·</span>
          <span><i class="fa fa-clock"></i> ${t.duration}m${t.actual ? ` (actual ${t.actual}m)` : ''}</span>
          ${t.time ? `<span>·</span><span><i class="fa fa-bell"></i> ${t.time}</span>` : ''}
          ${cl.length ? `<span>·</span><span>✔ ${cl.filter(c => c.d).length}/${cl.length}</span>` : ''}
          ${t.date < today() && !['Completed', 'Cancelled'].includes(t.status) ? '<span>·</span><span class="badge Missed" style="padding:1px 6px">overdue</span>' : ''}
        </div>
      </div>
    </div>
    <div class="task-right">
      <div class="task-badges">
        <span class="badge ${t.priority}">${t.priority}</span>
        <span class="badge ${t.status}">${t.status}</span>
      </div>
      <div class="task-actions">
        <button class="btn s sm icon-btn" data-act="edit" data-id="${t.id}" aria-label="Edit" title="Edit"><i class="fa fa-pen"></i></button>
        <button class="btn s sm icon-btn" data-act="dup" data-id="${t.id}" aria-label="Duplicate" title="Duplicate"><i class="fa fa-copy"></i></button>
        <button class="btn d sm icon-btn" data-act="del" data-id="${t.id}" aria-label="Delete" title="Delete"><i class="fa fa-trash"></i></button>
      </div>
    </div>
  </div>`;
}
const list = a => a.length ? a.map(taskRow).join('') : '<div class="empty"><i class="fa fa-inbox fa-2x"></i><p>No tasks here yet.</p></div>';
function taskForm(t, d) {
  t = t || { title: '', description: '', subject: D.subjects.find(s => !s.archived).id, date: d || today(), time: '', duration: 30, priority: 'Medium', status: 'Pending', checklist: [], notes: '', actual: 0, reminder: '' };
  const cl = (t.checklist || []).map(c => (c.d ? '[x] ' : '') + c.t).join('\n');
  return `<label>Title</label><input name="title" style="width:100%" value="${esc(t.title)}"><label>Description</label><textarea name="description">${esc(t.description)}</textarea>
<div class="row"><div><label>Subject</label><select name="subject">${subOpt(t.subject)}</select></div><div><label>Date</label><input type="date" name="date" value="${t.date}"></div><div><label>Start time</label><input type="time" name="time" value="${t.time || ''}"></div><div><label>Reminder</label><input type="time" name="reminder" value="${t.reminder || ''}"></div></div>
<div class="row"><div><label>Planned min</label><input type="number" min="1" name="duration" value="${t.duration}" style="width:90px"></div><div><label>Actual min</label><input type="number" min="0" name="actual" value="${t.actual || 0}" style="width:90px"></div><div><label>Priority</label><select name="priority">${opt(PR.map(x => [x, x]), t.priority)}</select></div><div><label>Status</label><select name="status">${opt(ST.map(x => [x, x]), t.status)}</select></div></div>
<label>Checklist (one per line; prefix [x] if done)</label><textarea name="checklist">${esc(cl)}</textarea><label>Notes — what I learned</label><textarea name="notes">${esc(t.notes)}</textarea>
${t.id ? '' : '<div class="row"><div><label>Repeat</label><select name="rep"><option value="0">No</option><option value="1">Daily</option><option value="7">Weekly</option></select></div><div><label>Occurrences</label><input type="number" name="cnt" min="1" max="60" value="4" style="width:80px"></div></div>'}`
}
function readTask(m, t) {
  const title = val(m, 'title').trim(), date = val(m, 'date'); if (!title) return toast('Title is required', 'err'), null; if (!validDate(date)) return toast('Pick a valid date', 'err'), null;
  const st = val(m, 'status'), o = {
    ...(t || { id: uid(), sample: false }), title, description: val(m, 'description'), subject: val(m, 'subject'), date, time: val(m, 'time'), reminder: val(m, 'reminder'), duration: Math.max(1, +val(m, 'duration') || 1), actual: Math.max(0, +val(m, 'actual') || 0), priority: val(m, 'priority'), status: st, notes: val(m, 'notes'),
    checklist: val(m, 'checklist').split('\n').map(x => x.trim()).filter(Boolean).map(x => ({ t: x.replace(/^\[x\]\s*/i, ''), d: /^\[x\]/i.test(x) }))
  };
  o.completedAt = st === 'Completed' ? (o.completedAt || new Date().toISOString()) : null; return o
}
function openTask(id, d) { const t = D.tasks.find(x => x.id === id); modal(t ? 'Edit task' : 'New task', taskForm(t, d), m => { const o = readTask(m, t); if (!o) return false; if (t) Object.assign(t, o); else { const n = +val(m, 'rep'), c = n ? Math.min(60, +val(m, 'cnt') || 1) : 1; for (let i = 0; i < c; i++)D.tasks.push({ ...o, id: uid() + i, date: addDays(o.date, i * n), checklist: o.checklist.map(x => ({ ...x })) }) } save(); render(); toast('Task saved') }) }
function genTasks(props, title = 'Preview generated tasks') {
  if (!props.length) return toast('Nothing to generate for that selection', 'warn');
  const key = p => [p.date, p.subject, p.title.toLowerCase()].join('|'), ex = new Map(D.tasks.map(t => [key(t), t])), dups = props.filter(p => ex.has(key(p)));
  modal(title, `<p>${props.length} task(s) · ${dups.length} duplicate(s) detected.</p><div style="max-height:240px;overflow:auto">${props.map(p => `<div class="sm">${p.date} — ${esc(p.title)} (${p.duration}m)${ex.has(key(p)) ? ' <span class="badge">duplicate</span>' : ''}</div>`).join('')}</div>${dups.length ? '<label>Duplicates</label><select name="dm"><option value="skip">Skip duplicates</option><option value="replace">Replace duplicates</option></select>' : '<input type="hidden" name="dm" value="skip">'}`, m => {
    const rep = val(m, 'dm') === 'replace'; let n = 0;
    for (const p of props) { const o = ex.get(key(p)); if (o) { if (!rep) continue; D.tasks = D.tasks.filter(x => x !== o) } D.tasks.push({ id: uid() + n, title: p.title, description: '', subject: p.subject, date: p.date, time: p.time || '', duration: p.duration, priority: 'Medium', status: 'Pending', checklist: [], notes: '', actual: 0, completedAt: null, reminder: '', sample: false }); n++ } save(); render(); toast(n + ' task(s) added')
  }, 'Add tasks')
}
function calGrid(y, m) {
  const f = new Date(y, m, 1), n = new Date(y, m + 1, 0).getDate(); let h = '<div class="cal">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<div class="dow">${x}</div>`).join('') + '<div></div>'.repeat(f.getDay());
  for (let i = 1; i <= n; i++) { const d = ymd(new Date(y, m, i)), I = info(d); h += `<button class="cell ${I.s}${d === today() ? ' tod' : ''}${d === sel ? ' sel' : ''}" data-act="day" data-d="${d}" aria-label="${d}: ${SL[I.s][0]}${I.h ? ', ' + esc(I.h.name) : ''}"><b>${i}</b><i class="fa ${SL[I.s][1]}"></i>${I.h ? '<i class="fa fa-star"></i>' : ''}</button>` } return h + '</div>'
}
const legend = () => '<div class="row sm mu" style="margin-top:10px">' + Object.entries(SL).map(([k, v]) => `<span class="badge" style="background:var(--bd)"><i class="fa ${v[1]}"></i> ${v[0]}</span>`).join('') + '</div>';
function mk(id, type, labels, sets, o = {}) { const c = document.getElementById(id); if (!c) return; if (charts[id]) charts[id].destroy(); Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--mu'); charts[id] = new Chart(c, { type, data: { labels, datasets: sets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: sets.length > 1 || ['doughnut'].includes(type) } }, ...o } }) }
const COL = ['#7c5cff', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'];
const chartBox = (id, t, col = 'col-6', icon = 'fa-chart-simple') => `<div class="card ${col}">
  <div class="card-head">
    <div class="card-head-title">
      <i class="fa ${icon}" style="color:var(--pr)"></i>
      <h3>${t}</h3>
    </div>
  </div>
  <div class="chart-wrap">
    <canvas id="${id}"></canvas>
  </div>
</div>`;
function getRange() { const t = today(), S = D.settings; let a, b = t; if (rg.r === 'all') { a = S.start; b = S.target < t ? S.target : t } else if (rg.r === 'custom') { a = rg.from || S.start; b = rg.to || t } else a = addDays(t, -(+rg.r - 1)); if (!validDate(a) || !validDate(b) || a > b) a = b; return dayList(a, b) }
function charts_(days) {
  const I = days.map(info), pl = I.flatMap(i => i.ts), empty = !pl.length; if (empty) return false; const L = days.map(d => d.slice(5));
  mk('c1', 'line', L, [{ label: 'Completion %', data: I.map(i => i.ts.length ? pc(i.done, i.ts.length) : null), borderColor: COL[0], spanGaps: true, tension: .3 }], { scales: { y: { min: 0, max: 100 } } });
  mk('c2', 'bar', L, [{ label: 'Planned h', data: I.map(i => +(i.plan / 60).toFixed(2)), backgroundColor: COL[1] }, { label: 'Actual h', data: I.map(i => +(i.act / 60).toFixed(2)), backgroundColor: COL[2] }]);
  const sj = D.subjects.map(s => ({ s, m: pl.filter(t => t.subject === s.id).reduce((x, t) => x + (+t.actual || 0), 0), p: pl.filter(t => t.subject === s.id), }));
  mk('c3', 'doughnut', sj.map(x => x.s.name), [{ data: sj.map(x => x.m), backgroundColor: sj.map(x => x.s.color) }]);
  const wk = {}; days.forEach((d, i) => { const dt = parse(d); dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); const k = ymd(dt); (wk[k] = wk[k] || []).push(...I[i].ts) });
  mk('c4', 'bar', Object.keys(wk).map(k => k.slice(5)), [{ label: 'Weekly completion %', data: Object.values(wk).map(a => pc(a.filter(t => t.status === 'Completed').length, a.length)), backgroundColor: COL[0] }], { scales: { y: { min: 0, max: 100 } } });
  const dn = pl.filter(t => t.status === 'Completed').length, ms = pl.filter(t => t.status === 'Missed' || (t.date < today() && ['Pending', 'In Progress'].includes(t.status))).length;
  mk('c5', 'doughnut', ['Completed', 'Missed', 'Other'], [{ data: [dn, ms, pl.length - dn - ms], backgroundColor: ['#22c55e', '#ef4444', '#64748b'] }]);
  mk('c6', 'bar', sj.map(x => x.s.name.slice(0, 14)), [{ label: 'Completion %', data: sj.map(x => pc(x.p.filter(t => t.status === 'Completed').length, x.p.length)), backgroundColor: sj.map(x => x.s.color) }], { scales: { y: { min: 0, max: 100 } } }); return true
}
const V = {};
V.dashboard = () => {
  const s = stats(), I = s.I, t = today(),
    up = D.tasks.filter(x => x.date > t && x.status === 'Pending').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    mi = D.tasks.filter(x => x.date < t && ['Pending', 'In Progress', 'Missed'].includes(x.status)).slice(-5);
  const k = (l, v, i) => `<div class="kpi"><div class="kpi-top"><span class="kpi-label">${l}</span><span class="kpi-icon"><i class="fa ${i}"></i></span></div><b>${v}</b></div>`;
  const subProgList = D.subjects.filter(x => !x.archived).map(x => {
    const a = D.tasks.filter(t => t.subject === x.id && t.status !== 'Cancelled'),
      doneCount = a.filter(t => t.status === 'Completed').length,
      p = pc(doneCount, a.length);
    return `<div class="sub-progress-item">
      <div class="sub-prog-top">
        <div class="sub-prog-name">
          <span class="sub-icon-box" style="background:${x.color}22;color:${x.color}"><i class="fa ${x.icon}"></i></span>
          <span class="sub-name-text">${esc(x.name)}</span>
        </div>
        <div class="sub-prog-stats">
          <span class="mu sm">${doneCount}/${a.length}</span>
          <span class="sub-pct-badge" style="color:${x.color}">${p}%</span>
        </div>
      </div>
      <div class="bar sub-bar"><i style="width:${p}%;background:${x.color}"></i></div>
    </div>`;
  }).join('');

  return `<div class="kpi-grid">
    ${k('Today', pc(I.done, I.ts.length) + '%', 'fa-bullseye')}
    ${k('Done today', I.done + '/' + I.ts.length, 'fa-check')}
    ${k('Study hours', fh(s.hrs), 'fa-clock')}
    ${k('Streak', s.st + ' d', 'fa-fire')}
    ${k('Weekly rate', s.wk + '%', 'fa-calendar-week')}
    ${k('Overall', s.all + '%', 'fa-flag-checkered')}
  </div>
  <div class="quote-banner">
    <i class="fa fa-quote-left"></i>
    <span class="cur">“${QUOTES[parse(t).getDate() % QUOTES.length]}”</span>
  </div>
  <div class="grid-12">
    <!-- Row 1: Today's checklist (col-6) & Subject progress (col-6) -->
    <div class="card col-6">
      <div class="card-head">
        <div class="card-head-title">
          <i class="fa fa-list-check" style="color:var(--pr)"></i>
          <h3>Today's checklist</h3>
        </div>
        <span class="badge ${I.done === I.ts.length && I.ts.length ? 'Completed' : ''}">${I.done}/${I.ts.length} Done (${pc(I.done, I.ts.length)}%)</span>
      </div>
      ${bar(pc(I.done, I.ts.length))}
      <div class="task-list-scroll">${list(I.ts)}</div>
    </div>

    <div class="card col-6">
      <div class="card-head">
        <div class="card-head-title">
          <i class="fa fa-chart-pie" style="color:var(--bl)"></i>
          <h3>Subject progress</h3>
        </div>
        <span class="badge">${D.subjects.filter(x => !x.archived).length} Subjects</span>
      </div>
      <div class="sub-progress-list">${subProgList}</div>
    </div>

    <!-- Row 2: Charts (col-6 & col-6) -->
    ${chartBox('c2', 'Planned vs actual (last 7 days)', 'col-6', 'fa-chart-column')}
    ${chartBox('c1', 'Daily completion trend', 'col-6', 'fa-chart-line')}

    <!-- Row 3: Calendar (col-6) & Activity & Schedule (col-6) -->
    <div class="card col-6">
      <div class="card-head">
        <div class="card-head-title">
          <i class="fa fa-calendar-days" style="color:var(--ok)"></i>
          <h3>${new Date(cal.y, cal.m).toLocaleString('en', { month: 'long', year: 'numeric' })}</h3>
        </div>
      </div>
      ${calGrid(cal.y, cal.m)}
      ${legend()}
    </div>

    <div class="card col-6">
      <div class="card-head">
        <div class="card-head-title">
          <i class="fa fa-bolt" style="color:var(--wr)"></i>
          <h3>Upcoming & Attention</h3>
        </div>
      </div>
      <div class="dash-sections-stack">
        <div class="dash-sub-sec">
          <h4><i class="fa fa-calendar-plus" style="color:var(--bl)"></i> Upcoming Tasks</h4>
          ${up.length ? up.map(x => `<div class="mini-row"><span class="badge Low">${x.date}</span><span class="mini-row-title">${esc(x.title)}</span></div>`).join('') : '<div class="empty sm">Nothing scheduled</div>'}
        </div>
        <div class="dash-sub-sec">
          <h4><i class="fa fa-circle-exclamation" style="color:var(--er)"></i> Needs Attention</h4>
          ${mi.length ? `<div class="task-list-mini">${list(mi)}</div>` : '<div class="empty sm"><i class="fa fa-circle-check" style="color:var(--ok)"></i> No missed tasks 🎉</div>'}
        </div>
        <div class="dash-sub-sec">
          <h4><i class="fa fa-star" style="color:var(--wr)"></i> Festivals & Holidays</h4>
          ${D.holidays.slice(0, 4).map(h => `<div class="mini-row"><span class="badge Medium">${h.date}</span><span class="mini-row-title">${esc(h.name)}</span><span class="mu sm">${h.policy}</span></div>`).join('') || '<div class="empty sm">None added</div>'}
        </div>
      </div>
    </div>
  </div>`};
V.today = () => {
  const f = D.tasks.filter(t => t.date === td && (!tf.sub || t.subject === tf.sub) && (!tf.st || t.status === tf.st) && (!tf.pr || t.priority === tf.pr) && (!tf.q || (t.title + t.notes).toLowerCase().includes(tf.q.toLowerCase()))).sort((a, b) => tf.sort === 'priority' ? PR.indexOf(b.priority) - PR.indexOf(a.priority) : (a.time || '99').localeCompare(b.time || '99'));
  const all = D.tasks.filter(t => t.date === td && t.status !== 'Cancelled'), dn = all.filter(t => t.status === 'Completed').length;
  return `<div class="card"><h3 class="cur">Define Today's Tasks</h3><div class="row"><input type="date" id="tdd" value="${td}"><button class="btn" data-act="new">+ Add manually</button><button class="btn s" data-act="copyprev">Copy previous day</button><button class="btn s" data-act="fromweekly">From weekly routine</button><button class="btn s" data-act="gotodaily">From daily routine</button><button class="btn s" data-act="review">Day-end review</button></div></div>
<div class="card" style="margin-top:16px"><div class="row"><input id="fq" placeholder="Search…" value="${esc(tf.q)}"><select id="fs"><option value="">All subjects</option>${opt(D.subjects.map(x => [x.id, x.name]), tf.sub)}</select><select id="ft"><option value="">All status</option>${opt(ST.map(x => [x, x]), tf.st)}</select><select id="fp"><option value="">All priority</option>${opt(PR.map(x => [x, x]), tf.pr)}</select><select id="fo">${opt([['time', 'Sort: time'], ['priority', 'Sort: priority']], tf.sort)}</select><button class="btn s" data-act="clrf">Clear filters</button><button class="btn s" data-act="markall">Mark all completed</button><button class="btn d" data-act="delday">Delete day's tasks</button></div>
<p>${dn}/${all.length} completed (${pc(dn, all.length)}%)</p>${bar(pc(dn, all.length))}<br>${list(f)}</div>`
};
function drInit() { if (!dr) dr = { date: today(), items: (D.daily.length ? D.daily : D.subjects.filter(s => !s.archived).map(s => ({ subject: s.id, title: s.name, minutes: s.minutes, on: true }))).map(x => ({ ...x })) } }
V.daily = () => {
  drInit(); return `<div class="card"><h3>Daily routine for one date</h3><input type="date" id="drd" value="${dr.date}"><div style="margin-top:12px">${dr.items.map((x, i) => `<div class="row" style="margin-bottom:6px"><input type="checkbox" data-dr="on" data-i="${i}" ${x.on ? 'checked' : ''} aria-label="Include"><select data-dr="subject" data-i="${i}">${subOpt(x.subject)}</select><input data-dr="title" data-i="${i}" value="${esc(x.title)}"><input type="number" min="5" style="width:80px" data-dr="minutes" data-i="${i}" value="${x.minutes}"> min<button class="btn s sm" data-act="up" data-i="${i}" aria-label="Up">↑</button><button class="btn s sm" data-act="dn" data-i="${i}" aria-label="Down">↓</button><button class="btn d sm" data-act="rmi" data-i="${i}" aria-label="Remove">×</button></div>`).join('')}</div>
<p class="mu">Total: ${dr.items.filter(x => x.on).reduce((a, x) => a + (+x.minutes || 0), 0)} min</p><div class="row"><button class="btn s" data-act="addi">+ Custom task</button><button class="btn s" data-act="savet">Save as template</button><button class="btn s" data-act="loadt">Load template</button><button class="btn" data-act="gend">Preview & generate</button></div></div>`
};
V.weekly = () => {
  const W = D.weekly[wr], DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; if (!W) return `<div class="card empty"><p>No weekly routine yet.</p><button class="btn" data-act="neww">Create weekly routine</button></div>`; const day = W.days[wd] || { rest: false, items: [] }, t = today();
  return `<div class="card"><div class="row"><select id="wsel">${opt(D.weekly.map((w, i) => [i, w.name]), wr)}</select><button class="btn s" data-act="neww">New</button><button class="btn s" data-act="renw">Rename</button><button class="btn s" data-act="dupw">Duplicate</button><button class="btn d" data-act="delw">Delete</button></div>
<div class="row" style="margin:14px 0">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button class="btn ${i == wd ? '' : 's'}" data-act="wday" data-i="${i}">${DN[i]}${W.days[i] && W.days[i].rest ? ' 🛏' : ''}</button>`).join('')}</div>
<label style="display:flex;gap:8px"><input type="checkbox" id="wrest" ${day.rest ? 'checked' : ''}> Rest day</label>${day.items.length ? day.items.map((x, i) => `<div class="task" style="--c:${sub(x.subject).color}"><div class="tt">${esc(x.title)} <span class="mu sm">· ${esc(sub(x.subject).name)} · ${x.minutes}m ${x.time || ''}</span></div><button class="btn d sm" data-act="rmw" data-i="${i}" aria-label="Remove">×</button></div>`).join('') : '<div class="empty">No tasks this day.</div>'}
<div class="row"><select id="ws">${subOpt()}</select><input id="wt" placeholder="Task title"><input id="wm" type="number" value="30" style="width:80px"><input id="wh" type="time"><button class="btn" data-act="addw">Add</button></div>
<div class="row" style="margin-top:12px"><select id="wc">${DN.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select><button class="btn s" data-act="copyw">Copy this day to…</button></div></div>
<div class="card" style="margin-top:16px"><h3>Generate tasks</h3><div class="row"><label>Start</label><input type="date" id="gs" value="${t}"><label>End</label><input type="date" id="ge" value="${addDays(t, 13)}"><button class="btn" data-act="genw">Preview & generate</button></div><p class="mu sm">Generated tasks are independent copies — editing a day never changes the routine.</p></div>`
};
V.calendar = () => {
  const mo = dayList(ymd(new Date(cal.y, cal.m, 1)), ymd(new Date(cal.y, cal.m + 1, 0))).map(info), c = s => mo.filter(i => i.s === s).length, pl = mo.flatMap(i => i.ts), I = info(sel), a = D.ann[sel] || {};
  return `<div class="card"><div class="row" style="justify-content:space-between"><button class="btn s" data-act="pm" aria-label="Previous month">‹</button><h3 style="margin:0">${new Date(cal.y, cal.m).toLocaleString('en', { month: 'long', year: 'numeric' })}</h3><button class="btn s" data-act="tm">Today</button><button class="btn s" data-act="nm" aria-label="Next month">›</button></div><br>${calGrid(cal.y, cal.m)}${legend()}
<p class="mu">Study days ${mo.filter(i => i.done > 0).length} · Missed ${c('missed')} · Rest ${c('rest')} · Holidays ${c('holiday')} · Completion ${pc(pl.filter(t => t.status === 'Completed').length, pl.length)}% · Hours ${fh(mo.reduce((x, i) => x + i.act, 0))}</p></div>
<div class="card" style="margin-top:16px"><h3>${sel} — ${SL[I.s][0]}${I.h ? ' · ' + esc(I.h.name) + ' (' + I.h.policy + ')' : ''}</h3><p>${pc(I.done, I.ts.length)}% complete · actual ${I.act} min / planned ${I.plan} min</p>${list(I.ts)}<div class="row"><button class="btn" data-act="new" data-d="${sel}">+ Task</button><select id="dty"><option>Normal</option><option ${a.type === 'Rest' ? 'selected' : ''}>Rest</option><option ${a.type === 'Holiday' ? 'selected' : ''}>Holiday</option></select><button class="btn s" data-act="setty">Set day type</button><input type="date" id="rsd" value="${addDays(sel, 1)}"><button class="btn s" data-act="resch">Reschedule pending tasks</button></div><label>Daily note</label><textarea id="dnote">${esc(a.note || '')}</textarea><button class="btn s" data-act="savenote">Save note</button></div>`
};
V.subjects = () => `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="newsub">+ Add subject</button></div><div class="grid-12">${D.subjects.map(s => { const a = D.tasks.filter(t => t.subject === s.id && t.status !== 'Cancelled'); return `<div class="card col-6" style="border-left:4px solid ${s.color};${s.archived ? 'opacity:.5' : ''}"><h3><i class="fa ${s.icon}" style="color:${s.color}"></i> ${esc(s.name)}</h3><p class="mu">Daily target ${s.minutes} min · ${a.filter(t => t.status === 'Completed').length}/${a.length} tasks · ${fh(a.reduce((x, t) => x + (+t.actual || 0), 0))} logged</p>${bar(pc(a.filter(t => t.status === 'Completed').length, a.length))}<div class="row" style="margin-top:10px"><button class="btn s sm" data-act="editsub" data-id="${s.id}">Edit</button><button class="btn s sm" data-act="arcsub" data-id="${s.id}">${s.archived ? 'Unarchive' : 'Archive'}</button></div></div>` }).join('')}</div><p class="mu" style="margin-top:14px">Total daily target: ${D.subjects.filter(s => !s.archived).reduce((x, s) => x + s.minutes, 0)} min</p>`;
V.analytics = () => `<div class="card row"><select id="rgs">${opt([['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['all', 'Entire period'], ['custom', 'Custom']], rg.r)}</select>${rg.r === 'custom' ? `<input type="date" id="rf" value="${rg.from}"><input type="date" id="rt" value="${rg.to}">` : ''}</div><div id="an" class="grid-12" style="margin-top:16px">${[['c1', 'Daily completion %', 'col-6', 'fa-chart-line'], ['c2', 'Planned vs actual hours', 'col-6', 'fa-chart-column'], ['c3', 'Time by subject (actual)', 'col-6', 'fa-chart-pie'], ['c4', 'Weekly completion', 'col-6', 'fa-chart-bar'], ['c5', 'Completed vs missed', 'col-6', 'fa-circle-half-stroke'], ['c6', 'Subject progress', 'col-6', 'fa-layer-group']].map(x => chartBox(...x)).join('')}</div>`;
V.holidays = () => `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="newhol">+ Add holiday</button></div><div class="card">${D.holidays.length ? `<table><tr><th>Date</th><th>Name</th><th>Policy</th><th></th></tr>${D.holidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => `<tr><td>${h.date}${h.annual ? ' ↻' : ''}</td><td>${esc(h.name)} ${h.sample ? '<span class="badge">sample</span>' : ''}<div class="mu sm">${esc(h.description)}</div></td><td>${h.policy}</td><td><button class="btn s sm" data-act="edithol" data-id="${h.id}">Edit</button> <button class="btn d sm" data-act="delhol" data-id="${h.id}">Delete</button></td></tr>`).join('')}</table>` : '<div class="empty">No holidays added.</div>'}</div><p class="mu sm">Sample dates are not auto-detected — verify and edit them. Holidays never delete your tasks.</p>`;
V.data = () => `<div class="card"><h3>Export & Auto-Save</h3><div class="row"><button class="btn" data-act="savejson"><i class="fa fa-floppy-disk"></i> Save to data/ folder & backup</button><button class="btn s" data-act="exp" data-k="all">Download Full backup</button><button class="btn s" data-act="exp" data-k="tasks">Tasks only</button><button class="btn s" data-act="exp" data-k="logs">Study logs</button><button class="btn s" data-act="exp" data-k="cal">Calendar</button></div></div><div class="card" style="margin-top:16px"><h3>Import</h3><div class="row" style="margin-bottom:12px"><button class="btn s" data-act="loadserver"><i class="fa fa-folder-open"></i> Load latest from data/ folder</button></div><div class="drop" id="drop"><i class="fa fa-cloud-arrow-up fa-2x"></i><p>Drag a .json file here or</p><input type="file" id="file" accept=".json,application/json"></div></div>`;
V.settings = () => {
  const S = D.settings; return `<div class="card"><div class="row"><div><label>Start date</label><input type="date" id="s_start" value="${S.start}"></div><div><label>Goal days</label><select id="s_goal">${opt([90, 100, 110, 120].map(x => [x, x]), S.goal)}</select></div><div><label>Target date</label><input type="date" id="s_target" value="${S.target}"></div><div><label>Daily target (min)</label><input type="number" id="s_daily" value="${S.daily}"></div><div><label>Weekly target (min)</label><input type="number" id="s_weekly" value="${S.weekly}"></div></div>
<div class="row"><div><label>Target role</label><input id="s_role" value="${esc(S.role)}"></div><div><label>Locations</label><input id="s_loc" value="${esc(S.locations)}"></div></div><label>Rest days</label><div class="row">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((n, i) => `<label style="display:flex;gap:4px;margin:0"><input type="checkbox" class="rd" value="${i}" ${S.rest.includes(i) ? 'checked' : ''}>${n}</label>`).join('')}</div>
<label style="display:flex;gap:8px"><input type="checkbox" id="s_snd" ${S.sound ? 'checked' : ''}> Reminder sound</label><div class="row" style="margin-top:12px"><button class="btn" data-act="saveset">Save settings</button><button class="btn s" data-act="theme">Toggle theme</button><button class="btn s" data-act="notif">Enable browser notifications</button><button class="btn s" data-act="rmsample">Remove sample data</button><button class="btn d" data-act="reset">Reset everything</button></div><p class="mu sm">Reminders only fire while this page is open in a browser tab. Changing the goal never deletes task history.</p></div>`
};
const POST = { dashboard: () => charts_ ? (() => { const d = dayList(addDays(today(), -6), today()), I = d.map(info); mk('c2', 'bar', d.map(x => x.slice(5)), [{ label: 'Planned h', data: I.map(i => +(i.plan / 60).toFixed(2)), backgroundColor: COL[1] }, { label: 'Actual h', data: I.map(i => +(i.act / 60).toFixed(2)), backgroundColor: COL[2] }]); const d2 = dayList(addDays(today(), -13), today()), I2 = d2.map(info); mk('c1', 'line', d2.map(x => x.slice(5)), [{ label: 'Completion %', data: I2.map(i => i.ts.length ? pc(i.done, i.ts.length) : null), borderColor: COL[0], spanGaps: true, tension: .3 }], { scales: { y: { min: 0, max: 100 } } }) })() : 0, analytics: () => { if (!charts_(getRange())) $('#an').innerHTML = '<div class="card empty" style="grid-column:1/-1">No tasks in this range yet — charts appear once you plan tasks.</div>' } };
function render() {
  Object.values(charts).forEach(c => c.destroy()); charts = {}; const t = today(), s = stats(), h = new Date().getHours();
  const displayName = window.AUTH_USER?.username || 'Sonu';
  $('#top').innerHTML = `<div><button class="btn s menu" data-act="menu" aria-label="Menu"><i class="fa fa-bars"></i></button> <span class="cur">${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${esc(displayName)}</span><div class="mu sm">${new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Day ${s.day > 0 ? s.day : 0} of ${D.settings.goal} · ${Math.max(0, s.left)} days left · saved ${D.savedAt ? new Date(D.savedAt).toLocaleTimeString() : '—'}</div></div><div class="row"><button class="btn s" data-act="notif" title="Chrome Notification Settings & Test"><i class="fa fa-bell"></i></button><button class="btn s" data-act="savejson" title="Save JSON to data/ folder & download backup"><i class="fa fa-floppy-disk"></i> Save as JSON</button><button class="btn" data-act="new"><i class="fa fa-plus"></i> Quick add</button><button class="btn s" data-act="theme" aria-label="Theme"><i class="fa fa-circle-half-stroke"></i></button><button class="btn s" data-act="logout"><i class="fa fa-right-from-bracket"></i> Logout</button></div>`;
  $('#nav').innerHTML = NAV.map(([k, l, i]) => `<button class="${k === view ? 'on' : ''}" data-act="nav" data-k="${k}"><i class="fa ${i}"></i>${l}</button>`).join('');
  $('#v').innerHTML = V[view]();
  document.documentElement.dataset.theme = D.settings.theme;
  POST[view] && POST[view]();
  $('#side').classList.remove('open');
  const bk = $('#sideBackdrop');
  if (bk) bk.classList.remove('open');
  const sf = $('#sideFooter');
  if (sf) {
    const goal = D.settings.goal || 120, day = s.day > 0 ? s.day : 0, pct = pc(day, goal);
    sf.innerHTML = `<div class="side-goal-card">
      <div class="side-goal-top">
        <b>Day ${day} of ${goal}</b>
        <span style="color:var(--pr);font-weight:600">${pct}%</span>
      </div>
      <div class="bar" style="height:5px"><i style="width:${pct}%"></i></div>
      <div class="side-goal-role"><i class="fa fa-briefcase" style="color:var(--pr)"></i> ${esc(D.settings.role || 'Target Offer')}</div>
    </div>`;
  }
}
const byId = id => D.tasks.find(t => t.id === id);
function importApply(d, mode, over) {
  const bk = JSON.stringify(D); try { localStorage.setItem(CFG.key + '_backup', bk) } catch (e) { } let N; let dup = 0; const mA = (a, b) => { for (const r of b || []) { const i = a.findIndex(x => x.id === r.id); if (i < 0) a.push(r); else { dup++; if (over) a[i] = r } } }, mO = (a, b) => { for (const k in b || {}) { if (k in a) { dup++; if (over) a[k] = b[k] } else a[k] = b[k] } };
  if (mode === 'replace') N = migrate(JSON.parse(JSON.stringify(d))); else { N = JSON.parse(bk); if (mode === 'merge') { ['subjects', 'tasks', 'holidays', 'weekly'].forEach(k => mA(N[k], d[k])); mO(N.ann, d.ann); mO(N.reviews, d.reviews); N.logs.push(...(d.logs || [])) } else if (mode === 'tasks') { mA(N.subjects, d.subjects); mA(N.tasks, d.tasks) } else if (mode === 'logs') { mO(N.reviews, d.reviews); N.logs.push(...(d.logs || [])) } else { mO(N.ann, d.ann); mA(N.holidays, d.holidays) } }
  const e = validate(N); if (e) return toast('Import aborted, nothing changed: ' + e, 'err'); D = N; save(); render(); toast(`Import complete (${dup} duplicate id(s) ${over ? 'overwritten' : 'skipped'}). Previous data backed up.`)
}
function handleFile(f) {
  if (!f) return; if (!/\.json$/i.test(f.name)) return toast('Please choose a .json file', 'err'); if (f.size > 5e6) return toast('File too large (max 5 MB)', 'err'); const r = new FileReader(); r.onload = () => {
    let d; try { d = JSON.parse(r.result) } catch (e) { return toast('Invalid JSON: ' + e.message, 'err') } const e = validate(d); if (e) return toast('Import failed: ' + e, 'err');
    modal('Import preview', `<p>Schema v${d.schema ?? '?'} · ${(d.tasks || []).length} tasks · ${(d.subjects || []).length} subjects · ${(d.holidays || []).length} holidays · ${Object.keys(d.ann || {}).length} day notes · ${Object.keys(d.reviews || {}).length} reviews</p><label>Mode</label><select name="mode"><option value="replace">Replace all data</option><option value="merge">Merge with existing</option><option value="tasks">Import tasks only</option><option value="logs">Import study logs only</option><option value="cal">Import calendar & holidays only</option></select><label>If an ID already exists</label><select name="ov"><option value="0">Skip duplicates</option><option value="1">Overwrite with imported record</option></select><p class="mu sm">Your current data is backed up before applying. Replace and overwrite cannot be undone except via that backup.</p>`, m => { importApply(d, val(m, 'mode'), val(m, 'ov') === '1') }, 'Apply import')
  }; r.readAsText(f)
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('#side').classList.remove('open');
    const bk = $('#sideBackdrop');
    if (bk) bk.classList.remove('open');
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, id = b.dataset.id, i = +b.dataset.i, t = id && byId(id), go = k => { view = k; render() };
  const A = {
    nav: () => {
      go(b.dataset.k);
      $('#side').classList.remove('open');
      const bk = $('#sideBackdrop');
      if (bk) bk.classList.remove('open');
    },
    menu: () => {
      const s = $('#side'), bk = $('#sideBackdrop');
      s.classList.toggle('open');
      if (bk) bk.classList.toggle('open', s.classList.contains('open'));
    },
    closeside: () => {
      $('#side').classList.remove('open');
      const bk = $('#sideBackdrop');
      if (bk) bk.classList.remove('open');
    },
    savejson: async () => {
      const obj = exportObj('all'), fn = `preptrack-${today()}.json`;
      let savedOnServer = false;
      const apiBase = (location.protocol === 'http:' || location.protocol === 'https:') ? '' : 'http://localhost:8080';
      try {
        const res = await fetch(`${apiBase}/api/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(obj)
        });
        if (res.ok) {
          const d = await res.json();
          savedOnServer = true;
          toast(`Saved to data/${d.filename || fn}! (Updated/replaced)`);
        }
      } catch (err) {
        console.warn('Local server save not reached:', err);
      }
      download(obj, fn);
      if (!savedOnServer) {
        toast(`Downloaded ${fn} successfully!`);
      }
      D.savedAt = new Date().toISOString();
      save();
      render();
    },
    loadserver: async () => {
      const apiBase = (location.protocol === 'http:' || location.protocol === 'https:') ? '' : 'http://localhost:8080';
      try {
        const res = await fetch(`${apiBase}/api/latest`);
        if (!res.ok) return toast('No saved file found in data/ folder yet', 'warn');
        const d = await res.json();
        const e = validate(d);
        if (e) return toast('Invalid JSON in data folder: ' + e, 'err');
        modal('Import from data/ folder', `<p>Found saved backup in data/ folder (${(d.tasks || []).length} tasks, ${(d.subjects || []).length} subjects). Choose import mode:</p><label>Mode</label><select name="mode"><option value="replace">Replace all data with this file</option><option value="merge">Merge with existing</option></select><label>If duplicate ID exists</label><select name="ov"><option value="1">Overwrite with this backup</option><option value="0">Skip duplicates</option></select>`, m => {
          importApply(d, val(m, 'mode'), val(m, 'ov') === '1');
        }, 'Apply import');
      } catch (err) {
        toast('Could not connect to local server: ' + err.message, 'err');
      }
    },
    logout: async () => {
      try { await fetch('api/auth.php?action=logout'); } catch (_) {}
      sessionStorage.removeItem('pt_s');
      localStorage.removeItem('pt_s');
      location.replace('login.php');
    },
    theme: () => { D.settings.theme = D.settings.theme === 'dark' ? 'light' : 'dark'; save(); render() },
    new: () => openTask(null, b.dataset.d || (view === 'today' ? td : today())), edit: () => openTask(id),
    dup: () => { D.tasks.push({ ...t, id: uid(), status: 'Pending', completedAt: null, actual: 0, sample: false, checklist: (t.checklist || []).map(c => ({ ...c, d: false })) }); save(); render(); toast('Task duplicated') },
    del: () => ask(`Delete "${esc(t.title)}"? This can't be undone.`, () => { D.tasks = D.tasks.filter(x => x !== t); save(); render(); toast('Task deleted') }, 'Delete'),
    tog: () => { if (t.status === 'Completed') { t.status = 'Pending'; t.completedAt = null; save(); render(); toast('Marked pending (undone)') } else { e.target.checked = false; modal('Complete task', `<p>${esc(t.title)}</p><label>Actual time spent (min)</label><input type="number" name="a" min="0" value="${t.actual || t.duration}">`, m => { t.status = 'Completed'; t.completedAt = new Date().toISOString(); t.actual = Math.max(0, +val(m, 'a') || 0); save(); render(); toast('Nice work! Task completed') }, 'Done') } },
    clrf: () => { tf = { q: '', sub: '', st: '', pr: '', sort: 'time' }; render() },
    markall: () => ask('Mark all pending tasks of this day as completed (actual time left as 0 unless already set)?', () => { D.tasks.filter(x => x.date === td && ['Pending', 'In Progress'].includes(x.status)).forEach(x => { x.status = 'Completed'; x.completedAt = new Date().toISOString() }); save(); render() }),
    delday: () => ask('Delete ALL tasks on ' + td + '?', () => { D.tasks = D.tasks.filter(x => x.date !== td); save(); render(); toast('Deleted') }, 'Delete all'),
    copyprev: () => genTasks(D.tasks.filter(x => x.date === addDays(td, -1) && x.status !== 'Cancelled').map(x => ({ date: td, subject: x.subject, title: x.title, duration: x.duration, time: x.time })), 'Copy previous day'),
    fromweekly: () => { const W = D.weekly[wr], d = W && W.days[parse(td).getDay()]; if (!d || d.rest || !d.items.length) return toast('No weekly routine tasks for this weekday', 'warn'); genTasks(d.items.map(x => ({ date: td, subject: x.subject, title: x.title, duration: +x.minutes, time: x.time }))) },
    gotodaily: () => { drInit(); dr.date = td; go('daily') },
    review: () => { const r = D.reviews[td] || {}; modal('Day-end review — ' + td, ['learned:What did I learn today?', 'hard:What was difficult?', 'revise:What should I revise?', 'improve:What will I improve tomorrow?'].map(x => { const [k, l] = x.split(':'); return `<label>${l}</label><textarea name="${k}">${esc(r[k] || '')}</textarea>` }).join('') + `<label>Confidence (1–5)</label><select name="conf">${opt([1, 2, 3, 4, 5].map(x => [x, x]), r.conf || 3)}</select>`, m => { D.reviews[td] = { learned: val(m, 'learned'), hard: val(m, 'hard'), revise: val(m, 'revise'), improve: val(m, 'improve'), conf: +val(m, 'conf') }; save(); toast('Review saved') }) },
    up: () => { if (i > 0) { [dr.items[i - 1], dr.items[i]] = [dr.items[i], dr.items[i - 1]]; render() } }, dn: () => { if (i < dr.items.length - 1) { [dr.items[i + 1], dr.items[i]] = [dr.items[i], dr.items[i + 1]]; render() } }, rmi: () => { dr.items.splice(i, 1); render() },
    addi: () => { dr.items.push({ subject: D.subjects.find(s => !s.archived).id, title: 'Custom task', minutes: 30, on: true }); render() }, savet: () => { D.daily = dr.items.map(x => ({ ...x })); save(); toast('Template saved') }, loadt: () => { dr = null; D.daily.length || toast('No template saved — showing subject defaults', 'warn'); drInit(); render() },
    gend: () => genTasks(dr.items.filter(x => x.on && x.title.trim()).map(x => ({ date: dr.date, subject: x.subject, title: x.title.trim(), duration: Math.max(1, +x.minutes || 1) }))),
    neww: () => modal('New weekly routine', '<label>Name</label><input name="n" value="My weekly routine">', m => { D.weekly.push({ id: uid(), name: val(m, 'n') || 'Routine', days: {} }); wr = D.weekly.length - 1; save(); render() }, 'Create'),
    renw: () => modal('Rename', `<input name="n" value="${esc(D.weekly[wr].name)}">`, m => { D.weekly[wr].name = val(m, 'n') || 'Routine'; save(); render() }),
    dupw: () => { const c = JSON.parse(JSON.stringify(D.weekly[wr])); c.id = uid(); c.name += ' (copy)'; D.weekly.push(c); wr = D.weekly.length - 1; save(); render() },
    delw: () => ask('Delete this weekly routine? Already generated tasks stay.', () => { D.weekly.splice(wr, 1); wr = 0; save(); render() }, 'Delete'),
    wday: () => { wd = i; render() }, rmw: () => { D.weekly[wr].days[wd].items.splice(i, 1); save(); render() },
    addw: () => { const T = $('#wt').value.trim(); if (!T) return toast('Enter a title', 'err'); const W = D.weekly[wr]; (W.days[wd] = W.days[wd] || { rest: false, items: [] }).items.push({ id: uid(), subject: $('#ws').value, title: T, minutes: +$('#wm').value || 30, time: $('#wh').value }); save(); render() },
    copyw: () => { const W = D.weekly[wr], to = +$('#wc').value; W.days[to] = JSON.parse(JSON.stringify(W.days[wd] || { rest: false, items: [] })); save(); toast('Copied'); render() },
    genw: () => { const W = D.weekly[wr], s = $('#gs').value, en = $('#ge').value; if (!validDate(s) || !validDate(en) || en < s) return toast('Choose a valid date range', 'err'); const P = []; dayList(s, en).forEach(d => { const x = W.days[parse(d).getDay()]; if (!x || x.rest || (D.ann[d] && D.ann[d].type === 'Rest')) return; x.items.forEach(y => P.push({ date: d, subject: y.subject, title: y.title, duration: +y.minutes, time: y.time })) }); genTasks(P) },
    day: () => { sel = b.dataset.d; const p = parse(sel); cal.y = p.getFullYear(); cal.m = p.getMonth(); if (view === 'dashboard') view = 'calendar'; render() },
    pm: () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y-- } render() }, nm: () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++ } render() }, tm: () => { const n = new Date(); cal = { y: n.getFullYear(), m: n.getMonth() }; sel = today(); render() },
    setty: () => { const v = $('#dty').value; D.ann[sel] = D.ann[sel] || {}; if (v === 'Normal') delete D.ann[sel].type; else D.ann[sel].type = v; save(); render(); toast('Day type updated') },
    savenote: () => { D.ann[sel] = D.ann[sel] || {}; D.ann[sel].note = $('#dnote').value; save(); toast('Note saved') },
    resch: () => { const n = $('#rsd').value; if (!validDate(n)) return toast('Pick a valid date', 'err'); const p = D.tasks.filter(x => x.date === sel && ['Pending', 'In Progress', 'Missed'].includes(x.status)); p.forEach(x => { x.date = n; if (x.status === 'Missed') x.status = 'Pending' }); save(); render(); toast(p.length + ' task(s) moved to ' + n) },
    newsub: () => subForm(), editsub: () => subForm(D.subjects.find(s => s.id === id)), arcsub: () => { const s = D.subjects.find(x => x.id === id); s.archived = !s.archived; save(); render() },
    newhol: () => holForm(), edithol: () => holForm(D.holidays.find(h => h.id === id)), delhol: () => ask('Delete this holiday?', () => { D.holidays = D.holidays.filter(h => h.id !== id); save(); render() }, 'Delete'),
    exp: () => { const k = b.dataset.k; download(exportObj(k), `preptrack-${k === 'all' ? 'backup' : k}-${today()}.json`); toast('Export downloaded') },
    saveset: () => { const S = D.settings, g = +$('#s_goal').value, st = $('#s_start').value; let tg = $('#s_target').value; if (+S.goal !== g) tg = addDays(st, g - 1); if (!validDate(st) || !validDate(tg)) return toast('Invalid dates', 'err'); Object.assign(S, { start: st, goal: g, target: tg, daily: +$('#s_daily').value || 210, weekly: +$('#s_weekly').value || 1470, role: $('#s_role').value, locations: $('#s_loc').value, sound: $('#s_snd').checked, rest: $$('.rd').filter(x => x.checked).map(x => +x.value) }); save(); render(); toast('Settings saved') },
    notif: () => typeof requestNotificationPermission === 'function' ? requestNotificationPermission() : ('Notification' in window ? Notification.requestPermission().then(p => toast('Notifications ' + p)) : toast('Not supported', 'warn')),
    rmsample: () => ask('Remove all sample tasks and holidays? Your own records stay.', () => { D.tasks = D.tasks.filter(x => !x.sample); D.holidays = D.holidays.filter(x => !x.sample); save(); render(); toast('Sample data removed') }, 'Remove'),
    reset: () => ask('Erase ALL PrepTrack data in this browser? Export a backup first!', () => { localStorage.setItem(CFG.key + '_backup', JSON.stringify(D)); D = migrate({ tasks: [], holidays: [], subjects: seed().subjects }); save(); render(); toast('Reset (backup kept in browser)') }, 'Erase')
  }; A[a] && A[a]()
});
function subForm(s) { s = s || { name: '', minutes: 30, color: '#7c5cff', icon: 'fa-book' }; modal(s.id ? 'Edit subject' : 'Add subject', `<label>Name</label><input name="n" value="${esc(s.name)}"><label>Daily minutes</label><input type="number" name="m" value="${s.minutes}"><label>Colour</label><input type="color" name="c" value="${s.color}"><label>Icon</label><select name="i">${opt(['fa-book', 'fa-code', 'fa-database', 'fa-comments', 'fa-layer-group', 'fa-bolt', 'fa-brain', 'fa-gears'].map(x => [x, x]), s.icon)}</select>`, m => { const n = val(m, 'n').trim(); if (!n) return toast('Name required', 'err'), false; const o = { name: n, minutes: +val(m, 'm') || 30, color: val(m, 'c'), icon: val(m, 'i') }; if (s.id) Object.assign(s, o); else D.subjects.push({ id: uid(), archived: false, ...o }); save(); render() }) }
function holForm(h) { h = h || { name: '', date: today(), description: '', annual: false, policy: 'Full Holiday' }; modal(h.id ? 'Edit holiday' : 'Add holiday', `<label>Name</label><input name="n" value="${esc(h.name)}"><label>Date</label><input type="date" name="d" value="${h.date}"><label>Description</label><input name="s" value="${esc(h.description)}"><label>Study policy</label><select name="p">${opt(['Full Holiday', 'Light Study', 'Normal Study'].map(x => [x, x]), h.policy)}</select><label>Repeat annually</label><select name="a"><option value="0">No</option><option value="1" ${h.annual ? 'selected' : ''}>Yes</option></select>`, m => { if (!val(m, 'n').trim() || !validDate(val(m, 'd'))) return toast('Name and valid date required', 'err'), false; const o = { name: val(m, 'n').trim(), date: val(m, 'd'), description: val(m, 's'), policy: val(m, 'p'), annual: val(m, 'a') === '1', sample: false }; if (h.id) Object.assign(h, o); else D.holidays.push({ id: uid(), ...o }); save(); render() }) }
document.addEventListener('change', e => {
  const t = e.target, id = t.id, F = { tdd: () => { td = t.value || today(); render() }, fs: () => { tf.sub = t.value; render() }, ft: () => { tf.st = t.value; render() }, fp: () => { tf.pr = t.value; render() }, fo: () => { tf.sort = t.value; render() }, drd: () => { dr.date = t.value }, wsel: () => { wr = +t.value; render() }, wrest: () => { const W = D.weekly[wr]; (W.days[wd] = W.days[wd] || { rest: false, items: [] }).rest = t.checked; save(); render() }, rgs: () => { rg.r = t.value; render() }, rf: () => { rg.from = t.value; render() }, rt: () => { rg.to = t.value; render() }, file: () => { handleFile(t.files[0]); t.value = '' } }; F[id] && F[id]();
  if (t.dataset.dr) { const x = dr.items[+t.dataset.i], f = t.dataset.dr; x[f] = f === 'on' ? t.checked : f === 'minutes' ? +t.value : t.value; if (f === 'on' || f === 'minutes') render() }
});
document.addEventListener('input', e => { if (e.target.id === 'fq') { tf.q = e.target.value; const p = e.target.selectionStart; render(); const n = $('#fq'); n.focus(); n.setSelectionRange(p, p) } });
['dragover', 'dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { const d = e.target.closest && e.target.closest('#drop'); if (!d) return; e.preventDefault(); d.classList.toggle('over', ev === 'dragover'); if (ev === 'drop') handleFile(e.dataTransfer.files[0]) }));
const fired = new Set(); setInterval(() => { const n = new Date(), hm = pad(n.getHours()) + ':' + pad(n.getMinutes()); D.tasks.filter(t => t.date === today() && t.reminder === hm && t.status !== 'Completed' && !fired.has(t.id + hm)).forEach(t => { fired.add(t.id + hm); toast('⏰ ' + t.title, 'warn'); if ('Notification' in window && Notification.permission === 'granted') new Notification('PrepTrack', { body: t.title }); if (D.settings.sound) try { const c = new AudioContext(), o = c.createOscillator(); o.connect(c.destination); o.start(); setTimeout(() => o.stop(), 300) } catch (_) { } }) }, 20000);
render(); if (loadMsg) toast(loadMsg, 'err'); if (D.tasks.some(t => t.sample)) toast('Sample data is loaded — remove it in Settings when ready', 'warn');
