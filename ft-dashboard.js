// ft-dashboard.js — v2.0  FIX: reduce em vez de spread Math.max
import { getReceitas }     from './ft-receitas.js';
import { getIngredientes } from './ft-ingredientes.js';
import { calcPrecoMarkup, calcLucro, calcMargemReal, calcRendimento } from './ft-calc.js';
import { formatCurrency, formatPercent, formatQtdUnid, formatNum } from './ft-format.js';
import { renderEmpty, renderTutorial } from './ft-ui.js';
import { ico } from './ft-icons.js';

export function renderDashboard() {
  const recs  = getReceitas();
  const ings  = getIngredientes();
  const wrap  = document.getElementById('ft-dashboard');
  if (!wrap) return;

  renderTutorial('ft-sec-dash', 'dash', ico.dashboard, 'Entendendo o Dashboard', [
    'O dashboard usa <strong>markup 200%</strong> como referência para comparações.',
    'KPIs mostram um panorama rápido do seu cardápio.',
    'O ranking lista as pizzas da mais lucrativa para a menos lucrativa.',
    'Rendimento mostra quantas pizzas você produz por embalagem de ingrediente.',
  ]);

  if (!recs.length) {
    renderEmpty(wrap, ico.dashboard,
      'Dashboard vazio',
      'Cadastre receitas para ver as estatísticas de lucratividade.');
    return;
  }

  const MK     = 200;
  const custos = recs.map(r => r.custo_total||0);
  const precos = custos.map(c => calcPrecoMarkup(c, MK));
  const lucros = precos.map((p,i) => calcLucro(p, custos[i]));
  const margs  = precos.map((p,i) => calcMargemReal(p, custos[i]));
  const n      = recs.length;

  const custoMed = custos.reduce((a,b)=>a+b,0)/n;
  const margMed  = margs.reduce((a,b)=>a+b,0)/n;

  // FIX: reduce seguro (sem spread que pode crashar em arrays grandes)
  const iMC = custos.reduce((mi,v,i,a)=>v>a[mi]?i:mi, 0); // mais cara
  const imc = custos.reduce((mi,v,i,a)=>v<a[mi]?i:mi, 0); // mais barata
  const iML = lucros.reduce((mi,v,i,a)=>v>a[mi]?i:mi, 0); // mais lucrativa

  const ranking = recs
    .map((r,i)=>({ r, c:custos[i], p:precos[i], l:lucros[i], m:margs[i] }))
    .sort((a,b)=>b.l-a.l);

  wrap.innerHTML = `
    <!-- KPIs -->
    <div class="ft-kpis">
      <div class="ft-kpi">
        <div class="ft-kpi-ico">${ico.recipes}</div>
        <div class="ft-kpi-val">${n}</div>
        <div class="ft-kpi-lbl">Receitas</div>
      </div>
      <div class="ft-kpi">
        <div class="ft-kpi-ico">${ico.ingredients}</div>
        <div class="ft-kpi-val">${ings.length}</div>
        <div class="ft-kpi-lbl">Ingredientes</div>
      </div>
      <div class="ft-kpi">
        <div class="ft-kpi-ico">${ico.tag}</div>
        <div class="ft-kpi-val">${formatCurrency(custoMed)}</div>
        <div class="ft-kpi-lbl">Custo médio</div>
      </div>
      <div class="ft-kpi ft-kpi-hi">
        <div class="ft-kpi-ico">${ico.money}</div>
        <div class="ft-kpi-val">${formatPercent(margMed)}</div>
        <div class="ft-kpi-lbl">Margem média</div>
      </div>
    </div>

    <!-- Destaques -->
    <div class="ft-dash-sec-title">Destaques</div>
    <div class="ft-destaques">
      <div class="ft-dest ft-dest-green">
        <div class="ft-dest-ico">${ico.trophy}</div>
        <div>
          <div class="ft-dest-lbl">Mais lucrativa</div>
          <div class="ft-dest-name">${recs[iML].nome}</div>
          <div class="ft-dest-val">${formatCurrency(lucros[iML])} lucro</div>
        </div>
      </div>
      <div class="ft-dest ft-dest-amber">
        <div class="ft-dest-ico">${ico.star}</div>
        <div>
          <div class="ft-dest-lbl">Mais cara</div>
          <div class="ft-dest-name">${recs[iMC].nome}</div>
          <div class="ft-dest-val">${formatCurrency(custos[iMC])} custo</div>
        </div>
      </div>
      <div class="ft-dest ft-dest-blue">
        <div class="ft-dest-ico">${ico.check}</div>
        <div>
          <div class="ft-dest-lbl">Mais barata</div>
          <div class="ft-dest-name">${recs[imc].nome}</div>
          <div class="ft-dest-val">${formatCurrency(custos[imc])} custo</div>
        </div>
      </div>
    </div>

    <!-- Ranking -->
    <div class="ft-dash-sec-title">
      Ranking <span class="ft-dash-sec-sub">markup ${MK}%</span>
    </div>
    <div class="ft-ranking">
      ${ranking.map((it,pos) => {
        const barW = ranking[0].l>0 ? (it.l/ranking[0].l*100).toFixed(1) : 0;
        const medal = pos===0?'🥇':pos===1?'🥈':pos===2?'🥉':'';
        return `
        <div class="ft-rank-item">
          <div class="ft-rank-pos">${medal||pos+1}</div>
          <div class="ft-rank-body">
            <div class="ft-rank-name">
              ${it.r.nome}
              <span class="ft-tam-pill">${it.r.tamanho}</span>
            </div>
            <div class="ft-rank-sub">Custo ${formatCurrency(it.c)} · Preço ${formatCurrency(it.p)}</div>
            <div class="ft-rank-bar-wrap">
              <div class="ft-rank-bar" style="width:${barW}%"></div>
            </div>
          </div>
          <div class="ft-rank-right">
            <div class="ft-rank-lucro">${formatCurrency(it.l)}</div>
            <div class="ft-rank-marg">${formatPercent(it.m)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Rendimento -->
    ${ings.filter(ig=>recs.some(r=>r.ingredientes?.some(i=>i.ingrediente_id===ig.id))).length ? `
    <div class="ft-dash-sec-title">Rendimento de ingredientes</div>
    <div class="ft-rendilist">
      ${ings
        .filter(ig=>recs.some(r=>r.ingredientes?.some(i=>i.ingrediente_id===ig.id)))
        .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
        .map(ig => {
          const usos = recs.flatMap(r=>
            (r.ingredientes||[]).filter(i=>i.ingrediente_id===ig.id)
              .map(i=>({ pizza:r.nome, qtd:i.quantidade }))
          );
          return `
          <div class="ft-rend-card">
            <div class="ft-rend-hd">
              <span class="ft-rend-nome">${ig.nome}</span>
              <span class="ft-rend-emb">${formatQtdUnid(ig.quantidade_embalagem,ig.unidade)}/emb.</span>
            </div>
            ${usos.map(u=>`
            <div class="ft-rend-row">
              <span>${u.pizza}</span>
              <span class="ft-rend-qtd">${formatQtdUnid(u.qtd,ig.unidade)}/pizza</span>
              <span class="ft-rend-res">${formatNum(calcRendimento(ig.quantidade_embalagem,u.qtd),1)} pizzas/emb.</span>
            </div>`).join('')}
          </div>`;
        }).join('')}
    </div>` : ''}`;
}
