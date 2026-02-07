// --- DATOS (TEORÍA AMPLIADA) ---
const CODECS = {
    lpc: {
        name: "LPC (Predictivo Lineal)",
        desc: `El <strong>LPC (Linear Predictive Coding)</strong> modela el tracto vocal humano como un filtro digital lineal. El codificador analiza la voz y calcula los coeficientes de reflexión que describen este filtro. 
        <br><br>
        <strong>Funcionamiento:</strong> A diferencia de enviar la onda de sonido real (como en PCM), el sistema solo transmite estos coeficientes matemáticos (aproximadamente 10-12 números por trama). En el receptor, se genera una señal de excitación básica (un tren de impulsos para sonidos sonoros o ruido blanco para sordos) y se pasa a través del filtro sintético para recrear la voz.
        <br><br>
        <strong>Por qué suena robótico:</strong> Como no se transmite la información precisa de la excitación (el tono y la energía), el resultado es una voz muy comprensible pero sintética, como la de un robot. Es ideal para comunicaciones donde el ancho de banda es crítico y la calidad natural es secundaria.`,
        tag: "Uso: Militar / Espacio / Seguridad",
        color: "#0d9488",
        bitrate: "2.4", mos: "3.0", cpu: "Baja", delay: "35",
        noise: 0.9, smooth: 0.1
    },
    relp: {
        name: "RELP (Residuo Excitado)",
        desc: `El <strong>RELP (Residual Excited Linear Prediction)</strong> es una evolución directa del LPC diseñada para mitigar el efecto "robot". Mientras que LPC envía solo los filtros, RELP calcula la diferencia (el "residuo" o error) entre la voz real y la predicción del modelo LPC.
        <br><br>
        <strong>Funcionamiento:</strong> Este residuo contiene información crucial sobre el tono (pitch) y la entonación que LPC pierde por completo. Al transmitir este residuo (a menudo en banda base) junto con los coeficientes del filtro, el receptor puede reconstruir una voz con una entonación y naturalidad mucho mayor que LPC, aunque requiere un poco más de ancho de banda.
        <br><br>
        <strong>Ventaja clave:</strong> Ofrece la calidad tonal que le falta a LPC, pero sin el costo de ancho de banda de PCM. Se usó mucho en comunicaciones satelitales y sistemas de videoconferencia tempranos.`,
        tag: "Uso: Satélites / Telefonía Mejorada",
        color: "#d97706",
        bitrate: "9.6", mos: "3.5", cpu: "Media", delay: "25",
        noise: 0.4, smooth: 0.5
    },
    celp: {
        name: "CELP (Codificación por Libros)",
        desc: `El <strong>CELP (Code-Excited Linear Prediction)</strong> es el estándar moderno para alta fidelidad. Utiliza la técnica avanzada de "Análisis por Síntesis" y una estructura llamada "Libro de Códigos" (Codebook).
        <br><br>
        <strong>Funcionamiento detallado:</strong> El codificador posee una base de datos (el libro) que contiene cientos (o miles) de formas de onda pregrabadas. El algoritmo busca en este libro cuál de las formas de onda se parece más a tu voz original. En lugar de enviar la onda entera, solo envía el índice (número) de esa forma de onda encontrada.
        <br><br>
        <strong>Por qué es tan bueno:</strong> Al buscar la mejor aproximación, logra una calidad de voz casi indistinguible de la original (PCM) con tasas de bits muy bajas. Es la base de tecnologías como VoIP (Skype, WhatsApp), Voice over LTE (4G) y 5G. Su única desventaja es la alta complejidad computacional requerida para la búsqueda en el libro de códigos en tiempo real.`,
        tag: "Uso: VoIP / Celulares 4G-5G / Streaming",
        color: "#059669",
        bitrate: "12.2", mos: "4.2", cpu: "Alta", delay: "20",
        noise: 0.05, smooth: 1.0
    }
};

// --- ESCENARIOS DEL JUEGO (AMPLIADOS) ---
const SCENARIOS = [
    { text: "Necesitas hacer una llamada militar encriptada con un canal extremadamente limitado de 2.4 kbps.", answer: "lpc", feedback: "¡Correcto! LPC es el rey del bajo ancho de banda." },
    { text: "Estás en una videoconferencia importante y necesitas que tu voz se escuche natural, casi como si estuvieras ahí.", answer: "celp", feedback: "¡Exacto! CELP ofrece la mejor calidad para VoIP y videoconferencias." },
    { text: "Tienes un enlace satelital antiguo con capacidad media. Quieres algo mejor que un robot, pero no necesitas calidad HD.", answer: "relp", feedback: "¡Bien! RELP es el punto medio perfecto para satélites de la era antigua." },
    { text: "Tu batería se está agotando rápido y tu procesador es lento. Necesitas el códec más ligero posible.", answer: "lpc", feedback: "Correcto. LPC requiere muy poca potencia de procesamiento (CPU)." },
    {   text: "Estás diseñando la red 5G y necesitas la mejor calidad de voz posible para el usuario.", answer: "celp", feedback: "¡Asombroso! CELP es el estándar moderno de alta fidelidad." },
    { text: "Tu enlace tiene un retraso (latencia) alto y necesitas un códec simple que funcione igual.", answer: "lpc", feedback: "Correcto. LPC tolera bien el delay y funciona con pocas interrupciones." },
    { text: "Estás comunicándote con un robot en Marte y el ancho de banda es crítico.", answer: "lpc", feedback: "¡Correcto! Para comunicación espacial, la eficiencia de LPC es vital." },
    { text: "Estás jugando un videojuego competitivo y la latencia debe ser baja para no perder.", answer: "celp", feedback: "¡Exacto! CELP se optimiza para baja latencia en tiempo real." },
    {   text: "Tienes un sistema de emergencia que necesita ser robusto, donde la calidad vocal es secundaria a la claridad del mensaje.", answer: "lpc", feedback: "Correcto. LPC es el preferido en sistemas de emergencia por su claridad." },
    { text: "Necesitas transmitir una señal robusta bajo el agua (acústica) donde el ancho de banda es muy limitado.", answer: "lpc", feedback: "¡Bien! La compresión extrema de LPC es ideal para este entorno hostil." },
    { text: "Quieres mantener la calidad de audio en una llamada VoIP, pero no quieres saturar el ancho de banda.", answer: "celp", feedback: "Perfecto. CELP equilibra calidad y eficiencia de red." },
    { text: "Estás mejorando un sistema de radio analógico viejo. Quieres mejorar el tono sin romper el presupuesto.", answer: "relp", feedback: "¡Excelente! RELP ofrece una mejora de tono accesible comparado con LPC." },
    { text: "Estás enviando un mensaje de voz confidencial por un canal público e inseguro.", answer: "lpc", feedback: "¡Bien! La baja tasa de bits de LPC facilita la encriptación." }
];

// --- ESTADO ---
const canvas = document.getElementById('oscCanvas');
const ctx = canvas.getContext('2d');
let state = { 
    codec: 'lpc', 
    playing: false, 
    time: 0, 
    animId: null,
    score: 0,
    currentScenarioIndex: 0,
    isGameProcessing: false 
};

// --- INICIO SEGURO ---
document.addEventListener('DOMContentLoaded', () => { 
    resizeCanvas(); 
    selectCodec('lpc'); 
    loadScenario(); 
});
window.onresize = resizeCanvas;

// --- LÓGICA UI ---
function selectCodec(key) {
    state.codec = key;
    const data = CODECS[key];

    // Efecto Burbuja
    const btn = document.getElementById('btn-' + key);
    btn.classList.remove('pop-effect');
    void btn.offsetWidth; 
    btn.classList.add('pop-effect');

    document.querySelectorAll('.codec-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Actualizar Variables CSS
    document.documentElement.style.setProperty('--active-color', data.color);
    
    // Actualizar Métricas
    document.getElementById('m-bitrate').textContent = data.bitrate;
    document.getElementById('m-mos').textContent = data.mos;
    document.getElementById('m-delay').textContent = data.delay;
    document.getElementById('m-cpu').textContent = data.cpu;
    
    // Colorear bordes
    document.querySelectorAll('.metric-mini').forEach(m => m.style.borderBottomColor = data.color);

    // Status
    document.getElementById('statusText').textContent = key.toUpperCase() + "_READY";
    document.getElementById('statusText').style.color = data.color;

    // Modal Teoría
    document.getElementById('theoryTitle').textContent = data.name;
    document.getElementById('theoryText').innerHTML = data.desc;
    document.getElementById('theoryTag').textContent = data.tag;
    document.getElementById('theoryTag').style.background = data.color;

    if(!state.playing) drawFrame();
}

function toggleSim() {
    state.playing = !state.playing;
    const btn = document.getElementById('mainToggleBtn');

    if(state.playing) {
        btn.className = "main-action-btn btn-stop";
        btn.innerHTML = "⏹ DETENER";
        animate();
    } else {
        btn.className = "main-action-btn btn-start";
        btn.innerHTML = "▶ INICIAR";
        cancelAnimationFrame(state.animId);
        drawFrame();
    }
}

// --- MODALES ---
function openModal(id) {
    closeAllModals();
    document.getElementById(id).classList.add('active');
}
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// --- JUEGO ---
function startGame() {
    openModal('modal-game');
}

function loadScenario() {
    const sc = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    document.getElementById('gameScenario').textContent = sc.text;
    document.getElementById('gameScenario').dataset.answer = sc.answer;
    document.getElementById('gameScenario').dataset.feedback = sc.feedback;
    
    const fbEl = document.getElementById('gameFeedback');
    fbEl.className = 'game-feedback'; 
    fbEl.textContent = "";
    
    // Limpiar clases de error de las tarjetas
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('wrong'));
    
    state.isGameProcessing = false;
}

function fireConfetti() {
    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];
    const container = document.getElementById('modal-game');
    
    for(let i=0; i<50; i++) {
        const conf = document.createElement('div');
        conf.classList.add('confetti');
        conf.style.left = Math.random() * 100 + '%';
        conf.style.top = '-20px';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
        
        container.appendChild(conf);
        
        setTimeout(() => {
            conf.remove();
        }, 3000);
    }
}

function checkAnswer(choice) {
    if (state.isGameProcessing) return; 
    state.isGameProcessing = true;

    const correct = document.getElementById('gameScenario').dataset.answer;
    const feedback = document.getElementById('gameScenario').dataset.feedback;
    const fbEl = document.getElementById('gameFeedback');
    const card = document.getElementById('card-' + choice);

    if (choice === correct) {
        // CORRECTO
        state.score += 10;
        document.getElementById('scoreVal').textContent = state.score;
        
        // Confeti
        fireConfetti();

        fbEl.textContent = "¡Correcto! " + feedback;
        fbEl.className = "game-feedback success";
        
        // Cargar siguiente
        setTimeout(() => {
            loadScenario();
        }, 2000);

    } else {
        // INCORRECTO
        // Poner tarjeta roja
        card.classList.add('wrong');
        
        // Mensaje solicitado por el usuario
        fbEl.textContent = "Ups incorrecto, vuelve a intentarlo ¡No te desanimes!";
        fbEl.className = "game-feedback error";

        // Permitir reintentar
        setTimeout(() => {
            state.isGameProcessing = false;
            card.classList.remove('wrong');
        }, 1500);
    }
}

// --- MOTOR GRÁFICO ---
function resizeCanvas() {
    if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        if(!state.playing) drawFrame();
    }
}

function animate() {
    if(!state.playing) return;
    state.time += 0.2; 
    drawFrame();
    state.animId = requestAnimationFrame(animate);
}

function drawFrame() {
    // Seguro: Si el canvas no tiene tamaño, intentar reajustar
    if (!canvas.width || canvas.height === 0) {
        resizeCanvas();
        if (!canvas.width) return; 
    }

    const w = canvas.width;
    const h = canvas.height;
    const data = CODECS[state.codec];

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<w; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for(let y=0; y<h; y+=50) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.stroke();
    
    // Eje
    ctx.strokeStyle = "#312e81";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

    // Onda
    ctx.lineWidth = 4;
    ctx.strokeStyle = data.color;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const amp = h/3.5;
    const freq = 0.04;

    for(let x=0; x<w; x++) {
        let y = Math.sin((x + state.time * 30) * freq) * amp;
        if(data.smooth < 0.9) {
            const steps = 25 * (1.1 - data.smooth);
            y = Math.round(y / steps) * steps;
        }
        if(data.noise > 0.1) y += (Math.random() - 0.5) * amp * data.noise;
        ctx.lineTo(x, h/2 + y);
    }
    ctx.stroke();
}