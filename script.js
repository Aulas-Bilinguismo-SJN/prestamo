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

// Cargar equipos ocupados desde BaseB (GET)
function cargarEquiposOcupados() {
    fetch(`${SCRIPT_URL}?action=getBaseB`)
        .then(response => response.json())
        .then(data => {
            // Resetear todos los equipos primero
            items.forEach(item => {
                item.documento = "";
                item.profesor = "";
                item.materia = "";
            });

            // Cargar solo los equipos que están en BaseB (ocupados)
            if (data && Array.isArray(data)) {
                data.forEach(fila => {
                    if (fila && fila.length >= 4) {
                        const numeroEquipo = fila[0]; // Número del equipo
                        const documento = fila[1];
                        const profesor = fila[2];
                        const materia = fila[3];
                        
                        // Buscar el equipo correspondiente
                        const item = items.find(i => i.nombre === numeroEquipo.toString());
                        if (item) {
                            item.documento = documento || "";
                            item.profesor = profesor || "";
                            item.materia = materia || "";
                        }
                    }
                });
            }
            actualizarVista();
        })
        .catch(error => console.error("Error al cargar equipos ocupados:", error));
}

// Buscar estudiante en BaseA por documento
function buscarEstudianteEnBaseA(documento) {
    return fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.encontrado) {
                return {
                    nombre: data.nombre,
                    curso: data.curso,
                    encontrado: true
                };
            }
            return { encontrado: false };
        })
        .catch(error => {
            console.error("Error al buscar estudiante:", error);
            return { encontrado: false };
        });
}

// Guardar equipo ocupado en BaseB (POST)
function guardarEquipoEnBaseB(item) {
    const datos = {
        action: 'saveToBaseB',
        numeroEquipo: item.nombre,
        documento: item.documento,
        profesor: item.profesor,
        materia: item.materia
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    }).catch(error => console.error("Error al guardar en BaseB:", error));
}

// Eliminar equipo de BaseB
function eliminarEquipoDeBaseB(numeroEquipo) {
    const datos = {
        action: 'deleteFromBaseB',
        numeroEquipo: numeroEquipo
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    }).catch(error => console.error("Error al eliminar de BaseB:", error));
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
    document.querySelector('.modal-header h2').textContent = `Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Complete la información del Equipo:';
    listaMetodos.innerHTML = '';

    const formulario = document.createElement('div');
    formulario.style.display = 'flex';
    formulario.style.flexDirection = 'column';
    formulario.style.gap = '15px';

    const divDocumento = document.createElement('div');
    divDocumento.innerHTML = `
        <label for="documento">Documento del Estudiante:</label>
        <input type="text" id="documento" value="${item.documento}" placeholder="Ingrese el número de documento...">
        <small id="buscarInfo" style="color: #6c757d;">Ingrese el documento para buscar automáticamente el estudiante</small>
    `;

    const divNombreEstudiante = document.createElement('div');
    divNombreEstudiante.innerHTML = `
        <label for="nombreEstudiante">Nombre del Estudiante:</label>
        <input type="text" id="nombreEstudiante" readonly placeholder="Se completará automáticamente...">
    `;

    const divCurso = document.createElement('div');
    divCurso.innerHTML = `
        <label for="curso">Curso:</label>
        <input type="text" id="curso" readonly placeholder="Se completará automáticamente...">
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
    btnGuardar.disabled = true; // Deshabilitado hasta que se encuentre el estudiante

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';

    // Event listener para buscar automáticamente cuando se ingrese el documento
    let timerBusqueda;
    document.getElementById('documento').addEventListener('input', function(e) {
        const documento = e.target.value.trim();
        const infoElement = document.getElementById('buscarInfo');
        const nombreInput = document.getElementById('nombreEstudiante');
        const cursoInput = document.getElementById('curso');
        
        // Limpiar timer anterior
        clearTimeout(timerBusqueda);
        
        if (documento.length >= 3) { // Buscar cuando tenga al menos 3 dígitos
            infoElement.textContent = 'Buscando estudiante...';
            infoElement.style.color = '#ffc107';
            
            timerBusqueda = setTimeout(() => {
                buscarEstudianteEnBaseA(documento).then(resultado => {
                    if (resultado.encontrado) {
                        nombreInput.value = resultado.nombre;
                        cursoInput.value = resultado.curso;
                        infoElement.textContent = '✓ Estudiante encontrado';
                        infoElement.style.color = '#28a745';
                        btnGuardar.disabled = false;
                    } else {
                        nombreInput.value = '';
                        cursoInput.value = '';
                        infoElement.textContent = '⚠ Estudiante no encontrado en la base de datos';
                        infoElement.style.color = '#dc3545';
                        btnGuardar.disabled = true;
                    }
                });
            }, 500); // Esperar 500ms después de que el usuario deje de escribir
        } else {
            nombreInput.value = '';
            cursoInput.value = '';
            infoElement.textContent = 'Ingrese el documento para buscar automáticamente el estudiante';
            infoElement.style.color = '#6c757d';
            btnGuardar.disabled = true;
        }
    });

    btnGuardar.addEventListener('click', () => {
        const documento = document.getElementById('documento').value.trim();
        const nombreEstudiante = document.getElementById('nombreEstudiante').value.trim();
        const curso = document.getElementById('curso').value.trim();
        const profesor = document.getElementById('profesor').value.trim();
        const materia = document.getElementById('materia').value.trim();

        if (!documento || !nombreEstudiante || !profesor || !materia) {
            alert('Por favor complete todos los campos obligatorios');
            return;
        }

        // Actualizar el item con la información del estudiante encontrado
        item.documento = `${documento} - ${nombreEstudiante} (${curso})`;
        item.profesor = profesor;
        item.materia = materia;

        guardarEquipoEnBaseB(item);
        cerrarModal();
        actualizarVista();
    });

    btnCancelar.addEventListener('click', cerrarModal);

    divBotones.append(btnGuardar, btnCancelar);
    formulario.append(divDocumento, divNombreEstudiante, divCurso, divProfesor, divMateria, divBotones);
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
        <p><strong>Estudiante:</strong></p>
        <div class="info-content">${item.documento || 'Sin información'}</div>
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
            // Eliminar de BaseB
            eliminarEquipoDeBaseB(item.nombre);
            
            // Limpiar localmente
            item.documento = "";
            item.profesor = "";
            item.materia = "";

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
            if (item.documento) {
                eliminarEquipoDeBaseB(item.nombre);
            }
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
    cargarEquiposOcupados();                    // Cargar equipos ocupados al inicio
    setInterval(cargarEquiposOcupados, 30000);  // Actualizar cada 30 segundos
});
