// Modulos/Principales/Matricula/matricula.js
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { generarTarjetaMatricula } = require('./canvas_matricula.js');
const { regionAPlatforma, verificarCuentaRiot, obtenerSummoner, obtenerRangos } = require("../../../API's/Riot/lol_api");
const { obtenerRangoTFT } = require("../../../API's/Riot/tft_api");

const Usuario = require('../../../Base_Datos/MongoDB/Usuario.js');
const IntentoMatricula = require('../../../Base_Datos/MongoDB/IntentoMatricula.js');
const Contador = require('../../../Base_Datos/MongoDB/contador.js');
const { logNuevaMatricula, actualizarGaleria } = require('./bitacora');
const { actualizarUsuario } = require('../Nivel/motor_ranking');

// 🎨 Paleta de colores ANSI
const c = { v: '\x1b[32m', r: '\x1b[31m', a: '\x1b[33m', b: '\x1b[0m' };

const ICONOS_VERIFICACION = [2, 5, 6, 11, 12];
const TIEMPO_INICIAL = 10 * 60 * 1000;
const TIEMPO_EXPIRACION = 15 * 60 * 1000;
const INTERVALO_VERIFICACION = 30 * 1000;

const MAX_INTENTOS = 3;
const TIEMPO_COOLDOWN = 30 * 60 * 1000;

const CANVAS_VERIFICACION = {
    2: 'https://i.imgur.com/z6bovLx.png',
    5: 'https://i.imgur.com/joY5sDH.png',
    6: 'https://i.imgur.com/lyhDDfz.png',
    11: 'https://i.imgur.com/LqRb15A.png',
    12: 'https://i.imgur.com/oXeX0Be.png'
};

const ESTADO_VERIFICACION = {
    APROBADA:  'https://i.imgur.com/U48F8TX.png',
    DENEGADA:  'https://i.imgur.com/XScBueH.png',
    CANCELADA: 'https://i.imgur.com/LWwGrbf.png',
    ERROR:     'https://i.imgur.com/PhzYaUF.png'
};

const CACHE_FILE = path.join(__dirname, '../../../Base_Datos/Cache/matriculas_pendientes.json');
try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (e) {}

const usuariosEnMatricula = new Map();

async function actualizarCache() {
    const data = {};
    for (const [userId, estado] of usuariosEnMatricula.entries()) {
        data[userId] = { etapa: estado.etapa, fechaInicio: Date.now() };
    }
    try {
        await fsPromises.writeFile(CACHE_FILE, JSON.stringify(data, null, 4), 'utf8');
    } catch (err) {}
}

function setEstadoUsuario(userId, estado) {
    usuariosEnMatricula.set(userId, estado);
    actualizarCache();
}

function deleteEstadoUsuario(userId) {
    usuariosEnMatricula.delete(userId);
    actualizarCache();
}

function getMensajes() {
    delete require.cache[require.resolve('./mensajes')];
    return require('./mensajes');
}

function obtenerIconoAleatorio(iconoActual = null) {
    const disponibles = ICONOS_VERIFICACION.filter(id => id !== iconoActual);
    return disponibles[Math.floor(Math.random() * disponibles.length)];
}

async function usuarioYaRegistrado(discordId) {
    try {
        const usuario = await Usuario.findOne({ Discord_ID: discordId });
        return !!usuario;
    } catch {
        return false;
    }
}

async function guardarUsuario(datosUsuario) {
    try {
        await Usuario.findOneAndUpdate(
            { Discord_ID: datosUsuario.Discord_ID },
            datosUsuario,
            { upsert: true, returnDocument: 'after' }
        );
        return true;
    } catch {
        return false;
    }
}

async function registrarFalloIntento(userId) {
    try {
        let intento = await IntentoMatricula.findOne({ Discord_ID: userId });
        if (!intento) {
            intento = new IntentoMatricula({ Discord_ID: userId, Fallos: 0 });
        }
        intento.Fallos += 1;
        if (intento.Fallos >= MAX_INTENTOS) {
            intento.CooldownHasta = new Date(Date.now() + TIEMPO_COOLDOWN);
        }
        await intento.save();
    } catch (error) {}
}

async function preValidarCuenta(userId, gameName, tagLine) {
    const regionesValidas = ['LAN', 'LAS', 'NA', 'BR'];
    const promesas = regionesValidas.map(async (region) => {
        try {
            const resultado = await verificarCuentaRiot(gameName, tagLine, region);
            if (!resultado.existe) return null;

            const plataforma = regionAPlatforma[region];
            const summoner = await obtenerSummoner(resultado.data.puuid, plataforma);
            if (!summoner) return null;

            return {
                region, puuid: resultado.data.puuid, plataforma, summoner,
                gameName: resultado.data.gameName, tagLine: resultado.data.tagLine
            };
        } catch { return null; }
    });

    const resultados = await Promise.all(promesas);
    const cuentasEncontradas = resultados.filter(r => r !== null);

    const estadoActual = usuariosEnMatricula.get(userId);
    if (estadoActual) {
        estadoActual.preValidacion = cuentasEncontradas;
        setEstadoUsuario(userId, estadoActual);
    }
}

async function generarYGuardarTarjeta(estadoUsuario) {
    const [rangos, rangoTFT] = await Promise.all([
        obtenerRangos(estadoUsuario.puuid, estadoUsuario.plataforma),
        obtenerRangoTFT(estadoUsuario.gameName, estadoUsuario.tagLine, estadoUsuario.plataforma)
    ]);

    let numeroTotal = 1;
    try {
        const docContador = await Contador.findOneAndUpdate(
            { id: 'matriculas_globales' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        numeroTotal = docContador.seq;
    } catch (err) {
        numeroTotal = (await Usuario.countDocuments()) + 1;
    }

    const imageBuffer = await generarTarjetaMatricula({
        gameName: estadoUsuario.gameName,
        tagLine: estadoUsuario.tagLine,
        nivel: estadoUsuario.summonerLevel,
        iconoId: estadoUsuario.iconoValidacion,
        soloq: rangos.soloq,
        flex: rangos.flex,
        numeroUsuario: numeroTotal
    });

    const attachment = new AttachmentBuilder(imageBuffer, { name: 'tarjeta.png' });
    const embed = new EmbedBuilder().setColor('#171b23').setImage('attachment://tarjeta.png');

    return {
        tarjeta: { embed, attachment },
        rangosGuardados: { soloq: rangos.soloq, flex: rangos.flex, tft: rangoTFT },
        numeroMatricula: numeroTotal
    };
}

async function preGenerarTarjeta(userId, estadoUsuario) {
    try {
        const datosGenerados = await generarYGuardarTarjeta(estadoUsuario);
        const estadoActual = usuariosEnMatricula.get(userId);
        if (estadoActual && estadoActual.etapa === 'validacion') {
            estadoActual.tarjetaPreGenerada = datosGenerados.tarjeta;
            estadoActual.rangosPreCargados  = datosGenerados.rangosGuardados;
            estadoActual.numeroMatricula    = datosGenerados.numeroMatricula;
            setEstadoUsuario(userId, estadoActual);
        }
    } catch {}
}

async function validarRiotID(message, estadoUsuario) {
    const riotIDLimpio = message.content.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();

    if (!riotIDLimpio.includes('#')) return message.channel.send(getMensajes().TAGIncorrectoMatricula);

    const [nombre, tag] = riotIDLimpio.split('#');
    if (!nombre || !tag) return message.channel.send(getMensajes().IDIncorrectoMatricula);

    estadoUsuario.riotID    = riotIDLimpio;
    estadoUsuario.gameName  = nombre.trim();
    estadoUsuario.tagLine   = tag.trim();
    estadoUsuario.etapa     = 'region';
    setEstadoUsuario(message.author.id, estadoUsuario);

    await message.channel.send(getMensajes().RegionMatricula(riotIDLimpio));
    preValidarCuenta(message.author.id, estadoUsuario.gameName, estadoUsuario.tagLine).catch(() => {});
}

async function validarRegion(message, estadoUsuario) {
    const region = message.content.trim().toUpperCase();
    const regionesValidas = ['LAN', 'LAS', 'NA', 'BR'];

    if (!regionesValidas.includes(region)) return message.channel.send(getMensajes().RegionInvalidaMatricula);

    estadoUsuario.region = region;
    const datosPreValidados = estadoUsuario.preValidacion?.find(d => d.region === region);

    let loadingMessage = null;
    if (!datosPreValidados) loadingMessage = await message.channel.send(getMensajes().CargandoValidacion);

    let puuid, plataforma, summoner, gameName, tagLine;

    if (datosPreValidados) {
        ({ puuid, plataforma, summoner, gameName, tagLine } = datosPreValidados);
    } else {
        const resultado = await verificarCuentaRiot(estadoUsuario.gameName, estadoUsuario.tagLine, region);
        if (!resultado.existe) return fallarBusquedaCuenta(message, loadingMessage, estadoUsuario);

        plataforma = regionAPlatforma[region];
        puuid      = resultado.data.puuid;
        summoner   = await obtenerSummoner(puuid, plataforma);

        if (!summoner) return fallarBusquedaCuenta(message, loadingMessage, estadoUsuario);

        gameName = resultado.data.gameName;
        tagLine  = resultado.data.tagLine;
    }

    try {
        const cuentaExistente = await Usuario.findOne({ PUUID: puuid });
        if (cuentaExistente) {
            estadoUsuario.etapa = 'riotid';
            setEstadoUsuario(message.author.id, estadoUsuario);
            const msgEnUso = getMensajes().CuentaYaEnUso || 'Esta cuenta ya pertenece a otro usuario.';
            console.log(`${c.r}·${c.b} [Matricula] El usuario ${message.author.username} finalizó un proceso de matrícula. Razón: ${c.r}La cuenta de LoL ya está en uso${c.b}.`);
            return loadingMessage ? await loadingMessage.edit(msgEnUso) : await message.channel.send(msgEnUso);
        }
    } catch {}

    try {
        if (estadoUsuario.timeoutInicial) {
            clearTimeout(estadoUsuario.timeoutInicial);
            estadoUsuario.timeoutInicial = null;
        }

        const iconoAsignado = obtenerIconoAleatorio(summoner.profileIconId);

        Object.assign(estadoUsuario, {
            etapa: 'validacion', puuid, plataforma, gameName, tagLine,
            iconoActual: summoner.profileIconId, iconoValidacion: iconoAsignado,
            summonerLevel: summoner.summonerLevel,
            tiempoInicio:     Date.now(),
            tiempoExpiracion: Date.now() + TIEMPO_EXPIRACION
        });

        const embedVerificacion = new EmbedBuilder().setColor('#171b23').setImage(CANVAS_VERIFICACION[iconoAsignado]);
        const contenidoMensaje  = { content: getMensajes().ValidacionEnProceso, embeds: [embedVerificacion] };

        estadoUsuario.verificacionMsg = loadingMessage
            ? await loadingMessage.edit(contenidoMensaje)
            : await message.channel.send(contenidoMensaje);

        setEstadoUsuario(message.author.id, estadoUsuario);
        iniciarPolling(message, estadoUsuario);

    } catch {
        const errorMsg = getMensajes().ErrorMatricula;
        loadingMessage ? await loadingMessage.edit(errorMsg) : await message.channel.send(errorMsg);
    }
}

async function fallarBusquedaCuenta(message, loadingMessage, estadoUsuario) {
    estadoUsuario.etapa = 'riotid';
    setEstadoUsuario(message.author.id, estadoUsuario);
    const msg = getMensajes().CuentaNoEncontradaMatricula;
    return loadingMessage ? loadingMessage.edit(msg) : message.channel.send(msg);
}

function iniciarPolling(message, estadoUsuario) {
    const userId = message.author.id;
    preGenerarTarjeta(userId, estadoUsuario);

    const intervalo = setInterval(async () => {
        const estadoActual = usuariosEnMatricula.get(userId);
        if (!estadoActual || estadoActual.etapa !== 'validacion') return clearInterval(intervalo);

        if (Date.now() >= estadoActual.tiempoExpiracion) {
            clearInterval(intervalo);
            deleteEstadoUsuario(userId);
            await registrarFalloIntento(userId);

            if (estadoActual.verificacionMsg) {
                const embedDenegada = new EmbedBuilder().setColor('#171b23').setImage(ESTADO_VERIFICACION.DENEGADA);
                await estadoActual.verificacionMsg.edit({ content: getMensajes().ValidacionDenegada, embeds: [embedDenegada] }).catch(() => {});
            }
            console.log(`${c.r}·${c.b} [Matricula] El usuario ${message.author.username} finalizó un proceso de matrícula. Razón: ${c.r}Tiempo de validación agotado${c.b}.`);
            return message.channel.send(getMensajes().ValidacionExpirada);
        }

        try {
            const summoner = await obtenerSummoner(estadoActual.puuid, estadoActual.plataforma);
            if (!summoner) return;

            if (summoner.profileIconId === estadoActual.iconoValidacion) {
                clearInterval(intervalo);

                if (estadoActual.verificacionMsg) {
                    const embedAprobada = new EmbedBuilder().setColor('#171b23').setImage(ESTADO_VERIFICACION.APROBADA);
                    await estadoActual.verificacionMsg.edit({ content: getMensajes().ValidacionAprobada, embeds: [embedAprobada] }).catch(() => {});
                }

                let datosTarjeta;
                let numMatricula;
                if (estadoActual.tarjetaPreGenerada) {
                    datosTarjeta = { tarjeta: estadoActual.tarjetaPreGenerada, rangosGuardados: estadoActual.rangosPreCargados };
                    numMatricula = estadoActual.numeroMatricula;
                } else {
                    const resultado = await generarYGuardarTarjeta(estadoActual);
                    datosTarjeta = { tarjeta: resultado.tarjeta, rangosGuardados: resultado.rangosGuardados };
                    numMatricula = resultado.numeroMatricula;
                }

                const fechaActual    = new Date();
                const fechaFormateada = `${String(fechaActual.getDate()).padStart(2, '0')}/${String(fechaActual.getMonth() + 1).padStart(2, '0')}/${fechaActual.getFullYear()}`;

                const datosGuardar = {
                    Discord_ID:       userId,
                    Discord_Nick:     message.author.username,
                    Fecha:            fechaFormateada,
                    // ─────────────────────────────────────────────────────
                    // 🏠 Guardamos el ID del servidor donde se matriculó.
                    // Permite hacer rankings locales por servidor sin traer
                    // arrays de IDs a Node.js en cada consulta.
                    // ─────────────────────────────────────────────────────
                    Guild_ID:         message.guild?.id || null,
                    Riot_ID:          `${estadoActual.gameName}#${estadoActual.tagLine}`,
                    Region:           estadoActual.region,
                    PUUID:            estadoActual.puuid,
                    Nivel:            estadoActual.summonerLevel,
                    Icono_ID:         estadoActual.iconoValidacion,
                    Numero_Matricula: numMatricula,
                    Rangos: {
                        Flex:  datosTarjeta.rangosGuardados?.flex  || null,
                        SoloQ: datosTarjeta.rangosGuardados?.soloq || null,
                        TFT:   datosTarjeta.rangosGuardados?.tft   || null
                    }
                };

                await guardarUsuario(datosGuardar);

                // Indexamos al nuevo usuario en el ranking en memoria
                // desde el momento en que se matricula, con nivel 1 y 0 XP.
                actualizarUsuario(datosGuardar.Guild_ID, userId, 1, 0);

                deleteEstadoUsuario(userId);
                await IntentoMatricula.deleteOne({ Discord_ID: userId });

                try {
                    const nickSeguro    = message.author.username.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Jugador';
                    const nombreCarpeta = `#${numMatricula}_${nickSeguro}`;
                    const rutaCarpeta   = path.join(__dirname, '../../../Base_Datos/Usuarios', nombreCarpeta);

                    try { await fsPromises.access(rutaCarpeta); }
                    catch { await fsPromises.mkdir(rutaCarpeta, { recursive: true }); }

                    const plantillaJuegos = {
                        Resumen: { Victorias: 0, Derrotas: 0, WinRate: 0 },
                        Campeones: {},
                        Companeros: {},
                        Historial: []
                    };

                    const archivosCrear = {
                        'datos_basicos.json': {
                            Discord_ID:       userId,
                            Discord_Nick:     message.author.username,
                            Numero_Matricula: numMatricula,
                            Riot_ID:          `${estadoActual.gameName}#${estadoActual.tagLine}`,
                            PUUID:            estadoActual.puuid,
                            Region:           estadoActual.region,
                            Fecha_Matricula:  fechaFormateada
                        },
                        'datos_lol_soloq.json':   plantillaJuegos,
                        'datos_lol_flex.json':    plantillaJuegos,
                        'datos_lol_normals.json': plantillaJuegos,
                        'datos_lol_total.json':   plantillaJuegos
                    };

                    for (const [nombreArchivo, contenidoVacio] of Object.entries(archivosCrear)) {
                        const rutaArchivo = path.join(rutaCarpeta, nombreArchivo);
                        try { await fsPromises.access(rutaArchivo); }
                        catch { await fsPromises.writeFile(rutaArchivo, JSON.stringify(contenidoVacio, null, 4), 'utf8'); }
                    }
                } catch (e) {
                    console.error(`${c.r}·${c.b} [Matricula] Error asíncrono creando archivos físicos: ${c.r}Fallo${c.b}.`, e);
                }

                await message.channel.send(getMensajes().MatriculaCompletada);
                await message.channel.send({
                    embeds: [datosTarjeta.tarjeta.embed],
                    files:  [datosTarjeta.tarjeta.attachment]
                });

                await logNuevaMatricula(message.client, message.author, datosGuardar.Riot_ID, numMatricula);
                await actualizarGaleria(message.client);

                console.log(`${c.v}·${c.b} [Matricula] El usuario ${message.author.username} finalizó un proceso de matrícula. Razón: ${c.v}Completado con éxito${c.b}.`);
            }
        } catch {}
    }, INTERVALO_VERIFICACION);

    estadoUsuario.intervalo = intervalo;
    setEstadoUsuario(userId, estadoUsuario);
}

async function cancelarMatricula(message) {
    const userId       = message.author.id;
    const estadoUsuario = usuariosEnMatricula.get(userId);
    if (!estadoUsuario) return;

    if (estadoUsuario.timeoutInicial) clearTimeout(estadoUsuario.timeoutInicial);
    if (estadoUsuario.intervalo)      clearInterval(estadoUsuario.intervalo);

    let mensajeCancelacion = getMensajes().MatriculaCancelada;

    if (estadoUsuario.etapa === 'validacion') {
        mensajeCancelacion = getMensajes().CancelacionDuranteValidacion;
        if (estadoUsuario.verificacionMsg) {
            const embedCancelada = new EmbedBuilder().setColor('#171b23').setImage(ESTADO_VERIFICACION.CANCELADA);
            await estadoUsuario.verificacionMsg.edit({
                content: getMensajes().ValidacionCancelada,
                embeds:  [embedCancelada]
            }).catch(() => {});
        }
    }

    deleteEstadoUsuario(userId);
    await registrarFalloIntento(userId);
    await message.channel.send(mensajeCancelacion);

    console.log(`${c.a}·${c.b} [Matricula] El usuario ${message.author.username} finalizó un proceso de matrícula. Razón: Cancelado manualmente.`);
}

async function ejecutarMatricula(message) {
    const esEnDM  = message.channel.isDMBased();
    const responder = (texto) => esEnDM ? message.channel.send(texto) : message.reply(texto);
    const userId  = message.author.id;

    try {
        const recordIntentos = await IntentoMatricula.findOne({ Discord_ID: userId });
        if (recordIntentos && recordIntentos.CooldownHasta) {
            if (Date.now() < recordIntentos.CooldownHasta.getTime()) {
                const timestampSegundos = Math.floor(recordIntentos.CooldownHasta.getTime() / 1000);
                const tiempoDinamico    = `<t:${timestampSegundos}:R>`;
                const msgCooldown = getMensajes().EnCooldownMatricula
                    ? getMensajes().EnCooldownMatricula(tiempoDinamico)
                    : `¡Has superado el límite de intentos permitidos! \n\nPor favor, espera **${tiempoDinamico}** antes de volver a intentarlo.`;
                return responder(msgCooldown);
            } else {
                await IntentoMatricula.deleteOne({ Discord_ID: userId });
            }
        }
    } catch (error) {}

    if (await usuarioYaRegistrado(userId)) {
        return responder(getMensajes().UsuarioYaMatriculado(message.author));
    }

    if (usuariosEnMatricula.has(userId)) {
        return responder(getMensajes().MatriculaYaEnProceso);
    }

    try {
        const dmChannel = esEnDM ? message.channel : await message.author.createDM();

        console.log(`${c.a}·${c.b} [Matricula] El usuario ${message.author.username} comenzó un proceso de matrícula.`);

        await dmChannel.send(getMensajes().ArranqueMatricula);

        const timeoutInicial = setTimeout(async () => {
            const estado = usuariosEnMatricula.get(userId);
            if (estado && (estado.etapa === 'riotid' || estado.etapa === 'region')) {
                deleteEstadoUsuario(userId);
                await registrarFalloIntento(userId);
                try { await dmChannel.send(getMensajes().TiempoAgotadoInicial); } catch {}

                console.log(`${c.r}·${c.b} [Matricula] El usuario ${message.author.username} finalizó un proceso de matrícula. Razón: ${c.r}Tiempo inicial agotado${c.b}.`);
            }
        }, TIEMPO_INICIAL);

        setEstadoUsuario(userId, { etapa: 'riotid', timeoutInicial: timeoutInicial });
        if (!esEnDM) await responder(getMensajes().LlamadoMatricula(message.author));
    } catch (error) {
        deleteEstadoUsuario(userId);
        if (!esEnDM) {
            const bloqueado = error.code === 50007 || error.message?.includes('Cannot send messages');
            await responder(bloqueado ? getMensajes().FalloLlamadoMatricula(message.author) : getMensajes().ErrorInicioMatricula);
        }
    }
}

async function procesarRespuestaDM(message) {
    const estadoUsuario = usuariosEnMatricula.get(message.author.id);
    if (!estadoUsuario) return;

    if (estadoUsuario.etapa === 'riotid') {
        await validarRiotID(message, estadoUsuario);
    } else if (estadoUsuario.etapa === 'region') {
        await validarRegion(message, estadoUsuario);
    }
}

async function restaurarMatriculas(client) {
    try {
        if (!fs.existsSync(CACHE_FILE)) return;
        const data    = JSON.parse(await fsPromises.readFile(CACHE_FILE, 'utf8'));
        const userIds = Object.keys(data);

        if (userIds.length === 0) return;
        console.log(`${c.v}·${c.b} [Matricula] Rescatando ${userIds.length} procesos interrumpidos por el reinicio...`);

        for (const userId of userIds) {
            await IntentoMatricula.deleteOne({ Discord_ID: userId }).catch(() => {});
            try {
                const user = await client.users.fetch(userId);
                await user.send(getMensajes().MatriculaCanceladaReinicio);
            } catch (e) {}
        }

        await fsPromises.writeFile(CACHE_FILE, JSON.stringify({}), 'utf8');
        console.log(`${c.v}·${c.b} [Matricula] Misión de rescate completada ${c.v}correctamente${c.b}.`);
    } catch (err) {}
}

module.exports = {
    name: 'matricula',
    execute:              ejecutarMatricula,
    ejecutarCancelar:     cancelarMatricula,
    procesarRespuestaDM,
    restaurarMatriculas,
    usuariosEnMatricula,
    ESTADO_VERIFICACION,
    CANVAS_VERIFICACION
};