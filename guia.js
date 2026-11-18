const tituloGuia = 'Meu Guia de Português';
const painel = document.getElementById('painel');
const busca = document.getElementById('busca');
const limpar = document.getElementById('limpar');
const apresentacao = document.getElementById('apresentacao');
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const mapaCategorias = new Map(categorias.map(categoria => [categoria[0], categoria]));
const mapaRegras = new Map(regras.map(regra => [regra[0], regra]));
const porTitulo = [...regras].sort((a,b) => collator.compare(a[2], b[2]));
const frequentes = ['mau-mal', 'onde-aonde', 'crase-regra', 'porques', 'ha-a', 'haver-fazer'];
const ignorar = new Set(['a', 'o', 'as', 'os', 'de', 'do', 'da', 'e', 'ou', 'em', 'um', 'uma']);
const consultasDiretas = new Map([['crase', 'crase-regra']]);
const indice = regras.map(regra => ({
  regra,
  titulo: normalizar(regra[2]),
  texto: normalizar([...regra.flat(), mapaCategorias.get(regra[1])[1]].join(' ')),
}));

const chave = 'meu-guia-portugues-v1';
let favoritos = new Set();
let notas = Object.create(null);
try {
  const dados = JSON.parse(localStorage.getItem(chave)) || {};
  if (Array.isArray(dados.favoritos)) favoritos = new Set(dados.favoritos.filter(id => mapaRegras.has(id)));
  if (dados.notas && typeof dados.notas === 'object') {
    for (const [id, nota] of Object.entries(dados.notas)) {
      if (mapaRegras.has(id) && typeof nota === 'string') notas[id] = nota;
    }
  }
} catch {}

function salvar() {
  try {
    localStorage.setItem(chave, JSON.stringify({ favoritos: [...favoritos], notas }));
    return true;
  } catch { return false; }
}

function elemento(pai, tag, texto = '', classe = '') {
  const no = document.createElement(tag);
  if (texto) no.textContent = texto;
  if (classe) no.className = classe;
  pai.append(no);
  return no;
}

function link(pai, texto, destino, classe) {
  const ancora = elemento(pai, 'a', texto, classe);
  ancora.href = destino;
  return ancora;
}

function titulo(pai, texto, total) {
  const cabecalho = elemento(pai, 'div', '', 'cabecalho-secao');
  elemento(cabecalho, 'h2', texto);
  if (total !== undefined) {
    const contagem = elemento(cabecalho, 'span', total === 1 ? '1 regra' : total + ' regras', 'contagem');
    contagem.setAttribute('role', 'status');
  }
}

function regraCard(pai, regra, exibirCategoria = true) {
  const card = link(pai, '', '#regra/' + regra[0], 'regra');
  if (exibirCategoria) elemento(card, 'small', mapaCategorias.get(regra[1])[1]);
  elemento(card, 'strong', regra[2]);
  elemento(card, 'p', regra[3]);
}

function mostrarRegras(tituloLista, lista, vazio, exibirCategoria = true) {
  const secao = elemento(painel, 'section', '', 'secao');
  titulo(secao, tituloLista, lista.length);
  if (!lista.length) {
    elemento(secao, 'p', vazio);
    return;
  }
  const grade = elemento(secao, 'div', '', 'grade');
  for (const regra of lista) regraCard(grade, regra, exibirCategoria);
}

function mostrarInicio() {
  const secao = elemento(painel, 'section', '', 'secao');
  titulo(secao, 'Explore por assunto', regras.length);
  const grade = elemento(secao, 'div', '', 'grade');
  for (const [id, nome, resumo, simbolo] of categorias) {
    const card = link(grade, '', '#tema/' + id, 'categoria');
    elemento(card, 'span', simbolo, 'simbolo').setAttribute('aria-hidden', 'true');
    const texto = elemento(card, 'div');
    elemento(texto, 'strong', nome);
    elemento(texto, 'small', resumo);
  }
  mostrarRegras('Dúvidas para começar', frequentes.map(id => mapaRegras.get(id)), '');
}

function procurar(consulta) {
  const forma = normalizar(consulta);
  if (!forma) return [];
  const assunto = forma.replace(/^(?:(?:como|quando|onde) (?:se )?(?:usar|escrever|empregar|colocar)|o que e|qual e a regra de) /u, '');
  const termos = assunto.split(' ').filter(termo => !ignorar.has(termo));
  if (!termos.length) termos.push(assunto);
  const termosConsulta = termos.join(' ');
  const direta = consultasDiretas.get(termosConsulta);
  return indice.filter(item => item.regra[0] === direta || termos.every(termo => item.texto.includes(termo)))
    .map(item => ({
      regra: item.regra,
      pontos: (item.regra[0] === direta ? 30 : 0)
        + (item.titulo === forma ? 20 : 0)
        + (item.titulo.includes(assunto) ? 10 : 0)
        + (item.titulo.startsWith(termosConsulta + ' ') ? 5 : 0)
        + termos.filter(termo => item.titulo.split(' ').includes(termo)).length,
    }))
    .sort((a,b) => b.pontos - a.pontos || collator.compare(a.regra[2],b.regra[2]))
    .map(item => item.regra);
}

function mostrarRegra(regra) {
  const [id, categoria, nome, resumo, explicacao, exemplos, observacao] = regra;
  const caminho = elemento(painel, 'nav', '', 'navegacao-artigo');
  caminho.setAttribute('aria-label', 'Local da regra');
  link(caminho, '← Início', '#');
  link(caminho, mapaCategorias.get(categoria)[1], '#tema/' + categoria);
  const artigo = elemento(painel, 'article', '', 'artigo');
  const topo = elemento(artigo, 'header', '', 'artigo-topo');
  elemento(topo, 'h1', nome, 'titulo-pagina');
  const botao = elemento(topo, 'button', '', 'botao');
  botao.type = 'button';
  const estado = elemento(artigo, 'span', '', 'nota-status');
  estado.setAttribute('role', 'status');
  const aplicarFavorito = () => {
    const ativo = favoritos.has(id);
    botao.textContent = ativo ? '★ Favorita' : '☆ Favoritar';
    botao.setAttribute('aria-pressed', String(ativo));
  };
  aplicarFavorito();
  botao.onclick = () => {
    const antes = favoritos.has(id);
    if (antes) favoritos.delete(id);
    else favoritos.add(id);
    if (!salvar()) {
      if (antes) favoritos.add(id);
      else favoritos.delete(id);
      estado.textContent = 'O navegador não conseguiu salvar.';
    } else {
      estado.textContent = antes ? 'Regra removida das favoritas.' : 'Regra adicionada às favoritas.';
    }
    aplicarFavorito();
  };
  elemento(artigo, 'p', resumo, 'resposta');
  elemento(artigo, 'p', explicacao);
  elemento(artigo, 'h2', 'Exemplos comentados');
  const lista = elemento(artigo, 'div', '', 'exemplos');
  for (const exemplo of exemplos) {
    const [frase, comentario] = exemplo.split('|');
    const item = elemento(lista, 'p', '', 'exemplo');
    elemento(item, 'strong', frase);
    elemento(item, 'span', comentario);
  }
  if (observacao) {
    elemento(artigo, 'h2', 'Atenção');
    elemento(artigo, 'p', observacao, 'observacao');
  }
  const form = elemento(artigo, 'form', '', 'anotacoes');
  elemento(form, 'h2', 'Minha anotação');
  const label = elemento(form, 'label', 'Guarde uma frase sua ou uma dica para lembrar.');
  label.htmlFor = 'nota';
  const nota = elemento(form, 'textarea');
  nota.id = 'nota';
  nota.value = notas[id] || '';
  const guardar = elemento(form, 'button', 'Salvar anotação', 'botao');
  guardar.type = 'submit';
  const aviso = elemento(form, 'span', '', 'nota-status');
  aviso.setAttribute('role', 'status');
  form.onsubmit = evento => {
    evento.preventDefault();
    const anterior = notas[id];
    if (nota.value.trim()) notas[id] = nota.value.trim();
    else delete notas[id];
    if (!salvar()) {
      if (anterior === undefined) delete notas[id];
      else notas[id] = anterior;
      aviso.textContent = 'O navegador não conseguiu salvar.';
    } else {
      aviso.textContent = notas[id] ? 'Anotação salva.' : 'Anotação removida.';
    }
  };
  const relacionadas = porTitulo.filter(item => item[0] !== id && item[1] === categoria).slice(0,3);
  if (relacionadas.length) mostrarRegras('Veja também', relacionadas, '', false);
}

function atualizar(focar = false) {
  const rota = location.hash.slice(1);
  const [tipo, id] = rota.split('/');
  const consulta = busca.value.trim();
  const regra = tipo === 'regra' ? mapaRegras.get(id) : undefined;
  const categoria = tipo === 'tema' ? mapaCategorias.get(id) : undefined;
  const inicio = !consulta && !rota;
  limpar.hidden = !busca.value;
  apresentacao.hidden = !inicio;
  document.getElementById('atalhos').hidden = !inicio;
  for (const [idLink, ativo] of [['inicio-link', inicio], ['favoritas-link', !consulta && rota === 'favoritas']]) {
    const item = document.getElementById(idLink);
    if (ativo) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  painel.replaceChildren();
  document.title = regra && !consulta ? regra[2] + ' · ' + tituloGuia : tituloGuia;
  if (consulta) mostrarRegras('Resultados da busca', procurar(consulta), 'Nenhuma regra encontrada. Tente uma palavra mais curta ou procure por assunto.');
  else if (regra) mostrarRegra(regra);
  else if (categoria) mostrarRegras(categoria[1], porTitulo.filter(item => item[1] === id), '', false);
  else if (rota === 'favoritas') mostrarRegras('Minhas favoritas', porTitulo.filter(item => favoritos.has(item[0])), 'Abra uma regra e use Favoritar para guardá-la aqui.');
  else if (inicio || rota === 'principal') mostrarInicio();
  else mostrarRegras('Página não encontrada', [], 'Use a busca ou volte ao início.');
  if (focar) {
    const heading = painel.querySelector('h1, h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    window.scrollTo(0,0);
  }
}

const atalhos = document.getElementById('atalhos');
for (const id of frequentes.slice(0,4)) link(atalhos, mapaRegras.get(id)[2], '#regra/' + id);
document.getElementById('busca-form').onsubmit = evento => {
  evento.preventDefault();
  atualizar(true);
};
busca.oninput = () => atualizar();
limpar.onclick = () => { busca.value = ''; atualizar(); busca.focus(); };
document.addEventListener('click', evento => {
  const ancora = evento.target.closest('a[href^="#"]');
  if (!ancora || ancora.classList.contains('skip') || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
  if (ancora.hash === location.hash) {
    evento.preventDefault();
    busca.value = '';
    atualizar(true);
  }
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#principal') return;
  busca.value = '';
  atualizar(true);
});
atualizar();
