// =====================================================================
// Formulário de edição em massa das UNIDADES (Etapa C — tipagem)
// =====================================================================
// Cada linha edita: tipo, áreas e os atributos específicos do tipo.
// A finalidade é derivada do tipo. Os campos comerciais legados
// (tem_exaustao / area_deposito) continuam sincronizados nas colunas
// antigas E no JSON de atributos, até o resto do app migrar.
// =====================================================================
import { getLojasStatus } from './data-layer.js';
import { getSupabase } from './supabase-client.js';
import { abrirModal } from './modal.js';
import { el } from './utils.js';
import { renderTudo, mostrarToast } from './render.js';
import { getCtxEmp, getCtxId } from './contexto.js';

const TIPOS = [
  { v: 'loja',          label: 'Loja',        finalidade: 'comercial'   },
  { v: 'sala',          label: 'Sala',        finalidade: 'comercial'   },
  { v: 'galpao',        label: 'Galpão',      finalidade: 'comercial'   },
  { v: 'apartamento',   label: 'Apartamento', finalidade: 'residencial' },
  { v: 'kitnet',        label: 'Kitnet',      finalidade: 'residencial' },
  { v: 'vaga_isolada',  label: 'Vaga',        finalidade: 'comercial'   },
  { v: 'outro',         label: 'Outro',       finalidade: 'comercial'   },
];

// Atributos editáveis por tipo: [chave, rótulo, tipoInput]
const ATRIBUTOS = {
  loja: [
    ['area_deposito', 'Depósito m²', 'number'],
    ['tem_exaustao',  'Exaustão',    'checkbox'],
  ],
  sala: [
    ['capacidade_kva', 'kVA', 'number'],
  ],
  galpao: [
    ['pe_direito', 'Pé-dir. m', 'number'],
    ['docas',      'Docas',     'number'],
  ],
  apartamento: [
    ['quartos',   'Quartos',   'number'],
    ['vagas',     'Vagas',     'number'],
    ['mobiliado', 'Mobiliado', 'checkbox'],
  ],
  kitnet: [
    ['mobiliado', 'Mobiliado', 'checkbox'],
  ],
  vaga_isolada: [],
  outro: [],
};

const inpStyle = { width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '4px' };

function renderAtributos(cell, tipo, valores, registro) {
  cell.innerHTML = '';
  registro.atrInputs = {};
  const specs = ATRIBUTOS[tipo] || [];
  if (!specs.length) {
    cell.appendChild(el('span', { style: { fontSize: '11px', color: '#94a3b8' } }, '—'));
    return;
  }
  specs.forEach(([chave, rotulo, kind]) => {
    const wrap = el('label', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', whiteSpace: 'nowrap' } });
    let inp;
    if (kind === 'checkbox') {
      inp = el('input', { type: 'checkbox', style: { width: '15px', height: '15px', cursor: 'pointer' } });
      inp.checked = !!valores[chave];
      wrap.appendChild(inp);
      wrap.appendChild(document.createTextNode(rotulo));
    } else {
      inp = el('input', { type: 'number', step: '0.01', placeholder: rotulo, title: rotulo,
        value: valores[chave] ?? '',
        style: { ...inpStyle, width: '76px', padding: '4px 6px', fontSize: '12px' } });
      wrap.appendChild(inp);
    }
    registro.atrInputs[chave] = { inp, kind };
    cell.appendChild(wrap);
  });
}

export async function abrirFormAreasLojas() {
  const lojas = await getLojasStatus();
  const emp = getCtxEmp();
  const nomeU = emp?.config?.nomenclatura_unidades || 'Unidades';
  const body = el('div');

  body.appendChild(el('div', {
    style: { padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', color: '#1e40af' }
  }, '💡 Defina o tipo de cada unidade e os atributos aparecem conforme o tipo (depósito e exaustão para loja; pé-direito e docas para galpão; quartos e vagas para apartamento). Unidades em uso interno ficam bloqueadas.'));

  const GRID = '55px 120px 1fr 1fr 1.8fr 100px';
  const header = el('div', {
    style: { display: 'grid', gridTemplateColumns: GRID, gap: '8px', padding: '8px 10px', background: '#f1f5f9', borderRadius: '6px', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }
  });
  header.innerHTML = '<div>Cód.</div><div>Tipo</div><div>Área priv. (m²)</div><div>Área total (m²)</div><div>Atributos</div><div>Status</div>';
  body.appendChild(header);

  const lista = el('div', { style: { maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px' } });
  const registros = [];

  lojas.forEach(l => {
    const linha = el('div', {
      style: { display: 'grid', gridTemplateColumns: GRID, gap: '8px', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }
    });

    const reg = { loja: l, atrInputs: {} };

    const selTipo = el('select', { style: { ...inpStyle, padding: '5px 6px' } });
    TIPOS.forEach(t => {
      const opt = el('option', { value: t.v }, t.label);
      if ((l.tipo || 'loja') === t.v) opt.selected = true;
      selTipo.appendChild(opt);
    });

    const inpPriv  = el('input', { type: 'number', step: '0.01', placeholder: '0,00', value: l.area_privativa ?? '', style: inpStyle });
    const inpTotal = el('input', { type: 'number', step: '0.01', placeholder: '0,00', value: l.area_total ?? '', style: inpStyle });

    const atrCell = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } });
    const valoresIniciais = { ...(l.atributos || {}) };
    // legado: colunas antigas prevalecem se o JSON ainda não tem o valor
    if (valoresIniciais.area_deposito === undefined && l.area_deposito != null) valoresIniciais.area_deposito = l.area_deposito;
    if (valoresIniciais.tem_exaustao === undefined && l.tem_exaustao != null) valoresIniciais.tem_exaustao = l.tem_exaustao;
    renderAtributos(atrCell, l.tipo || 'loja', valoresIniciais, reg);

    selTipo.addEventListener('change', () => {
      renderAtributos(atrCell, selTipo.value, coletarAtributos(reg, valoresIniciais), reg);
    });

    if (l.uso_interno) {
      [selTipo, inpPriv, inpTotal].forEach(i => { i.disabled = true; i.style.opacity = '0.4'; });
      atrCell.style.opacity = '0.4';
      atrCell.querySelectorAll('input').forEach(i => i.disabled = true);
    }

    reg.selTipo = selTipo; reg.inpPriv = inpPriv; reg.inpTotal = inpTotal; reg.atrCell = atrCell;
    registros.push(reg);

    let statusBadge = '';
    if (l.uso_interno) statusBadge = '<span style="color:#475569;font-size:11px">Bloqueada</span>';
    else if (l.status === 'ocupada') statusBadge = '<span style="color:#16a34a;font-size:11px">Locada</span>';
    else if (l.status === 'proposta_analise') statusBadge = '<span style="color:#d97706;font-size:11px">Proposta em análise</span>';
    else if (l.status === 'proposta_aceita') statusBadge = '<span style="color:#2563eb;font-size:11px">Proposta aceita</span>';
    else statusBadge = '<span style="color:#94a3b8;font-size:11px">Disponível</span>';

    linha.appendChild(el('div', { style: { fontWeight: '600', fontSize: '14px' } }, l.codigo));
    linha.appendChild(selTipo);
    linha.appendChild(inpPriv);
    linha.appendChild(inpTotal);
    linha.appendChild(atrCell);
    const statusDiv = el('div'); statusDiv.innerHTML = statusBadge;
    linha.appendChild(statusDiv);
    lista.appendChild(linha);
  });
  body.appendChild(lista);

  // ===== Adicionar unidades novas ao empreendimento =====
  const novas = [];
  const tipoPadrao = (emp?.preset === 'galpao_logistico') ? 'galpao'
                   : (emp?.preset === 'residencial_multifamiliar') ? 'apartamento'
                   : 'loja';
  const proximoCodigo = () => {
    const todos = lojas.map(l => l.codigo).concat(novas.map(n => n.inpCod.value));
    const nums = todos.map(c => parseInt(String(c).replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    const prox = (nums.length ? Math.max(...nums) : 0) + 1;
    const pad = Math.max(2, String(prox).length);
    return String(prox).padStart(pad, '0');
  };
  const btnAdd = el('button', {
    type: 'button', className: 'btn outline sm',
    style: { marginTop: '10px', fontSize: '12px' }
  }, '＋ Adicionar unidade');
  btnAdd.addEventListener('click', () => {
    const reg = { atrInputs: {}, nova: true };
    const linha = el('div', {
      style: { display: 'grid', gridTemplateColumns: GRID, gap: '8px', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }
    });
    const inpCod = el('input', { value: proximoCodigo(), style: { ...inpStyle, fontWeight: '600', width: '100%', padding: '4px 6px' } });
    const selTipo = el('select', { style: { ...inpStyle, padding: '5px 6px' } });
    TIPOS.forEach(t => {
      const opt = el('option', { value: t.v }, t.label);
      if (t.v === tipoPadrao) opt.selected = true;
      selTipo.appendChild(opt);
    });
    const inpPriv  = el('input', { type: 'number', step: '0.01', placeholder: '0,00', style: inpStyle });
    const inpTotal = el('input', { type: 'number', step: '0.01', placeholder: '0,00', style: inpStyle });
    const atrCell = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } });
    renderAtributos(atrCell, tipoPadrao, {}, reg);
    selTipo.addEventListener('change', () => renderAtributos(atrCell, selTipo.value, coletarAtributos(reg, {}), reg));

    reg.inpCod = inpCod; reg.selTipo = selTipo; reg.inpPriv = inpPriv; reg.inpTotal = inpTotal;
    novas.push(reg);

    const btnRem = el('button', { type: 'button', title: 'Remover', style: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontSize: '14px' } }, '✕');
    btnRem.addEventListener('click', () => { novas.splice(novas.indexOf(reg), 1); linha.remove(); });

    linha.appendChild(inpCod);
    linha.appendChild(selTipo);
    linha.appendChild(inpPriv);
    linha.appendChild(inpTotal);
    linha.appendChild(atrCell);
    linha.appendChild(btnRem);
    lista.appendChild(linha);
    lista.scrollTop = lista.scrollHeight;
  });
  body.appendChild(btnAdd);

  const total = lojas.length;
  const comArea = lojas.filter(l => l.area_privativa).length;
  body.appendChild(el('div', {
    style: { marginTop: '12px', fontSize: '12px', color: 'var(--ink-soft)', textAlign: 'right' }
  }, `${comArea} de ${total} unidades com área cadastrada`));

  abrirModal({
    titulo: `Editar características — ${nomeU}`,
    body,
    submitLabel: 'Salvar',
    maxWidth: '860px',
    onSubmit: async () => {
      const supa = await getSupabase();
      const updates = [];

      registros.forEach(reg => {
        if (reg.selTipo.disabled) return; // uso interno
        const l = reg.loja;
        const novoTipo = reg.selTipo.value;
        const novoPriv = reg.inpPriv.value ? Number(reg.inpPriv.value) : null;
        const novoTotal = reg.inpTotal.value ? Number(reg.inpTotal.value) : null;
        const atrs = coletarAtributos(reg, {});
        const finalidade = (TIPOS.find(t => t.v === novoTipo) || {}).finalidade || 'comercial';

        const antes = JSON.stringify({ t: l.tipo || 'loja', p: l.area_privativa ?? null, a: l.area_total ?? null, x: l.atributos || {} });
        const depois = JSON.stringify({ t: novoTipo, p: novoPriv, a: novoTotal, x: atrs });
        if (antes === depois) return;

        const payload = {
          tipo: novoTipo, finalidade,
          area_privativa: novoPriv, area_total: novoTotal,
          atributos: atrs
        };
        // Sincroniza colunas legadas enquanto o restante do app depende delas
        if (novoTipo === 'loja') {
          payload.area_deposito = atrs.area_deposito ?? null;
          payload.tem_exaustao = !!atrs.tem_exaustao;
        }
        updates.push({ id: l.id, codigo: l.codigo, payload });
      });

      // Inserção das unidades novas (carimbadas no empreendimento em contexto —
      // o trigger de default apontaria pro primeiro empreendimento, que pode não ser este)
      const inserts = novas
        .filter(reg => reg.inpCod.value.trim())
        .map(reg => {
          const t = reg.selTipo.value;
          return {
            codigo: reg.inpCod.value.trim(),
            tipo: t,
            finalidade: (TIPOS.find(x => x.v === t) || {}).finalidade || 'comercial',
            area_privativa: reg.inpPriv.value ? Number(reg.inpPriv.value) : null,
            area_total: reg.inpTotal.value ? Number(reg.inpTotal.value) : null,
            atributos: coletarAtributos(reg, {}),
            uso_interno: false,
            empreendimento_id: getCtxId()
          };
        });

      if (updates.length === 0 && inserts.length === 0) {
        mostrarToast('Nenhuma alteração para salvar', 'info');
        return;
      }
      if (inserts.length > 0) {
        const { error: errIns } = await supa.from('lojas').insert(inserts);
        if (errIns) throw new Error('Erro ao criar unidades: ' + errIns.message);
      }
      let salvas = 0;
      for (const u of updates) {
        // Sempre por id — o código deixou de ser único global no multi-empreendimento
        const { error } = await supa.from('lojas').update(u.payload).eq('id', u.id);
        if (error) throw new Error(`Erro na unidade ${u.codigo}: ${error.message}`);
        salvas++;
      }
      const partes = [];
      if (inserts.length) partes.push(`${inserts.length} criada${inserts.length > 1 ? 's' : ''}`);
      if (salvas) partes.push(`${salvas} atualizada${salvas > 1 ? 's' : ''}`);
      mostrarToast('Unidades: ' + partes.join(' · '), 'success');
      await renderTudo();
    }
  });
}

function coletarAtributos(reg, base) {
  const out = { ...base };
  Object.entries(reg.atrInputs).forEach(([chave, { inp, kind }]) => {
    if (kind === 'checkbox') out[chave] = !!inp.checked;
    else if (inp.value !== '' && inp.value != null) out[chave] = Number(inp.value);
    else delete out[chave];
  });
  return out;
}
