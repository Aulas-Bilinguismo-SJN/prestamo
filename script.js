const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyq2A9c6ULXsC99gTo-2Ni24J3bSnE4WErhFwnWKj5TPKUSEaHAb5s1g139U7rIBJoMzQ/exec';

// Datos de los 50 items
const items = [];
for (let i = 1; i <= 50; i++) {
    items.push({ id: `item_${i}`, nombre: `${i}`, documento: "", profesor: "", materia: "" });
}

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
        <label for="documento">Documento:</label>
        <textarea id="documento" rows="2" placeholder="Ingrese el documento...">${item.documento}</textarea>
    `;

    const divProfesor = document.createElement('div');
    divProfesor.innerHTML = `
        <label for="profesor">Profesor(a) Encargado:</label>
        <input type="text" id="profesor" value="${item.profesor}">
    `;

    const divMateria = document.createElement('div');
    divMateria.innerHTML = `
        <label for="materia">Materia:</label>
        <input type="text" id="materia" value="${item.materia || ''}">
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

    btnGuardar.addEventListener('click', async () => {
        const documento = document.getElementById('documento').value.trim();
        const profesor = document.getElementById('profesor').value.trim();
        const materia = document.getElementById('materia').value.trim();

        if (!documento) {
            alert("Debe ingresar un documento.");
            return;
        }

        try {
            const res = await fetch(BACKEND_URL, {
                method: 'POST',
                body: JSON.stringify({ action: "validarDocumento", documento })
            });
            const json = await res.json();

            if (!json.success) {
                alert("Documento no encontrado en BaseA.");
                return;
            }

            // Guardar localmente
            item.documento = documento;
            item.profesor = profesor;
            item.materia = materia;

            // Registrar en BaseB como Préstamo
            await fetch(BACKEND_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "registrarOperacion",
                    equipo: item.nombre,
                    documento,
                    profesor,
                    materia,
                    tipo: "Préstamo",
                    comentario: ""
                })
            });

            cerrarModal();
            actualizarVista();
        } catch (error) {
            alert("Ocurrió un error al guardar.");
            console.error(error);
        }
    });

    btnCancelar.addEventListener('click', cerrarModal);

    divBotones.appendChild(btnGuardar);
    divBotones.appendChild(btnCancelar);

    formulario.appendChild(divDocumento);
    formulario.appendChild(divProfesor);
    formulario.appendChild(divMateria);
    formulario.appendChild(divBotones);

    listaMetodos.appendChild(formulario);
    modal.style.display = 'block';
}

function mostrarModalDesmarcar(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('modalMetodos');
    const listaMetodos = document.getElementById('listaMetodos');
    document.querySelector('.modal-header h2').textContent = `Devolver Equipo ${item.nombre}`;
    document.querySelector('.modal-body p').textContent = 'Información del equipo:';
    listaMetodos.innerHTML = '';

    const formulario = document.createElement('div');
    formulario.style.display = 'flex';
    formulario.style.flexDirection = 'column';
    formulario.style.gap = '15px';

    const info = document.createElement('div');
    info.innerHTML = `
        <p><strong>Documento:</strong> ${item.documento}</p>
        <p><strong>Profesor:</strong> ${item.profesor}</p>
        <p><strong>Materia:</strong> ${item.materia || '-'}</p>
    `;

    const divComentario = document.createElement('div');
    divComentario.innerHTML = `
        <label for="comentario">Comentario (opcional):</label>
        <textarea id="comentario" rows="3" placeholder="Escriba un comentario si lo desea..."></textarea>
    `;

    const divBotones = document.createElement('div');
    divBotones.style.display = 'flex';
    divBotones.style.gap = '10px';
    divBotones.style.justifyContent = 'flex-end';

    const btnDesmarcar = document.createElement('button');
    btnDesmarcar.textContent = 'Devolver';
    btnDesmarcar.style.backgroundColor = '#a94442';
    btnDesmarcar.style.color = 'white';

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.backgroundColor = '#6c757d';
    btnCancelar.style.color = 'white';

    btnDesmarcar.addEventListener('click', async () => {
        const comentario = document.getElementById('comentario').value.trim();

        try {
            // Registrar devolución
            await fetch(BACKEND_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "registrarOperacion",
                    equipo: item.nombre,
                    documento: item.documento,
                    profesor: item.profesor,
                    materia: item.materia || '',
                    tipo: "Devolución",
                    comentario: comentario
                })
            });

            // Limpiar
            item.documento = "";
            item.profesor = "";
            item.materia = "";

            cerrarModal();
            actualizarVista();
        } catch (error) {
            alert("Error al registrar la devolución.");
            console.error(error);
        }
    });

    btnCancelar.addEventListener('click', cerrarModal);

    divBotones.appendChild(btnDesmarcar);
    divBotones.appendChild(btnCancelar);

    formulario.appendChild(info);
    formulario.appendChild(divComentario);
    formulario.appendChild(divBotones);

    listaMetodos.appendChild(formulario);
    modal.style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalMetodos').style.display = 'none';
}

function actualizarVista() {
    crearGrilla();
}

function crearGrilla() {
    const contenedor = document.getElementById("malla");
    contenedor.innerHTML = "";
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "repeat(10, 1fr)";
    contenedor.style.gap = "15px";
    contenedor.style.padding = "20px";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "ramo";
        div.style.backgroundColor = item.documento ? "#d4edda" : "#f8f9fa";
        div.style.border = item.documento ? "2px solid #28a745" : "2px solid #ccc";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.cursor = "pointer";
        div.style.borderRadius = "8px";
        div.style.padding = "10px";

        const numero = document.createElement("div");
        numero.textContent = item.nombre;
        numero.style.fontWeight = "bold";

        const estado = document.createElement("div");
        estado.textContent = item.documento ? "✓" : "○";
        estado.style.color = item.documento ? "green" : "#6c757d";

        div.appendChild(numero);
        div.appendChild(estado);

        div.addEventListener("click", () => mostrarModalItem(item.id));

        contenedor.appendChild(div);
    });
}

function resetearMalla() {
    if (confirm("¿Deseas resetear todos los Equipos?")) {
        items.forEach(item => {
            item.documento = "";
            item.profesor = "";
            item.materia = "";
        });
        actualizarVista();
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('modalMetodos');
    if (event.target === modal) cerrarModal();
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') cerrarModal();
});

document.addEventListener('DOMContentLoaded', crearGrilla);
