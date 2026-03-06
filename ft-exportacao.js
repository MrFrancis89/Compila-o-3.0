// ft-exportacao.js — v2.0
import { getIngredientes } from './ft-ingredientes.js';
import { getReceitas }     from './ft-receitas.js';
import { calcPrecoMarkup, calcMargemReal } from './ft-calc.js';
import { formatCurrency, formatQtdUnid, formatPercent, TAMANHO_LABEL } from './ft-format.js';
import { toast, renderTutorial } from './ft-ui.js';
import { ico } from './ft-icons.js';

export function renderExportacao() {
  const wrap = document.getElementById('ft-exportacao');
  if (!wrap) return;

  renderTutorial('ft-sec-exp', 'exp', ico.exportIcon, 'Exportação de dados', [
    '<strong>CSV</strong>: abra no Excel ou Google Sheets para análise.',
    '<strong>JSON</strong>: backup completo para restaurar dados no futuro.',
    '<strong>PDF</strong>: ficha técnica formatada para impressão ou WhatsApp.',
    '<strong>Importar</strong>: restaura um backup JSON previamente exportado.',
  ]);

  wrap.innerHTML = `
    <div class="ft-list-header">Exportar e importar dados</div>

    <div class="ft-exp-group">
      <div class="ft-exp-group-title">${ico.exportIcon} Exportar</div>

      <div class="ft-exp-row">
        <div class="ft-exp-info">
          <div class="ft-exp-name">${ico.csv} Ingredientes — CSV</div>
          <div class="ft-exp-desc">Planilha com todos os ingredientes cadastrados.</div>
        </div>
        <button class="ft-btn ft-btn-primary ft-btn-sm" id="ft-exp-ingcsv">
          <span class="ft-bico">${ico.download}</span><span>Exportar</span>
        </button>
      </div>

      <div class="ft-exp-row">
        <div class="ft-exp-info">
          <div class="ft-exp-name">${ico.csv} Receitas — CSV</div>
          <div class="ft-exp-desc">Planilha de receitas com custo e ingredientes.</div>
        </div>
        <button class="ft-btn ft-btn-primary ft-btn-sm" id="ft-exp-reccsv">
          <span class="ft-bico">${ico.download}</span><span>Exportar</span>
        </button>
      </div>

      <div class="ft-exp-row">
        <div class="ft-exp-info">
          <div class="ft-exp-name">${ico.json} Backup completo — JSON</div>
          <div class="ft-exp-desc">Todos os dados para restauração futura.</div>
        </div>
        <button class="ft-btn ft-btn-primary ft-btn-sm" id="ft-exp-json">
          <span class="ft-bico">${ico.download}</span><span>Exportar</span>
        </button>
      </div>

      <div class="ft-exp-row">
        <div class="ft-exp-info">
          <div class="ft-exp-name">${ico.pdf} Fichas técnicas — PDF</div>
          <div class="ft-exp-desc">Fichas formatadas para impressão ou compartilhamento.</div>
        </div>
        <button class="ft-btn ft-btn-accent ft-btn-sm" id="ft-exp-pdf">
          <span class="ft-bico">${ico.pdf}</span><span>Imprimir/PDF</span>
        </button>
      </div>
    </div>

    <div class="ft-exp-group">
      <div class="ft-exp-group-title">${ico.upload} Importar</div>
      <div class="ft-exp-row">
        <div class="ft-exp-info">
          <div class="ft-exp-name">Restaurar backup — JSON</div>
          <div class="ft-exp-desc">Importa dados de um backup JSON exportado anteriormente.</div>
        </div>
        <label class="ft-btn ft-btn-ghost ft-btn-sm ft-btn-file">
          <span class="ft-bico">${ico.upload}</span><span>Importar</span>
          <input type="file" id="ft-imp-json" accept=".json" style="display:none">
        </label>
      </div>
    </div>`;

  document.getElementById('ft-exp-ingcsv')?.addEventListener('click', _expIngCSV);
  document.getElementById('ft-exp-reccsv')?.addEventListener('click', _expRecCSV);
  document.getElementById('ft-exp-json'  )?.addEventListener('click', _expJSON);
  document.getElementById('ft-exp-pdf'   )?.addEventListener('click', _expPDF);
  document.getElementById('ft-imp-json'  )?.addEventListener('change', _impJSON);
}

// ─── Helpers ──────────────────────────────────────────────────────
function _csv(cols) {
  return cols.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(';');
}
function _dl(name, content, mime='text/csv;charset=utf-8;') {
  const b = new Blob(['\uFEFF'+content],{type:mime});
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(b),download:name});
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function _expIngCSV() {
  const list = getIngredientes();
  if (!list.length) { toast('Nenhum ingrediente para exportar.','aviso'); return; }
  const hd = _csv(['Nome','Unidade','Qtd Embalagem','Preço Compra (R$)','Custo Unitário (R$)']);
  const rows = list.map(i=>_csv([
    i.nome, i.unidade, i.quantidade_embalagem,
    i.preco_compra.toFixed(2).replace('.',','),
    i.custo_unitario.toFixed(4).replace('.',','),
  ]));
  _dl('ft-ingredientes.csv',[hd,...rows].join('\n'));
  toast('Ingredientes exportados!','sucesso');
}

function _expRecCSV() {
  const list = getReceitas();
  if (!list.length) { toast('Nenhuma receita para exportar.','aviso'); return; }
  const hd = _csv(['Nome','Tamanho','Ingredientes','Quantidades','Custo Total (R$)']);
  const rows = list.map(r=>_csv([
    r.nome, r.tamanho,
    (r.ingredientes||[]).map(i=>i.nome).join(' | '),
    (r.ingredientes||[]).map(i=>`${i.quantidade} ${i.unidade}`).join(' | '),
    (r.custo_total||0).toFixed(2).replace('.',','),
  ]));
  _dl('ft-receitas.csv',[hd,...rows].join('\n'));
  toast('Receitas exportadas!','sucesso');
}

function _expJSON() {
  const bk = {
    versao:'2.0', exportadoEm:new Date().toISOString(),
    ingredientes:getIngredientes(), receitas:getReceitas(),
  };
  _dl('ft-backup.json',JSON.stringify(bk,null,2),'application/json');
  toast('Backup exportado!','sucesso');
}

async function _impJSON(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const bk = JSON.parse(await file.text());
    if (!bk.ingredientes && !bk.receitas) throw new Error('Formato inválido');
    const { salvar } = await import('./ft-storage.js');
    let n=0;
    for (const x of (bk.ingredientes||[])) { await salvar('ingredientes',x.id,x); n++; }
    for (const x of (bk.receitas    ||[])) { await salvar('receitas',    x.id,x); n++; }
    toast(`${n} itens importados. Recarregue o app.`,'sucesso');
  } catch(err) {
    toast('Arquivo inválido ou corrompido.','erro');
    console.error(err);
  }
  e.target.value='';
}

function _expPDF() {
  const recs = getReceitas();
  if (!recs.length) { toast('Nenhuma receita para imprimir.','aviso'); return; }

  const fichas = [...recs]
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
    .map(r => {
      const rows = (r.ingredientes||[]).map(i=>`
        <tr>
          <td>${i.nome}</td>
          <td>${formatQtdUnid(i.quantidade,i.unidade)}</td>
          <td>${formatCurrency(i.custo)}</td>
          <td>${r.custo_total>0?formatPercent(i.custo/r.custo_total*100):'—'}</td>
        </tr>`).join('');
      const p200 = calcPrecoMarkup(r.custo_total||0, 200);
      return `
        <div class="ficha">
          <div class="ficha-hd">
            <h2>${r.nome}</h2>
            <span>${TAMANHO_LABEL[r.tamanho]||r.tamanho}</span>
          </div>
          <table>
            <thead><tr><th>Ingrediente</th><th>Qtd</th><th>Custo</th><th>%</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="ficha-ft">
            <span>Custo: <strong>${formatCurrency(r.custo_total)}</strong></span>
            <span>Preço sugerido (mk200%): <strong>${formatCurrency(p200)}</strong></span>
            <span>Margem: <strong>${formatPercent(calcMargemReal(p200, r.custo_total))}</strong></span>
          </div>
        </div>`;
    }).join('');

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Fichas Técnicas</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;font-size:12px;color:#111;padding:16px}
.ficha{page-break-after:always;padding:20px;max-width:680px;margin:0 auto}
.ficha:last-child{page-break-after:auto}
.ficha-hd{display:flex;justify-content:space-between;align-items:baseline;
  border-bottom:2px solid #FF8C00;padding-bottom:8px;margin-bottom:14px}
.ficha-hd h2{font-size:20px;font-weight:700;color:#FF8C00}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#111;color:#fff;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase}
td{padding:6px 10px;border-bottom:1px solid #eee}
tr:nth-child(even) td{background:#f9f9f9}
.ficha-ft{display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#444}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${fichas}
<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

