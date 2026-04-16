/* modelscan.js — separado para compatibilidade com CSP do GitHub Pages */

var FILES = [];
var LINKS = [];
var SOURCES = [];
var RESULT = null;
var DECISION = null;
var DBG_LINES = [];

/* ── DEBUG ── */
function dbg(msg, type) {
var ts = new Date().toLocaleTimeString(‘pt-BR’);
var color = { ok: ‘#3FB950’, err: ‘#F85149’, inf: ‘#58A6FF’, warn: ‘#D29922’ }[type] || ‘#58A6FF’;
var prefix = { ok: ’[OK] ’, err: ’[ERR] ’, inf: ’[INF] ‘, warn: ‘[AVR] ’ }[type] || ‘[INF] ‘;
DBG_LINES.push(’<span style="color:' + color + '">’ + ts + ’ ’ + prefix + msg + ‘</span>’);
if (DBG_LINES.length > 80) { DBG_LINES.shift(); }
var el = document.getElementById(‘dbg-log’);
if (el) { el.innerHTML = DBG_LINES.join(’<br>’); el.scrollTop = el.scrollHeight; }
}

function dbgClear() {
DBG_LINES = [];
var el = document.getElementById(‘dbg-log’);
if (el) { el.innerHTML = ‘<span style="color:#58A6FF">Log limpo.</span>’; }
}

/* ── HELPERS ── */
function GV(id) {
var e = document.getElementById(id);
return (e && e.value) ? e.value.trim() : ‘’;
}
function G(id) { return document.getElementById(id); }
function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function makeUID() { return ‘MDL-’ + Math.random().toString(36).substr(2, 6).toUpperCase(); }

function showErr(msg) {
dbg(msg, ‘err’);
var b = G(‘err-banner’);
if (b) { b.textContent = msg; b.style.display = ‘block’; }
}
function hideErr() {
var b = G(‘err-banner’);
if (b) { b.style.display = ‘none’; }
}
function resetBtn() {
dbg(‘Botao restaurado.’, ‘warn’);
var btn = G(‘btn-run’);
if (btn) { btn.style.display = ‘block’; }
var ld = G(‘loading’);
if (ld) { ld.style.display = ‘none’; }
}

/* ── TILES ── */
function togTile(el) {
var s = el.getAttribute(‘data-s’);
var isOn = el.className.indexOf(‘on’) >= 0;
el.className = isOn ? ‘tile’ : ‘tile on’;
var idx = SOURCES.indexOf(s);
if (!isOn) { if (idx < 0) { SOURCES.push(s); } }
else { if (idx >= 0) { SOURCES.splice(idx, 1); } }
dbg(’Fonte: ’ + s + ’ = ’ + (!isOn ? ‘ON’ : ‘OFF’), ‘inf’);
}

/* ── ARQUIVOS ── */
function addFiles(fl) {
var i, f, j, found;
for (i = 0; i < fl.length; i++) {
f = fl[i]; found = false;
for (j = 0; j < FILES.length; j++) { if (FILES[j].name === f.name) { found = true; break; } }
if (!found) { FILES.push(f); }
}
dbg(‘Arquivos: ’ + FILES.length, ‘ok’);
renderFiles();
}
function renderFiles() {
var i, h = ‘’;
var ok = G(‘flist-ok’), fl = G(‘flist’);
for (i = 0; i < FILES.length; i++) {
var ext = FILES[i].name.split(’.’).pop().toUpperCase();
var kb = Math.round(FILES[i].size / 1024);
h += ‘<div class="fi"><span style="font-size:11px;color:#717A8C;flex-shrink:0;font-weight:700;">’ + ext + ‘</span>’;
h += ‘<span class="fi-n">’ + FILES[i].name + ’ (’ + kb + ‘KB)</span>’;
h += ‘<button class="fi-r" type="button" data-idx="' + i + '">x</button></div>’;
}
if (fl) { fl.innerHTML = h; }
if (ok) {
if (FILES.length > 0) { ok.style.display = ‘block’; ok.textContent = FILES.length + ’ arquivo(s) carregado(s).’; }
else { ok.style.display = ‘none’; }
}
/* re-bind remove buttons */
var btns = document.querySelectorAll(’.fi-r’);
for (i = 0; i < btns.length; i++) {
(function(btn) {
btn.addEventListener(‘click’, function() { rmF(parseInt(btn.getAttribute(‘data-idx’))); });
})(btns[i]);
}
}
function rmF(i) { FILES.splice(i, 1); renderFiles(); }

/* ── LINKS ── */
function addLink() {
var inp = G(‘linp’);
if (!inp) { return; }
var v = inp.value.trim();
if (!v) { return; }
var i, found = false;
for (i = 0; i < LINKS.length; i++) { if (LINKS[i] === v) { found = true; break; } }
if (!found) { LINKS.push(v); }
inp.value = ‘’;
dbg(‘Link: ’ + v, ‘inf’);
renderChips();
}
function renderChips() {
var i, h = ‘’;
for (i = 0; i < LINKS.length; i++) {
h += ‘<span class="chip">’ + LINKS[i];
h += ‘<button type="button" class="chip-rm" data-idx="' + i + '" style="background:none;border:none;color:rgba(0,92,169,.5);cursor:pointer;font-size:14px;margin-left:4px;">x</button>’;
h += ‘</span>’;
}
var el = G(‘chips’);
if (el) { el.innerHTML = h; }
var btns = document.querySelectorAll(’.chip-rm’);
for (i = 0; i < btns.length; i++) {
(function(btn) {
btn.addEventListener(‘click’, function() { rmL(parseInt(btn.getAttribute(‘data-idx’))); });
})(btns[i]);
}
}
function rmL(i) { LINKS.splice(i, 1); renderChips(); }

/* ── EXECUTAR ── */
async function executar() {
dbg(‘executar() chamado.’, ‘inf’);
var nm = GV(‘nm’), ar = GV(‘ar’), ow = GV(‘ow’), oe = GV(‘oe’);
dbg(‘nm=’ + nm + ’ ar=’ + ar + ’ ow=’ + ow, ‘inf’);
if (!nm) { alert(‘Informe o Nome do Modelo.’); return; }
if (!ar) { alert(‘Informe a Area.’); return; }
if (!ow) { alert(‘Informe o Model Owner.’); return; }
if (!oe) { alert(‘Informe seu e-mail.’); return; }

var hasKey = GV(‘api-key’).length > 0;
dbg(’Chave presente: ’ + hasKey, hasKey ? ‘ok’ : ‘warn’);

hideErr();
G(‘btn-run’).style.display = ‘none’;
G(‘loading’).style.display = ‘block’;

var steps = [
‘Agente de Ingestao: lendo fontes…’,
‘Agente RAG: extraindo informacoes…’,
‘Agente Classificador: identificando tecnica…’,
‘Agente de Criticidade: calculando dimensoes…’,
‘Sintese: gerando Model Card…’
];
var i;
for (i = 0; i < steps.length; i++) {
G(‘loading-txt’).textContent = steps[i];
dbg(’Step ’ + (i + 1) + ’: ’ + steps[i], ‘inf’);
await wait(i === 1 ? 1800 : 1200);
}

dbg(’Steps OK. Chamando ’ + (hasKey ? ‘callAPI’ : ‘makeDemo’), ‘inf’);
try {
RESULT = hasKey ? await callAPI(GV(‘api-key’)) : makeDemo();
dbg(’RESULT OK. Nivel: ’ + RESULT.criticality_level, ‘ok’);
} catch (e) {
dbg(’ERRO: ’ + e.message, ‘err’);
resetBtn();
showErr(’Erro: ’ + e.message);
return;
}

G(‘loading’).style.display = ‘none’;
G(‘sec-mc’).style.display = ‘block’;
renderMC(RESULT);
dbg(‘FLUXO COMPLETO.’, ‘ok’);
G(‘sec-mc’).scrollIntoView({ behavior: ‘smooth’ });
}

/* ── API ── */
async function callAPI(key) {
dbg(‘callAPI() iniciado.’, ‘inf’);
var nm = GV(‘nm’), ar = GV(‘ar’), ow = GV(‘ow’), txt = ‘’, i;
for (i = 0; i < FILES.length; i++) {
try {
var t = await readTxt(FILES[i]);
txt += ‘\nARQ:’ + FILES[i].name + ‘\n’ + t.substring(0, 3000);
dbg(’Lido: ’ + FILES[i].name, ‘ok’);
} catch (e) { dbg(’Erro lendo ’ + FILES[i].name, ‘warn’); }
}

var tmpl = ‘{“family”:“string”,“technique”:“string”,“description”:“string”,“platform”:“string”,“inputs”:“string”,“outputs”:“string”,“autonomy”:“string”,“regulatory”:“string”,“scores”:{“D1”:3,“D2”:3,“D3”:3,“D4”:3,“D5”:3,“D6”:3},“weighted_score”:3.0,“criticality_level”:“N1”,“criticality_name”:“Critico”,“tags”:[“tag”],“controls”:[{“text”:“texto”,“type”:“crit”}],“validation_scope”:“string”,“confidence”:70,“confidence_note”:“string”}’;
var prompt = ‘Analise e gere Model Card em JSON puro sem markdown.\nModelo:’ + nm + ‘\nArea:’ + ar + ‘\nOwner:’ + ow + ‘\nFontes:’ + SOURCES.join(’,’) + ‘\nLinks:’ + LINKS.join(’,’) + ‘\nCtx:’ + GV(‘ctx’) + (txt ? ‘\n’ + txt : ‘’) + ‘\nRetorne SOMENTE este JSON:\n’ + tmpl;

dbg(‘Prompt: ’ + prompt.length + ’ chars. Fetch…’, ‘inf’);

var controller = new AbortController();
var abortTimer = setTimeout(function() { dbg(‘TIMEOUT 55s.’, ‘err’); controller.abort(); }, 55000);

var res;
try {
res = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
signal: controller.signal,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: key,
‘anthropic-version’: ‘2023-06-01’,
‘anthropic-dangerous-direct-browser-access’: ‘true’
},
body: JSON.stringify({
model: ‘claude-sonnet-4-20250514’,
max_tokens: 2000,
messages: [{ role: ‘user’, content: prompt }]
})
});
} catch (fe) {
clearTimeout(abortTimer);
dbg(’fetch ERRO: ’ + fe.name + ’ - ’ + fe.message, ‘err’);
throw fe;
}
clearTimeout(abortTimer);
dbg(’fetch OK. HTTP ’ + res.status, res.ok ? ‘ok’ : ‘err’);

var data;
try { data = await res.json(); }
catch (je) { dbg(’JSON parse ERRO: ’ + je.message, ‘err’); throw je; }

dbg(‘JSON keys: ’ + Object.keys(data).join(’,’), ‘inf’);
if (!res.ok || data.error) {
var em = data.error ? data.error.message : (’HTTP ’ + res.status);
dbg(’API ERRO: ’ + em, ‘err’);
throw new Error(em);
}

var raw = ‘’, ci;
for (ci = 0; ci < data.content.length; ci++) { if (data.content[ci].text) { raw += data.content[ci].text; } }
dbg(‘Raw: ’ + raw.length + ’ chars.’, ‘inf’);

var js = raw.indexOf(’{’), je = raw.lastIndexOf(’}’) + 1;
if (js < 0 || je <= 0) { dbg(’JSON nao encontrado. Raw: ’ + raw.substring(0, 80), ‘err’); throw new Error(‘Sem JSON valido’); }

var r = JSON.parse(raw.substring(js, je));
r.model_name = nm; r.model_area = ar; r.model_owner = ow;
dbg(’JSON OK. Nivel: ’ + r.criticality_level, ‘ok’);
return r;
}

/* ── DEMO ── */
function makeDemo() {
dbg(‘makeDemo() chamado.’, ‘warn’);
return {
model_name: GV(‘nm’) || ‘Scoring de Credito PF’,
model_area: GV(‘ar’) || ‘SUPEC’,
model_owner: GV(‘ow’) || ‘Demo’,
family: ‘Machine Learning’,
technique: ‘Gradient Boosting (XGBoost)’,
description: ‘Modelo para estimacao de probabilidade de default em carteiras PF.’,
platform: ‘Python + Databricks (MLflow)’,
inputs: ‘Score bureau, historico, renda, tempo de relacionamento’,
outputs: ‘Score PD (0-1000), faixa de risco (A-G), limite recomendado’,
autonomy: ‘Automatico ate R$50 mil; aprovacao humana acima’,
regulatory: ‘Basileia III / IFRS 9’,
scores: { D1: 4, D2: 4, D3: 4, D4: 3, D5: 5, D6: 3 },
weighted_score: 3.90,
criticality_level: ‘N1’,
criticality_name: ‘Critico’,
tags: [‘credito-pf’, ‘pd-model’, ‘basileia-iii’, ‘xgboost’],
controls: [
{ text: ‘Monitoramento continuo PSI/KS/Gini’, type: ‘crit’ },
{ text: ‘Validacao independente anual’, type: ‘crit’ },
{ text: ‘Plano de contingencia semestral’, type: ‘crit’ },
{ text: ‘Analise de vies a cada recalibracao’, type: ‘warn’ },
{ text: ‘SHAP values para contestacoes’, type: ‘warn’ },
{ text: ‘Aprovacao do Comite para alteracoes’, type: ‘ok’ }
],
validation_scope: ‘Validacao Profunda N1: revisao conceitual, backtesting 24 meses, stress test.’,
confidence: 72,
confidence_note: ‘Confianca moderada-alta. Resultado de demonstracao.’
};
}

/* ── READ TXT ── */
function readTxt(f) {
return new Promise(function(resolve, reject) {
var reader = new FileReader();
reader.onload = function(ev) { resolve(ev.target.result); };
reader.onerror = function() { reject(new Error(‘FileReader error’)); };
reader.readAsText(f);
});
}

/* ── RENDER MODEL CARD ── */
function renderMC(r) {
dbg(‘renderMC() iniciado.’, ‘inf’);
var id = r.uid || makeUID(); r.uid = id;
var ts = new Date().toLocaleString(‘pt-BR’);
var oe = GV(‘oe’), ve = GV(‘ve’);
var dm = { D1:‘D1 Impacto Fin.’, D2:‘D2 Exp. Reg.’, D3:‘D3 Autonomia’, D4:‘D4 Opacidade’, D5:‘D5 Abrangencia’, D6:‘D6 Maturidade’ };

var sc = r.scores || {}, k, scH = ‘’;
for (k in sc) {
var pct = Math.round((sc[k] / 5) * 100);
scH += ‘<div class="scrow"><div class="scd">’ + (dm[k] || k) + ‘</div>’;
scH += ‘<div class="sctrk"><div class="scf" style="width:' + pct + '%;"></div></div>’;
scH += ‘<div class="scv">’ + sc[k] + ‘/5</div></div>’;
}

var controls = r.controls || [], ctH = ‘’, ci;
for (ci = 0; ci < controls.length; ci++) {
var c = controls[ci], ctype = c.type || ‘’;
var cls = ‘ci’;
if (ctype === ‘crit’) { cls = ‘ci ci-crit’; }
else if (ctype === ‘warn’) { cls = ‘ci ci-warn’; }
else if (ctype === ‘ok’) { cls = ‘ci ci-ok’; }
ctH += ‘<div class="' + cls + '">’ + (c.text || ‘’) + ‘</div>’;
}

var tags = r.tags || [], tgH = ‘’, ti;
for (ti = 0; ti < tags.length; ti++) { tgH += ‘<div class="tag">’ + tags[ti] + ‘</div>’; }

var h = ‘’;
h += ‘<div class="mc-hd"><div class="mc-id">’ + id + ‘</div>’;
h += ‘<div class="mc-n">’ + (r.model_name||’’) + ‘</div>’;
h += ‘<div class="mc-f">’ + (r.family||’’) + ’ - ’ + (r.technique||’’) + ‘</div>’;
h += ‘<div class="mc-lv"><div class="mc-ln">’ + (r.criticality_level||’’) + ‘</div>’;
h += ‘<div class="mc-lname">’ + (r.criticality_name||’’) + ‘</div></div>’;
h += ‘<div class="mc-meta">’;
h += ‘<div><div class="mc-ml">Area</div><div class="mc-mv">’ + (r.model_area||’’) + ‘</div></div>’;
h += ‘<div><div class="mc-ml">Owner</div><div class="mc-mv">’ + (r.model_owner||’’) + ‘</div></div>’;
h += ‘<div><div class="mc-ml">Gerado</div><div class="mc-mv">’ + ts + ‘</div></div>’;
h += ‘<div><div class="mc-ml">Confianca</div><div class="mc-mv">’ + (r.confidence||0) + ‘%</div></div>’;
h += ‘</div></div>’;
h += ‘<div class="card"><div class="card-t">Descricao</div><div class="txt">’ + (r.description||’’) + ‘</div></div>’;
h += ‘<div class="card"><div class="card-t">Identificacao Tecnica</div><div class="ig">’;
h += ‘<div class="ic"><div class="ic-l">Tecnica</div><div class="ic-v">’ + (r.technique||’’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Plataforma</div><div class="ic-v">’ + (r.platform||’’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Inputs</div><div class="ic-v">’ + (r.inputs||’’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Outputs</div><div class="ic-v">’ + (r.outputs||’’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Autonomia</div><div class="ic-v">’ + (r.autonomy||’’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Regulatorio</div><div class="ic-v">’ + (r.regulatory||’’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Fontes</div><div class="ic-v">’ + (SOURCES.length ? SOURCES.join(’, ‘) : ‘nao especificadas’) + ‘</div></div>’;
h += ‘<div class="ic"><div class="ic-l">Chave</div><div class="ic-v" style="color:#005CA9;font-family:monospace;font-size:11px;">’ + id + ‘</div></div>’;
h += ‘</div></div>’;
h += ‘<div class="card"><div class="card-t">Criticidade</div>’ + scH;
h += ‘<div class="sctot"><div class="sctot-l">Pontuacao Ponderada</div>’;
h += ‘<div class="sctot-v">’ + ((r.weighted_score||0).toFixed(2)) + ‘</div></div>’;
h += ‘<div style="font-size:11px;color:#B8BEC9;margin-top:4px;">’ + (r.confidence_note||’’) + ‘</div></div>’;
h += ‘<div class="card"><div class="card-t">Tags</div><div class="tags">’ + tgH + ‘</div></div>’;
h += ‘<div class="card"><div class="card-t">Controles Recomendados</div>’ + ctH + ‘</div>’;
h += ‘<div class="card"><div class="card-t">Escopo de Validacao</div><div class="txt">’ + (r.validation_scope||’’) + ‘</div></div>’;

var eOwnerLines = [
‘Prezado(a) ’ + (r.model_owner||’’) + ‘,’, ‘’,
‘Catalogacao concluida!’, ‘’,
‘ID: ’ + id, ‘Modelo: ’ + (r.model_name||’’),
‘Nivel: ’ + (r.criticality_level||’’) + ’ - ’ + (r.criticality_name||’’),
‘Pontuacao: ’ + ((r.weighted_score||0).toFixed(2)) + ‘/5’,
‘Gerado: ’ + ts, ‘’,
‘Proximos passos:’, ‘1. Revise o Model Card’, ‘2. Confirme ou solicite revisao’, ‘’,
‘Equipe ModelScan’
];
var eValLines = [
‘Equipe de Validacao,’, ‘’,
‘Novo modelo - criticidade ’ + (r.criticality_level||’’) + ‘.’, ‘’,
‘ID: ’ + id, ‘Modelo: ’ + (r.model_name||’’),
‘Area: ’ + (r.model_area||’’), ‘Owner: ’ + (r.model_owner||’’),
‘Nivel: ’ + (r.criticality_level||’’) + ’ - ’ + (r.criticality_name||’’),
’Pontuacao: ’ + ((r.weighted_score||0).toFixed(2)) + ‘/5’, ‘’,
‘Aguarda validacao.’, ‘ModelScan’
];

h += ‘<div class="card"><div class="card-t">Notificacao - Owner</div>’;
h += ‘<div style="font-size:12px;color:#B8BEC9;margin-bottom:8px;">Para: ’ + oe + ‘</div>’;
h += ‘<div class="email-pre">’ + eOwnerLines.join(’\n’) + ‘</div></div>’;
h += ‘<div class="card"><div class="card-t">Notificacao - Validacao</div>’;
h += ‘<div style="font-size:12px;color:#B8BEC9;margin-bottom:8px;">Para: ’ + ve + ‘</div>’;
h += ‘<div class="email-pre">’ + eValLines.join(’\n’) + ‘</div></div>’;

h += ‘<div class="card"><div class="card-t">Sua Confirmacao</div>’;
h += ‘<div class="g2" style="margin-bottom:12px;">’;
h += ‘<div class="field" style="margin:0;"><label>Corrigir Tecnica</label><input type="text" id="mtech" placeholder="Confirme ou corrija..."></div>’;
h += ‘<div class="field" style="margin:0;"><label>Corrigir Autonomia</label><select id="maut">’;
h += ‘<option value="">manter</option><option>100% automatizado</option><option>Revisao em excecoes</option>’;
h += ‘<option>Aprovacao sistematica</option><option>Subsidio analitico</option><option>Apenas informativo</option>’;
h += ‘</select></div></div>’;
h += ‘<div class="field"><label>Observacoes</label><textarea id="mnotes" placeholder="Correcoes ou contexto..."></textarea></div>’;
h += ‘<div class="dec-row"><button class="dec-btn" type="button" id="btn-ap">OK Confirmo!</button>’;
h += ‘<button class="dec-btn" type="button" id="btn-rj">Solicito revisao</button></div>’;
h += ‘<button class="btn-run" type="button" id="btn-fin" disabled style="opacity:.4;margin-top:12px;">Finalizar e Registrar</button>’;
h += ‘<div id="ok-final" style="display:none;" class="ok"></div></div>’;
h += ‘<div style="display:flex;gap:8px;padding-bottom:10px;">’;
h += ‘<button class="btn-s" type="button" id="btn-expj">JSON</button>’;
h += ‘<button class="btn-s" type="button" id="btn-expt">TXT</button>’;
h += ‘<button class="btn-s" type="button" id="btn-print">PDF</button></div>’;

G(‘mc-out’).innerHTML = h;

/* bind confirmacao buttons */
var bap = G(‘btn-ap’), brj = G(‘btn-rj’), bfin = G(‘btn-fin’);
if (bap) { bap.addEventListener(‘click’, function() { setD(‘approve’); }); }
if (brj) { brj.addEventListener(‘click’, function() { setD(‘reject’); }); }
if (bfin) { bfin.addEventListener(‘click’, function() { finish(); }); }
var bj = G(‘btn-expj’), bt = G(‘btn-expt’), bp = G(‘btn-print’);
if (bj) { bj.addEventListener(‘click’, expJ); }
if (bt) { bt.addEventListener(‘click’, expT); }
if (bp) { bp.addEventListener(‘click’, function() { window.print(); }); }

dbg(‘renderMC() OK. ID=’ + id, ‘ok’);
}

/* ── DECISAO / FINALIZAR ── */
function setD(d) {
DECISION = d;
dbg(‘Decisao: ’ + d, ‘ok’);
var ba = G(‘btn-ap’), br = G(‘btn-rj’), bf = G(‘btn-fin’);
if (ba) { ba.className = d === ‘approve’ ? ‘dec-btn dec-ap-on’ : ‘dec-btn’; }
if (br) { br.className = d === ‘reject’  ? ‘dec-btn dec-rj-on’ : ‘dec-btn’; }
if (bf) { bf.disabled = false; bf.style.opacity = ‘1’; }
}
function finish() {
if (!DECISION) { return; }
dbg(‘finish(): ’ + DECISION, ‘ok’);
var ts = new Date().toLocaleString(‘pt-BR’), ow = GV(‘ow’);
var bf = G(‘btn-fin’), ob = G(‘ok-final’);
if (bf) { bf.disabled = true; bf.style.opacity = ‘.4’; bf.textContent = DECISION === ‘approve’ ? ‘Registrado!’ : ‘Revisao solicitada’; }
if (ob) {
ob.style.display = ‘block’;
ob.innerHTML = DECISION === ‘approve’
? ‘Registrado! Chave: <strong>’ + (RESULT.uid||’’) + ’</strong><br>Por ’ + ow + ’ em ’ + ts
: ’Revisao solicitada por ’ + ow + ’ em ’ + ts;
}
}

/* ── EXPORT ── */
function expJ() {
if (!RESULT) { return; }
var a = document.createElement(‘a’);
a.href = URL.createObjectURL(new Blob([JSON.stringify(RESULT, null, 2)], { type: ‘application/json’ }));
a.download = ‘mc-’ + (RESULT.uid||‘mc’) + ‘.json’;
document.body.appendChild(a); a.click(); document.body.removeChild(a);
dbg(‘JSON exportado.’, ‘ok’);
}
function expT() {
if (!RESULT) { return; }
var lines = [’MODEL CARD: ’ + RESULT.model_name, ’Chave: ’ + RESULT.uid,
‘Nivel: ’ + RESULT.criticality_level + ’ - ’ + RESULT.criticality_name,
‘Pontuacao: ’ + ((RESULT.weighted_score||0).toFixed(2)) + ‘/5’, ‘’,
‘Descricao:’, RESULT.description, ‘’, ‘Escopo:’, RESULT.validation_scope];
var a = document.createElement(‘a’);
a.href = URL.createObjectURL(new Blob([lines.join(’\n’)], { type: ‘text/plain’ }));
a.download = ‘mc-’ + (RESULT.uid||‘mc’) + ‘.txt’;
document.body.appendChild(a); a.click(); document.body.removeChild(a);
dbg(‘TXT exportado.’, ‘ok’);
}

/* ── INIT ── */
function init() {
dbg(‘JS carregado. Safari=’ + /Safari/.test(navigator.userAgent) + ’ iOS=’ + /iPhone|iPad/.test(navigator.userAgent), ‘ok’);
dbg(’URL: ’ + window.location.href, ‘inf’);

window.onerror = function(msg, src, line) { dbg(’ERRO GLOBAL: ’ + msg + ’ linha ’ + line, ‘err’); };
window.onunhandledrejection = function(ev) { var r = ev.reason; dbg(’PROMISE ERRO: ’ + (r && r.message ? r.message : String(r)), ‘err’); };

var eyeBtn = G(‘eye-btn’);
if (eyeBtn) { eyeBtn.addEventListener(‘click’, function() { var inp = G(‘api-key’); if (inp) { inp.type = inp.type === ‘password’ ? ‘text’ : ‘password’; } }); }

var addLinkBtn = G(‘btn-addlink’);
if (addLinkBtn) { addLinkBtn.addEventListener(‘click’, addLink); }

var finp = G(‘finp’);
if (finp) { finp.addEventListener(‘change’, function() { addFiles(this.files); }); }

var btnRun = G(‘btn-run’);
if (btnRun) {
btnRun.addEventListener(‘click’, function() { dbg(‘BTN-RUN clicado!’, ‘ok’); executar(); });
dbg(‘btn-run listener OK.’, ‘ok’);
} else {
dbg(‘btn-run NAO ENCONTRADO!’, ‘err’);
}

var dbgClearBtn = G(‘dbg-clear’);
if (dbgClearBtn) { dbgClearBtn.addEventListener(‘click’, dbgClear); }

dbg(‘PRONTO. Todos os listeners ativos.’, ‘ok’);
}

document.addEventListener(‘DOMContentLoaded’, init);
