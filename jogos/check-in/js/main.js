// Check-in · controle das telas e da interação.

import { novoEstado, salvar, carregar, apagar, lerRecorde, gravarRecorde } from "./estado.js";
import { quarto, listaQuartos } from "./predio.js";
import {
  DIAS_SEMANA, diaSemana, ehFimDeSemana, ehFeriado, temporadaAtual,
  podeFicar, satisfacao, efeitoNosVizinhos, humor, colocar, recusar, desfazer
} from "./hospedes.js";
import { iniciarDia, procura, abrirCheckin, encerrarCheckin, fecharDia, proximoDia, resumoTemporada } from "./economia.js";
import { montarCena, desenharPredio, figura, fundoPerfil } from "./render/corte-lateral.js";

const TEMAS = [
  { id: "pousada-praia", nome: "Pousada de praia" },
  { id: "hotel-executivo", nome: "Hotel executivo", breve: true },
  { id: "chale-serra", nome: "Chalé na serra", breve: true },
  { id: "motel-estrada", nome: "Motel de estrada", breve: true }
];
const NOMES_DIA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const CREDITO = `<p>Idealizado por Jonathan Caye, criado por Claude</p>`;

const $ = id => document.getElementById(id);
const reais = v => (v < 0 ? "−" : "") + "R$ " + Math.abs(Math.round(v)).toLocaleString("pt-BR");
const dec = v => v.toFixed(1).replace(".", ",");
const pct = v => Math.round(v * 100) + "%";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const estrelasTxt = n => "★".repeat(n) + `<i>${"★".repeat(5 - n)}</i>`;

let tema = null;
let estado = null;
let ui = { sel: null, alvo: null, foco: null };

async function iniciar() {
  try {
    tema = await (await fetch("data/temas/pousada-praia.json")).json();
  } catch (e) {
    $("cena").innerHTML = `<p style="padding:20px">Não foi possível carregar o jogo. Abra pelo site (GitHub Pages).</p>`;
    return;
  }
  montarCena($("cena"), tema);
  $("cena").addEventListener("click", tocarCena);
  $("painel").addEventListener("click", tocarPainel);
  $("painel").addEventListener("input", mudarPreco);
  $("topo").addEventListener("click", e => { if (e.target.closest("[data-menu]")) abrirMenu(); });
  const salvo = carregar();
  if (salvo && salvo.tema === tema.id) estado = salvo;
  desenhar();
  abertura();
}

/* ---------------- abertura e menus ---------------- */

function camada(html, cls = "") {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const c = $("camada");
  c.className = "camada " + cls;
  c.innerHTML = html;
  c.hidden = false;
  c.onclick = e => {
    const b = e.target.closest("[data-acao]");
    if (b) acao(b.dataset.acao);
  };
}
function fecharCamada() { $("camada").hidden = true; $("camada").innerHTML = ""; }

function abertura() {
  $("topo").hidden = true;
  $("painel").hidden = true;
  const temp = tema.temporadas[0];
  const rec = lerRecorde();
  const podeContinuar = estado && estado.fase !== "fim";
  camada(`<div class="folha">
    <div>
      <div class="rotulo">Mesa de Jogos · gestão de hotel</div>
      <h1 class="logo">Check<span>-</span>in</h1>
      <p class="sub">${tema.hotel}</p>
    </div>
    <div>
      <div class="rotulo" style="margin-bottom:6px">Tema da carreira</div>
      <div class="temas">${TEMAS.map(t => `<button class="tema${t.id === tema.id ? " on" : ""}" ${t.breve ? "disabled" : ""}>${t.nome}${t.breve ? "<em>em breve</em>" : ""}</button>`).join("")}</div>
    </div>
    <div class="quadro">
      <div class="ln"><span>Temporada ${temp.n}</span><span>${temp.nome}</span></div>
      <div class="ln"><span>Duração</span><span>${temp.dias} dias</span></div>
      ${rec ? `<div class="ln"><span>Recorde</span><span>${rec.estrelas ? "★".repeat(rec.estrelas) : "sem estrelas"} · ${reais(rec.caixa)}</span></div>` : ""}
    </div>
    ${podeContinuar ? `<button class="btn" data-acao="continuar">Continuar · dia ${estado.dia}</button><button class="btn sec" data-acao="novo">Nova temporada</button>`
      : `<button class="btn" data-acao="novo">Começar temporada</button>`}
    <button class="btn sec peq" data-acao="como">Como jogar</button>
    <div class="rodape"><a href="../../">← Mesa de Jogos</a>${CREDITO}</div>
  </div>`, "abertura");
}

function comoJogar(volta = "abertura") {
  camada(`<div class="folha">
    <div class="rotulo">Como jogar</div>
    <h2>Cada dia tem manhã, check-in e noite</h2>
    <ol class="passos">
      <li><span><b>Manhã:</b> defina o preço de cada tipo de quarto. Preço alto rende mais, mas nem todo grupo topa pagar.</span></li>
      <li><span><b>Check-in:</b> escolha um grupo da fila e toque num quarto para ver a satisfação prevista. Toque de novo para confirmar.</span></li>
      <li><span><b>Vizinhança:</b> o barulho atravessa a parede e o teto. Turmas e famílias fazem barulho; casais e surfistas querem silêncio. Famílias vizinhas se dão bem.</span></li>
      <li><span><b>Preferências:</b> casais querem vista para o mar; famílias preferem o 1º andar.</span></li>
      <li><span><b>Noite:</b> as diárias entram no caixa e quem sai deixa avaliação. Recusar grupo com quarto vago custa reputação.</span></li>
      <li><span><b>Meta:</b> em 30 dias, feche com caixa e reputação acima da meta para ganhar até 3 estrelas.</span></li>
    </ol>
    <button class="btn" data-acao="${volta === "jogo" ? "fechar" : "abertura"}">Entendi</button>
  </div>`);
}

function abrirMenu() {
  camada(`<div class="folha">
    <div class="rotulo">Pausa</div>
    <h2>${tema.hotel}</h2>
    <button class="btn" data-acao="fechar">Voltar ao jogo</button>
    <button class="btn sec" data-acao="como-jogo">Como jogar</button>
    <button class="btn sec" data-acao="reiniciar">Recomeçar a temporada</button>
    <button class="btn sec" data-acao="abertura">Tela inicial</button>
  </div>`);
}

function acao(a) {
  if (a === "novo") {
    estado = novoEstado(tema, 1);
    iniciarDia(tema, estado);
    salvar(estado);
    ui = { sel: null, alvo: null, foco: null };
    entrar();
  } else if (a === "continuar" || a === "fechar") entrar();
  else if (a === "como") comoJogar();
  else if (a === "como-jogo") comoJogar("jogo");
  else if (a === "abertura") { desenhar(); abertura(); }
  else if (a === "reiniciar") { apagar(); acao("novo"); }
  else if (a === "dormir") {
    proximoDia(tema, estado);
    salvar(estado);
    ui = { sel: null, alvo: null, foco: null };
    entrar();
  } else if (a === "fim-novo") { apagar(); acao("novo"); }
  else if (a === "fim-sair") { apagar(); estado = null; desenhar(); abertura(); }
}

function entrar() {
  fecharCamada();
  $("topo").hidden = false;
  $("painel").hidden = false;
  desenhar();
  if (estado.fase === "noite") balanco();
  if (estado.fase === "fim") fim();
}

/* ---------------- desenho ---------------- */

function humorDe(h, id) { return humor(satisfacao(tema, estado, h, id).valor); }

function desenhar() {
  if (!estado) {
    desenharPredio($("cena"), tema, { quartos: {}, fase: "manha", precos: {} }, {}, () => "ok");
    return;
  }
  desenharTopo();
  desenharPredio($("cena"), tema, estado, uiPredio(), humorDe);
  desenharPainel();
}

function desenharTopo() {
  const temp = temporadaAtual(tema, estado);
  const fases = { manha: "Manhã", checkin: "Check-in", noite: "Noite", fim: "Fim" };
  $("topo").innerHTML = `
    <div class="dia">Dia ${Math.min(estado.dia, temp.dias)}<small>${DIAS_SEMANA[diaSemana(estado.dia)]} · de ${temp.dias}</small></div>
    <span class="fase ${estado.fase}">${fases[estado.fase]}</span>
    <div class="num">${reais(estado.caixa)}<small>caixa</small></div>
    <div class="num"><span class="estrela">★</span> ${dec(estado.rep)}<small>reputação</small></div>
    <button class="menu" data-menu aria-label="Menu">☰</button>`;
}

function hospSel() { return estado.fila.find(h => h.id === ui.sel); }

function uiPredio() {
  const out = { foco: ui.foco, alvo: ui.alvo };
  const h = estado.fase === "checkin" && hospSel();
  if (h) {
    out.prev = {};
    for (const q of listaQuartos(tema)) {
      if (estado.quartos[q.id]) continue;
      const r = podeFicar(tema, estado, h, q.id);
      if (!r.ok) { out.prev[q.id] = r; continue; }
      const s = satisfacao(tema, estado, h, q.id, { ...estado.quartos, [q.id]: h }).valor;
      out.prev[q.id] = { ok: true, valor: s, humor: humor(s) };
    }
    if (ui.alvo) {
      out.deltas = {};
      for (const d of efeitoNosVizinhos(tema, estado, h, ui.alvo)) out.deltas[d.id] = d.delta;
    }
  }
  return out;
}

function chipsHosp(h) {
  const p = tema.perfis[h.perfil];
  const c = [];
  if (p.prefs.includes("vista")) c.push(`<span class="pil teal">quer vista</span>`);
  if (p.prefs.includes("baixo")) c.push(`<span class="pil teal">1º andar</span>`);
  if (p.sens >= 2) c.push(`<span class="pil teal">silêncio</span>`);
  if (p.barulho >= 2) c.push(`<span class="pil laranja">${p.barulho >= 3 ? "muito barulho" : "barulhentos"}</span>`);
  if (p.minTipo >= 1) c.push(`<span class="pil">Std ou melhor</span>`);
  return c.join("");
}

function avatar(h, cls = "av") {
  const p = tema.perfis[h.perfil];
  return `<span class="${cls}" style="--fundo-perfil:${fundoPerfil(p.cor)}">${figura(h.perfil, p.cor, h.id)}</span>`;
}

function blocoFoco() {
  if (!ui.foco) return "";
  const h = estado.quartos[ui.foco];
  const q = quarto(tema, ui.foco);
  if (!h) return "";
  const s = satisfacao(tema, estado, h, ui.foco);
  const hm = humor(s.valor);
  return `<div class="previa">
    <div class="topo-p"><span class="nota ${hm}">${s.valor}</span>
      <div style="flex:1"><div class="hosp-nm" style="font-weight:800">${esc(h.nome)} · ${q.id}</div>
      <div class="dica">${tema.perfis[h.perfil].nome} · ${h.noites} ${h.noites === 1 ? "noite" : "noites"} restantes · ${reais(h.preco)}/noite</div></div>
      <button class="pil" data-fechar-foco>fechar</button></div>
    ${listaFatores(s.fatores)}
  </div>`;
}

function listaFatores(f) {
  if (!f.length) return `<p class="dica">Nada a reclamar, nada a elogiar.</p>`;
  return `<ul class="fatores">${f.map(x => `<li><span>${esc(x.txt)}</span><b class="${x.d > 0 ? "m" : "n"}">${x.d > 0 ? "+" : ""}${x.d}</b></li>`).join("")}</ul>`;
}

function desenharPainel() {
  const el = $("painel");
  if (estado.fase === "manha") el.innerHTML = painelManha();
  else if (estado.fase === "checkin") el.innerHTML = painelCheckin();
  else el.innerHTML = `<div class="dica">Fim do dia.</div>`;
  el.querySelectorAll("input[type=range]").forEach(pintaRange);
}

function painelManha() {
  const temp = temporadaAtual(tema, estado);
  const pr = procura(tema, estado);
  const n = estado.fila.length;
  const ocup = Object.values(estado.quartos).filter(Boolean);
  const chips = [];
  if (ehFeriado(temp, estado.dia)) chips.push(`<span class="pil laranja">${temp.feriado.nome}</span>`);
  else if (ehFimDeSemana(estado.dia)) chips.push(`<span class="pil laranja">Fim de semana</span>`);
  if (ocup.length) chips.push(`<span class="pil">${ocup.length} ${ocup.length === 1 ? "quarto ocupado" : "quartos ocupados"}</span>`);
  return `${blocoFoco()}
    <div class="linha-tit"><div><div class="rotulo">Manhã · ${NOMES_DIA[diaSemana(estado.dia)]}</div><h2>${n} ${n === 1 ? "pedido de reserva" : "pedidos de reserva"} hoje</h2></div></div>
    ${chips.length ? `<div class="pilulas">${chips.join("")}</div>` : ""}
    <div class="precos">${Object.entries(tema.tipos).map(([k, t]) => {
      const qtd = listaQuartos(tema).filter(q => q.tipo === k).length;
      const livres = listaQuartos(tema).filter(q => q.tipo === k && !estado.quartos[q.id]).length;
      return `<label class="preco"><span class="nm">${t.nome}<small>${livres} de ${qtd} livres</small></span>
        <input type="range" min="${t.min}" max="${t.max}" step="10" value="${estado.precos[k]}" data-tipo="${k}" aria-label="Preço ${t.nome}">
        <span class="vl" id="vl-${k}">${reais(estado.precos[k])}<small>${procuraTxt(pr[k], n)}</small></span></label>`;
    }).join("")}</div>
    <button class="btn" data-abrir>Abrir o check-in →</button>`;
}

function procuraTxt(x, n) {
  if (!n) return "sem pedidos";
  return `${x} de ${n} topam`;
}

function pintaRange(r) {
  const p = ((r.value - r.min) / (r.max - r.min)) * 100;
  r.style.setProperty("--p", p + "%");
}

function mudarPreco(e) {
  const r = e.target.closest("input[type=range]");
  if (!r) return;
  estado.precos[r.dataset.tipo] = +r.value;
  pintaRange(r);
  const pr = procura(tema, estado);
  const n = estado.fila.length;
  for (const k of Object.keys(tema.tipos)) {
    const v = $("vl-" + k);
    if (v) v.innerHTML = `${reais(estado.precos[k])}<small>${procuraTxt(pr[k], n)}</small>`;
  }
  salvar(estado);
}

function painelCheckin() {
  const h = hospSel();
  const fila = estado.fila.length
    ? `<div class="fila">${estado.fila.map(x => `<button class="hosp${x.id === ui.sel ? " sel" : ""}" data-hosp="${x.id}">
        <span class="cab">${avatar(x)}<span><span class="nm">${esc(x.nome)}</span><br><span class="pf">${tema.perfis[x.perfil].nome}</span></span></span>
        <span class="dd"><span>${x.noites} ${x.noites === 1 ? "noite" : "noites"}</span><span>até <b>${reais(x.orc)}</b></span></span>
        <span class="pilulas">${chipsHosp(x)}</span></button>`).join("")}</div>`
    : `<div class="vazio">Fila vazia. Hora de fechar o dia.</div>`;

  let meio = "";
  if (h && ui.alvo) {
    const q = quarto(tema, ui.alvo);
    const s = satisfacao(tema, estado, h, ui.alvo, { ...estado.quartos, [ui.alvo]: h });
    const hm = humor(s.valor);
    const viz = efeitoNosVizinhos(tema, estado, h, ui.alvo);
    meio = `<div class="previa">
      <div class="topo-p"><span class="nota ${hm}">${s.valor}</span>
        <div><div style="font-weight:800">${esc(h.nome)} no ${q.id}</div>
        <div class="dica">${tema.tipos[q.tipo].nome} · ${reais(estado.precos[q.tipo])}/noite · ${h.noites} ${h.noites === 1 ? "noite" : "noites"}</div></div></div>
      ${listaFatores(s.fatores)}
      ${viz.length ? `<div class="pilulas">${viz.map(v => `<span class="pil ${v.delta < 0 ? "vermelho" : "teal"}">Vizinhos do ${v.id}: ${v.delta > 0 ? "+" : ""}${v.delta}</span>`).join("")}</div>` : ""}
    </div>
    <div class="botoes"><button class="btn sec peq" data-cancelar>Escolher outro</button><button class="btn peq" data-confirmar>Check-in no ${q.id}</button></div>`;
  } else if (h) {
    meio = `<p class="dica">Toque num quarto vago para ver como <b>${esc(h.nome)}</b> ficaria.</p>
    <div class="botoes"><button class="btn sec peq" data-desfazer ${estado.desfazer.length ? "" : "disabled"}>Desfazer</button><button class="btn sec peq" data-recusar>Recusar</button><button class="btn peq" data-encerrar>${ui.encerrar ? "Confirmar" : "Encerrar"}</button></div>`;
  } else {
    meio = `${blocoFoco() || (estado.fila.length ? `<p class="dica">Escolha um grupo da fila.</p>` : "")}
    <div class="botoes"><button class="btn sec peq" data-desfazer ${estado.desfazer.length ? "" : "disabled"}>Desfazer</button><button class="btn peq" data-encerrar>${ui.encerrar ? "Confirmar: encerrar" : "Encerrar o dia →"}</button></div>`;
  }
  return `<div class="linha-tit"><div class="rotulo">Check-in · fila</div><div class="rotulo">${estado.fila.length} ${estado.fila.length === 1 ? "grupo" : "grupos"}</div></div>
    ${fila}${meio}`;
}

/* ---------------- toques ---------------- */

function toast(txt) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = txt;
  $("app").appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function tocarCena(e) {
  if (!estado || !$("camada").hidden) return;
  const b = e.target.closest(".qto");
  if (!b) return;
  const id = b.dataset.id;
  const h = estado.fase === "checkin" && hospSel();
  if (h) {
    if (estado.quartos[id]) { ui.foco = null; toast(`Quarto ${id} ocupado por ${estado.quartos[id].nome}`); return; }
    const r = podeFicar(tema, estado, h, id);
    if (!r.ok) { toast(`${id}: ${r.motivo.toLowerCase()} para ${h.nome}`); return; }
    if (ui.alvo === id) return confirmar();
    ui.alvo = id;
    desenhar();
    return;
  }
  if (estado.quartos[id]) { ui.foco = ui.foco === id ? null : id; desenhar(); }
  else toast(`Quarto ${id} vago · ${tema.tipos[quarto(tema, id).tipo].nome}${quarto(tema, id).vista ? " com vista" : ""}`);
}

function confirmar() {
  const h = hospSel();
  if (!h || !ui.alvo) return;
  const id = ui.alvo;
  if (colocar(tema, estado, h.id, id)) {
    ui = { sel: estado.fila[0]?.id ?? null, alvo: null, foco: null };
    salvar(estado);
    desenhar();
    toast(`Check-in de ${h.nome} no ${id}`);
  }
}

function tocarPainel(e) {
  const t = e.target;
  const hb = t.closest("[data-hosp]");
  if (hb) {
    const id = +hb.dataset.hosp;
    ui.sel = ui.sel === id ? null : id;
    ui.alvo = null; ui.foco = null;
    desenhar();
    return;
  }
  if (t.closest("[data-abrir]")) {
    abrirCheckin(estado);
    ui = { sel: estado.fila[0]?.id ?? null, alvo: null, foco: null };
    salvar(estado); desenhar(); return;
  }
  if (t.closest("[data-confirmar]")) return confirmar();
  if (t.closest("[data-cancelar]")) { ui.alvo = null; desenhar(); return; }
  if (t.closest("[data-fechar-foco]")) { ui.foco = null; desenhar(); return; }
  if (t.closest("[data-recusar]")) {
    const h = hospSel();
    recusar(tema, estado, ui.sel);
    ui = { sel: estado.fila[0]?.id ?? null, alvo: null, foco: null };
    salvar(estado); desenhar();
    if (h) toast(`${h.nome} foi recusado`);
    return;
  }
  if (t.closest("[data-desfazer]")) {
    if (desfazer(estado)) { ui = { sel: estado.fila[0]?.id ?? null, alvo: null, foco: null }; salvar(estado); desenhar(); }
    return;
  }
  if (t.closest("[data-encerrar]")) {
    if (estado.fila.length && !ui.encerrar) {
      ui.encerrar = true; desenhar();
      toast(`${estado.fila.length} na fila vão embora. Toque de novo para encerrar.`);
      return;
    }
    encerrarCheckin(tema, estado);
    fecharDia(tema, estado);
    ui = { sel: null, alvo: null, foco: null };
    salvar(estado);
    desenhar();
    balanco();
  }
}

/* ---------------- noite e fim ---------------- */

function balanco() {
  const b = estado.balanco;
  const temp = temporadaAtual(tema, estado);
  const ultimo = estado.dia >= temp.dias;
  const avisos = [];
  if (b.saida.recusados) avisos.push(`${b.saida.recusados} ${b.saida.recusados === 1 ? "grupo recusado" : "grupos recusados"} com quarto vago (reputação caiu)`);
  if (b.saida.caros) avisos.push(`${b.saida.caros} ${b.saida.caros === 1 ? "grupo achou caro e foi embora" : "grupos acharam caro e foram embora"}`);
  if (b.saida.semVaga) avisos.push(`${b.saida.semVaga} ${b.saida.semVaga === 1 ? "grupo ficou" : "grupos ficaram"} sem quarto`);
  const proxDia = ultimo ? "" : `${NOMES_DIA[diaSemana(estado.dia + 1)]}, dia ${estado.dia + 1}`;
  camada(`<div class="folha">
    <div><div class="rotulo">Noite · balanço do dia ${b.dia}</div><h2>${b.lucro >= 0 ? "Dia no azul" : "Dia no vermelho"}</h2></div>
    <div class="blocos">
      <div class="bloco"><span class="rotulo">Receita</span><b>${reais(b.receita)}</b></div>
      <div class="bloco"><span class="rotulo">Custos</span><b>${reais(b.custos)}</b></div>
      <div class="bloco"><span class="rotulo">Lucro</span><b class="${b.lucro >= 0 ? "pos" : "neg"}">${reais(b.lucro)}</b></div>
    </div>
    <div class="quadro">
      <div class="ln"><span>Ocupação</span><span>${pct(b.ocupacao)} · ${b.ocupados} de ${b.total}</span></div>
      <div class="ln"><span>Diária média (ADR)</span><span>${reais(b.adr)}</span></div>
      <div class="ln"><span>Receita por quarto (RevPAR)</span><span>${reais(b.revpar)}</span></div>
      <div class="ln"><span>Reputação</span><span>★ ${dec(b.rep)}</span></div>
    </div>
    ${avisos.length ? `<ul class="avisos">${avisos.map(a => `<li>${a}</li>`).join("")}</ul>` : ""}
    <div class="rotulo">${b.avaliacoes.length ? "Avaliações de quem saiu" : "Ninguém saiu hoje"}</div>
    ${b.avaliacoes.length ? `<div class="rolar">${b.avaliacoes.map(a => `<div class="aval">${avatar({ perfil: a.perfil, id: a.quarto.charCodeAt(2) })}
      <div><div class="nm"><span>${esc(a.nome)} · ${a.quarto}</span><span class="est">${estrelasTxt(a.estrelas)}</span></div><p>${esc(a.texto)}</p></div></div>`).join("")}</div>` : ""}
    <button class="btn" data-acao="dormir">${ultimo ? "Ver o fim da temporada →" : `Dormir · ${proxDia} →`}</button>
  </div>`);
}

function fim() {
  const r = resumoTemporada(tema, estado);
  const temp = temporadaAtual(tema, estado);
  const rec = lerRecorde();
  const novoRec = !rec || r.estrelas > rec.estrelas || (r.estrelas === rec.estrelas && r.caixa > rec.caixa);
  if (novoRec) gravarRecorde({ estrelas: r.estrelas, caixa: r.caixa, rep: r.rep });
  const titulo = ["Temporada difícil", "Pousada de pé", "Pousada querida", "Pousada famosa"][r.estrelas];
  camada(`<div class="folha">
    <div><div class="rotulo">Fim da temporada ${temp.n} · ${temp.nome}</div><h1>${titulo}</h1></div>
    <div class="estrelas-g">${"★".repeat(r.estrelas)}<i>${"★".repeat(3 - r.estrelas)}</i></div>
    <div class="blocos">
      <div class="bloco"><span class="rotulo">Caixa</span><b>${reais(r.caixa)}</b></div>
      <div class="bloco"><span class="rotulo">Reputação</span><b>★ ${dec(r.rep)}</b></div>
      <div class="bloco"><span class="rotulo">Ocupação</span><b>${pct(r.ocupacao)}</b></div>
    </div>
    <div class="quadro">
      <div class="ln"><span>Lucro na temporada</span><span>${reais(r.lucro)}</span></div>
      <div class="ln"><span>Diária média · RevPAR</span><span>${reais(r.adr)} · ${reais(r.revpar)}</span></div>
      <div class="ln"><span>Hóspedes atendidos</span><span>${r.hospedes} · ${r.cinco} deram 5★</span></div>
      <div class="ln"><span>Grupos recusados com vaga</span><span>${r.recusados}</span></div>
    </div>
    <div class="metas">${r.metas.map(m => `<div class="${r.estrelas >= m.estrelas ? "ok" : ""}"><span>${"★".repeat(m.estrelas)}</span><span>caixa ${reais(m.caixa)} e ★ ${dec(m.rep)}</span></div>`).join("")}</div>
    ${novoRec ? `<div class="pilulas"><span class="pil laranja">Novo recorde</span></div>` : ""}
    <p class="dica">A temporada 2 (Verão) e os novos temas chegam nas próximas versões.</p>
    <div class="botoes"><button class="btn sec" data-acao="fim-sair">Tela inicial</button><button class="btn" data-acao="fim-novo">Jogar de novo</button></div>
  </div>`);
}

iniciar();
