const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`,
    nombre: `${i+1}`,
    documento: "",
    profesor: "",
    materia: "",
    nombreCompleto: "",
    curso: ""
    id: `item_${i+1}`, nombre: `${i+1}`, documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdigcfuoeHycEROAQ2zfjDAqdrBo0QxjzZNs0AmqqA86PVCsAetPDfp4gP9E3TFGZf7w/exec';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPkJVdzy3dmbyfT8jUbaBbETPQc4aDoUGJUVqcsCRYUR8iU48rVCpU2_Va_mz1wtKIJA/exec';

const formatearFecha = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
};

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
            
            items.forEach(item => Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""}));

            const estados = {};
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
                    const [timestamp, equipo, nombreCompleto, documento, curso, profesor, materia, tipo] = fila;
                    if (equipo && tipo && (!estados[equipo] || new Date(timestamp) > new Date(estados[equipo].timestamp))) {
                        estados[equipo] = {timestamp, nombreCompleto, documento, curso, profesor, materia, tipo};
                    }
                }
            });
            
            // Aplicar solo los equipos que están en "Préstamo" (último registro)
            Object.entries(estadosEquipos).forEach(([numeroEquipo, estado]) => {

            Object.entries(estados).forEach(([numero, estado]) => {
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
                    const item = items.find(i => i.nombre === numero);
                    if (item) Object.assign(item, estado);
                }
            });
            

            actualizarVista();
        } catch (error) { 
            console.error("Error al cargar equipos:", error); 
            console.error("Error al cargar:", error);
            actualizarVista();
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
            
            const response = await fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`);
            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            if (data && (data.encontrado === true || data.encontrado === 'true')) {

            if (data && data.encontrado === true) {
                return {
                    nombreCompleto: data.nombreCompleto || data.nombre || '',
                    nombreCompleto: data.nombreCompleto || 'Sin nombre',
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
                    curso: data.curso || 'Sin curso',
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
            return {encontrado: false, error: data.error || 'Estudiante no encontrado'};

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
            return {encontrado: false, error: `Error de conexión: ${error.message}`};
        }
    },

    async guardarDevolucion(item, comentario = '') {
    async guardar(item, tipo, datosEstudiante = null, comentario = '') {
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
            action: 'saveToBaseB', marcaTemporal: formatearFecha(), equipo: item.nombre,
            nombreCompleto: datosEstudiante?.nombreCompleto || item.nombreCompleto || '',
            documento: datosEstudiante?.documento || item.documento,
            curso: datosEstudiante?.curso || item.curso || '',
            profesorEncargado: item.profesor, materia: item.materia, tipo, comentario
        };
        

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos)
            });
            console.log('Devolución registrada:', datos);
            await fetch(SCRIPT_URL, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)});
        } catch (error) {
            console.error("Error al guardar devolución:", error);
            console.error(`Error al guardar ${tipo}:`, error);
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
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.documento.trim()) return mostrarModalDesmarcar(itemId);

    const modal = document.getElementById('modalMetodos');
    const container = document.getElementById('listaMetodos');
    let modal = document.getElementById('modalMetodos');

    document.querySelector('.modal-header h2').textContent = `Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Complete la información del Préstamo:';
    if (!item) {
        console.error('Item no encontrado:', itemId);
        return;
    }
    
    // Si el modal no existe, crearlo
    if (!modal) {
        console.log('Modal no encontrado, creándolo...');
        crearModal();
        modal = document.getElementById('modalMetodos');
    }

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
    form.querySelector('#documento').oninput = async (e) => {
        const doc = e.target.value.trim();
        const info = document.getElementById('buscarInfo');
        
        clearTimeout(timer);
        datosEstudiante = {}; // Reset datos
        
        if (doc.length >= 3) {
            info.textContent = 'Validando documento...';
            info.style.color = '#ffc107';
            
            timer = setTimeout(async () => {
                try {
    const container = document.getElementById('listaMetodos');
    if (!item || !modal || !container) return;
    if (!modal || !container) {
        console.error('Modal o container no encontrado después de crear');
        return;
    }

    const esDevolucion = !!item.documento.trim();

    const header = document.querySelector('.modal-header h2');
    const bodyP = document.querySelector('.modal-body p');
    // Actualizar título y descripción del modal
    const header = modal.querySelector('.modal-header h2');
    const bodyP = modal.querySelector('.modal-body p');
    if (header) header.textContent = `${esDevolucion ? 'Devolver' : 'Prestar'} Equipo ${item.nombre}`;
    if (bodyP) bodyP.textContent = esDevolucion ? 'Información del Préstamo Activo:' : 'Complete la información del Préstamo:';

    if (esDevolucion) {
        // Modal para devolución
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div class="readonly-info">
                    <p><strong>Estudiante:</strong></p><div class="info-content">${item.nombreCompleto || 'Sin información'}</div>
                    <p><strong>Documento:</strong></p><div class="info-content">${item.documento}</div>
                    <p><strong>Curso:</strong></p><div class="info-content">${item.curso || 'Sin información'}</div>
                    <p><strong>Profesor(a):</strong></p><div class="info-content">${item.profesor || 'Sin profesor'}</div>
                    <p><strong>Materia:</strong></p><div class="info-content">${item.materia || 'Sin materia'}</div>
                <div class="readonly-info" style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                    <div style="margin-bottom: 10px;"><strong>Estudiante:</strong> ${item.nombreCompleto || 'Sin información'}</div>
                    <div style="margin-bottom: 10px;"><strong>Documento:</strong> ${item.documento}</div>
                    <div style="margin-bottom: 10px;"><strong>Curso:</strong> ${item.curso || 'Sin información'}</div>
                    <div style="margin-bottom: 10px;"><strong>Profesor(a):</strong> ${item.profesor || 'Sin profesor'}</div>
                    <div><strong>Materia:</strong> ${item.materia || 'Sin materia'}</div>
                </div>
                <div>
                    <label for="comentario" style="display: block; margin-bottom: 5px; font-weight: bold;">Comentario de Devolución (opcional):</label>
                    <textarea id="comentario" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" placeholder="Observaciones sobre el estado del equipo..."></textarea>
                </div>
                <div><label for="comentario">Comentario de Devolución (opcional):</label>
                <textarea id="comentario" rows="4" placeholder="Observaciones sobre el estado del equipo..."></textarea></div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnGuardar" style="background-color: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Registrar Devolución</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    <button id="btnGuardar" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Registrar Devolución</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                </div>
            </div>`;

        document.getElementById('btnGuardar').onclick = async () => {
            const comentario = document.getElementById('comentario').value.trim();
            if (confirm(`¿Confirma la devolución del equipo ${item.nombre}?`)) {
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
                cerrarModal(); actualizarVista();
                cerrarModal(); 
                actualizarVista();
            }
        };
    } else {
        // Modal para préstamo
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div><label for="documento">Documento del Estudiante:</label>
                <input type="text" id="documento" placeholder="Ingrese el número de documento...">
                <small id="buscarInfo" style="color: #6c757d;">Ingrese el Documento para buscar automáticamente</small></div>
                <div><label for="profesor">Profesor(a) Encargado:</label>
                <input type="text" id="profesor" placeholder="Ingrese el nombre del profesor(a)..." value="${item.profesor}"></div>
                <div><label for="materia">Materia:</label>
                <input type="text" id="materia" placeholder="Ingrese la materia..." value="${item.materia}"></div>
                <div>
                    <label for="documento" style="display: block; margin-bottom: 5px; font-weight: bold;">Documento del Estudiante:</label>
                    <input type="text" id="documento" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ingrese el número de documento...">
                    <small id="buscarInfo" style="color: #6c757d; display: block; margin-top: 5px;">Ingrese el Documento para buscar automáticamente</small>
                </div>
                <div>
                    <label for="profesor" style="display: block; margin-bottom: 5px; font-weight: bold;">Profesor(a) Encargado:</label>
                    <input type="text" id="profesor" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ingrese el nombre del profesor(a)..." value="${item.profesor}">
                </div>
                <div>
                    <label for="materia" style="display: block; margin-bottom: 5px; font-weight: bold;">Materia:</label>
                    <input type="text" id="materia" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ingrese la materia..." value="${item.materia}">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnGuardar" style="background-color: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Registrar Préstamo</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    <button id="btnGuardar" style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Registrar Préstamo</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                </div>
            </div>`;

        let datosEstudiante = {}, timer;

        document.getElementById('documento').oninput = async (e) => {
            const doc = e.target.value.trim();
            const info = document.getElementById('buscarInfo');
            clearTimeout(timer); datosEstudiante = {};
            clearTimeout(timer); 
            datosEstudiante = {};

            if (doc.length >= 3) {
                info.textContent = 'Validando documento...'; info.style.color = '#ffc107';
                info.textContent = 'Validando documento...'; 
                info.style.color = '#ffc107';
                timer = setTimeout(async () => {
                    const result = await api.buscarEstudiante(doc);
                    console.log('Resultado de validación:', result);
                    
                    if (result.encontrado) {
                        datosEstudiante = {
                            nombreCompleto: result.nombreCompleto,
                            documento: result.documento,
                            curso: result.curso
                        };
                        datosEstudiante = result;
                        info.textContent = `✓ Estudiante: ${result.nombreCompleto} - Curso: ${result.curso}`;
                        info.style.color = '#28a745';
                    } else {
                        if (result.error) {
                            info.textContent = `⚠ Error: ${result.error}`;
                        } else {
                            info.textContent = '⚠ Documento no encontrado - Verifique el número';
                        }
                        info.textContent = result.error ? `⚠ Error: ${result.error}` : '⚠ Documento no encontrado - Verifique el número';
                        info.style.color = '#dc3545';
                    }
                } catch (error) {
                    console.error('Error en validación:', error);
                    info.textContent = '⚠ Error en validación - Intente nuevamente';
                    info.style.color = '#dc3545';
                }
            }, 800);
            
        } else if (!doc.length) {
            info.textContent = 'Ingrese el Documento para buscar automáticamente';
            info.style.color = '#6c757d';
        }
    };
                }, 800);
            } else if (!doc.length) {
                info.textContent = 'Ingrese el Documento para buscar automáticamente';
                info.style.color = '#6c757d';
            }
        };

    form.appendChild(crearBotones('Registrar Préstamo', '', async () => {
        const [doc, prof, mat] = ['documento', 'profesor', 'materia'].map(id => document.getElementById(id).value.trim());
        
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
}
        document.getElementById('btnGuardar').onclick = async () => {
            const [doc, prof, mat] = ['documento', 'profesor', 'materia'].map(id => document.getElementById(id).value.trim());

function mostrarModalDesmarcar(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
            if (!doc || !prof || !mat) return alert('Complete todos los campos: Documento, Profesor y Materia');
            if (!doc || !prof || !mat) {
                alert('Complete todos los campos: Documento, Profesor y Materia');
                return;
            }

    const modal = document.getElementById('modalMetodos');
    const container = document.getElementById('listaMetodos');
    
    document.querySelector('.modal-header h2').textContent = `Devolver Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Información del Préstamo Activo:';

    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    form.innerHTML = `<div class="readonly-info">
        <p><strong>Estudiante:</strong></p><div class="info-content">${item.nombreCompleto || 'Sin información'}</div>
        <p><strong>Documento:</strong></p><div class="info-content">${item.documento || 'Sin información'}</div>
        <p><strong>Curso:</strong></p><div class="info-content">${item.curso || 'Sin información'}</div>
        <p><strong>Profesor(a):</strong></p><div class="info-content">${item.profesor || 'Sin profesor'}</div>
        <p><strong>Materia:</strong></p><div class="info-content">${item.materia || 'Sin materia'}</div>
    </div>
    <div><label for="comentario">Comentario de Devolución (opcional):</label>
    <textarea id="comentario" rows="4" placeholder="Observaciones sobre el estado del equipo..."></textarea></div>`;

    form.appendChild(crearBotones('Registrar Devolución', 'delete-modal-btn', async () => {
        const comentario = document.getElementById('comentario').value.trim();
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
            if (!datosEstudiante.encontrado && Object.keys(datosEstudiante).length === 0) {
                if (!confirm('No se encontró información del estudiante. ¿Desea continuar con el registro manual?')) return;
                datosEstudiante = {documento: doc, nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
            }
            
            cerrarModal();

            Object.assign(item, {documento: doc, profesor: prof, materia: mat, nombreCompleto: datosEstudiante.nombreCompleto, curso: datosEstudiante.curso});

            await api.guardar(item, 'Préstamo', datosEstudiante);
            cerrarModal(); actualizarVista();
            cerrarModal(); 
            actualizarVista();
        }
    }));
        };
    }

    container.innerHTML = '';
    container.appendChild(form);
    document.getElementById('btnCancelar').onclick = cerrarModal;
    // Asignar evento al botón cancelar
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCancelar) {
        btnCancelar.onclick = cerrarModal;
    }
    
    // Mostrar el modal
    modal.style.display = 'block';
    console.log('Modal mostrado para item:', item.nombre, 'Tipo:', esDevolucion ? 'Devolución' : 'Préstamo');
}

// --- UI FUNCTIONS ---
const actualizarVista = () => crearGrilla();
// Función para crear el modal si no existe
function crearModal() {
    if (document.getElementById('modalMetodos')) return;
    
    const modalHTML = `
        <div id="modalMetodos" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
            <div style="position: relative; background-color: white; margin: 5% auto; padding: 0; width: 90%; max-width: 600px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div class="modal-header" style="background-color: #f8f9fa; padding: 20px; border-bottom: 1px solid #dee2e6; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0; color: #333;">Gestión de Equipo</h2>
                    <span onclick="cerrarModal()" style="position: absolute; right: 20px; top: 20px; font-size: 28px; font-weight: bold; color: #999; cursor: pointer; user-select: none;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <p style="margin-bottom: 20px; color: #666;">Información del equipo:</p>
                    <div id="listaMetodos"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal creado exitosamente');
}

function crearGrilla() {
const actualizarVista = () => {
    const contenedor = document.getElementById("malla");
    if (!contenedor) return console.error('Error: No se encontró el elemento con id "malla"');

    contenedor.innerHTML = items.map(item => {
        const ocupado = !!item.documento;
        return `<div class="ramo" style="background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; border-color: ${ocupado ? '#28a745' : '#ccc'};" onclick="mostrarModalItem('${item.id}')">
                    <div style="font-weight: bold;">${item.nombre}</div>
                    <div style="color: ${ocupado ? 'green' : '#6c757d'};">${ocupado ? '✓' : '○'}</div>
                    ${ocupado ? `<div style="font-size: 0.8em; color: #666; margin-top: 5px;">${item.nombreCompleto}</div>` : ''}
                </div>`;
        return `
            <div class="ramo" style="background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; border: 2px solid ${ocupado ? '#28a745' : '#ccc'}; border-radius: 8px; padding: 15px; margin: 5px; cursor: pointer; text-align: center; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: all 0.3s ease;" 
                 onclick="mostrarModalItem('${item.id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; font-size: 1.2em;">${item.nombre}</div>
                <div style="color: ${ocupado ? 'green' : '#6c757d'}; font-size: 1.5em; margin: 5px 0;">${ocupado ? '✓' : '○'}</div>
                ${ocupado ? `<div style="font-size: 0.8em; color: #666; margin-top: 5px; text-align: center;"><strong>${item.nombreCompleto || 'Sin nombre'}</strong><br><small>${item.curso || 'Sin curso'}</small></div>` : ''}
            </div>`;
    }).join('');
}
};

function resetearMalla() {
    if (confirm("⚠️ ATENCIÓN: Esto registrará la devolución de TODOS los equipos prestados. ¿Estás seguro?")) {
        const comentarioMasivo = prompt("Comentario para devolución masiva (opcional):", "Devolución masiva - Fin de jornada");
        
        const comentario = prompt("Comentario para devolución masiva (opcional):", "Devolución masiva - Fin de jornada") || '';
        items.forEach(async item => {
            if (item.documento) {
                await api.guardarDevolucion(item, comentarioMasivo || '');
                Object.assign(item, {
                    documento: "", 
                    profesor: "", 
                    materia: "",
                    nombreCompleto: "",
                    curso: ""
                });
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
            }
        });
        setTimeout(actualizarVista, 1000); // Dar tiempo para que se procesen las devoluciones
        setTimeout(actualizarVista, 1000);
    }
}

const cerrarModal = () => document.getElementById('modalMetodos').style.display = 'none';
const cerrarModal = () => {
    const modal = document.getElementById('modalMetodos');
    if (modal) modal.style.display = 'none';
    if (modal) {
        modal.style.display = 'none';
        console.log('Modal cerrado');
    }
};

window.onclick = e => { if (e.target === document.getElementById('modalMetodos')) cerrarModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
// Event listeners
window.onclick = e => { 
    if (e.target === document.getElementById('modalMetodos')) {
        cerrarModal(); 
    }
};

document.addEventListener('keydown', e => { 
    if (e.key === 'Escape') {
        cerrarModal(); 
    }
});

// --- EVENT LISTENERS ---
window.onclick = e => e.target === document.getElementById('modalMetodos') && cerrarModal();
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarModal());
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('malla') || !document.getElementById('modalMetodos')) return console.error('Elementos requeridos no encontrados');
    console.log('DOM cargado, inicializando...');
    
    // Verificar elementos requeridos
    const malla = document.getElementById('malla');
    if (!malla) {
        console.error('Elemento "malla" no encontrado');
        return;
    }
    
    // Crear el modal si no existe
    crearModal();
    
    // Inicializar vista
    actualizarVista();
    api.cargarEquipos();
    
    // Configurar actualización automática cada 30 segundos
    setInterval(api.cargarEquipos, 30000);
    
    console.log('Aplicación inicializada correctamente');
});

window.debugItems = () => console.log('Items:', items, 'Malla:', document.getElementById('malla'), 'Modal:', document.getElementById('modalMetodos'));
// Función de debug
window.debugItems = () => {
    console.log('Items:', items);
    console.log('Malla:', document.getElementById('malla'));
    console.log('Modal:', document.getElementById('modalMetodos'));
};
