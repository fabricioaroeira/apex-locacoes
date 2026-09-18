// =====================================================================
// Leitura DETERMINÍSTICA dos relatórios do SIENGE (sem IA)
// =====================================================================
// Os relatórios "Contas Recebidas (por Cliente)" e "Contas a Receber
// (por Cliente)" saem do SIENGE como PDF com camada de texto (iText).
// Ler o texto direto tem três vantagens sobre a IA:
//   1. não há limite de tamanho — o consolidado de todas as lojas passa
//      de 800 parcelas, o que estoura a resposta da IA;
//   2. os números são exatos, sem risco de linha inventada ou pulada;
//   3. não passa pela Edge Function (o limite de ~4 MB não se aplica).
//
// Este módulo é puro (sem DOM, sem Supabase) para poder ser testado em
// node com os mesmos PDFs. A única função que toca o navegador é
// lerPdfNoNavegador(), que carrega o pdf.js embarcado (js/vendor) sob demanda.
// =====================================================================

const RE_DATA = /^\d{2}\/\d{2}\/\d{4}$/;
const RE_NUM  = /^-?[\d.]*\d,\d{2}$/;

// ---------------------------------------------------------------------
// 1. Reconstrução das linhas a partir dos itens de texto do pdf.js
// ---------------------------------------------------------------------
// Cada célula da tabela vem como um item {str, transform}. O relatório do
// SIENGE é paisagem e sai ROTACIONADO no PDF (a página tem /Rotate 90),
// então as coordenadas cruas do item vêm trocadas. Passa-se pelo viewport
// da página, que já aplica a rotação: aí x cresce para a direita e y para
// baixo, como na tela. Agrupa por y (com tolerância) e ordena por x.
export function linhasDaPagina(textContent, viewport, Util) {
  const rows = [];
  for (const it of textContent.items) {
    if (!it.str || !it.str.trim()) continue;
    const tx = Util.transform(viewport.transform, it.transform);
    const x = tx[4], y = tx[5];
    let row = rows.find(r => Math.abs(r.y - y) <= 2.5);
    if (!row) { row = { y, itens: [] }; rows.push(row); }
    row.itens.push({ x, s: it.str.trim() });
  }
  rows.sort((a, b) => a.y - b.y);                      // de cima para baixo
  return rows.map(r => r.itens.sort((a, b) => a.x - b.x).map(i => i.s).join(' '));
}

// ---------------------------------------------------------------------
// 2. Utilidades
// ---------------------------------------------------------------------
export function numBR(s) {
  if (s == null || s === '') return null;
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
export function dataISO(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function parc(s) {
  const m = /^(\d+)\/(\d+)(\*?)$/.exec(s || '');
  // chaves com prefixo: a linha do "a receber" também tem uma coluna "Total" (em R$),
  // e um nome curto colidia com ela (parcela_total recebia dinheiro).
  return m ? { parcela_num: Number(m[1]), parcela_total: Number(m[2]), parcela_rotulo: s } : { parcela_num: null, parcela_total: null, parcela_rotulo: s || null };
}
export function componenteDoDocumento(doc) {
  const p = String(doc || '').toUpperCase();
  if (p.startsWith('CT.'))   return 'aluguel';
  if (p.startsWith('COND.')) return 'condominio';
  if (p.startsWith('IPTU.')) return 'iptu';
  if (p.startsWith('REC.'))  return 'recibo';
  return 'outros';
}
// "Loja 14" -> "14"; "LOJA 03" -> "03"; qualquer outro texto -> null
export function codigoLoja(unidade) {
  const m = /^\s*loja\s+0*(\d+)\s*$/i.exec(unidade || '');
  return m ? String(m[1]).padStart(2, '0') : null;
}

// ---------------------------------------------------------------------
// 3. Parser de uma linha (as duas leiautes)
// ---------------------------------------------------------------------
// Estratégia: quebra em tokens e lê PELAS PONTAS. As colunas numéricas da
// direita têm quantidade fixa; o que sobra entre a parcela/TC e elas é a
// unidade (texto livre), e o que sobra entre a data inicial e o documento
// é o cliente (texto livre). Assim nome de cliente com número ou unidade
// com espaço não quebram a leitura.

// Contas Recebidas:
// Dt.baixa Cliente… Dt.Emissão Documento Título Parc TC Unid… Port Oper Vencto Vl.baixa [P] Acréscimo Seguro TaxaAdm Desconto Líquido
function parseLinhaRecebida(tokens) {
  const t = tokens.slice();
  if (t.length < 14 || !RE_DATA.test(t[0])) return null;
  // ponta direita: 6 números, com "P" opcional grudado após o primeiro (vl. baixa)
  const liquido = t.pop(), desconto = t.pop(), taxa_adm = t.pop(), seguro = t.pop(), acrescimo = t.pop();
  let flagParcial = false;
  if (t[t.length - 1] === 'P') { flagParcial = true; t.pop(); }
  const vl_baixa = t.pop();
  const vencto = t.pop();
  const oper = t.pop(), port = t.pop();
  for (const v of [liquido, desconto, taxa_adm, seguro, acrescimo, vl_baixa]) if (!RE_NUM.test(v)) return null;
  if (!RE_DATA.test(vencto) || !/^\d+$/.test(oper) || !/^\d+$/.test(port)) return null;
  // ponta esquerda: data baixa, cliente…, data emissão, documento, título, parcela, TC
  const dt_baixa = t.shift();
  // procura a data de emissão: primeiro token de data depois do cliente
  let iEmi = -1;
  for (let i = 1; i < t.length; i++) if (RE_DATA.test(t[i]) && /^\d+\/\d+\*?$/.test(t[i + 3] || '')) { iEmi = i; break; }
  if (iEmi < 1) return null;
  const cliente = t.slice(0, iEmi).join(' ');
  const dt_emissao = t[iEmi], documento = t[iEmi + 1], titulo = t[iEmi + 2], parcela = t[iEmi + 3], tc = t[iEmi + 4];
  const unidade = t.slice(iEmi + 5).join(' ');
  if (!/^\d+$/.test(titulo)) return null;
  return {
    origem: 'recebidas', dt_baixa: dataISO(dt_baixa), cliente, dt_emissao: dataISO(dt_emissao),
    documento, titulo, ...parc(parcela), tc, unidade, port, oper,
    data_vencimento: dataISO(vencto),
    vl_baixa: numBR(vl_baixa), parcial: flagParcial, acrescimo: numBR(acrescimo), seguro: numBR(seguro),
    taxa_adm: numBR(taxa_adm), desconto: numBR(desconto), liquido: numBR(liquido),
  };
}

// Contas a Receber:
// Vencto Cliente… Documento Título Parc TC Unid… ValorOriginal Id DtCálculo SaldoAtual Dias Acréscimo Desconto Seguro TaxaAdm Total
function parseLinhaAReceber(tokens) {
  const t = tokens.slice();
  if (t.length < 14 || !RE_DATA.test(t[0])) return null;
  const total = t.pop(), taxa_adm = t.pop(), seguro = t.pop(), desconto = t.pop(), acrescimo = t.pop();
  const dias = t.pop(), saldo = t.pop(), dt_calc = t.pop(), id = t.pop(), valor_original = t.pop();
  for (const v of [total, taxa_adm, seguro, desconto, acrescimo, saldo, valor_original]) if (!RE_NUM.test(v)) return null;
  if (!RE_DATA.test(dt_calc) || !/^\d+$/.test(dias) || !/^\d+$/.test(id)) return null;
  const vencto = t.shift();
  let iDoc = -1;
  for (let i = 1; i < t.length; i++) if (/^\d+$/.test(t[i + 1] || '') && /^\d+\/\d+\*?$/.test(t[i + 2] || '')) { iDoc = i; break; }
  if (iDoc < 1) return null;
  const cliente = t.slice(0, iDoc).join(' ');
  const documento = t[iDoc], titulo = t[iDoc + 1], parcela = t[iDoc + 2], tc = t[iDoc + 3];
  const unidade = t.slice(iDoc + 4).join(' ');
  return {
    origem: 'a_receber', data_vencimento: dataISO(vencto), cliente, documento, titulo, ...parc(parcela), tc, unidade,
    valor_original: numBR(valor_original), dt_calculo: dataISO(dt_calc), saldo_atual: numBR(saldo), dias: Number(dias),
    acrescimo: numBR(acrescimo), desconto: numBR(desconto), seguro: numBR(seguro), taxa_adm: numBR(taxa_adm), total: numBR(total),
  };
}

// ---------------------------------------------------------------------
// 4. Parser do relatório inteiro (todas as páginas)
// ---------------------------------------------------------------------
export function parseRelatorioSienge(paginas) {
  const linhas = paginas.flat();
  const texto = linhas.join('\n');
  let tipo = null;
  if (/Contas Recebidas/i.test(texto)) tipo = 'recebidas';
  else if (/Contas a Receber/i.test(texto)) tipo = 'a_receber';
  if (!tipo) throw new Error('Este PDF não parece ser "Contas Recebidas" nem "Contas a Receber" do SIENGE.');

  const meta = { tipo, empresa: null, centro_custo: null, periodo: null, emitido_em: null };
  for (const l of linhas) {
    let m;
    if (!meta.empresa && (m = /Empresa\s+(\d+)\s*-\s*(.+?)(\s{2,}|$)/.exec(l))) meta.empresa = { codigo: m[1], nome: m[2].trim() };
    if (!meta.centro_custo && (m = /Centro de custo\s+(\d+)\s*-\s*(.+?)(\s{2,}|$)/.exec(l))) meta.centro_custo = { codigo: m[1], nome: m[2].trim() };
    if (!meta.periodo && (m = /Per[ií]odo(?: de recebimento)?\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/.exec(l))) meta.periodo = { de: dataISO(m[1]), ate: dataISO(m[2]) };
    if (!meta.emitido_em && (m = /^(\d{2}\/\d{2}\/\d{4})\s+-\s+\d{2}:\d{2}:\d{2}/.exec(l))) meta.emitido_em = dataISO(m[1]);
  }
  // "Empresa 10 - JAX 28 ... Período 18/09/2026 a ..." vem na mesma linha: corta o nome no "Período"
  if (meta.empresa) meta.empresa.nome = meta.empresa.nome.replace(/\s+Per[ií]odo.*$/, '').trim();

  const registros = [], totaisCliente = [], descartadas = [];
  for (const l of linhas) {
    const tokens = l.split(/\s+/).filter(Boolean);
    if (/^Total do cliente/i.test(l)) {
      const nums = tokens.filter(x => RE_NUM.test(x)).map(numBR);
      totaisCliente.push({ liquido: nums[nums.length - 1], primeiro: nums[0] });
      continue;
    }
    if (!RE_DATA.test(tokens[0] || '')) continue;               // cabeçalho, rodapé, continuação de nome
    const r = tipo === 'recebidas' ? parseLinhaRecebida(tokens) : parseLinhaAReceber(tokens);
    if (r) registros.push(r); else descartadas.push(l);
  }
  return { meta, registros, totaisCliente, descartadas };
}

// ---------------------------------------------------------------------
// 5. Consolidação: Recebidas + A Receber  ->  uma parcela por chave
// ---------------------------------------------------------------------
// Chave da parcela = documento + nº da parcela + vencimento (a mesma da
// unique index em sienge_parcelas). Baixas parciais viram uma parcela só,
// com os valores somados e a data da última baixa.
export function consolidarParcelas({ recebidas, aReceber }, hoje) {
  const hojeISO = hoje || new Date().toISOString().slice(0, 10);
  const mapa = new Map();
  const chave = r => [r.documento, r.parcela_num ?? 'NULL', r.data_vencimento].join('|');

  for (const r of (recebidas?.registros || [])) {
    const k = chave(r);
    let p = mapa.get(k);
    if (!p) {
      p = { chave: k, documento: r.documento, titulo: r.titulo, parcela_num: r.parcela_num, parcela_total: r.parcela_total, parcela_rotulo: r.parcela_rotulo,
            unidade: r.unidade, loja: codigoLoja(r.unidade), cliente: r.cliente, componente: componenteDoDocumento(r.documento),
            data_vencimento: r.data_vencimento, valor_original: 0, valor_pago: 0, acrescimo: 0, desconto: 0,
            data_pagamento: null, baixas: 0, em_aberto: null };
      mapa.set(k, p);
    }
    p.valor_original = round2(p.valor_original + (r.vl_baixa || 0));
    p.valor_pago     = round2(p.valor_pago + (r.liquido || 0));
    p.acrescimo      = round2(p.acrescimo + (r.acrescimo || 0));
    p.desconto       = round2(p.desconto + (r.desconto || 0));
    p.baixas++;
    if (!p.data_pagamento || r.dt_baixa > p.data_pagamento) p.data_pagamento = r.dt_baixa;
  }
  for (const r of (aReceber?.registros || [])) {
    const k = chave(r);
    let p = mapa.get(k);
    if (!p) {
      p = { chave: k, documento: r.documento, titulo: r.titulo, parcela_num: r.parcela_num, parcela_total: r.parcela_total, parcela_rotulo: r.parcela_rotulo,
            unidade: r.unidade, loja: codigoLoja(r.unidade), cliente: r.cliente, componente: componenteDoDocumento(r.documento),
            data_vencimento: r.data_vencimento, valor_original: r.valor_original, valor_pago: 0, acrescimo: 0, desconto: 0,
            data_pagamento: null, baixas: 0, em_aberto: null };
      mapa.set(k, p);
    }
    // saldo em aberto desta parcela (pode coexistir com baixas parciais)
    p.em_aberto = { saldo: r.saldo_atual, acrescimo: r.acrescimo, total: r.total, dias: r.dias };
    if (!p.baixas) p.valor_original = r.valor_original;
    else p.valor_original = round2(p.valor_original + (r.saldo_atual || 0));
  }

  const parcelas = [];
  for (const p of mapa.values()) {
    let status, valor_corrigido;
    if (p.em_aberto) {
      status = p.data_vencimento < hojeISO ? 'atrasada' : 'a_vencer';
      valor_corrigido = p.em_aberto.total;             // saldo + acréscimos calculados até a emissão
    } else {
      status = 'paga';
      valor_corrigido = p.valor_pago;
    }
    parcelas.push({
      ...p, status, valor_corrigido,
      // pagamento parcial de parcela ainda em aberto: guarda o recebido mas NÃO carimba data (fn_recalcular_status olha data_pagamento)
      data_pagamento: p.em_aberto ? null : p.data_pagamento,
      valor_pago: p.baixas ? p.valor_pago : null,
      sienge_titulo: `${p.titulo} / ${p.documento}`,
    });
  }
  parcelas.sort((a, b) => (a.loja || '99').localeCompare(b.loja || '99') || a.data_vencimento.localeCompare(b.data_vencimento));
  return parcelas;
}
function round2(n) { return Math.round(n * 100) / 100; }

// ---------------------------------------------------------------------
// 6. Navegador: extrai as linhas de um File PDF com pdf.js (embarcado, sob demanda)
// ---------------------------------------------------------------------
// pdf.js 3.11.174 embarcado em js/vendor/: a CSP das páginas só permite
// script do próprio domínio (e o worker nem do jsdelivr), então CDN não serve.
const PDFJS_URL = new URL('./vendor/pdf.min.js', import.meta.url).href;
const PDFJS_WORKER = new URL('./vendor/pdf.worker.min.js', import.meta.url).href;
let _pdfjs = null;
async function carregarPdfJs() {
  if (_pdfjs) return _pdfjs;
  if (typeof window === 'undefined') throw new Error('lerPdfNoNavegador só funciona no navegador');
  if (!window.pdfjsLib) {
    await new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = PDFJS_URL; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar o leitor de PDF (js/vendor/pdf.min.js). Rode o PUSH_UPDATE.bat para publicar os arquivos novos.'));
      document.head.appendChild(s);
    });
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  _pdfjs = window.pdfjsLib;
  return _pdfjs;
}
export async function lerPdfNoNavegador(file) {
  const pdfjs = await carregarPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    paginas.push(linhasDaPagina(tc, page.getViewport({ scale: 1 }), pdfjs.Util));
  }
  const totalTexto = paginas.flat().join('').length;
  if (totalTexto < 50) throw new Error('O PDF não tem camada de texto (parece escaneado). Exporte de novo do SIENGE em PDF, não em imagem.');
  return paginas;
}
