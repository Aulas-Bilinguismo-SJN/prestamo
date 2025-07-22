const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`, nombre: `${i+1}`, documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPkJVdzy3dmbyfT8jUbaBbETPQc4aDoUGJUVqcsCRYUR8iU48rVCpU2_Va_mz1wtKIJA/exec';

const formatearFecha = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
};

const api = {
    async cargarEquipos() {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseB`).then(r => r.json());
            items.forEach(item => Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""}));
            
            const estados = {};
            data?.forEach(fila => {
                if (fila.length >= 8) {
                    const [timestamp, equipo, nombreCompleto, documento, curso, profesor, materia, tipo] = fila;
                    if (equipo && tipo && (!estados[equipo] || new Date(timestamp) > new Date(estados[equipo].timestamp))) {
                        estados[equipo] = {timestamp, nombreCompleto, documento, curso, profesor, materia, tipo};
                    }
                }
            });
            
            Object.entries(estados).forEach(([numero, estado]) => {
                if (estado.tipo === "Préstamo") {
                    const item = items.find(i => i.nombre === numero);
                    if (item) Object.assign(item, estado);
                }
            });
            
            actualizarVista();
        } catch (error) { 
            console.error("Error al cargar:", error);
            actualizarVista();
        }
    },

    async buscarEstudiante(documento) {
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`);
            const data = await response.json();
            
            if (data && data.encontrado === true) {
                return {
                    nombreCompleto: data.nombreCompleto || 'Sin nombre',
                    documento: data.documento || documento,
                    curso: data.curso || 'Sin curso',
                    encontrado: true
                };
            }
            return {encontrado: false, error: data.error || 'Estudiante no encontrado'};
            
        } catch (error) {
            return {encontrado: false, error: `Error de conexión: ${error.message}`};
        }
    },

    async guardar(item, tipo, datosEstudiante = null, comentario = '') {
        const datos = {
            action: 'saveToBaseB', marcaTemporal: formatearFecha(), equipo: item.nombre,
            nombreCompleto: datosEstudiante?.nombreCompleto || item.nombreCompleto || '',
            documento: datosEstudiante?.documento || item.documento,
            curso: datosEstudiante?.curso || item.curso || '',
            profesorEncargado: item.profesor, materia: item.materia, tipo, comentario
        };
        
        try {
            await fetch(SCRIPT_URL, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)});
        } catch (error) {
            console.error(`Error al guardar ${tipo}:`, error);
        }
    }
};

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    let modal = document.getElementById('modalMetodos');
    
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
    
    const container = document.getElementById('listaMetodos');
    if (!modal || !container) {
        console.error('Modal o container no encontrado después de crear');
        return;
    }
    
    const esDevolucion = !!item.documento.trim();
    
    // Actualizar título y descripción del modal
    const header = modal.querySelector('.modal-header h2');
    const bodyP = modal.querySelector('.modal-body p');
    if (header) header.textContent = `${esDevolucion ? 'Devolver' : 'Prestar'} Equipo ${item.nombre}`;
    if (bodyP) bodyP.textContent = esDevolucion ? 'Información del Préstamo Activo:' : 'Complete la información del Préstamo:';

    if (esDevolucion) {
        // Modal para devolución
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
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
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnGuardar" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Registrar Devolución</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancelar</button>
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
        // Modal para préstamo
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
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
                    <button id="btnGuardar" style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Registrar Préstamo</button>
                    <button id="btnCancelar" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                </div>
            </div>`;

        let datosEstudiante = {}, timer;
        
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
                alert('Complete todos los campos: Documento, Profesor y Materia');
                return;
            }
            
            if (!datosEstudiante.encontrado && Object.keys(datosEstudiante).length === 0) {
                if (!confirm('No se encontró información del estudiante. ¿Desea continuar con el registro manual?')) return;
                datosEstudiante = {documento: doc, nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
            }
            
            Object.assign(item, {documento: doc, profesor: prof, materia: mat, nombreCompleto: datosEstudiante.nombreCompleto, curso: datosEstudiante.curso});
            
            await api.guardar(item, 'Préstamo', datosEstudiante);
            cerrarModal(); 
            actualizarVista();
        };
    }

    // Asignar evento al botón cancelar
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCancelar) {
        btnCancelar.onclick = cerrarModal;
    }
    
    // Mostrar el modal
    modal.style.display = 'block';
    console.log('Modal mostrado para item:', item.nombre, 'Tipo:', esDevolucion ? 'Devolución' : 'Préstamo');
}

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

const actualizarVista = () => {
    const contenedor = document.getElementById("malla");
    if (!contenedor) return console.error('Error: No se encontró el elemento con id "malla"');
    
    contenedor.innerHTML = items.map(item => {
        const ocupado = !!item.documento;
        return `
            <div class="ramo" style="background-color: ${ocupado ? '#d4edda' : '#f8f9fa'}; border: 2px solid ${ocupado ? '#28a745' : '#ccc'}; border-radius: 8px; padding: 15px; margin: 5px; cursor: pointer; text-align: center; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: all 0.3s ease;" 
                 onclick="mostrarModalItem('${item.id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; font-size: 1.2em;">${item.nombre}</div>
                <div style="color: ${ocupado ? 'green' : '#6c757d'}; font-size: 1.5em; margin: 5px 0;">${ocupado ? '✓' : '○'}</div>
                ${ocupado ? `<div style="font-size: 0.8em; color: #666; margin-top: 5px; text-align: center;"><strong>${item.nombreCompleto || 'Sin nombre'}</strong><br><small>${item.curso || 'Sin curso'}</small></div>` : ''}
            </div>`;
    }).join('');
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

const cerrarModal = () => {
    const modal = document.getElementById('modalMetodos');
    if (modal) {
        modal.style.display = 'none';
        console.log('Modal cerrado');
    }
};

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

document.addEventListener('DOMContentLoaded', () => {
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

// Función de debug
window.debugItems = () => {
    console.log('Items:', items);
    console.log('Malla:', document.getElementById('malla'));
    console.log('Modal:', document.getElementById('modalMetodos'));
};
