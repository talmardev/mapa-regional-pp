// Medidor do Mapa Regional: mapa, medições e conversor.
// As escalas e as caixas vêm do config.js.

const tela = document.getElementById('mapa'), contexto = tela.getContext('2d');
const imagem = new Image();
let fator = 1;                  // larguraOriginal / largura da imagem carregada
let vista = { escala: 1, x: 0, y: 0 };
let pontos = [];                // em píxeis da imagem carregada
let modo = 'dist';
let escalaMinima = 0.05;
let avisoZona = '';             // aviso quando um ponto é recusado por estar noutra zona
let grupoViagem = 0;            // índice em CONFIG.velocidades
let emTerra = [];               // índices dos troços por mar que passam por terra
let mascaraMar = null;          // null: por fazer; false: não deu para ler a imagem

const formatoInteiro = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 });
const formatoDecimal = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $ = id => document.getElementById(id);

// Vista do mapa

function redimensionar() {
  const densidade = window.devicePixelRatio || 1, ret = tela.getBoundingClientRect();
  tela.width = Math.round(ret.width * densidade); tela.height = Math.round(ret.height * densidade);
  // Se o mapa carregou antes de a janela ter tamanho, enquadra agora
  if (imagem.naturalWidth && vista.escala <= 0) verTudo();
  else desenhar();
}

// Enquadra o mapa todo, deixando espaço para o painel
function verTudo() {
  const ret = tela.getBoundingClientRect();
  const largo = window.innerWidth > 700;
  const larguraPainel = largo ? 360 : 0, alturaPainel = largo ? 0 : ret.height * 0.35;
  const larguraLivre = ret.width - larguraPainel - 20, alturaLivre = ret.height - alturaPainel - 20;
  vista.escala = Math.min(larguraLivre / imagem.naturalWidth, alturaLivre / imagem.naturalHeight);
  escalaMinima = vista.escala * 0.5;
  vista.x = larguraPainel + 10 + (larguraLivre - imagem.naturalWidth * vista.escala) / 2;
  vista.y = 10 + (alturaLivre - imagem.naturalHeight * vista.escala) / 2;
  desenhar();
}

const paraEcra = p => ({ x: p.x * vista.escala + vista.x, y: p.y * vista.escala + vista.y });
const paraImagem = (ex, ey) => ({ x: (ex - vista.x) / vista.escala, y: (ey - vista.y) / vista.escala });

function zoomEm(ex, ey, f) {
  const nova = Math.max(escalaMinima, Math.min(CONFIG.zoomMaximo, vista.escala * f));
  const p = paraImagem(ex, ey);
  vista.escala = nova; vista.x = ex - p.x * nova; vista.y = ey - p.y * nova;
  desenhar();
}

function desenhar() {
  const densidade = window.devicePixelRatio || 1;
  contexto.setTransform(1, 0, 0, 1, 0, 0);
  contexto.clearRect(0, 0, tela.width, tela.height);
  if (!imagem.naturalWidth) return;
  contexto.setTransform(densidade * vista.escala, 0, 0, densidade * vista.escala, densidade * vista.x, densidade * vista.y);
  contexto.imageSmoothingEnabled = vista.escala < 2;
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(imagem, 0, 0);
  contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
  if (!pontos.length) return;

  const noEcra = pontos.map(paraEcra);
  const fechado = modo === 'area' && pontos.length > 2;
  contexto.lineJoin = 'round'; contexto.lineCap = 'round';
  contexto.beginPath();
  noEcra.forEach((p, i) => i ? contexto.lineTo(p.x, p.y) : contexto.moveTo(p.x, p.y));
  if (fechado) { contexto.closePath(); contexto.fillStyle = 'rgba(200,38,30,.2)'; contexto.fill(); }
  contexto.strokeStyle = '#fff'; contexto.lineWidth = 6; contexto.stroke();
  contexto.strokeStyle = '#c8261e'; contexto.lineWidth = 3; contexto.stroke();

  // Troços por mar que passam por terra, a tracejado laranja
  if (modo === 'dist' && emTerra.length) {
    contexto.setLineDash([10, 7]); contexto.strokeStyle = '#ff9a1f'; contexto.lineWidth = 3.5;
    emTerra.forEach(i => {
      contexto.beginPath(); contexto.moveTo(noEcra[i - 1].x, noEcra[i - 1].y); contexto.lineTo(noEcra[i].x, noEcra[i].y);
      contexto.stroke();
    });
    contexto.setLineDash([]);
  }

  // Etiquetas com os km de cada troço, só quando o troço tem espaço
  if (modo === 'dist') {
    contexto.font = '700 13px "Alegreya Sans",system-ui,sans-serif';
    contexto.textAlign = 'center'; contexto.textBaseline = 'middle';
    for (let i = 1; i < noEcra.length; i++) {
      const a = noEcra[i - 1], b = noEcra[i];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 60) continue;
      const texto = formatoInteiro.format(kmTroco(pontos[i - 1], pontos[i])) + ' km';
      const largura = contexto.measureText(texto).width + 12;
      const meioX = (a.x + b.x) / 2, meioY = (a.y + b.y) / 2;
      contexto.fillStyle = 'rgba(247,238,217,.95)'; contexto.strokeStyle = '#8a6232'; contexto.lineWidth = 1;
      retanguloRedondo(meioX - largura / 2, meioY - 11, largura, 22, 11); contexto.fill(); contexto.stroke();
      contexto.fillStyle = '#2b2117'; contexto.fillText(texto, meioX, meioY + 1);
    }
  }
  noEcra.forEach((p, i) => {
    contexto.beginPath(); contexto.arc(p.x, p.y, i === 0 ? 8 : 6, 0, Math.PI * 2);
    contexto.fillStyle = i === 0 ? '#2b2117' : '#c8261e'; contexto.fill();
    contexto.strokeStyle = '#fff'; contexto.lineWidth = 2.5; contexto.stroke();
  });
}

function retanguloRedondo(x, y, largura, altura, raio) {
  contexto.beginPath(); contexto.moveTo(x + raio, y);
  contexto.arcTo(x + largura, y, x + largura, y + altura, raio);
  contexto.arcTo(x + largura, y + altura, x, y + altura, raio);
  contexto.arcTo(x, y + altura, x, y, raio);
  contexto.arcTo(x, y, x + largura, y, raio);
  contexto.closePath();
}

// Medições

const kmTroco = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) * CONFIG.kmPorPixel * fator;

// Caixa onde está o ponto, ou null se estiver no continente
function caixaDoPonto(p) {
  const fx = imagem.naturalWidth / CONFIG.larguraOriginal, fy = imagem.naturalHeight / CONFIG.alturaOriginal;
  return CONFIG.caixas.find(c => p.x >= c.x * fx && p.x <= (c.x + c.largura) * fx
    && p.y >= c.y * fy && p.y <= (c.y + c.altura) * fy) || null;
}
const nomeZona = c => c ? 'a caixa de ' + c.nome : 'o continente';

// Recusa o ponto se ficar noutra zona (ignora o índice indicado).
// Basta comparar com um ponto, porque estão todos na mesma zona.
function zonaPermitida(p, ignorar) {
  const outro = pontos.find((_, i) => i !== ignorar);
  if (!outro) return true;
  const zonaNova = caixaDoPonto(p), zonaAtual = caixaDoPonto(outro);
  if (zonaNova === zonaAtual) return true;
  avisoZona = 'Não dá para medir entre ' + nomeZona(zonaAtual) + ' e ' + nomeZona(zonaNova)
    + '. Os pontos têm de ficar todos na mesma zona.';
  return false;
}

// Máscara do mar pela cor dos píxeis. A imagem é reduzida para não passar
// o limite de tamanho dos canvas nos telemóveis.
function criarMascaraMar() {
  const reducao = Math.min(1, Math.sqrt(8e6 / (imagem.naturalWidth * imagem.naturalHeight)));
  const largura = Math.round(imagem.naturalWidth * reducao), altura = Math.round(imagem.naturalHeight * reducao);
  const auxiliar = document.createElement('canvas');
  auxiliar.width = largura; auxiliar.height = altura;
  const ctx = auxiliar.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imagem, 0, 0, largura, altura);
  const dados = ctx.getImageData(0, 0, largura, altura).data, m = CONFIG.mar;
  const mar = new Uint8Array(largura * altura);
  for (let i = 0; i < mar.length; i++) {
    const r = dados[i * 4], g = dados[i * 4 + 1], b = dados[i * 4 + 2];
    mar[i] = r <= m.vermelhoMax && g >= m.verde[0] && g <= m.verde[1]
      && b >= m.azul[0] && b <= m.azul[1] && b - r >= m.azulMenosVermelho ? 1 : 0;
  }
  return { mar, largura, altura, reducao };
}

// Troços com mais terra seguida do que CONFIG.kmTerraTolerado
function trocosEmTerra() {
  if (mascaraMar === null) {
    try { mascaraMar = criarMascaraMar(); } catch { mascaraMar = false; }
  }
  if (!mascaraMar) return [];
  const { mar, largura, altura, reducao } = mascaraMar;
  const kmPorPasso = CONFIG.kmPorPixel * fator / reducao, resultado = [];
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1], b = pontos[i];
    const passos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * reducao);
    let seguidos = 0;
    for (let s = 0; s <= passos; s++) {
      const f = passos ? s / passos : 0;
      const x = Math.round((a.x + (b.x - a.x) * f) * reducao), y = Math.round((a.y + (b.y - a.y) * f) * reducao);
      const eMar = x >= 0 && y >= 0 && x < largura && y < altura && mar[y * largura + x];
      seguidos = eMar ? 0 : seguidos + 1;
      if (seguidos * kmPorPasso > CONFIG.kmTerraTolerado) { resultado.push(i); break; }
    }
  }
  return resultado;
}

function formatarDias(dias) {
  dias = Math.ceil(dias);
  return formatoInteiro.format(dias) + (dias === 1 ? ' dia' : ' dias');
}

function formatarTempo(h) {
  const minutos = Math.max(1, Math.round(h * 60));
  if (minutos < 60) return minutos + ' min';
  if (minutos < 24 * 60) {
    const H = Math.floor(minutos / 60), M = minutos % 60;
    return H + ' h' + (M ? ' ' + String(M).padStart(2, '0') + ' min' : '');
  }
  const horas = Math.round(h), D = Math.floor(horas / 24), H = horas % 24;
  return D + (D === 1 ? ' dia' : ' dias') + (H ? ' e ' + H + ' h' : '');
}

function totais() {
  let comprimento = 0;
  for (let i = 1; i < pontos.length; i++) comprimento += kmTroco(pontos[i - 1], pontos[i]);
  let area = 0, perimetro = comprimento;
  if (pontos.length > 2) {
    // Área do polígono pela fórmula de Gauss
    let soma = 0;
    for (let i = 0; i < pontos.length; i++) {
      const a = pontos[i], b = pontos[(i + 1) % pontos.length];
      soma += a.x * b.y - b.x * a.y;
    }
    area = Math.abs(soma) / 2 * CONFIG.km2PorPixel * fator * fator;
    perimetro = comprimento + kmTroco(pontos[pontos.length - 1], pontos[0]);
  }
  return { comprimento, area, perimetro };
}

function atualizar() {
  const t = totais();
  const grande = $('valorGrande'), sub = $('valorSub');
  if (modo === 'dist') {
    grande.innerHTML = formatoInteiro.format(t.comprimento) + '<small>km</small>';
    sub.textContent = pontos.length === 0 ? 'Clica no mapa para marcar o primeiro ponto.'
      : pontos.length === 1 ? 'Agora clica no segundo ponto.'
      : pontos.length + ' pontos. Continua a clicar para fazer um percurso.';
  } else {
    grande.innerHTML = formatoInteiro.format(t.area) + '<small>km²</small>';
    sub.textContent = pontos.length < 3 ? 'Marca pelo menos 3 pontos à volta da zona.'
      : 'Perímetro: ' + formatoInteiro.format(t.perimetro) + ' km, ' + pontos.length + ' vértices.';
  }
  $('aviso').textContent = avisoZona;
  $('aviso').classList.toggle('escondido', !avisoZona);

  const comTrocos = modo === 'dist' && pontos.length > 2;
  const trocos = $('trocos');
  trocos.innerHTML = '';
  if (comTrocos) {
    for (let i = 1; i < pontos.length; i++) {
      const item = document.createElement('li');
      item.innerHTML = '<span>Ponto ' + i + ' → ' + (i + 1) + '</span><span>'
        + formatoInteiro.format(kmTroco(pontos[i - 1], pontos[i])) + ' km</span>';
      trocos.appendChild(item);
    }
  }
  $('caixaTrocos').classList.toggle('escondido', !comTrocos);

  const comViagem = modo === 'dist' && pontos.length > 1;
  const grupo = CONFIG.velocidades[grupoViagem];
  const viagem = $('viagem');
  viagem.innerHTML = '';
  if (comViagem) {
    grupo.meios.forEach(v => {
      const valores = v.kmh || v.kmDia;
      const velocidade = valores.map(x => formatoInteiro.format(x)).join(' / ') + (v.kmh ? ' km/h' : ' km por dia');
      const tempos = valores.map(x => v.kmh ? formatarTempo(t.comprimento / x) : formatarDias(t.comprimento / x));
      viagem.insertAdjacentHTML('beforeend', '<tr><td>' + v.nome + '<small>' + velocidade + '</small></td><td>'
        + tempos[0] + '</td><td>' + (tempos[1] || '–') + '</td></tr>');
    });
  }
  $('caixaViagem').classList.toggle('escondido', !comViagem);
  emTerra = comViagem && grupo.porMar ? trocosEmTerra() : [];
  $('avisoMar').classList.toggle('escondido', !emTerra.length);
  desenhar();
}

// Interação com o rato e o toque

const ponteiros = new Map();
let arrasto = null, pinca = null;

function pontoTocado(ex, ey) {
  for (let i = pontos.length - 1; i >= 0; i--) {
    const p = paraEcra(pontos[i]);
    if (Math.hypot(p.x - ex, p.y - ey) < 12) return i;
  }
  return -1;
}
function posicao(e) {
  const ret = tela.getBoundingClientRect();
  return { x: e.clientX - ret.left, y: e.clientY - ret.top };
}

tela.addEventListener('pointerdown', e => {
  tela.setPointerCapture(e.pointerId);
  const p = posicao(e);
  ponteiros.set(e.pointerId, p);
  if (ponteiros.size === 2) {
    const [a, b] = [...ponteiros.values()];
    const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinca = { distancia0: Math.hypot(a.x - b.x, a.y - b.y), escala0: vista.escala, ancora: paraImagem(meio.x, meio.y) };
    arrasto = null;
    return;
  }
  arrasto = { ex: p.x, ey: p.y, vistaX: vista.x, vistaY: vista.y, moveu: false, ponto: pontoTocado(p.x, p.y), id: e.pointerId };
});

tela.addEventListener('pointermove', e => {
  const p = posicao(e);
  const naImagem = paraImagem(p.x, p.y);
  if (imagem.naturalWidth && naImagem.x >= 0 && naImagem.y >= 0 && naImagem.x <= imagem.naturalWidth && naImagem.y <= imagem.naturalHeight)
    $('coordenadas').textContent = 'x ' + Math.round(naImagem.x) + ', y ' + Math.round(naImagem.y);
  if (!ponteiros.has(e.pointerId)) return;
  ponteiros.set(e.pointerId, p);

  if (pinca && ponteiros.size >= 2) {
    const [a, b] = [...ponteiros.values()];
    const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    vista.escala = Math.max(escalaMinima, Math.min(CONFIG.zoomMaximo, pinca.escala0 * Math.hypot(a.x - b.x, a.y - b.y) / pinca.distancia0));
    vista.x = meio.x - pinca.ancora.x * vista.escala;
    vista.y = meio.y - pinca.ancora.y * vista.escala;
    desenhar();
    return;
  }

  if (!arrasto || arrasto.id !== e.pointerId) return;
  const dx = p.x - arrasto.ex, dy = p.y - arrasto.ey;
  if (!arrasto.moveu && Math.hypot(dx, dy) > 4) arrasto.moveu = true;
  if (!arrasto.moveu) return;
  if (arrasto.ponto >= 0) {
    // O ponto só acompanha o cursor enquanto ficar na mesma zona dos outros
    const novo = paraImagem(p.x, p.y);
    if (zonaPermitida(novo, arrasto.ponto)) { pontos[arrasto.ponto] = novo; avisoZona = ''; }
    atualizar();
  } else {
    tela.classList.add('a-mover');
    vista.x = arrasto.vistaX + dx; vista.y = arrasto.vistaY + dy;
    desenhar();
  }
});

function terminarPonteiro(e) {
  if (arrasto && arrasto.id === e.pointerId && !arrasto.moveu && !pinca && arrasto.ponto < 0 && e.type === 'pointerup') {
    const p = posicao(e), novo = paraImagem(p.x, p.y);
    if (zonaPermitida(novo, -1)) { pontos.push(novo); avisoZona = ''; }
    atualizar();
  }
  ponteiros.delete(e.pointerId);
  if (ponteiros.size < 2) pinca = null;
  if (arrasto && arrasto.id === e.pointerId) arrasto = null;
  tela.classList.remove('a-mover');
}
tela.addEventListener('pointerup', terminarPonteiro);
tela.addEventListener('pointercancel', terminarPonteiro);
tela.addEventListener('wheel', e => {
  e.preventDefault();
  const p = posicao(e);
  zoomEm(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

// Botões e atalhos

function zoomAoCentro(f) {
  const ret = tela.getBoundingClientRect();
  zoomEm(ret.width / 2, ret.height / 2, f);
}
$('zoomMais').onclick = () => zoomAoCentro(1.5);
$('zoomMenos').onclick = () => zoomAoCentro(1 / 1.5);
$('zoomTudo').onclick = verTudo;

function desfazer() { pontos.pop(); avisoZona = ''; atualizar(); }
function limpar() { pontos = []; avisoZona = ''; atualizar(); }
$('desfazer').onclick = desfazer;
$('limpar').onclick = limpar;

function definirModo(m) {
  modo = m;
  $('modoDist').setAttribute('aria-pressed', m === 'dist');
  $('modoArea').setAttribute('aria-pressed', m === 'area');
  atualizar();
}
$('modoDist').onclick = () => definirModo('dist');
$('modoArea').onclick = () => definirModo('area');

// Botões dos grupos do tempo de viagem, a partir do config.js
CONFIG.velocidades.forEach((g, i) => {
  const botao = document.createElement('button');
  botao.textContent = g.grupo;
  botao.setAttribute('aria-pressed', i === grupoViagem);
  botao.onclick = () => {
    grupoViagem = i;
    [...$('gruposViagem').children].forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    atualizar();
  };
  $('gruposViagem').appendChild(botao);
});

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); desfazer(); }
  if (e.key === 'Escape') limpar();
});

// Texto pronto a colar no Discord
$('copiar').onclick = async () => {
  const t = totais();
  let texto;
  if (modo === 'dist') texto = pontos.length < 2 ? ''
    : 'Distância: ' + formatoInteiro.format(t.comprimento) + ' km' + (pontos.length > 2 ? ' (' + (pontos.length - 1) + ' troços)' : '');
  else texto = pontos.length < 3 ? ''
    : 'Área: ' + formatoInteiro.format(t.area) + ' km² (perímetro ' + formatoInteiro.format(t.perimetro) + ' km)';
  if (!texto) return;
  const botao = $('copiar');
  try { await navigator.clipboard.writeText(texto); botao.textContent = 'Copiado'; }
  catch { botao.textContent = 'Não deu'; }
  setTimeout(() => botao.textContent = 'Copiar', 1400);
};

$('recolher').onclick = () => {
  const recolhido = $('painel').classList.toggle('recolhido');
  $('recolher').textContent = recolhido ? 'Mostrar detalhes' : 'Esconder detalhes';
  $('recolher').setAttribute('aria-expanded', !recolhido);
};

// Conversor: km da vida real para km do mapa

const lerNumero = v => parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
$('kmVidaReal').addEventListener('input', e => {
  const v = lerNumero(e.target.value);
  $('kmMapa').value = isNaN(v) ? '' : formatoInteiro.format(v * CONFIG.fatorVidaReal);
});
$('kmMapa').addEventListener('input', e => {
  const v = lerNumero(e.target.value);
  $('kmVidaReal').value = isNaN(v) ? '' : formatoDecimal.format(v / CONFIG.fatorVidaReal);
});

// Carregar o mapa

function escreverEscala() {
  $('notaEscala').textContent = '1 pixel = ' + formatoDecimal.format(CONFIG.kmPorPixel * fator) + 'km';
}

$('ficheiro').addEventListener('change', e => {
  const ficheiro = e.target.files[0];
  if (!ficheiro) return;
  const leitor = new FileReader();
  leitor.onload = () => { imagem.src = leitor.result; };
  leitor.readAsDataURL(ficheiro);
});
imagem.onload = () => {
  fator = CONFIG.larguraOriginal / imagem.naturalWidth;
  mascaraMar = null;
  escreverEscala();
  $('estado').classList.add('escondido');
  pontos = []; avisoZona = '';
  verTudo();
  atualizar();
};
imagem.onerror = () => {
  $('estado').textContent = 'Não foi possível abrir o mapa. Usa "Carregar outra edição do mapa" no painel.';
  $('estado').classList.remove('escondido');
};

// Textos do painel que dependem do config.js
$('kmVidaReal').placeholder = '300';
$('kmMapa').placeholder = formatoInteiro.format(300 * CONFIG.fatorVidaReal);
escreverEscala();

window.addEventListener('resize', redimensionar);
redimensionar();
imagem.src = CONFIG.ficheiroMapa;
