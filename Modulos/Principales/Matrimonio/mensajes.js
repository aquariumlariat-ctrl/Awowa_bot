// Archivo Autogenerado por el Editor de Mensajes

module.exports = {
    PropuestaBotError: (usuario) => `¡Oye ${usuario}! No molestes al bot. <:Awowa_Angry:1470476949267681280> 

Son criaturas libres y no quieren entrar en matrimonio.`,
    PropuestaSiMismo: (usuario) => `¡Oye ${usuario}! Eso es raro. <:Awowa_Stare:1472431115947216998>

No puedes proponerte matrimonio a ti mismo.`,
    PropuestaDuplicada: (usuario) => `¡${usuario} ya tienes una propuesta pendiente! <:Awowa_Sip:1470440711416582406>

Espera a que la propuesta actual reciba respuesta antes de enviar otra.`,
    PropuestaCooldown: (usuario, tiempo) => `¡${usuario} aún no estás listo para buscar de nuevo el amor! <:Awowa_Cry:1470435511901487117>

Debes esperar un poco antes de poder proponer matrimonio de nuevo.`,
    PropuestaYaCasado: (usuario) => `¡Oye ${usuario} tú ya tienes pareja! <:Awowa_Stare:1472431115947216998>

Debes divorciarte antes de buscar de nuevo el amor.`,
    PropuestaTargetCasado: (usuario, target) => `¡${usuario}, tristemente esa persona ya tiene pareja! <:Awowa_Cry:1470435511901487117>

Parece que alguien llegó primero…`,
    PropuestaTargetCooldown: (usuario, target) => `¡${usuario}, tristemente esa persona acaba de salir de un divorcio! <:Awowa_Thinking:1470765623435858115>

Necesita un poco más de tiempo antes de volver al amor.`,
    PropuestaEnviada: (usuario, target) => `¡Qué emoción! ¡${target} alguien quiere pedir tu mano! <:Awowa_wow:1470775972658942167> 

${usuario} quiere casarse contigo. ¿Aceptas?`,
    PropuestaRechazada: (usuario, target) => `¡La propuesta fue rechazada! <:Awowa_Cry:1470435511901487117> 

Lo lamento ${usuario}... El amor no es para todos...`,
    PropuestaExpirada: (usuario, target) => `¡La propuesta no tuvo respuesta! <:Awowa_Cry:1470435511901487117> 

Lo lamento ${usuario}... El amor no es para todos...`,
    PropuestaYaNoCasable: (target) => `¡Vaya ${target}! Algo cambió mientras esperabas. <:Awowa_Thinking:1470765623435858115>

Esta propuesta ya no es válida.`,
    MatrimonioCelebrado: (usuario1, usuario2) => `¡Una nueva pareja! <:Awowa_Yeii:1470377870009565184>

<:marry2:1482631804123877456><:marry:1482631458656092331> ${usuario1} y ${usuario2} ahora están casados.`,
    ErrInterno: (usuario) => `¡${usuario}, hubo un problema interno! <:Awowa_Thinking:1470765623435858115>

Por favor, inténtalo nuevamente más tarde.
Si el problema persiste, contacta a soporte.`,
    DivorcioNoCasado: (usuario) => `¡${usuario}, no tienes pareja! <:Awowa_Stare:1472431115947216998>

No hay nada que disolver aquí.`,
    DivorcioConfirmacion: (usuario, pareja) => `¡${usuario} piénsalo un poquito más! <:Awowa_Cry:1470435511901487117> 

¿Quieres poner fin al matrimonio actual?`,
    DivorcioCompletado: (usuario, pareja) => `¡El amor entre ${usuario} y ${pareja} se acabó! <:Awowa_wow:1470775972658942167> 

Ambos volvieron a ser almas libres y seguirán por caminos separados.`,
    DivorcioCancelado: (usuario) => `¡Una segunda oportunidad ${usuario}! <:Awowa_Camera:1470482435719303248>

El proceso del divorcio fue cancelado.`,
    DivorcioExpirado: (usuario) => `¡Aún quedaba un poco de amor ${usuario}! <:Awowa_Risita:1470413697662058597>

No se confirmó el proceso de divorcio, la pareja seguirá junta.`,
    PropuestaAuroraError: (usuario) => `¡Me sonrojas ${usuario}! <:Awowa_Blush:1470430442128806191> 

Pero no puedo aceptar algo así...`,
    PropuestaAjena: (usuario) => `¡Ey ${usuario}! Esta propuesta no es para ti. <:Awowa_Bonk:1470785113598984308>`,
    PropuestaNoMatriculado: (usuario) => `¡${usuario} necesitas estar matriculado para poder usar este comando! <:Awowa_Writing:1471450155638067372> 

Puedes matricularte con el comando \`/matricula\`.`,
    PropuestaTargetNoMatriculado: (usuario, target) => `¡Oye ${usuario}, ese usuario no se encuentra matriculado! <:Awowa_Cry:1470435511901487117> 

Estaría genial si alguien lo convenciera de matricularse…`,
    DivorcioPersonaEquivocada: (usuario, mencionado, pareja) => `¡${usuario}, no estás casado con esa persona. <:Awowa_Shrug:1470377839416053770> 

Puedes ver tu actual pareja en tu perfil.`
};
