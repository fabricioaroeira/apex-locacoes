// =====================================================================
// Importação consolidada do SIENGE — tela (aba Financeiro)
// =====================================================================
// Anexa os relatórios "Contas Recebidas" e "Contas a Receber" de TODAS as
// lojas, mostra a prévia contrato a contrato e só grava depois do OK.
// A leitura dos PDFs é local (sienge-relatorio.js), sem IA.
// =====================================================================
import { analisarSiengeConsolidado, gravarSiengeConsolidado } from './data-layer.js';
import { abrirModal } from './modal.js';
import { el, formatMoney } from './utils.js';
import { mostrarToast } from './render.js';

const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '—';

export function abrirImportSiengeConsolidado(onFim) {
  let previa = null;
  const body = el('div');
  body.innerHTML = `
    <div style="font-size:12px;color:#0c4a6e;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:12px;line-height:1.5">
      No SIENGE, exporte em PDF os relatórios <strong>Contas Recebidas (por Cliente)</strong> e <strong>Contas a Receber (por Cliente)</strong>
      do centro de custo deste empreendimento, <strong>sem filtrar cliente</strong>. Pode anexar um só ou os dois.
      Para incluir parcelas atrasadas no "a receber", use período inicial 01/01/2000.
      <br>A leitura é feita aqui no navegador, sem IA — os números entram exatamente como estão no relatório.
    </div>
    <input type="file" data-pdfs accept="application/pdf" multiple style="font-size:12px;display:block;margin-bottom:10px">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      <button type="button" class="btn sm" data-analisar>Ler relatórios</button>
      <span data-status style="font-size:12px;color:var(--ink-soft)"></span>
    </div>
    <div data-previa></div>
  `;
  const inp = body.querySelector('[data-pdfs]');
  const btnAnalisar = body.querySelector('[data-analisar]');
  const status = body.querySelector('[data-status]');
  const boxPrevia = body.querySelector('[data-previa]');

  const submitBtn = () => document.querySelector('.modal .modal-foot button[type="submit"]');
  setTimeout(() => { const b = submitBtn(); if (b) b.disabled = true; }, 0);

  btnAnalisar.onclick = async () => {
    const files = Array.from(inp.files || []);
    if (!files.length) { mostrarToast('Escolha ao menos um PDF do SIENGE', 'error'); return; }
    btnAnalisar.disabled = true; status.textContent = 'Lendo ' + files.length + ' PDF(s)...'; boxPrevia.innerHTML = ''; previa = null;
    const b = submitBtn(); if (b) b.disabled = true;
    try {
      previa = await analisarSiengeConsolidado(files);
      status.textContent = '';
      boxPrevia.innerHTML = renderPrevia(previa);
      if (b) b.disabled = previa.totais.parcelas === 0;
    } catch (err) {
      status.innerHTML = '<span style="color:#991b1b">⚠️ ' + (err.message || err) + '</span>';
    } finally {
      btnAnalisar.disabled = false;
    }
  };

  abrirModal({
    titulo: '📥 Importar relatórios do SIENGE — todas as lojas',
    body,
    submitLabel: 'Gravar no sistema',
    maxWidth: '900px',
    onSubmit: async () => {
      if (!previa) throw new Error('Leia os relatórios antes de gravar.');
      const r = await gravarSiengeConsolidado(previa);
      mostrarToast(`${r.gravadas} parcelas gravadas` + (r.canceladas ? ` · ${r.canceladas} canceladas` : ''), 'success');
      if (onFim) onFim();
    }
  });
}

function renderPrevia(p) {
  const t = p.totais;
  const rel = p.relatorios;
  const relLinha = (nome, r) => r
    ? `<div><strong>${nome}:</strong> ${r.arquivo} · ${r.linhas} linhas · período ${fmtData(r.periodo?.de)} a ${fmtData(r.periodo?.ate)} · emitido ${fmtData(r.emitido_em)}</div>`
    : `<div style="color:var(--ink-soft)"><strong>${nome}:</strong> não anexado</div>`;

  let html = `
    <div style="font-size:12px;line-height:1.6;margin-bottom:10px">
      ${relLinha('Contas Recebidas', rel.recebidas)}
      ${relLinha('Contas a Receber', rel.a_receber)}
      <div><strong>Centro de custo:</strong> ${p.centro_custo ? p.centro_custo.codigo + ' - ' + p.centro_custo.nome : '—'} → <strong>${p.empreendimento?.nome || ''}</strong></div>
    </div>
    ${p.avisos.map(a => `<div style="font-size:12px;background:#fef3c7;border:1px solid #fcd34d;color:#854F0B;border-radius:6px;padding:8px 10px;margin-bottom:8px">⚠ ${a}</div>`).join('')}
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:10px 0 14px">
      ${kpi('Parcelas lidas', t.parcelas)}${kpi('Novas', t.novas, '#166534')}${kpi('Atualizadas', t.atualizadas, '#1e40af')}
      ${kpi('Sem contrato', t.nao_casadas, t.nao_casadas ? '#991b1b' : null)}${kpi('Serão canceladas', t.orfas, t.orfas ? '#9a3412' : null)}
    </div>
    <table style="font-size:12px">
      <thead><tr><th>Contrato</th><th>Lojas</th><th style="text-align:right">Pagas</th><th style="text-align:right">A vencer</th><th style="text-align:right">Atrasadas</th><th style="text-align:right">Recebido</th><th style="text-align:right">Em aberto</th><th style="text-align:right">Novas</th></tr></thead>
      <tbody>${p.porContrato.map(c => `<tr>
        <td><strong>${c.nome}</strong></td><td>${c.lojas}</td>
        <td style="text-align:right">${c.pagas}</td><td style="text-align:right">${c.a_vencer}</td>
        <td style="text-align:right;color:${c.atrasadas ? '#991b1b' : 'inherit'}">${c.atrasadas}</td>
        <td style="text-align:right">${formatMoney(c.total_pago)}</td><td style="text-align:right">${formatMoney(c.total_aberto)}</td>
        <td style="text-align:right">${c.novas}${c.orfas ? ` <span style="color:#9a3412">(−${c.orfas})</span>` : ''}</td>
      </tr>`).join('')}</tbody>
    </table>`;

  if (p.naoCasadas.length) {
    const grupos = {};
    for (const n of p.naoCasadas) { const k = `${n.cliente} · ${n.unidade} — ${n.motivo}`; grupos[k] = (grupos[k] || 0) + 1; }
    html += `<div style="margin-top:12px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px;color:#991b1b">
      <strong>Não serão importadas (${p.naoCasadas.length} parcelas):</strong>
      <ul style="margin:6px 0 0 18px">${Object.entries(grupos).map(([k, n]) => `<li>${k} (${n})</li>`).join('')}</ul>
      Cadastre o contrato da loja e importe de novo.
    </div>`;
  }
  if (p.orfas.length) {
    html += `<div style="margin-top:12px;font-size:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px;color:#9a3412">
      <strong>Estão no sistema mas não vieram no relatório — serão marcadas como canceladas (${p.orfas.length}):</strong>
      <ul style="margin:6px 0 0 18px;max-height:140px;overflow:auto">${p.orfas.slice(0, 60).map(o => `<li>${o.contrato_nome} · ${o.sienge_codigo} ${o.parcela_num != null ? o.parcela_num + 'ª' : ''} venc. ${fmtData(o.data_vencimento)} · ${formatMoney(o.valor_corrigido)} (${o.status})</li>`).join('')}${p.orfas.length > 60 ? '<li>…</li>' : ''}</ul>
      Nada é apagado: ficam com status "cancelada" e saem das cobranças e dos alertas.
    </div>`;
  }
  return html;
}
function kpi(label, val, cor) {
  return `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value" style="${cor ? 'color:' + cor : ''}">${val}</div></div>`;
}
