// ft/utils/calc.js — Ficha Técnica v1.0
// Todas as fórmulas de custo, preço e margem.

/**
 * Custo unitário de um ingrediente.
 * Ex: R$12 por 1000g → R$0.012 por g
 */
export function calcCustoUnitario(precoCompra, qtdEmbalagem) {
    if (!qtdEmbalagem || qtdEmbalagem <= 0) return 0;
    return precoCompra / qtdEmbalagem;
}

/**
 * Custo de um ingrediente numa receita.
 * Ex: 120g × R$0.012/g = R$1.44
 */
export function calcCustoIngrediente(quantidade, custoUnitario) {
    return quantidade * custoUnitario;
}

/**
 * Custo total de uma receita a partir da lista de ingredientes.
 * ingredientes: [{ custo: number }, ...]
 */
export function calcCustoReceita(ingredientes) {
    if (!Array.isArray(ingredientes)) return 0;
    return ingredientes.reduce((sum, i) => sum + (i.custo || 0), 0);
}

/**
 * Preço de venda pelo markup (sobre custo).
 * markup = 200 → preço = custo * (1 + 200/100) = custo * 3
 */
export function calcPrecoMarkup(custo, markupPercent) {
    return custo * (1 + markupPercent / 100);
}

/**
 * Preço de venda pela margem desejada (sobre preço de venda).
 * margem = 40% → preço = custo / (1 - 0.40) = custo / 0.60
 */
export function calcPrecoMargem(custo, margemPercent) {
    const margem = margemPercent / 100;
    if (margem >= 1) return 0; // inválido
    return custo / (1 - margem);
}

/**
 * Lucro absoluto.
 */
export function calcLucro(preco, custo) {
    return preco - custo;
}

/**
 * Margem real (% sobre o preço de venda).
 */
export function calcMargemReal(preco, custo) {
    if (!preco || preco <= 0) return 0;
    return ((preco - custo) / preco) * 100;
}

/**
 * Markup implícito (% sobre o custo).
 */
export function calcMarkupImplicito(preco, custo) {
    if (!custo || custo <= 0) return 0;
    return ((preco - custo) / custo) * 100;
}

/**
 * Rendimento de um ingrediente: quantas pizzas por embalagem.
 * Ex: 1000g ÷ 120g/pizza = 8.33 pizzas
 */
export function calcRendimento(qtdEmbalagem, qtdPorPizza) {
    if (!qtdPorPizza || qtdPorPizza <= 0) return 0;
    return qtdEmbalagem / qtdPorPizza;
}

/**
 * Custo total incorporando overhead e mão de obra como percentual
 * sobre o custo dos ingredientes.
 *
 * Fórmula:
 *   custoTotal = custoIng × (1 + overhead/100 + maoDeObra/100)
 *
 * Exemplos:
 *   custoIng=10, overhead=15%, maoDeObra=20% → 10 × 1.35 = R$13,50
 *   custoIng=10, overhead=0%,  maoDeObra=0%  → 10 × 1.00 = R$10,00
 *
 * @param {number} custoIng      Custo dos ingredientes
 * @param {number} overheadPct   % overhead (gás, energia, embalagem, etc.)
 * @param {number} maoDeObraPct  % mão de obra
 * @returns {{ total: number, valorOverhead: number, valorMaoDeObra: number }}
 */
export function calcCustoComExtras(custoIng, overheadPct, maoDeObraPct) {
    const oh  = Math.max(0, overheadPct   || 0);
    const mob = Math.max(0, maoDeObraPct  || 0);
    const valorOverhead   = custoIng * oh  / 100;
    const valorMaoDeObra  = custoIng * mob / 100;
    const total           = custoIng + valorOverhead + valorMaoDeObra;
    return { total, valorOverhead, valorMaoDeObra };
}
