 // --- CONFIGURACIÓN Y DATOS ---
const CODECS = {
    'lpc': { 
        color: '#ef4444', bitrate: '2.4', mos: '2.0', delay: '35', 
        title: 'LPC (Linear Predictive Coding)',
        desc: `<p><strong>¿Qué es?</strong><br>LPC es una técnica de codificación paramétrica que modela el tracto vocal humano como un filtro digital.</p><p><strong>¿Cómo funciona?</strong><br>Analiza la voz para encontrar los coeficientes de predicción lineal (polos) y la frecuencia fundamental (pitch). No transmite la onda de sonido, sino los parámetros para reconstruirla sintéticamente.</p><p><strong>Uso:</strong><br>Fue el estándar en sistemas de comunicación segura militar y satelital (FS-1015) debido a su baja tasa de bits.</p>`
    },
    'relp': { 
        color: '#f59e0b', bitrate: '9.6', mos: '3.5', delay: '25', 
        title: 'RELP (Residual Excited Linear Prediction)',
        desc: `<p><strong>¿Qué es?</strong><br>Una mejora sobre LPC. En lugar de descartar el error de predicción (residuo), RELP transmite una versión comprimida de este residuo en frecuencias bajas.</p><p><strong>¿Cómo funciona?</strong><br>Envía los coeficientes LPC más una señal de residuo de baja frecuencia. En el receptor, el residuo se extiende a altas frecuencias para excitar el filtro.</p><p><strong>Uso:</strong><br>Se utilizó en radio digital y sistemas satelitales donde LPC era demasiado malo pero el ancho de banda aún era limitado.</p>`
    },
    'celp': { 
        color: '#3b82f6', bitrate: '12.2', mos: '4.2', delay: '20', 
        title: 'CELP (Code-Excited Linear Prediction)',
        desc: `<p><strong>¿Qué es?</strong><br>El estándar actual para comunicaciones móviles (GSM, 3G) y VoIP. Combina modelado con análisis por síntesis.</p><p><strong>¿Cómo funciona?</strong><br>Utiliza "libros de códigos" (Codebooks) estocásticos para modelar la señal de excitación (el residuo). El codificador prueba combinaciones de códigos para encontrar la que suena más parecida a la voz original.</p><p><strong>Uso:</strong><br>VoIP (Skype, WhatsApp), Telefonía Móvil 3G/4G/5G. Ofrece una calidad casi natural (teléfono de alta calidad) a tasas de bits bajas.</p>`
    }
};

const QUESTIONS = [
    { q: "¿Qué técnica utiliza 'libros de códigos' (Codebooks) para modelar la voz?", options: ["LPC", "RELP", "CELP", "PCM"], correct: 2 },
    { q: "¿Cuál de los siguientes codecs produce un sonido robótico y sintético?", options: ["RELP", "LPC", "CELP", "MP3"], correct: 1 },
    { q: "¿Qué estándar es el más utilizado actualmente en telefonía móvil (VoIP, 4G)?", options: ["LPC", "RELP", "CELP", "ADPCM"], correct: 2 },
    { q: "¿Qué codec transmite una versión de baja frecuencia del residuo para mejorar la calidad?", options: ["LPC", "RELP", "CELP", "G.711"], correct: 1 },
    { q: "¿Qué codec tiene la menor tasa de bits (solo 2.4 kbps) pero la peor calidad?", options: ["CELP", "RELP", "LPC", "Opus"], correct: 2 }
];

let currentCodec = 'lpc';
let isRunning = false;
let gameScore = 0;
let currentQuestionIndex = 0;

// --- WEB AUDIO API & RECORDER VARIABLES ---
let audioCtx;
let micSource;
let analyser;
let lpcFilter, relpFilter, celpFilter; 

// Variables de Grabación
let mediaRecorder;
let audioChunks = [];
let recordedAudioBuffer = null;
let recordedSource = null; 
let isRecording = false;
let isResetting = false; // Flag para evitar que el onstop procese audio si estamos reseteando
let recordStartTime;
let recordInterval;

async function initAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micSource = audioCtx.createMediaStreamSource(stream);

        // Configurar Analizador
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        // Configurar Filtros
        lpcFilter = audioCtx.createBiquadFilter(); lpcFilter.type = 'lowpass'; lpcFilter.frequency.value = 800; lpcFilter.Q.value = 10; 
        relpFilter = audioCtx.createBiquadFilter(); relpFilter.type = 'lowpass'; relpFilter.frequency.value = 1200;
        celpFilter = audioCtx.createBiquadFilter(); celpFilter.type = 'bandpass'; celpFilter.frequency.value = 2000; celpFilter.Q.value = 0.7;

        // Configurar Recorder
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            // Si estamos reseteando, no procesar audio
            if (!isResetting) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                recordedAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                
                // UI: Habilitar Play
                document.getElementById('btnPlay').disabled = false;
                document.getElementById('recordStatus').innerText = `Audio listo. Selecciona un códec y presiona REPRODUCIR.`;
                playTone(600, 'sine', 0.2); 
            } else {
                // Si se reseteó, solo actualizamos estado
                document.getElementById('recordStatus').innerText = "Audio eliminado. Puedes grabar de nuevo.";
            }
        };

        // Ruta inicial (Modo Visual/Vivo)
        micSource.connect(lpcFilter);
        lpcFilter.connect(analyser);

        updateUI('lpc');
        isRunning = true;
        drawVisualizer();

    } catch (err) {
        alert("Error: Permiso de micrófono denegado.");
        console.error(err);
    }
}

// --- LÓGICA DE CONTROL ---
function selectCodec(codec) {
    if (!audioCtx) return;
    currentCodec = codec;
    
    // 1. Desconectar todo
    micSource.disconnect();
    if(lpcFilter) lpcFilter.disconnect();
    if(relpFilter) relpFilter.disconnect();
    if(celpFilter) celpFilter.disconnect();
    if(recordedSource) {
        try { recordedSource.disconnect(); } catch(e){}
        recordedSource.stop();
        recordedSource = null;
    }

    // 2. Definir nodo activo
    let activeNode;
    if (codec === 'lpc') activeNode = lpcFilter;
    else if (codec === 'relp') activeNode = relpFilter;
    else if (codec === 'celp') activeNode = celpFilter;

    // 3. Re-conectar
    micSource.connect(activeNode);
    activeNode.connect(analyser);

    // IMPORTANTE: No conectamos analyser a destination en modo vivo para evitar feedback.
    // Solo en modo playback (grabación) se conecta a destination.

    updateUI(codec);
    playTone(400, 'sine', 0.1);
}

function toggleSim() {
    const btn = document.getElementById('mainToggleBtn');
    const status = document.getElementById('statusText');

    if (!isRunning) {
        initAudio().then(() => {
            btn.innerText = "⏹ DETENER";
            btn.classList.remove('btn-start');
            btn.classList.add('btn-stop');
            status.innerText = currentCodec.toUpperCase() + "_RUNNING";
        });
    } else {
        if(audioCtx) audioCtx.close();
        isRunning = false;
        btn.innerText = "▶ INICIAR LABORATORIO";
        btn.classList.remove('btn-stop');
        btn.classList.add('btn-start');
        status.innerText = "STOPPED";
    }
}

// --- LÓGICA DE GRABACIÓN, RESET Y REPRODUCCIÓN ---

function toggleRecording() {
    if (!mediaRecorder) { alert("Paso 1: Debes INICIAR LABORATORIO primero."); return; }
    
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    // Preparar
    audioChunks = [];
    isResetting = false;
    
    // Iniciar Grabación
    mediaRecorder.start();
    isRecording = true;
    updateRecorderUI('recording');
    
    // Temporizador
    recordStartTime = Date.now();
    recordInterval = setInterval(() => {
        const elapsed = (Date.now() - recordStartTime) / 1000;
        document.getElementById('timerDisplay').innerText = elapsed.toFixed(1) + "s";
        
        // Parada automática estricta a 5.0s
        if (elapsed >= 5.0) stopRecording(); 
    }, 100);
}

function stopRecording() {
    if (!isRecording) return;
    mediaRecorder.stop();
    isRecording = false;
    clearInterval(recordInterval);
    updateRecorderUI('processing');
}

function resetRecording() {
    if (!mediaRecorder) return;

    // Si estamos grabando, primero paramos
    if (isRecording) {
        stopRecording();
    }

    // Marcar flag para evitar que el onstop procese audio parcial
    isResetting = true;
    
    // Limpiar todo
    audioChunks = [];
    recordedAudioBuffer = null;
    
    // Si estaba reproduciendo, parar
    if (recordedSource) {
        try { recordedSource.stop(); } catch(e){}
        recordedSource = null;
    }
    
    // Resetear UI
    document.getElementById('timerDisplay').innerText = "0.0s";
    updateRecorderUI('idle');
}

function playRecordedAudio() {
    if (!recordedAudioBuffer) return;
    
    // 1. Parar cualquier reproducción anterior
    if (recordedSource) {
        try { recordedSource.stop(); } catch(e){}
    }
    if (micSource) {
        micSource.disconnect();
    }

    // 2. Cambiar estado del botón REPRODUCIR (Opaco y Deshabilitado)
    const btnPlay = document.getElementById('btnPlay');
    btnPlay.disabled = true; // Deshabilitar inmediatamente
    btnPlay.innerHTML = "🔊 REPRODUCIENDO..."; // Texto indicador
    btnPlay.classList.remove('rec-play'); // Quitar color verde

    // 3. Crear fuente desde el buffer
    recordedSource = audioCtx.createBufferSource();
    recordedSource.buffer = recordedAudioBuffer;
    
    // 4. Enrutamiento: Source -> [Filtro] -> Analyser -> Destination (Escuchar)
    let activeNode;
    if (currentCodec === 'lpc') activeNode = lpcFilter;
    else if (currentCodec === 'relp') activeNode = relpFilter;
    else if (currentCodec === 'celp') activeNode = celpFilter;

    recordedSource.connect(activeNode);
    activeNode.connect(analyser);
    
    // Conectar a DESTINO (altavoces) para que el usuario escuche
    analyser.connect(audioCtx.destination);

    recordedSource.onended = () => {
        // Al terminar: Reconectar micrófono y desconectar destination (evitar eco al terminar)
        analyser.disconnect(audioCtx.destination);
        micSource.connect(activeNode); 
        recordedSource = null;
        
        // RESTAURAR BOTÓN REPRODUCIR
        btnPlay.disabled = false;
        btnPlay.innerHTML = "▶ REPRODUCIR";
        btnPlay.classList.add('rec-play'); // Restaurar color
        updateRecorderUI('ready');
    };

    recordedSource.start();
    updateRecorderUI('playing');
}

function updateRecorderUI(state) {
    const btnRecord = document.getElementById('btnRecord');
    const btnReset = document.getElementById('btnReset');
    const btnPlay = document.getElementById('btnPlay');

    if (state === 'recording') {
        btnRecord.innerHTML = "⏹ DETENER";
        btnRecord.classList.add('recording');
        btnReset.disabled = false; 
        btnPlay.disabled = true;
        document.getElementById('recordStatus').innerText = "Grabando audio...";
    } else if (state === 'processing') {
        btnRecord.innerHTML = "⏳ Procesando...";
        btnRecord.classList.remove('recording');
        btnReset.disabled = true;
        btnPlay.disabled = true;
        document.getElementById('recordStatus').innerText = "Decodificando...";
    } else if (state === 'ready') {
        btnRecord.innerHTML = "🎤 GRABAR (5s)";
        btnRecord.classList.remove('recording');
        btnReset.disabled = false;
        btnPlay.disabled = false;
        btnPlay.classList.add('rec-play');
        document.getElementById('recordStatus').innerText = `Audio listo. Se reproducirá en modo ${currentCodec.toUpperCase()}`;
    } else if (state === 'playing') {
        btnRecord.innerHTML = "🎤 GRABAR (5s)";
        btnReset.disabled = false; 
        btnPlay.disabled = true; // Ya está deshabilitado por la función playRecordedAudio
        btnPlay.classList.remove('rec-play');
        document.getElementById('recordStatus').innerText = "Reproduciendo audio procesado...";
    } else { // idle
        btnRecord.innerHTML = "🎤 GRABAR (5s)";
        btnRecord.classList.remove('recording');
        btnReset.disabled = true;
        btnPlay.disabled = true;
        btnPlay.classList.remove('rec-play');
        document.getElementById('recordStatus').innerText = "Paso 1: Inicia Laboratorio";
    }
}

// --- ACTUALIZAR INTERFAZ ---
function updateUI(codec) {
    const data = CODECS[codec];
    document.documentElement.style.setProperty('--active-color', data.color);
    document.querySelectorAll('.codec-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById(`btn-${codec}`).classList.add('selected');
    document.getElementById('m-bitrate').innerText = data.bitrate;
    document.getElementById('m-mos').innerText = data.mos;
    document.getElementById('m-delay').innerText = data.delay;
    document.getElementById('theoryTitle').innerText = data.title;
    document.getElementById('theoryText').innerHTML = data.desc;
    document.getElementById('statusText').innerText = codec.toUpperCase() + (isRunning ? "_RUNNING" : "_READY");
    document.getElementById('statusText').style.borderColor = data.color;
}

// --- VISUALIZADOR ---
function drawVisualizer() {
    const canvas = document.getElementById('oscCanvas');
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function render() {
        if(!isRunning) return;
        requestAnimationFrame(render);

        if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }

        analyser.getByteTimeDomainData(dataArray);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = CODECS[currentCodec].color;
        ctx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        const cy = canvas.height / 2;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, cy);
        ctx.stroke();
    }
    render();
}

// --- UTILIDADES ---
function playTone(freq, type, duration=0.1) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function initThreeJS() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i=0; i<400; i++) {
        vertices.push((Math.random()-0.5)*15, (Math.random()-0.5)*15, (Math.random()-0.5)*15);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({color: 0x3b82f6, size: 0.05, transparent: true, opacity: 0.5});
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        points.rotation.y += 0.001;
        renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => { 
        camera.aspect = window.innerWidth/window.innerHeight; 
        camera.updateProjectionMatrix(); 
        renderer.setSize(window.innerWidth, window.innerHeight); 
    });
}

function showIntro() { document.getElementById('intro-modal').classList.add('active'); }
function closeIntro() { document.getElementById('intro-modal').classList.remove('active'); }
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }

// --- JUEGO ---
function startGame() {
    openModal('modal-game');
    gameScore = 0;
    currentQuestionIndex = 0;
    document.getElementById('scoreVal').innerText = gameScore;
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= QUESTIONS.length) {
        document.getElementById('gameQuestion').innerText = "¡Juego Terminado!";
        document.getElementById('gameOptions').innerHTML = `<p>Puntuación Final: ${gameScore}/50</p><button class="main-action-btn btn-start" onclick="closeAllModals()">Cerrar</button>`;
        document.getElementById('gameFeedback').style.display = 'none';
        return;
    }
    const qData = QUESTIONS[currentQuestionIndex];
    document.getElementById('gameQuestion').innerText = qData.q;
    const optionsDiv = document.getElementById('gameOptions');
    optionsDiv.innerHTML = '';
    qData.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'game-option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, qData.correct, btn);
        optionsDiv.appendChild(btn);
    });
    document.getElementById('gameFeedback').style.display = 'none';
    document.getElementById('gameFeedback').className = 'game-feedback';
}

function checkAnswer(selectedIndex, correctIndex, btnElement) {
    const feedback = document.getElementById('gameFeedback');
    feedback.style.display = 'block';
    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        feedback.innerText = "¡CORRECTO!";
        feedback.classList.add('success', 'show');
        gameScore += 10;
        playTone(800, 'sine');
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestion();
            document.getElementById('scoreVal').innerText = gameScore;
        }, 1500);
    } else {
        btnElement.classList.add('wrong');
        feedback.innerText = "INCORRECTO.";
        feedback.classList.add('error', 'show');
        playTone(200, 'sawtooth');
    }
}

window.onload = () => {
    initThreeJS();
    showIntro();
    updateUI('lpc');
};