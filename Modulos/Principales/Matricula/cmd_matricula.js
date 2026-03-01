// Modulos/Principales/Matricula/cmd_matricula.js
const matricula = require('./matricula');

module.exports = [
    {
        name: 'matricula',
        description: 'Inicia el proceso oficial de matrícula en la Academia.',
        async execute(message, args) {
            await matricula.execute(message, args);
        }
    },
    {
        name: 'cancelar',
        description: 'Detiene y cancela un proceso de matrícula activo (solo por DM).',
        async execute(message) {
            await matricula.ejecutarCancelar(message);
        }
    }
];