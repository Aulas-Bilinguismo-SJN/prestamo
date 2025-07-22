const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`,
    nombre: `${i+1}`,
    documento: "",
    profesor: "",
    materia: "",
    nombreCompleto: "",
    curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdigcfuoeHycEROAQ2zfjDAqdrBo0QxjzZNs0AmqqA86PVCsAetPDfp4gP9E3TFGZf7w/exec';

// --- API FUNCTIONS ---
const api = {
    async cargarEquipos() {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseB`).then(r => r.json());
            
            // Resetear todos los items
            items.forEach(item => Object.assign(item, {
                documento: "", 
                profesor: "", 
                materia: "",
                nombreCompleto: "",
                curso: ""
            }));
            
            // Procesar registros para encontrar el último estado de cada equipo
            const estadosEquipos = {};
            
            data?.forEach(fila => {
                if (fila.length >= 8) {
                    const numeroEquipo = fila[1]?.toString(); // Equipo
                    const tipo = fila[7]?.toString(); // Tipo
                    const timestamp = fila[0]; // Marca temporal
                    
                    if (numeroEquipo && tipo) {
                        // Guardar solo el registro más reciente por equipo
                        if (!estadosEquipos[numeroEquipo] || 
                            new Date(timestamp) > new Date(estadosEquipos[numeroEquipo].timestamp)) {
                            estadosEquipos[numeroEquipo] = {
                                timestamp: timestamp,
                                nombreCompleto: fila[2] || "", // Nombre Completo
                                documento: fila[3] || "",       // Documento
                                curso: fila[4] || "",           // Curso
                                profesor: fila[5] || "",        // Profesor Encargado
                                materia: fila[6] || "",         // Materia
                                tipo: tipo,                     // Tipo
                                comentario: fila[8] || ""       // Comentario
                            };
                        }
                    }
                }
            });
            
            // Aplicar solo los equipos que están en "Préstamo" (último registro)
            Object.entries(estadosEquipos).forEach(([numeroEquipo, estado]) => {
                if (estado.tipo === "Préstamo") {
                    const item = items.find(i => i.nombre === numeroEquipo);
                    if (item) {
                        Object.assign(item, {
                            documento: estado.documento,
                            profesor: estado.profesor,
                            materia: estado.materia,
                            nombreCompleto: estado.nombreCompleto,
                            curso: estado.curso
                        });
                    }
                }
            });
            
            actualizarVista();
        } catch (error) { 
            console.error("Error al cargar equipos:", error); 
        }
    },

    async buscarEstudiante(documento) {
        try {
            console.log('Buscando documento:', documento);
            
            const url = `${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`;
            console.log('URL de búsqueda:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                console.error('Error en la respuesta:', response.status, response.statusText);
                return {encontrado: false, error: 'Error en la respuesta del servidor'};
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            if (data && (data.encontrado === true || data.encontrado === 'true')) {
                return {
                    nombreCompleto: data.nombreCompleto || data.nombre || '',
                    documento: data.documento || documento,
                    curso: data.curso || '',
                    encontrado: true
                };
            } else if (data && data.length > 0) {
                const estudiante = data[0];
                return {
                    nombreCompleto: estudiante.nombreCompleto || estudiante.nombre || estudiante[1] || '',
                    documento: estudiante.documento || documento,
                    curso: estudiante.curso || estudiante[2] || '',
                    encontrado: true
                };
            } else {
                console.log('Estudiante no encontrado para documento:', documento);
                return {encontrado: false};
            }
            
        } catch (error) {
            console.error('Error al buscar estudiante:', error);
            return {encontrado: false, error: error.message};
        }
    },

    async guardarPrestamo(item, datosEstudiante) {
        const datos = {
            action: 'saveToBaseB',
            // Estructura: Marca temporal, Equipo, Nombre Completo, Documento, Curso, Profesor Encargado, Materia, Tipo, Comentario
            marcaTemporal: new Date().toISOString(),
            equipo: item.nombre,
            nombreCompleto: datosEstudiante.nombreCompleto || '',
            documento: datosEstudiante.documento || item.documento,
            curso: datosEstudiante.curso || '',
            profesorEncargado: item.profesor,
            materia: item.materia,
            tipo: 'Préstamo',
            comentario: '' // Vacío para préstamos, se usa principalmente en devoluciones
        };
        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos)
            });
            console.log('Préstamo registrado:', datos);
        } catch (error) {
            console.error("Error al guardar préstamo:", error);
        }
    },

    async guardarDevolucion(item, comentario = '') {
        const datos = {
            action: 'saveToBaseB',
            // Estructura: Marca temporal, Equipo, Nombre Completo, Documento, Curso, Profesor Encargado, Materia, Tipo, Comentario
            marcaTemporal: new Date().toISOString(),
            equipo: item.nombre,
            nombreCompleto: item.nombreCompleto || '',
            documento: item.documento,
            curso: item.curso || '',
            profesorEncargado: item.profesor,
            materia: item.materia,
            tipo: 'Devuelto',
            comentario: comentario
        };
        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos)
            });
            console.log('Devolución registrada:', datos);
        } catch (error) {
            console.error("Error al guardar devolución:", error);
        }
    }
};

// --- MODAL FUNCTIONS ---
function crearInput(id, label, type = 'text', placeholder = '', readonly = false, value = '') {
    return `<div><label for="${id}">${label}:</label>
            <${type === 'textarea' ? 'textarea' : 'input'} ${type === 'textarea' ? 'rows="3"' : `type="${type}"`} 
            id="${id}" placeholder="${placeholder}" ${readonly ? 'readonly' : ''} value="${value}">${type === 'textarea' ? value : ''}</${type === 'textarea' ? 'textarea' : 'input'}>
            ${id === 'documento' ? '<small id="buscarInfo" style="color: #6c757d;">Ingrese el Documento para buscar automáticamente</small>' : ''}
            </div>`;
}

function crearBotones(guardarText, guardarClass, onGuardar) {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
    div.innerHTML = `<button id="btnGuardar" class="${guardarClass}" style="background-color: ${guardarClass === 'delete-modal-btn' ? '#dc3545' : '#007bff'}; color: white;">${guardarText}</button>
                     <button id="btnCancelar" style="background-color: #6c757d; color: white;">Cancelar</button>`;
    div.querySelector('#btnGuardar').onclick = onGuardar;
    div.querySelector('#btnCancelar').onclick = cerrarModal;
    return div;
}

function mostrarModalItem(itemId) {
    console.log(`mostrarModalItem llamado con ID: ${itemId}`); // Debug
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
        console.error(`Item no encontrado con ID: ${itemId}`);
        return;
    }
    
    console.log(`Item encontrado:`, item); // Debug
    console.log(`Documento del item: "${item.documento}"`); // Debug
    
    // Verificar si el equipo está prestado (tiene documento)
    const estaPrestado = item.documento && item.documento.trim() !== "";
    console.log(`¿Está prestado? ${estaPrestado}`); // Debug
    
    if (estaPrestado) {
        console.log('Llamando a mostrarModalDesmarcar'); // Debug
        return mostrarModalDesmarcar(itemId);
    } else {
        console.log('Llamando a mostrarModalPrestar'); // Debug
        return mostrarModalPrestar(itemId);
    }
}

// Separar la lógica de préstamo en una función independiente
function mostrarModalPrestar(itemId) {
    console.log(`mostrarModalPrestar llamado con ID: ${itemId}`); // Debug
    
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('modalMetodos');
    if (!modal) {
        console.error('Modal no encontrado en el DOM');
        return;
    }
    
    const container = document.getElementById('listaMetodos');
    if (!container) {
        console.error('Container del modal no encontrado');
        return;
    }
    
    const headerTitle = document.querySelector('.modal-header h2');
    const bodyText = document.querySelector('.modal-body p');
    
    if (headerTitle) headerTitle.textContent = `Equipo ${item.nombre}`;
    if (bodyText) bodyText.textContent = 'Complete la información del Préstamo:';
    
    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    form.innerHTML = [
        crearInput('documento', 'Documento del Estudiante', 'text', 'Ingrese el número de documento...'),
        crearInput('profesor', 'Profesor(a) Encargado', 'text', 'Ingrese el nombre del profesor(a)...', false, item.profesor),
        crearInput('materia', 'Materia', 'text', 'Ingrese la materia...', false, item.materia)
    ].join('');

    // Variables para almacenar datos del estudiante
    let datosEstudiante = {};

    // Búsqueda automática mejorada
    let timer;
    const documentoInput = form.querySelector('#documento');
    if (documentoInput) {
        documentoInput.oninput = async (e) => {
            const doc = e.target.value.trim();
            const info = document.getElementById('buscarInfo');
            
            clearTimeout(timer);
            datosEstudiante = {}; // Reset datos
            
            if (doc.length >= 3) {
                if (info) {
                    info.textContent = 'Validando documento...';
                    info.style.color = '#ffc107';
                }
                
                timer = setTimeout(async () => {
                    try {
                        const result = await api.buscarEstudiante(doc);
                        console.log('Resultado de validación:', result);
                        
                        if (result.encontrado) {
                            datosEstudiante = {
                                nombreCompleto: result.nombreCompleto,
                                documento: result.documento,
                                curso: result.curso
                            };
                            if (info) {
                                info.textContent = `✓ Estudiante: ${result.nombreCompleto} - Curso: ${result.curso}`;
                                info.style.color = '#28a745';
                            }
                        } else {
                            if (info) {
                                if (result.error) {
                                    info.textContent = `⚠ Error: ${result.error}`;
                                } else {
                                    info.textContent = '⚠ Documento no encontrado - Verifique el número';
                                }
                                info.style.color = '#dc3545';
                            }
                        }
                    } catch (error) {
                        console.error('Error en validación:', error);
                        if (info) {
                            info.textContent = '⚠ Error en validación - Intente nuevamente';
                            info.style.color = '#dc3545';
                        }
                    }
                }, 800);
                
            } else if (!doc.length) {
                if (info) {
                    info.textContent = 'Ingrese el Documento para buscar automáticamente';
                    info.style.color = '#6c757d';
                }
            }
        };
    }

    form.appendChild(crearBotones('Registrar Préstamo', '', async () => {
        const [doc, prof, mat] = ['documento', 'profesor', 'materia'].map(id => {
            const element = document.getElementById(id);
            return element ? element.value.trim() : '';
        });
        
        if (!doc || !prof || !mat) {
            return alert('Complete todos los campos: Documento, Profesor y Materia');
        }
        
        // Verificar si encontró el estudiante
        if (!datosEstudiante.encontrado && Object.keys(datosEstudiante).length === 0) {
            const confirmacion = confirm('No se encontró información del estudiante. ¿Desea continuar con el registro manual?');
            if (!confirmacion) return;
            
            // Datos mínimos para registro manual
            datosEstudiante = {
                documento: doc,
                nombreCompleto: 'Registro Manual',
                curso: 'Por verificar'
            };
        }
        
        // Actualizar item local
        item.documento = doc;
        item.profesor = prof;
        item.materia = mat;
        item.nombreCompleto = datosEstudiante.nombreCompleto;
        item.curso = datosEstudiante.curso;
        
        // Registrar préstamo en BaseB
        await api.guardarPrestamo(item, datosEstudiante);
        
        cerrarModal();
        actualizarVista();
    }));

    container.innerHTML = '';
    container.appendChild(form);
    modal.style.display = 'block';
    
    console.log('Modal de préstamo mostrado'); // Debug
}

function mostrarModalDesmarcar(itemId) {
    console.log(`mostrarModalDesmarcar llamado con ID: ${itemId}`); // Debug
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
        console.error(`Item no encontrado para devolución: ${itemId}`);
        return;
    }

    const modal = document.getElementById('modalMetodos');
    if (!modal) {
        console.error('Modal no encontrado en el DOM para devolución');
        return;
    }
    
    const container = document.getElementById('listaMetodos');
    if (!container) {
        console.error('Container del modal no encontrado para devolución');
        return;
    }
    
    const headerTitle = document.querySelector('.modal-header h2');
    const bodyText = document.querySelector('.modal-body p');
    
    if (headerTitle) headerTitle.textContent = `Devolver Equipo ${item.nombre}`;
    if (bodyText) bodyText.textContent = 'Información del Préstamo Activo:';

    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    form.innerHTML = `
        <div class="readonly-info" style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            <p style="margin: 0 0 8px 0;"><strong>Estudiante:</strong></p>
            <div class="info-content" style="margin-bottom: 12px; padding: 5px; background: white; border-radius: 3px;">${item.nombreCompleto || 'Sin información'}</div>
            
            <p style="margin: 0 0 8px 0;"><strong>Documento:</strong></p>
            <div class="info-content" style="margin-bottom: 12px; padding: 5px; background: white; border-radius: 3px;">${item.documento || 'Sin información'}</div>
            
            <p style="margin: 0 0 8px 0;"><strong>Curso:</strong></p>
            <div class="info-content" style="margin-bottom: 12px; padding: 5px; background: white; border-radius: 3px;">${item.curso || 'Sin información'}</div>
            
            <p style="margin: 0 0 8px 0;"><strong>Profesor(a):</strong></p>
            <div class="info-content" style="margin-bottom: 12px; padding: 5px; background: white; border-radius: 3px;">${item.profesor || 'Sin profesor'}</div>
            
            <p style="margin: 0 0 8px 0;"><strong>Materia:</strong></p>
            <div class="info-content" style="margin-bottom: 0; padding: 5px; background: white; border-radius: 3px;">${item.materia || 'Sin materia'}</div>
        </div>
        <div>
            <label for="comentario">Comentario de Devolución (opcional):</label>
            <textarea id="comentario" rows="4" placeholder="Observaciones sobre el estado del equipo..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        </div>`;

    form.appendChild(crearBotones('Registrar Devolución', 'delete-modal-btn', async () => {
        const comentarioElement = document.getElementById('comentario');
        const comentario = comentarioElement ? comentarioElement.value.trim() : '';
        
        if (confirm(`¿Confirma la devolución del equipo ${item.nombre}?`)) {
            
            // Registrar devolución en BaseB con comentario
            await api.guardarDevolucion(item, comentario);
            
            // Limpiar item local
            Object.assign(item, {
                documento: "", 
                profesor: "", 
                materia: "",
                nombreCompleto: "",
                curso: ""
            });
            
            if (comentario) {
                console.log(`Devolución equipo ${item.nombre} - Comentario: ${comentario}`);
            }
            
            cerrarModal();
            actualizarVista();
        }
    }));

    container.innerHTML = '';
    container.appendChild(form);
    modal.style.display = 'block';
    
    console.log('Modal de devolución mostrado'); // Debug
}

// --- UI FUNCTIONS ---
const actualizarVista = () => crearGrilla();

function crearGrilla() {
    const contenedor = document.getElementById("malla");
    if (!contenedor) {
        console.error('Contenedor "malla" no encontrado');
        return;
    }
    
    contenedor.innerHTML = items.map(item => {
        const ocupado = item.documento && item.documento.trim() !== "";
        return `<div class="ramo" 
                    style="background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; 
                           border-color: ${ocupado ? '#28a745' : '#ccc'}; 
                           cursor: pointer;
                           padding: 10px;
                           margin: 5px;
                           border: 2px solid;
                           border-radius: 5px;
                           text-align: center;" 
                    onclick="mostrarModalItem('${item.id}')"
                    title="${ocupado ? 'Click para devolver' : 'Click para prestar'}">
                    <div style="font-weight: bold; font-size: 1.1em;">${item.nombre}</div>
                    <div style="color: ${ocupado ? 'green' : '#6c757d'}; font-size: 1.2em; margin: 5px 0;">${ocupado ? '✓ Prestado' : '○ Disponible'}</div>
                    ${ocupado ? `<div style="font-size: 0.8em; color: #666; margin-top: 5px; word-break: break-word;">${item.nombreCompleto}</div>` : ''}
                </div>`;
    }).join('');
}

function resetearMalla() {
    if (confirm("⚠️ ATENCIÓN: Esto registrará la devolución de TODOS los equipos prestados. ¿Estás seguro?")) {
        const comentarioMasivo = prompt("Comentario para devolución masiva (opcional):", "Devolución masiva - Fin de jornada");
        
        items.forEach(async item => {
            if (item.documento && item.documento.trim() !== "") {
                await api.guardarDevolucion(item, comentarioMasivo || '');
                Object.assign(item, {
                    documento: "", 
                    profesor: "", 
                    materia: "",
                    nombreCompleto: "",
                    curso: ""
                });
            }
        });
        setTimeout(actualizarVista, 1000); // Dar tiempo para que se procesen las devoluciones
    }
}

const cerrarModal = () => {
    const modal = document.getElementById('modalMetodos');
    if (modal) {
        modal.style.display = 'none';
    }
};

// --- EVENT LISTENERS ---
window.onclick = e => {
    const modal = document.getElementById('modalMetodos');
    if (modal && e.target === modal) {
        cerrarModal();
    }
};

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        cerrarModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando aplicación');
    api.cargarEquipos();
    setInterval(api.cargarEquipos, 30000);
});
