// Modulos/Utilidades/Sincronizador/parser.js
const fs = require('fs').promises;
const path = require('path');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const MENSAJES_PATH = path.join(__dirname, '../../Principales/Matricula/mensajes.js');

function parsearMensaje(contenido) {
    const variables = [];
    const lineas = contenido.replace(/\r/g, '').split('\n');
    
    let variableActual = null;
    let contenidoActual = [];

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const lineaLimpia = linea.trim();

        if (lineaLimpia === '--' || lineaLimpia === '---') continue;

        if (lineaLimpia.startsWith('##')) {
            if (variableActual) {
                variables.push({
                    nombre: variableActual.nombre,
                    parametros: variableActual.parametros,
                    contenido: contenidoActual.join('\n').trim()
                });
            }

            let tituloBruto = lineaLimpia.replace(/^##\s*/, '').replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
            const matchParams = tituloBruto.match(/^([a-zA-Z0-9_]+)\s*\(([^)]+)\)$/);

            if (matchParams) {
                variableActual = {
                    nombre: matchParams[1],
                    parametros: matchParams[2].split(',').map(p => p.trim())
                };
            } else {
                let nombreLimpio = tituloBruto.split(' ')[0].replace(/[^a-zA-Z0-9_]/g, '');
                variableActual = nombreLimpio.length > 0 ? { nombre: nombreLimpio, parametros: null } : null;
            }
            contenidoActual = [];
        } else if (variableActual) {
            contenidoActual.push(linea);
        }
    }

    if (variableActual) {
        variables.push({
            nombre: variableActual.nombre,
            parametros: variableActual.parametros,
            contenido: contenidoActual.join('\n').trim()
        });
    }

    return variables;
}

function generarCodigoMensajes(todasLasVariables) {
    let codigo = '// Modulos/Principales/Matricula/mensajes.js\n\n';
    codigo += 'module.exports = {\n';

    todasLasVariables.forEach((variable, index) => {
        const isLast = index === todasLasVariables.length - 1;
        const coma = isLast ? '' : ',';

        if (variable.parametros) {
            const params = variable.parametros.join(', ');
            let contenido = variable.contenido;
            
            variable.parametros.forEach(param => {
                const regex = new RegExp(`\\{${param}\\}`, 'g');
                contenido = contenido.replace(regex, `\${${param}}`);
            });

            contenido = contenido.replace(/`/g, '\\`');
            codigo += `    ${variable.nombre}: (${params}) => \`${contenido}\`${coma}\n`;
        } else {
            let contenido = variable.contenido;
            contenido = contenido.replace(/`/g, '\\`');
            codigo += `    ${variable.nombre}: \`${contenido}\`${coma}\n`;
        }
    });

    codigo += '};\n';
    return codigo;
}

// 👇 MODIFICACIÓN: Agregamos "contexto" por defecto 👇
async function sincronizarMensajes(channel, contexto = 'startup') {
    try {
        if (contexto === 'startup') {
            console.log(`${c.v}·${c.b} [Editor de Mensajes] Módulo de escucha de variables iniciado ${c.v}correctamente${c.b}.`);
        }

        const mensajes = await channel.messages.fetch({ limit: 100 });
        const mensajesOrdenados = Array.from(mensajes.values())
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let todasLasVariables = [];
        
        for (const mensaje of mensajesOrdenados) {
            if (mensaje.author.bot) continue;
            
            const variables = parsearMensaje(mensaje.content);
            todasLasVariables = todasLasVariables.concat(variables);
        }

        if (todasLasVariables.length > 0) {
            const codigo = generarCodigoMensajes(todasLasVariables);
            await fs.writeFile(MENSAJES_PATH, codigo, 'utf8');
            delete require.cache[require.resolve(MENSAJES_PATH)];
            
            if (contexto === 'edit') {
                console.log(`${c.a}·${c.b} [Editor de Mensajes] Textos recargados en memoria por edición de variable.`);
            }
        }
        return true;
    } catch (err) {
        console.error(`${c.r}·${c.b} [Editor de Mensajes] Extracción de variables de Discord: ${c.r}Fallo${c.b}.`, err);
        return false;
    }
}

module.exports = { parsearMensaje, generarCodigoMensajes, sincronizarMensajes };