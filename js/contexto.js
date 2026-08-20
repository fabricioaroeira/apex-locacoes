// =====================================================================
// contexto.js — camada de EMPREENDIMENTO (Etapa B do plano multi-portfólio)
// =====================================================================
// Gerencia qual empreendimento está "em contexto" no app.
//   - listEmpreendimentos(): carrega v_portfolio (RLS já filtra pelo escopo
//     do usuário — cada um só enxerga os empreendimentos a que tem acesso)
//   - initContexto(): resolve o contexto atual na ordem:
//       1. ?emp=<slug> na URL (link vindo do portfólio)
//       2. localStorage (última escolha)
//       3. primeiro empreendimento disponível
//   - getCtxId()/getCtxEmp(): consultados pela data-layer para filtrar queries
// =====================================================================

import { getSupabase } from './supabase-client.js';

const KEY = 'apex_ctx_emp';
let _emps = null;

export async function listEmpreendimentos(force = false) {
  if (_emps && !force) return _emps;
  const supa = await getSupabase();
  const { data, error } = await supa.from('v_portfolio').select('*').order('ordem');
  if (error) throw error;
  _emps = data || [];
  return _emps;
}

export function getCtxId() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setCtxId(id) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch { /* storage indisponível: contexto fica só em memória via _emps */ }
}

export function getCtxEmp() {
  const id = getCtxId();
  return (_emps || []).find(e => e.empreendimento_id === id) || null;
}

/**
 * Resolve o contexto atual e devolve o empreendimento ativo (ou null se o
 * usuário não tem acesso a nenhum). Chamar ANTES de carregar dados.
 */
export async function initContexto() {
  const emps = await listEmpreendimentos();

  const slug = new URLSearchParams(location.search).get('emp');
  if (slug) {
    const bySlug = emps.find(e => e.slug === slug);
    if (bySlug) setCtxId(bySlug.empreendimento_id);
  }

  let id = getCtxId();
  if (!id || !emps.find(e => e.empreendimento_id === id)) {
    id = emps[0]?.empreendimento_id || null;
    setCtxId(id);
  }
  return emps.find(e => e.empreendimento_id === id) || null;
}

/**
 * Troca o contexto e recarrega a página (o caminho mais seguro: todos os
 * módulos releem os dados já filtrados; sem estado velho pendurado).
 */
export function trocarContexto(id) {
  setCtxId(id);
  const url = new URL(location.href);
  url.searchParams.delete('emp');
  location.href = url.pathname + url.search;
}

/**
 * Monta o seletor de contexto no header. Recebe o elemento container.
 * Só exibe o dropdown quando há mais de um empreendimento acessível.
 */
export async function montarSeletor(container) {
  const emps = await listEmpreendimentos();
  const atual = getCtxEmp();
  if (!container || !atual) return;

  const dot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${atual.cor};flex:none"></span>`;

  if (emps.length <= 1) {
    container.innerHTML = `<span class="ctx-chip">${dot}<span>${atual.nome}</span></span>`;
    return;
  }

  container.innerHTML = `
    <span class="ctx-chip" style="padding-right:6px">${dot}
      <select id="ctx-select" title="Trocar de empreendimento">
        ${emps.map(e => `<option value="${e.empreendimento_id}" ${e.empreendimento_id === atual.empreendimento_id ? 'selected' : ''}>${e.nome}</option>`).join('')}
      </select>
    </span>`;
  container.querySelector('#ctx-select').addEventListener('change', ev => trocarContexto(ev.target.value));
}
