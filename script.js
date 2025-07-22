const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`, nombre: `${i+1}`, documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPkJVdzy3dmbyfT8jUbaBbETPQc4aDoUGJUVqcsCRYUR8iU48rVCpU2_Va_mz1wtKIJA/exec';

// Fecha formato: dd/mm/yyyy hh:mm:ss (Colombia UTC-5)
const formatFecha = () => {
    const d = new Date(Date.now() - 5*60*60*1000);
    return `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCFullYear()} ${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}:${d.getUTCSeconds().toString().padStart(2,'0')}`;
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
                    if (item) Object.assign(item, {documento: estado.documento||"", profesor: estado.profesor||"", materia: estado.materia||"", nombreCompleto: estado.nombreCompleto||"", curso: estado.curso||""});
                    if (item) Object.assign(item, estado);
                }
            });

            
            actualizarVista();
        } catch (error) { 
            console.error("Error:", error);
            console.error("Error al cargar:", error);
            actualizarVista();
        }
    },

    async buscarEstudiante(doc) {
    async buscarEstudiante(documento) {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(doc)}`).then(r => r.json());
            return data?.encontrado ? {nombreCompleto: data.nombreCompleto||'Sin nombre', documento: data.documento||doc, curso: data.curso||'Sin curso', encontrado: true} : {encontrado: false, error: data.error||'No encontrado'};
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
            return {encontrado: false, error: `Error: ${error.message}`};
            return {encontrado: false, error: `Error de conexión: ${error.message}`};
        }
    },

    async guardar(item, tipo, datosEst = null, comentario = '') {
    async guardar(item, tipo, datosEstudiante = null, comentario = '') {
        const datos = {
            action: 'saveToBaseB', marcaTemporal: formatearFecha(), equipo: item.nombre,
            nombreCompleto: datosEstudiante?.nombreCompleto || item.nombreCompleto || '',
            documento: datosEstudiante?.documento || item.documento,
            curso: datosEstudiante?.curso || item.curso || '',
            profesorEncargado: item.profesor, materia: item.materia, tipo, comentario
        };

        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({
                    action: 'saveToBaseB', marcaTemporal: formatFecha(), equipo: item.nombre,
                    nombreCompleto: datosEst?.nombreCompleto || item.nombreCompleto || '',
                    documento: datosEst?.documento || item.documento, curso: datosEst?.curso || item.curso || '',
                    profesorEncargado: item.profesor, materia: item.materia, tipo, comentario
                })
            });
        } catch (error) { console.error(`Error ${tipo}:`, error); }
            await fetch(SCRIPT_URL, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)});
        } catch (error) {
            console.error(`Error al guardar ${tipo}:`, error);
        }
    }
};

function mostrarModalItem(itemId) {
    const item = items.find(i => i.id === itemId);
    const modal = document.getElementById('modalMetodos');
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
    if (!item || !modal || !container) return;
    if (!modal || !container) {
        console.error('Modal o container no encontrado después de crear');
        return;
    }

    const prestado = !!(item.documento?.trim());
    document.querySelector('.modal-header h2').textContent = `${prestado ? 'Devolver' : 'Prestar'} Equipo ${item.nombre}`;
    const esDevolucion = !!item.documento.trim();

    if (prestado) {
        // Modal Devolución
        container.innerHTML = `<div style="display:flex;flex-direction:column;gap:15px;">
            <div style="background:#f8f9fa;padding:15px;border-radius:5px;border:1px solid #e9ecef;">
                ${['Estudiante','Documento','Curso','Profesor(a)','Materia'].map((label,i) => 
                    `<p><strong>${label}:</strong></p><div style="margin-bottom:10px;padding:5px;background:white;border-radius:3px;">${[item.nombreCompleto||'Sin info', item.documento, item.curso||'Sin info', item.profesor||'Sin info', item.materia||'Sin info'][i]}</div>`
                ).join('')}
            </div>
            <div><label>Comentario (opcional):</label><textarea id="comentario" rows="3" placeholder="Observaciones..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"></textarea></div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="btnGuardar" style="background:#dc3545;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Devolver</button>
                <button id="btnCancelar" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Cancelar</button>
            </div></div>`;
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
            if (confirm(`¿Confirma devolución del equipo ${item.nombre}?`)) {
                await api.guardar(item, 'Devuelto', null, document.getElementById('comentario').value.trim());
                Object.assign(item, {documento:"", profesor:"", materia:"", nombreCompleto:"", curso:""});
                cerrarModal(); actualizarVista(); setTimeout(api.cargarEquipos, 1500);
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
        // Modal Préstamo
        container.innerHTML = `<div style="display:flex;flex-direction:column;gap:15px;">
            ${['documento|Documento del Estudiante|Ingrese documento...','profesor|Profesor(a) Encargado|Nombre del profesor...','materia|Materia|Nombre de la materia...'].map(field => {
                const [id, label, placeholder] = field.split('|');
                return `<div><label>${label}:</label><input type="text" id="${id}" placeholder="${placeholder}" value="${item[id]||''}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
                ${id==='documento'?'<small id="buscarInfo" style="color:#6c757d;">Ingrese documento para buscar</small>':''}
                </div>`;
            }).join('')}
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="btnGuardar" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Prestar</button>
                <button id="btnCancelar" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Cancelar</button>
            </div></div>`;

        let datosEst = {}, timer;
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
            const doc = e.target.value.trim(), info = document.getElementById('buscarInfo');
            clearTimeout(timer); datosEst = {};
            const doc = e.target.value.trim();
            const info = document.getElementById('buscarInfo');
            clearTimeout(timer); datosEstudiante = {};
            clearTimeout(timer); 
            datosEstudiante = {};

            if (doc.length >= 3) {
                info.textContent = 'Buscando...'; info.style.color = '#ffc107';
                info.textContent = 'Validando documento...'; info.style.color = '#ffc107';
                info.textContent = 'Validando documento...'; 
                info.style.color = '#ffc107';
                timer = setTimeout(async () => {
                    const result = await api.buscarEstudiante(doc);
                    if (result.encontrado) {
                        datosEst = result;
                        info.textContent = `✓ ${result.nombreCompleto} - ${result.curso}`;
                        datosEstudiante = result;
                        info.textContent = `✓ Estudiante: ${result.nombreCompleto} - Curso: ${result.curso}`;
                        info.style.color = '#28a745';
                    } else {
                        info.textContent = `⚠ ${result.error}`;
                        info.textContent = result.error ? `⚠ Error: ${result.error}` : '⚠ Documento no encontrado - Verifique el número';
                        info.style.color = '#dc3545';
                    }
                }, 800);
            } else info.textContent = 'Ingrese documento para buscar', info.style.color = '#6c757d';
            } else if (!doc.length) {
                info.textContent = 'Ingrese el Documento para buscar automáticamente';
                info.style.color = '#6c757d';
            }
        };

        document.getElementById('btnGuardar').onclick = async () => {
            const vals = ['documento','profesor','materia'].map(id => document.getElementById(id).value.trim());
            if (vals.some(v => !v)) return alert('Complete todos los campos');
            const [doc, prof, mat] = ['documento', 'profesor', 'materia'].map(id => document.getElementById(id).value.trim());

            
            if (!doc || !prof || !mat) return alert('Complete todos los campos: Documento, Profesor y Materia');
            if (!doc || !prof || !mat) {
                alert('Complete todos los campos: Documento, Profesor y Materia');
                return;
            }

            
            if (!datosEstudiante.encontrado && Object.keys(datosEstudiante).length === 0) {
                if (!confirm('No se encontró información del estudiante. ¿Desea continuar con el registro manual?')) return;
                datosEstudiante = {documento: doc, nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
            }

            if (!datosEst.encontrado && !Object.keys(datosEst).length && !confirm('Estudiante no encontrado. ¿Continuar?')) return;
            if (!datosEst.encontrado) datosEst = {documento: vals[0], nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
            Object.assign(item, {documento: doc, profesor: prof, materia: mat, nombreCompleto: datosEstudiante.nombreCompleto, curso: datosEstudiante.curso});

            Object.assign(item, {documento: vals[0], profesor: vals[1], materia: vals[2], nombreCompleto: datosEst.nombreCompleto||'Manual', curso: datosEst.curso||'Por verificar'});
            await api.guardar(item, 'Préstamo', datosEst);
            cerrarModal(); actualizarVista(); setTimeout(api.cargarEquipos, 1500);
            await api.guardar(item, 'Préstamo', datosEstudiante);
            cerrarModal(); actualizarVista();
            cerrarModal(); 
            actualizarVista();
        };
    }

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
    if (!contenedor) return;
    if (!contenedor) return console.error('Error: No se encontró el elemento con id "malla"');

    contenedor.innerHTML = items.map(item => {
        const ocupado = !!(item.documento?.trim());
        return `<div class="ramo" style="background:${ocupado?'#d4edda':'#f8f9fa'};border:2px solid ${ocupado?'#28a745':'#ccc'};border-radius:8px;padding:15px;margin:5px;cursor:pointer;text-align:center;min-height:80px;display:flex;flex-direction:column;justify-content:center;align-items:center;transition:all 0.3s ease;" 
            onclick="mostrarModalItem('${item.id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-weight:bold;font-size:1.2em;">Equipo ${item.nombre}</div>
            <div style="color:${ocupado?'green':'#6c757d'};font-size:1.5em;margin:5px 0;">${ocupado?'✓ PRESTADO':'○ DISPONIBLE'}</div>
            ${ocupado ? `<div style="font-size:0.8em;color:#666;margin-top:5px;text-align:center;"><strong>${item.nombreCompleto||'Sin nombre'}</strong><br><small>${item.curso||'Sin curso'}</small><br><small style="color:#888;">Doc: ${item.documento}</small></div>` : ''}
        </div>`;
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
    if (confirm("⚠️ Devolución masiva. ¿Seguro?")) {
        const comentario = prompt("Comentario:", "Devolución masiva") || '';
    if (confirm("⚠️ ATENCIÓN: Esto registrará la devolución de TODOS los equipos prestados. ¿Estás seguro?")) {
        const comentario = prompt("Comentario para devolución masiva (opcional):", "Devolución masiva - Fin de jornada") || '';
        items.forEach(async item => {
            if (item.documento?.trim()) {
            if (item.documento) {
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento:"", profesor:"", materia:"", nombreCompleto:"", curso:""});
                Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
            }
        });
        setTimeout(() => { actualizarVista(); api.cargarEquipos(); }, 2000);
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

// Eventos
window.onclick = e => e.target === document.getElementById('modalMetodos') && cerrarModal();
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarModal());
document.addEventListener('DOMContentLoaded', () => {
    const [malla, modal] = ['malla','modalMetodos'].map(id => document.getElementById(id));
    if (!malla || !modal) return console.error('Elementos DOM faltantes');
    actualizarVista(); api.cargarEquipos(); setInterval(api.cargarEquipos, 30000);
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

// Debug
window.debugItems = () => console.log('Items:', items.filter(i => i.documento?.trim()));
window.debugItems = () => console.log('Items:', items, 'Malla:', document.getElementById('malla'), 'Modal:', document.getElementById('modalMetodos'));
// Función de debug
window.debugItems = () => {
    console.log('Items:', items);
    console.log('Malla:', document.getElementById('malla'));
    console.log('Modal:', document.getElementById('modalMetodos'));
};
