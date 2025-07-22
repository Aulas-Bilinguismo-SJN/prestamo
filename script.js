// === CONFIGURACIÓN ===
const items = Array.from({length: 50}, (_, i) => ({
    id: `item_${i+1}`,
    nombre: `${i+1}`,
    documento: "",
    profesor: "",
    materia: "",
    nombreCompleto: "",
    curso: ""
}));

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPkJVdzy3dmbyfT8jUbaBbETPQc4aDoUGJUVqcsCRYUR8iU48rVCpU2_Va_mz1wtKIJA/exec';
const formatearFecha = () => new Date().toLocaleString('es-CO', {timeZone: 'America/Bogota'});

// === API ===
const api = {
    async cargarEquipos() {
        try {
            const data = await fetch(`${SCRIPT_URL}?action=getBaseB`).then(r => r.json());
            
            // Reset items
            items.forEach(item => Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""}));
            
            // Procesar último estado por equipo
            const estados = {};
            data?.forEach(fila => {
                if (fila.length >= 8) {
                    const equipo = fila[1]?.toString();
                    const tipo = fila[7]?.toString();
                    const timestamp = fila[0];
                    
                    if (equipo && tipo && (!estados[equipo] || new Date(timestamp) > new Date(estados[equipo].timestamp))) {
                        estados[equipo] = {
                            timestamp, tipo,
                            nombreCompleto: fila[2] || "",
                            documento: fila[3] || "",
                            curso: fila[4] || "",
                            profesor: fila[5] || "",
                            materia: fila[6] || ""
                        };
                    }
                }
            });
            
            // Aplicar préstamos activos
            Object.entries(estados).forEach(([equipo, estado]) => {
                if (estado.tipo === "Préstamo") {
                    const item = items.find(i => i.nombre === equipo);
                    if (item) Object.assign(item, estado);
                }
            });
            
            actualizarVista();
        } catch (error) { 
            console.error("Error al cargar equipos:", error);
            actualizarVista();
        }
    },

    async buscarEstudiante(documento) {
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getBaseA&documento=${encodeURIComponent(documento)}`);
            const data = await response.json();
            
            if (data?.encontrado) return data;
            if (data?.length > 0) {
                const est = data[0];
                return {
                    nombreCompleto: est.nombreCompleto || est.nombre || est[1] || 'Sin nombre',
                    documento: est.documento || documento,
                    curso: est.curso || est[2] || 'Sin curso',
                    encontrado: true
                };
            }
            return {encontrado: false, error: 'Estudiante no encontrado'};
        } catch (error) {
            return {encontrado: false, error: error.message};
        }
    },

    async guardar(item, tipo, datosEstudiante = null, comentario = '') {
        const datos = {
            action: 'saveToBaseB',
            marcaTemporal: formatearFecha(),
            equipo: item.nombre,
            nombreCompleto: datosEstudiante?.nombreCompleto || item.nombreCompleto || '',
            documento: datosEstudiante?.documento || item.documento,
            curso: datosEstudiante?.curso || item.curso || '',
            profesorEncargado: item.profesor,
            materia: item.materia,
            tipo, comentario
        };
        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(datos)
            });
            console.log(`${tipo} registrado:`, datos);
        } catch (error) {
            console.error(`Error al guardar ${tipo}:`, error);
        }
    }
};

// === MODAL ===
let modal = null;

const crearModal = () => {
    if (modal) return modal;
    
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.innerHTML = `
        <div style="position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none;" onclick="cerrarModal(event)">
            <div style="background: white; margin: 5% auto; padding: 0; width: 90%; max-width: 600px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
                <div class="header" style="background: #f8f9fa; padding: 20px; border-bottom: 1px solid #dee2e6; border-radius: 8px 8px 0 0; position: relative;">
                    <h2 style="margin: 0; color: #333;" id="modalTitulo">Gestión de Equipo</h2>
                    <span onclick="cerrarModal()" style="position: absolute; right: 20px; top: 20px; font-size: 28px; font-weight: bold; color: #999; cursor: pointer;">&times;</span>
                </div>
                <div class="body" style="padding: 20px;" id="modalBody"></div>
            </div>
        </div>`;
    
    document.body.appendChild(modal);
    return modal;
};

const mostrarModal = (item) => {
    if (!modal) crearModal();
    
    const esDevolucion = !!item.documento.trim();
    const titulo = document.getElementById('modalTitulo');
    const body = document.getElementById('modalBody');
    
    titulo.textContent = `${esDevolucion ? 'Devolver' : 'Prestar'} Equipo ${item.nombre}`;
    
    if (esDevolucion) {
        // Modal devolución simplificado
        body.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-bottom: 15px;">
                <div><strong>Estudiante:</strong> ${item.nombreCompleto}</div>
                <div><strong>Documento:</strong> ${item.documento}</div>
                <div><strong>Curso:</strong> ${item.curso}</div>
                <div><strong>Profesor:</strong> ${item.profesor}</div>
                <div><strong>Materia:</strong> ${item.materia}</div>
            </div>
            <textarea id="comentario" placeholder="Comentario (opcional)..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;" rows="3"></textarea>
            <div style="text-align: right;">
                <button onclick="cerrarModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-right: 10px;">Cancelar</button>
                <button onclick="confirmarDevolucion('${item.id}')" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px;">Devolver</button>
            </div>`;
    } else {
        // Modal préstamo simplificado
        body.innerHTML = `
            <div style="margin-bottom: 15px;">
                <input type="text" id="documento" placeholder="Documento del estudiante" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 5px;">
                <small id="buscarInfo" style="color: #6c757d;">Ingrese el documento para buscar</small>
            </div>
            <input type="text" id="profesor" placeholder="Profesor encargado" value="${item.profesor}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;">
            <input type="text" id="materia" placeholder="Materia" value="${item.materia}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;">
            <div style="text-align: right;">
                <button onclick="cerrarModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-right: 10px;">Cancelar</button>
                <button onclick="confirmarPrestamo('${item.id}')" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px;">Prestar</button>
            </div>`;
        
        configurarBusqueda();
    }
    
    modal.firstElementChild.style.display = 'block';
};

// Variables para búsqueda
let datosEstudiante = {}, timer;

const configurarBusqueda = () => {
    const docInput = document.getElementById('documento');
    const info = document.getElementById('buscarInfo');
    
    docInput.oninput = (e) => {
        const doc = e.target.value.trim();
        clearTimeout(timer);
        datosEstudiante = {};
        
        if (doc.length >= 3) {
            info.textContent = 'Validando...';
            info.style.color = '#ffc107';
            
            timer = setTimeout(async () => {
                const result = await api.buscarEstudiante(doc);
                if (result.encontrado) {
                    datosEstudiante = result;
                    info.textContent = `✓ ${result.nombreCompleto} - ${result.curso}`;
                    info.style.color = '#28a745';
                } else {
                    info.textContent = '⚠ Documento no encontrado';
                    info.style.color = '#dc3545';
                }
            }, 800);
        } else {
            info.textContent = 'Ingrese el documento para buscar';
            info.style.color = '#6c757d';
        }
    };
};

// Funciones de confirmación
const confirmarDevolucion = async (itemId) => {
    const item = items.find(i => i.id === itemId);
    const comentario = document.getElementById('comentario').value.trim();
    
    if (confirm(`¿Confirma la devolución del equipo ${item.nombre}?`)) {
        await api.guardar(item, 'Devuelto', null, comentario);
        Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
        cerrarModal();
        actualizarVista();
    }
};

const confirmarPrestamo = async (itemId) => {
    const item = items.find(i => i.id === itemId);
    const doc = document.getElementById('documento').value.trim();
    const prof = document.getElementById('profesor').value.trim();
    const mat = document.getElementById('materia').value.trim();
    
    if (!doc || !prof || !mat) {
        alert('Complete todos los campos');
        return;
    }
    
    if (!datosEstudiante.encontrado && Object.keys(datosEstudiante).length === 0) {
        if (!confirm('Estudiante no encontrado. ¿Continuar con registro manual?')) return;
        datosEstudiante = {documento: doc, nombreCompleto: 'Registro Manual', curso: 'Por verificar'};
    }
    
    Object.assign(item, {
        documento: doc, 
        profesor: prof, 
        materia: mat, 
        nombreCompleto: datosEstudiante.nombreCompleto, 
        curso: datosEstudiante.curso
    });
    
    await api.guardar(item, 'Préstamo', datosEstudiante);
    cerrarModal();
    actualizarVista();
};

const cerrarModal = (event) => {
    if (event && event.target !== event.currentTarget) return;
    if (modal) modal.firstElementChild.style.display = 'none';
};

// === UI ===
const actualizarVista = () => {
    const contenedor = document.getElementById("malla");
    if (!contenedor) return;

    contenedor.innerHTML = items.map(item => {
        const ocupado = !!item.documento;
        return `
            <div class="ramo" style="background: ${ocupado ? '#d4edda' : '#f8f9fa'}; border: 2px solid ${ocupado ? '#28a745' : '#ccc'}; border-radius: 8px; padding: 15px; margin: 5px; cursor: pointer; text-align: center; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: transform 0.2s;" 
                 onclick="mostrarModal(items.find(i => i.id === '${item.id}'))" 
                 onmouseover="this.style.transform='scale(1.02)'" 
                 onmouseout="this.style.transform='scale(1)'">
                <div style="font-weight: bold; font-size: 1.2em;">${item.nombre}</div>
                <div style="color: ${ocupado ? 'green' : '#6c757d'}; font-size: 1.5em; margin: 5px 0;">${ocupado ? '✓' : '○'}</div>
                ${ocupado ? `<div style="font-size: 0.8em; color: #666; margin-top: 5px;"><strong>${item.nombreCompleto}</strong><br><small>${item.curso}</small></div>` : ''}
            </div>`;
    }).join('');
};

const resetearMalla = () => {
    if (confirm("⚠️ Esto devolverá TODOS los equipos. ¿Continuar?")) {
        const comentario = prompt("Comentario:", "Devolución masiva") || '';
        
        items.forEach(async item => {
            if (item.documento) {
                await api.guardar(item, 'Devuelto', null, comentario);
                Object.assign(item, {documento: "", profesor: "", materia: "", nombreCompleto: "", curso: ""});
            }
        });
        
        setTimeout(actualizarVista, 1000);
    }
};

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    crearModal();
    actualizarVista();
    api.cargarEquipos();
    setInterval(api.cargarEquipos, 30000);
});

// Event listeners
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarModal());
window.debugItems = () => console.log('Items:', items);
