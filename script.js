pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusText = document.getElementById('status-text');
const previewArea = document.getElementById('preview-area');
const previewBox = document.getElementById('preview-box');
const btnDescargar = document.getElementById('btn-descargar');
const btnLimpiar = document.getElementById('btn-limpiar');

let actividades = [];

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    dropZone.addEventListener(e, (evt) => { evt.preventDefault(); evt.stopPropagation(); });
});

dropZone.addEventListener('dragover', () => dropZone.classList.add('active'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('active');
    if (e.dataTransfer.files.length) procesar(e.dataTransfer.files[0]);
});

dropZone.onclick = () => fileInput.click();
fileInput.onchange = (e) => { if(e.target.files.length) procesar(e.target.files[0]); };

async function procesar(file) {
    statusText.innerText = "Sincronizando plan...";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let textoFull = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        textoFull += content.items.map(item => item.str).join(" ") + "\n";
    }

    const materia = document.getElementById('materia').value || "Materia";
    const cat = document.getElementById('categoria').value || materia;

    const regexInicio = /CALENDARIO\s+DE\s+ACTIVIDADES/i;
    const partes = textoFull.split(regexInicio);
    if (partes.length < 2) { alert("Calendario no detectado."); return; }

    const textoCal = partes[1];
    const regexFecha = /(\d{1,2}\s+de\s+[a-z]+(?:\s+de\s+2026)?|\d{1,2}\/\d{1,2}\/\d{2,4})/gi;
    const bloques = textoCal.split(regexFecha);
    
    actividades = [];

    for (let i = 1; i < bloques.length; i += 2) {
        const fechaTxt = bloques[i];
        const contexto = bloques[i+1]; 

        if (/zoom|sesión|sesion/i.test(contexto)) continue;

        // LÓGICA DE TABLA: Encontrar los primeros dos números después de la fecha
        // Estos corresponden a No. Unidad y No. Actividad según tu estructura
        const numerosMatch = contexto.match(/\b\d+\b/g);
        
        if (numerosMatch && numerosMatch.length >= 2) {
            const unidad = numerosMatch[0];
            const numAct = numerosMatch[1];
            
            // DISTINCIÓN A vs AC: Búsqueda estricta de palabras clave
            let tipo = "A";
            const ctxMin = contexto.toLowerCase();
            if (ctxMin.includes("complementaria") || ctxMin.includes("comp.") || /\bac\b/i.test(contexto)) {
                tipo = "AC";
            }

            actividades.push({
                Subject: `${materia} U${unidad}${tipo}${numAct}`,
                Date: fmtFecha(fechaTxt),
                Cat: cat
            });
        }
    }

    if (actividades.length) {
        previewArea.classList.remove('d-none');
        previewBox.innerHTML = actividades.map(a => `<div class="act-row"><span>${a.Subject}</span> <span class="badge-date">${a.Date}</span></div>`).join('');
        statusText.innerText = "¡Detección Exitosa!";
    } else {
        alert("No se detectaron actividades. Revisa que el PDF sea un Plan de Trabajo SUAYED.");
        statusText.innerText = "Arrastra tu PDF aquí o haz clic";
    }
}

function fmtFecha(t) {
    if (t.includes('/')) {
        const p = t.split('/');
        return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2].length === 2 ? '20'+p[2] : p[2]}`;
    }
    const meses = { 'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12' };
    const p = t.toLowerCase().replace(/de/g, '').trim().split(/\s+/);
    return `${p[0].padStart(2, '0')}/${meses[p[1]]}/2026`;
}

btnDescargar.onclick = () => {
    const head = "Subject,Location,Description,Start Date,End Date,Start Time,End Time,All Day Event,Categories";
    const filas = actividades.map(a => `"${a.Subject}","","","${a.Date}","${a.Date}","","","Yes","${a.Cat}"`);
    const csv = "\uFEFF" + head + "\n" + filas.join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8;'}));
    link.download = `Tareas_${document.getElementById('materia').value || 'UNAM'}.csv`;
    link.click();
};

btnLimpiar.onclick = () => {
    previewArea.classList.add('d-none');
    actividades = [];
    statusText.innerText = "Arrastra tu PDF aquí o haz clic";
    fileInput.value = "";
};