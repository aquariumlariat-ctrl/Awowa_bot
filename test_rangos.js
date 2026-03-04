// test_rangos.js
require('dotenv').config();

// Datos extraídos de Base_Datos/Usuarios/#1_always_nickqoh_/datos_basicos.json
const PUUID = "T6YniqXX7RN15Xy8GrKp6RvCCuOREntsl8J9KoDqVL-iMZTI3DJEKzF-nM2finBkhZ7yGYOAD59i7Q";
const REGION = "LAN";
const PLATAFORMA = "la1"; // LAN equivale a la1

async function simularPeticionRiot() {
    console.log("==========================================");
    console.log("🔍 INICIANDO SIMULADOR DE API DE RIOT 🔍");
    console.log("==========================================\n");

    const headers = { 'X-Riot-Token': process.env.RIOT_API_KEY };

    try {
        // PASO 1: Obtener el Summoner ID usando el PUUID
        console.log("➤ PASO 1: Consultando Summoner por PUUID...");
        const urlSummoner = `https://${PLATAFORMA}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${PUUID}`;
        
        const resSummoner = await fetch(urlSummoner, { headers });
        console.log(`HTTP Status: ${resSummoner.status}`);

        if (resSummoner.status !== 200) {
            console.log("❌ Error fatal: No se pudo obtener el Summoner.");
            return;
        }

        const dataSummoner = await resSummoner.json();
        console.log("✅ Datos devueltos por Riot (Summoner):");
        console.log(dataSummoner);

        const summonerId = dataSummoner.id;
        console.log(`\n🎯 Summoner ID extraído: ${summonerId}\n`);

        // PASO 2: Obtener los Rangos usando el Summoner ID
        console.log("➤ PASO 2: Consultando Ligas (Rangos) usando el Summoner ID...");
        const urlRangos = `https://${PLATAFORMA}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
        
        const resRangos = await fetch(urlRangos, { headers });
        console.log(`HTTP Status: ${resRangos.status}`);

        if (resRangos.status !== 200) {
            console.log("❌ Error fatal: No se pudieron obtener los rangos.");
            return;
        }

        const dataRangos = await resRangos.json();
        console.log("✅ Datos devueltos por Riot (Ligas):");
        console.log(dataRangos);

        console.log("\n==========================================");
        console.log("🏁 SIMULACIÓN FINALIZADA 🏁");
        console.log("==========================================");

    } catch (error) {
        console.error("💥 Error durante la simulación:", error);
    }
}

simularPeticionRiot();