// ft-receitas.js — v2.0  BUG CORRIGIDO: sem await abrirModal
import { salvar, carregar, remover } from './ft-storage.js';
import { calcCustoIngrediente, calcCustoReceita } from './ft-calc.js';
import { formatCurrency, formatQtdUnid, generateId, parseNum, TAMANHO_LABEL } from './ft-format.js';
import { toast, abrirModal, fecharModal, confirmar, renderEmpty, renderTutorial } from './ft-ui.js';
import { abrirPickerIngrediente } from './ft-ingredientes.js';
import { ico } from './ft-icons.js';

const COL = 'receitas';
let _recs = [];
let _editList = []; // ingredientes em edição temporária

// ─── Estado ───────────────────────────────────────────────────────
export async function initReceitas() { _recs = await carregar(COL); }
export function getReceitas()        { return _recs; }
export function getReceitaById(id)   { return _recs.find(r=>r.id===id)||null; }

// ─── Tutorial ─────────────────────────────────────────────────────
function _tut() {
  renderTutorial('ft-sec-rec', 'rec', ico.recipes, 'Como criar receitas', [
    'Toque em <strong>+</strong> para criar uma nova receita de pizza.',
    'Dê um nome, escolha o tamanho e adicione os ingredientes.',
    'Para cada ingrediente, informe a <strong>quantidade usada por pizza</strong>.',
    'O custo total é calculado automaticamente. Use o <strong>Simulador</strong> para precificar.',
  ]);
}

// ─── Render lista ─────────────────────────────────────────────────
export function renderReceitas(busca = '') {
  const wrap = document.getElementById('ft-lista-rec');
  if (!wrap) return;
  _tut();

  const q = busca.trim().toLowerCase();
  const lista = [..._recs]
    .filter(r => !q || r.nome.toLowerCase().includes(q))
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));

  if (!lista.length) {
    renderEmpty(wrap, ico.recipes,
      q ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada',
      q ? 'Tente outro termo.' : 'Crie sua primeira receita tocando em +.',
      q ? null : { label: 'Nova receita', fn: ()=>abrirFormReceita() }
    );
    return;
  }

  wrap.innerHTML = `
    <div class="ft-list-header">${lista.length} receita${lista.length!==1?'s':''}</div>
    <div class="ft-list">
      ${lista.map(r => {
        const chips = (r.ingredientes||[]).slice(0,3).map(i=>
          `<span class="ft-chip">${_esc(i.nome)}</span>`).join('') +
          ((r.ingredientes?.length||0)>3
            ? `<span class="ft-chip ft-chip-more">+${r.ingredientes.length-3}</span>` : '');
        return `
        <button class="ft-list-item" data-id="${r.id}" type="button">
          <span class="ft-item-ico ft-ico-rec">${ico.recipes}</span>
          <span class="ft-item-body">
            <span class="ft-item-name">
              ${_esc(r.nome)}
              <span class="ft-tam-pill">${r.tamanho}</span>
            </span>
            <span class="ft-item-chips">${chips}</span>
          </span>
          <span class="ft-item-end">
            <span class="ft-pill ft-pill-acc">${formatCurrency(r.custo_total)}</span>
            <span class="ft-item-chev">${ico.chevR}</span>
          </span>
        </button>`;
      }).join('')}
    </div>`;

  wrap.querySelectorAll('.ft-list-item').forEach(b =>
    b.addEventListener('click', ()=>abrirFormReceita(b.dataset.id)));
}

// ─── Formulário (sem await!) ──────────────────────────────────────
export function abrirFormReceita(id = null) {
  const rec = id ? getReceitaById(id) : null;
  _editList = rec ? (rec.ingredientes||[]).map(i=>({...i})) : [];

  const tamOpts = ['P','M','G','GG'].map(t =>
    `<option value="${t}"${(rec?.tamanho===t||(!rec&&t==='G'))?' selected':''}>${TAMANHO_LABEL[t]}</option>`
  ).join('');

  const html = `
    <div class="ft-mhd">
      <button class="ft-mhd-close" id="_rClose" aria-label="Fechar">${ico.close}</button>
      <span class="ft-mhd-title">${rec ? 'Editar receita' : 'Nova receita'}</span>
      ${rec
        ? `<button class="ft-mhd-del" id="_rDel" aria-label="Apagar">${ico.trash}</button>`
        : `<span style="width:32px"></span>`}
    </div>
    <div class="ft-mbody">
      <div class="ft-field-row">
        <div class="ft-field" style="flex:2">
          <label for="ft-rec-nome">Nome da pizza</label>
          <input id="ft-rec-nome" class="ft-input" type="text"
            placeholder="Ex: Margherita, Calabresa…"
            value="${_esc(rec?.nome||'')}" autocomplete="off">
        </div>
        <div class="ft-field">
          <label for="ft-rec-tam">Tamanho</label>
          <select id="ft-rec-tam" class="ft-input ft-select">${tamOpts}</select>
        </div>
      </div>

      <div class="ft-field">
        <div class="ft-label-row">
          <label>Ingredientes</label>
          <button class="ft-btn ft-btn-sm ft-btn-ghost" id="_rAddIng" type="button">
            <span class="ft-bico">${ico.plus}</span><span>Adicionar</span>
          </button>
        </div>
        <div id="ft-rec-ings"></div>
      </div>

      <div class="ft-calc-preview" id="ft-rec-custo">
        <span class="ft-calc-label">${ico.tag} Custo total da receita</span>
        <span class="ft-calc-val" id="ft-rec-custo-val">—</span>
      </div>

      <div class="ft-tip-banner">
        ${ico.info}
        <span>Após salvar, vá ao <strong>Simulador</strong> para calcular o preço de venda ideal.</span>
      </div>
    </div>
    <div class="ft-mft">
      <button class="ft-btn ft-btn-primary ft-btn-full" id="_rSave" type="button">
        <span class="ft-bico">${ico.save}</span><span>Salvar receita</span>
      </button>
    </div>`;

  // ── SÍNCRONO: sem await ───────────────────────────────────────
  const done = abrirModal(html, { largo: true });

  // DOM existe agora — registrar tudo imediatamente
  _renderEdList();

  document.getElementById('_rClose')?.addEventListener('click', ()=>fecharModal(null), {once:true});
  document.getElementById('_rSave' )?.addEventListener('click', ()=>_save(id));
  document.getElementById('_rDel'  )?.addEventListener('click', async ()=>{
    fecharModal(null); await _del(id);
  });

  document.getElementById('_rAddIng')?.addEventListener('click', async () => {
    const ja = _editList.map(i=>i.ingrediente_id);
    const res = await abrirPickerIngrediente(ja);
    if (!res) return;
    const { ing, qtd } = res;
    _editList.push({
      ingrediente_id: ing.id, nome: ing.nome,
      quantidade: qtd, unidade: ing.unidade,
      custo: calcCustoIngrediente(qtd, ing.custo_unitario),
    });
    _renderEdList();
  });

  return done;
}

function _renderEdList() {
  const wrap = document.getElementById('ft-rec-ings');
  if (!wrap) return;

  if (!_editList.length) {
    wrap.innerHTML = `
      <div class="ft-ings-empty">
        ${ico.ingredients}
        <span>Nenhum ingrediente. Toque em <strong>+ Adicionar</strong>.</span>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="ft-ings-list">
        ${_editList.map((ing,idx) => `
        <div class="ft-ing-row">
          <span class="ft-ing-row-ico">${ico.ingredients}</span>
          <span class="ft-ing-row-body">
            <span class="ft-ing-row-name">${_esc(ing.nome)}</span>
            <span class="ft-ing-row-qtd">${formatQtdUnid(ing.quantidade, ing.unidade)}</span>
          </span>
          <span class="ft-ing-row-cost">${formatCurrency(ing.custo)}</span>
          <button class="ft-ing-row-rm" data-idx="${idx}" aria-label="Remover">${ico.close}</button>
        </div>`).join('')}
      </div>`;
    wrap.querySelectorAll('.ft-ing-row-rm').forEach(b =>
      b.addEventListener('click', () => {
        _editList.splice(parseInt(b.dataset.idx),1);
        _renderEdList();
      }));
  }

  const custo = calcCustoReceita(_editList);
  const el = document.getElementById('ft-rec-custo-val');
  const bx = document.getElementById('ft-rec-custo');
  if (el) { el.textContent = formatCurrency(custo); el.classList.toggle('has', custo>0); }
  if (bx) bx.classList.toggle('active', custo>0);
}

async function _save(id) {
  const nome    = document.getElementById('ft-rec-nome')?.value.trim();
  const tamanho = document.getElementById('ft-rec-tam' )?.value||'G';

  if (!nome) {
    const el=document.getElementById('ft-rec-nome');
    el?.classList.add('err');
    el?.addEventListener('input',()=>el.classList.remove('err'),{once:true});
    toast('Informe o nome da pizza.','erro'); return;
  }

  const obj = {
    id: id||generateId(), nome, tamanho,
    ingredientes: _editList.map(i=>({...i})),
    custo_total: calcCustoReceita(_editList),
    criadoEm: Date.now(),
  };

  const btn = document.getElementById('_rSave');
  if (btn) { btn.disabled=true; btn.lastElementChild.textContent='Salvando…'; }

  try {
    await salvar(COL, obj.id, obj);
    if (id) { const i=_recs.findIndex(r=>r.id===id); if(i>=0) _recs[i]=obj; else _recs.push(obj); }
    else _recs.push(obj);
    fecharModal('saved');
    toast(id?'Receita atualizada!':'Receita criada!','sucesso');
    renderReceitas(document.getElementById('ft-busca-rec')?.value||'');
    document.dispatchEvent(new CustomEvent('ft:recs-changed'));
  } catch(e) {
    toast('Erro ao salvar receita.','erro');
    if (btn) { btn.disabled=false; btn.lastElementChild.textContent='Salvar receita'; }
    console.error(e);
  }
}

async function _del(id) {
  const r = getReceitaById(id);
  if (!r) return;
  const ok = await confirmar(
    `Remover <strong>${_esc(r.nome)}</strong>?<br>Esta ação não pode ser desfeita.`,
    { labelOK:'Remover', perigo:true }
  );
  if (!ok) return;
  await remover(COL, id);
  _recs = _recs.filter(r=>r.id!==id);
  toast('Receita removida.','info');
  renderReceitas(document.getElementById('ft-busca-rec')?.value||'');
  document.dispatchEvent(new CustomEvent('ft:recs-changed'));
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
