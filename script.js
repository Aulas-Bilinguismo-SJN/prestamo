const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`,
    nombre: `${i+1}`,
    documento: "",
    profesor: "",
    materia: "",
    nombreCompleto: "",
    curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyuGDm29g7Xs3OE_vF1NyQyMYcucZpWIwxL2KMJU5BYL4nZCvo1R86m8dSQFpYEW8UYcA/exec';

// --- API ---
const api = {
    async cargarEquipos() {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseB`).then(r => r.json());

            // Reset items
            items.forEach(item => Object.assign(item, {
                documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""
            }));

            // Procesar último estado por equipo
            const estados = {};
            data?.forEach(fila => {
                if (fila.length >= 8) {
                    const [timestamp, equipo, nombreCompleto, documento, curso, profesor, materia, tipo] = fila;
                    if (equipo && tipo && (!estados[equipo] || new Date(timestamp) > new Date(estados[equipo].timestamp))) {
                        estados[equipo] = {timestamp, nombreCompleto, documento, curso, profesor, materia, tipo};
                    }
                }
            });

            // Aplicar solo préstamos activos
            Object.entries(estados).forEach(([numero, estado]) => {
                if (estado.tipo === "Préstamo") {
                    const item = items.find(i => i.nombre === numero);
                    if (item) Object.assign(item, estado);
                }
            });

            actualizarVista();
        } catch (error) { 
            console.error("Error al cargar:", error); 
            console.error("Error al cargar:", error);
            // Si hay error, al menos mostrar la vista vacía
            actualizarVista();
        }
    },

    async buscarEstudiante(documento) {
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`);
            const data = await response.json();

            console.log('=== DEBUG BUSCAR ESTUDIANTE ===');
            console.log('Documento buscado:', documento);
            console.log('URL completa:', `${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`);
            console.log('Status de respuesta:', response.status);
            console.log('Respuesta completa de la API:', data);
            console.log('Tipo de data.encontrado:', typeof data.encontrado);
            console.log('Valor de data.encontrado:', data.encontrado);
            console.log('=== FIN DEBUG ===');

            // Tu API retorna directamente {encontrado: true/false, documento, nombreCompleto, curso}
            if (data && data.encontrado === true) {
                return {
                    nombreCompleto: data.nombreCompleto || 'Sin nombre',
                    documento: data.documento || documento,
                    curso: data.curso || 'Sin curso',
                    encontrado: true
                };
            }

            // Si no se encontró o hay error
            return {
                encontrado: false,
                error: data.error || 'Estudiante no encontrado'
            };

        } catch (error) {
            console.error('Error en búsqueda:', error);
            return {
                encontrado: false, 
                error: `Error de conexión: ${error.message}`
            };
        }
    },

    async guardar(item, tipo, datosEstudiante = null, comentario = '') {
        const datos = {
            action: 'saveToBaseB',
            marcaTemporal: new Date().toISOString(),
            equipo: item.nombre,
            nombreCompleto: datosEstudiante?.nombreCompleto || item.nombreCompleto || '',
            documento: datosEstudiante?.documento || item.documento,
            curso: datosEstudiante?.curso || item.curso || '',
            profesorEncargado: item.profesor,
            materia: item.materia,
            tipo,
            comentario
        };

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos)
            });
        } catch (error) {
            console.error(`Error al guardar ${tipo}:`, error);
        }
    }
};

// --- MODAL ---
const crearInput = (id, label, type = 'text', placeholder = '', readonly = false, value = '') => 
    `<div><label for="${id}">${label}:</label>
     <${type === 'textarea' ? 'textarea' : 'input'} ${type === 'textarea' ? 'rows="3"' : `type="${type}"`} 
     id="${id}" placeholder="${placeholder}" ${readonly ? 'readonly' : ''} value="${value}">${type === 'textarea' ? value : ''}</${type === 'textarea' ? 'textarea' : 'input'}>
     ${id === 'documento' ? '<small id="buscarInfo" style="color: #6c757d;">Ingrese el Documento para buscar automáticamente</small>' : ''}
     </div>`;

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('modalMetodos');
    const container = document.getElementById('listaMetodos');
    const esDevolucion = !!item.documento.trim();

    document.querySelector('.modal-header h2').textContent = `${esDevolucion ? 'Devolver' : ''} Equipo ${item.nombre}`;
    document.querySelector('.modal-header h2').textContent = `${esDevolucion ? 'Devolver' : 'Prestar'} Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = esDevolucion ? 
        'Información del Préstamo Activo:' : 'Complete la información del Préstamo:';

    if (esDevolucion) {
        // Modal Devolución
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div class="readonly-info">
                    <p><strong>Estudiante:</strong></p><div class="info-content">${item.nombreCompleto || 'Sin información'}</div>
                    <p><strong>Documento:</strong></p><div class="info-content">${item.documento}</div>
                    <p><strong>Curso:</strong></p><div class="info-content">${item.curso || 'Sin información'}</div>
                    <p><strong>Profesor(a):</strong></p><div class="info-content">${item.profesor || 'Sin profesor'}</div>
                    <p><strong>Materia:</strong></p><div class="info-content">${item.materia || 'Sin materia'}</div>
                </div>
                <div><label for="comentario">Comentario de Devolución (opcional):</label>
                <textarea id="comentario" rows="4" placeholder="Observaciones sobre el estado del equipo..."></textarea></div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnGuardar" style="background-color: #dc3545; color: white;">Registrar Devolución</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white;">Cancelar</button>
                    <button id="btnGuardar" style="background-color: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Registrar Devolución</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                </div>
            </div>`;

        document.getElementById('btnGuardar').onclick = async () => {
            const comentario = document.getElementById('comentario').value.trim();
            if (confirm(`¿Confirma la devolución del equipo ${item.nombre}?`)) {
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
                cerrarModal();
                actualizarVista();
            }
        };
    } else {
        // Modal Préstamo
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                ${crearInput('documento', 'Documento del Estudiante', 'text', 'Ingrese el número de documento...')}
                ${crearInput('profesor', 'Profesor(a) Encargado', 'text', 'Ingrese el nombre del profesor(a)...', false, item.profesor)}
                ${crearInput('materia', 'Materia', 'text', 'Ingrese la materia...', false, item.materia)}
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnGuardar" style="background-color: #007bff; color: white;">Registrar Préstamo</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white;">Cancelar</button>
                    <button id="btnGuardar" style="background-color: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Registrar Préstamo</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                </div>
            </div>`;

        let datosEstudiante = {};
        let timer;

        document.getElementById('documento').oninput = async (e) => {
            const doc = e.target.value.trim();
            const info = document.getElementById('buscarInfo');

            clearTimeout(timer);
            datosEstudiante = {};

            if (doc.length >= 3) {
                info.textContent = 'Validando documento...';
                info.style.color = '#ffc107';

                timer = setTimeout(async () => {
                    const result = await api.buscarEstudiante(doc);
                    if (result.encontrado) {
                        datosEstudiante = result;
                        info.textContent = `✓ Estudiante: ${result.nombreCompleto} - Curso: ${result.curso}`;
                        info.style.color = '#28a745';
                    } else {
                        info.textContent = result.error ? `⚠ Error: ${result.error}` : '⚠ Documento no encontrado - Verifique el número';
                        info.style.color = '#dc3545';
                    }
                }, 800);
            } else if (!doc.length) {
                info.textContent = 'Ingrese el Documento para buscar automáticamente';
                info.style.color = '#6c757d';
            }
        };

        document.getElementById('btnGuardar').onclick = async () => {
            const [doc, prof, mat] = ['documento', 'profesor', 'materia'].map(id => document.getElementById(id).value.trim());

            if (!doc || !prof || !mat) {
                return alert('Complete todos los campos: Documento, Profesor y Materia');
            }

            if (!datosEstudiante.encontrado && Object.keys(datosEstudiante).length === 0) {
                const confirmacion = confirm('No se encontró información del estudiante. ¿Desea continuar con el registro manual?');
                if (!confirmacion) return;
                datosEstudiante = {documento: doc, nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
            }

            Object.assign(item, {
                documento: doc, profesor: prof, materia: mat,
                nombreCompleto: datosEstudiante.nombreCompleto,
                curso: datosEstudiante.curso
            });

            await api.guardar(item, 'Préstamo', datosEstudiante);
            cerrarModal();
            actualizarVista();
        };
    }

    document.getElementById('btnCancelar').onclick = cerrarModal;
    modal.style.display = 'block';
}

// --- UI ---
const actualizarVista = () => {
    document.getElementById("malla").innerHTML = items.map(item => {
    const contenedor = document.getElementById("malla");
    
    if (!contenedor) {
        console.error('Error: No se encontró el elemento con id "malla"');
        return;
    }
    
    console.log('Actualizando vista con', items.length, 'items');
    
    contenedor.innerHTML = items.map(item => {
        const ocupado = !!item.documento;
        return `<div class="ramo" style="background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; border-color: ${ocupado ? '#28a745' : '#ccc'};" onclick="mostrarModalItem('${item.id}')">
                    <div style="font-weight: bold;">${item.nombre}</div>
                    <div style="color: ${ocupado ? 'green' : '#6c757d'};">${ocupado ? '✓' : '○'}</div>
                    ${ocupado ? `<div style="font-size: 0.8em; color: #666; margin-top: 5px;">${item.nombreCompleto}</div>` : ''}
                </div>`;
        return `
            <div class="ramo" 
                 style="
                    background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; 
                    border: 2px solid ${ocupado ? '#28a745' : '#ccc'}; 
                    border-radius: 8px;
                    padding: 15px;
                    margin: 5px;
                    cursor: pointer;
                    text-align: center;
                    min-height: 80px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    transition: all 0.3s ease;
                 " 
                 onclick="mostrarModalItem('${item.id}')"
                 onmouseover="this.style.transform='scale(1.02)'"
                 onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; font-size: 1.2em;">${item.nombre}</div>
                <div style="color: ${ocupado ? 'green' : '#6c757d'}; font-size: 1.5em; margin: 5px 0;">
                    ${ocupado ? '✓' : '○'}
                </div>
                ${ocupado ? `
                    <div style="font-size: 0.8em; color: #666; margin-top: 5px; text-align: center;">
                        <strong>${item.nombreCompleto || 'Sin nombre'}</strong><br>
                        <small>${item.curso || 'Sin curso'}</small>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    console.log('Vista actualizada correctamente');
};

function resetearMalla() {
    if (confirm("⚠️ ATENCIÓN: Esto registrará la devolución de TODOS los equipos prestados. ¿Estás seguro?")) {
        const comentario = prompt("Comentario para devolución masiva (opcional):", "Devolución masiva - Fin de jornada") || '';
        items.forEach(async item => {
            if (item.documento) {
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
            }
        });
        setTimeout(actualizarVista, 1000);
    }
}

const cerrarModal = () => document.getElementById('modalMetodos').style.display = 'none';
const cerrarModal = () => {
    const modal = document.getElementById('modalMetodos');
    if (modal) {
        modal.style.display = 'none';
    }
};

// --- EVENTOS ---
window.onclick = e => e.target === document.getElementById('modalMetodos') && cerrarModal();
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarModal());
window.onclick = e => {
    const modal = document.getElementById('modalMetodos');
    if (e.target === modal) cerrarModal();
};

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarModal();
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando...');
    
    // Verificar que existan los elementos necesarios
    const malla = document.getElementById('malla');
    const modal = document.getElementById('modalMetodos');
    
    if (!malla) {
        console.error('Error: No se encontró el elemento con id "malla"');
        return;
    }
    
    if (!modal) {
        console.error('Error: No se encontró el elemento con id "modalMetodos"');
        return;
    }
    
    console.log('Elementos encontrados, cargando equipos...');
    
    // Mostrar equipos inmediatamente (vista inicial)
    actualizarVista();
    
    // Cargar datos del servidor
    api.cargarEquipos();
    
    // Actualizar cada 30 segundos
    setInterval(api.cargarEquipos, 30000);
    
    console.log('Sistema iniciado correctamente');
});


const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`,
    nombre: `${i+1}`,
    documento: "",
    profesor: "",
    materia: "",
    nombreCompleto: "",
    curso: ""
}));
// Función auxiliar para debug
window.debugItems = () => {
    console.log('Items actuales:', items);
    console.log('Elemento malla:', document.getElementById('malla'));
    console.log('Elemento modal:', document.getElementById('modalMetodos'));
};
