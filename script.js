const items = [];
for (let i = 1; i <= 50; i++) {
    items.push({
        id: `item_${i}`,
        nombre: `${i}`,
        documento: "",
        profesor: "",
        materia: ""
    });
}

// URL del Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdigcfuoeHycEROAQ2zfjDAqdrBo0QxjzZNs0AmqqA86PVCsAetPDfp4gP9E3TFGZf7w/exec';

// --- FUNCIONES DE CARGA Y GUARDADO ---

// Cargar datos desde BaseA (GET)
function cargarDatosDesdeGoogleSheet() {
    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            items.forEach((item, index) => {
                const fila = data[index + 1]; // fila 0 es encabezado
                if (fila) {
                    item.documento = fila[1] || "";
                    item.profesor = fila[2] || "";
                    item.materia = fila[3] || "";
                }
            });
            actualizarVista();
        })
        .catch(error => console.error("Error al cargar datos:", error));
}

// Guardar en BaseB (POST)
function guardarEnGoogleSheet(item) {
    const datos = {
        item: item.nombre,
        documento: item.documento,
        profesor: item.profesor,
        materia: item.materia
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    }).catch(error => console.error("Error al guardar:", error));
}

// --- MODAL: MARCAR Y DESMARCAR ---

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.documento.trim() !== "") {
        mostrarModalDesmarcar(itemId);
        return;
    }

    const modal = document.getElementById('modalMetodos');
    const listaMetodos = document.getElementById('listaMetodos');
    document.querySelector('.modal-header h2').textContent = `Item ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Complete la información del Equipo:';
    listaMetodos.innerHTML = '';

    const formulario = document.createElement('div');
    formulario.style.display = 'flex';
    formulario.style.flexDirection = 'column';
    formulario.style.gap = '15px';

    const divDocumento = document.createElement('div');
    divDocumento.innerHTML = `
        <label for="documento">Documento:</label>
        <textarea id="documento" rows="3" placeholder="Ingrese el documento...">${item.documento}</textarea>
    `;

    const divProfesor = document.createElement('div');
    divProfesor.innerHTML = `
        <label for="profesor">Profesor(a) Encargado:</label>
        <input type="text" id="profesor" value="${item.profesor}" placeholder="Ingrese el nombre del profesor(a)...">
    `;

    const divMateria = document.createElement('div');
    divMateria.innerHTML = `
        <label for="materia">Materia:</label>
        <input type="text" id="materia" value="${item.materia}" placeholder="Ingrese la materia...">
    `;

    const divBotones = document.createElement('div');
    divBotones.style.display = 'flex';
    divBotones.style.gap = '10px';
    divBotones.style.justifyContent = 'flex-end';

    const btnGuardar = document.createElement('button');
    btnGuardar.textContent = 'Guardar';
    btnGuardar.style.backgroundColor = '#007bff';
    btnGuardar.style.color = 'white';

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';

    btnGuardar.addEventListener('click', () => {
        const documento = document.getElementById('documento').value.trim();
        const profesor = document.getElementById('profesor').value.trim();
        const materia = document.getElementById('materia').value.trim();

        item.documento = documento;
        item.profesor = profesor;
        item.materia = materia;

        guardarEnGoogleSheet(item);
        cerrarModal();
        actualizarVista();
    });

    btnCancelar.addEventListener('click', cerrarModal);

    divBotones.append(btnGuardar, btnCancelar);
    formulario.append(divDocumento, divProfesor, divMateria, divBotones);
    listaMetodos.appendChild(formulario);

    modal.style.display = 'block';
}

function mostrarModalDesmarcar(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('modalMetodos');
    const listaMetodos = document.getElementById('listaMetodos');

    document.querySelector('.modal-header h2').textContent = `Desmarcar Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Información del Equipo a desmarcar:';
    listaMetodos.innerHTML = '';

    const formulario = document.createElement('div');
    formulario.style.display = 'flex';
    formulario.style.flexDirection = 'column';
    formulario.style.gap = '15px';

    const divInfo = document.createElement('div');
    divInfo.className = 'readonly-info';
    divInfo.innerHTML = `
        <p><strong>Documento:</strong></p>
        <div class="info-content">${item.documento || 'Sin documento'}</div>
        <p><strong>Profesor(a) Encargado:</strong></p>
        <div class="info-content">${item.profesor || 'Sin profesor'}</div>
        <p><strong>Materia:</strong></p>
        <div class="info-content">${item.materia || 'Sin materia'}</div>
    `;

    const divComentario = document.createElement('div');
    divComentario.innerHTML = `
        <label for="comentario">Comentario (opcional):</label>
        <textarea id="comentario" rows="4" placeholder="Explique por qué se desmarca..."></textarea>
    `;

    const divBotones = document.createElement('div');
    divBotones.style.display = 'flex';
    divBotones.style.gap = '10px';
    divBotones.style.justifyContent = 'flex-end';

    const btnDesmarcar = document.createElement('button');
    btnDesmarcar.textContent = 'Desmarcar';
    btnDesmarcar.className = 'delete-modal-btn';

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';

    btnDesmarcar.addEventListener('click', () => {
        const comentario = document.getElementById('comentario').value.trim();
        if (confirm(`¿Deseas desmarcar el equipo ${item.nombre}?`)) {
            item.documento = "";
            item.profesor = "";
            item.materia = "";

            // (opcional: guardar comentario)
            console.log(`Desmarcado: ${item.nombre}, Comentario: ${comentario}`);

            cerrarModal();
            actualizarVista();
        }
    });

    btnCancelar.addEventListener('click', cerrarModal);
    divBotones.append(btnDesmarcar, btnCancelar);
    formulario.append(divInfo, divComentario, divBotones);
    listaMetodos.appendChild(formulario);

    modal.style.display = 'block';
}

// --- ACTUALIZACIÓN Y RENDER DE GRILLA ---

function actualizarVista() {
    crearGrilla();
}

function crearGrilla() {
    const contenedor = document.getElementById("malla");
    contenedor.innerHTML = "";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "ramo";
        div.style.backgroundColor = item.documento ? "#d4edda" : "#f8f9fa";
        div.style.borderColor = item.documento ? "#28a745" : "#ccc";

        const numero = document.createElement("div");
        numero.textContent = item.nombre;
        numero.style.fontWeight = "bold";

        const estado = document.createElement("div");
        estado.textContent = item.documento ? "✓" : "○";
        estado.style.color = item.documento ? "green" : "#6c757d";

        div.append(numero, estado);
        div.addEventListener("click", () => mostrarModalItem(item.id));
        contenedor.appendChild(div);
    });
}

// --- UTILIDADES ---

function resetearMalla() {
    if (confirm("¿Estás seguro de resetear todos los equipos?")) {
        items.forEach(item => {
            item.documento = "";
            item.profesor = "";
            item.materia = "";
        });
        actualizarVista();
    }
}

function cerrarModal() {
    document.getElementById('modalMetodos').style.display = 'none';
}

// --- INICIALIZACIÓN ---

window.onclick = function(event) {
    const modal = document.getElementById('modalMetodos');
    if (event.target === modal) cerrarModal();
};

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') cerrarModal();
});

document.addEventListener('DOMContentLoaded', function() {
    cargarDatosDesdeGoogleSheet();               // primera carga
    setInterval(cargarDatosDesdeGoogleSheet, 30000); // cada 30 segundos
});
