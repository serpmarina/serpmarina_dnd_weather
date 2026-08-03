// ═══════════════════════════════════════════
// D&D WEATHER SYSTEM - MAIN ENTRY POINT (v2.0)
// Логика: последовательная смена событий с продолжительностью
// ═══════════════════════════════════════════

import { BIOMES, BIOME_LABELS, SEASON_LABELS, getSeason, getRandomWeather, getWeatherDescription } from "./weather-data.js";

// ═══════════════════════════════════════════
// 1. РЕГИСТРАЦИЯ НАСТРОЕК МОДУЛЯ
// ═══════════════════════════════════════════
Hooks.once("init", () => {
  console.log("D&D Weather System | Инициализация модуля v2.0");

  // Текущее погодное событие (с продолжительностью)
  game.settings.register("dnd-weather", "current-weather", {
    scope: "world",
    config: false,
    type: Object,
    default: {
      type: "",
      label: "Ясно",
      description: "",
      biomeKey: "forest",
      biomeLabel: "Лес",
      season: "summer",
      seasonLabel: "Лето",
      startedAt: 0,
      duration: 12
    }
  });

  // Глобальный биом по умолчанию
  game.settings.register("dnd-weather", "default-biome", {
    scope: "world",
    config: true,
    name: "Биом по умолчанию",
    hint: "Биом для генерации погоды, если у сцены не задан локальный биом",
    type: String,
    choices: BIOME_LABELS,
    default: "forest"
  });

  // Минимальная продолжительность события (часы)
  game.settings.register("dnd-weather", "min-duration", {
    scope: "world",
    config: true,
    name: "Минимальная продолжительность (часы)",
    hint: "Минимальное время погодного события",
    type: Number,
    default: 1,
    range: { min: 1, max: 24, step: 1 }
  });

  // Максимальная продолжительность события (часы)
  game.settings.register("dnd-weather", "max-duration", {
    scope: "world",
    config: true,
    name: "Максимальная продолжительность (часы)",
    hint: "Максимальное время погодного события",
    type: Number,
    default: 72,
    range: { min: 24, max: 168, step: 1 }
  });
});

// ═══════════════════════════════════════════
// 2. ФУНКЦИЯ ГЕНЕРАЦИИ НОВОГО СОБЫТИЯ
// ═══════════════════════════════════════════
function generateNewWeatherEvent() {
  const biomeKey = game.settings.get("dnd-weather", "default-biome") || "forest";
  const weather = getRandomWeather(biomeKey);

  const dayOfYear = Math.floor(game.time.worldTime / 86400) % 360 + 1;
  const season = getSeason(dayOfYear);

  const desc = getWeatherDescription(biomeKey, season, weather.type);
  const description = desc 
    ? `<em>"${desc.text}"</em><br><small style="opacity:0.7">⏱ Продлится: ~${desc.duration} ч.</small>`
    : "";

  // Генерируем случайную продолжительность в пределах настроек
  const minDuration = game.settings.get("dnd-weather", "min-duration") || 1;
  const maxDuration = game.settings.get("dnd-weather", "max-duration") || 72;
  const duration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;

  return {
    type: weather.type,
    label: weather.label,
    description,
    biomeKey,
    biomeLabel: BIOME_LABELS[biomeKey],
    season,
    seasonLabel: SEASON_LABELS[season],
    startedAt: game.time.worldTime,
    duration
  };
}

// ═══════════════════════════════════════════
// 3. ПРОВЕРКА И СМЕНА ПОГОДЫ
// ═══════════════════════════════════════════
async function checkAndUpdateWeather() {
  const currentWeather = game.settings.get("dnd-weather", "current-weather");
  const worldTime = game.time.worldTime;

  // Проверяем, закончилось ли текущее событие
  const endTime = currentWeather.startedAt + (currentWeather.duration * 3600);
  
  if (worldTime >= endTime) {
    console.log(`D&D Weather | Событие "${currentWeather.label}" закончилось. Генерируем новое...`);
    
    const newWeather = generateNewWeatherEvent();
    await game.settings.set("dnd-weather", "current-weather", newWeather);

    // Применяем ко всем сценам
    for (const scene of game.scenes) {
      await applyWeatherToScene(scene);
    }

    // Сообщение в чат
    await ChatMessage.create({
      user: game.users.find(u => u.isGM)?.id || game.user.id,
      content: `
        <div style="border-left: 4px solid #7b3f00; padding: 12px 16px; background: rgba(0,0,0,0.08); border-radius: 4px;">
          <h3 style="margin: 0 0 6px 0; font-size: 1.15em;">🌦 Смена погоды</h3>
          <p style="margin: 0 0 4px 0; font-size: 0.85em; opacity: 0.7;">${newWeather.seasonLabel} · Биом: ${newWeather.biomeLabel}</p>
          <p style="margin: 0 0 6px 0;"><strong>Новая погода:</strong> ${newWeather.label}</p>
          <p style="margin: 0 0 10px 0; font-size: 0.9em; opacity: 0.8;"><strong> Продлится:</strong> ~${newWeather.duration} ч.</p>
          ${newWeather.description ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.15);">${newWeather.description}</div>` : ""}
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });

    return true;
  }

  return false;
}

// ═══════════════════════════════════════════
// 4. ПРИМЕНЕНИЕ ПОГОДЫ К СЦЕНЕ
// ═══════════════════════════════════════════
async function applyWeatherToScene(scene) {
  const currentWeather = game.settings.get("dnd-weather", "current-weather");
  const localBiome = scene.getFlag("world", "weather-biome");
  const useGlobal = scene.getFlag("world", "weather-use-global") ?? true;

  if (!useGlobal) {
    console.log(`D&D Weather | Сцена "${scene.name}" использует ручную погоду (игнорируем)`);
    return;
  }

  let biomeKey = localBiome || game.settings.get("dnd-weather", "default-biome") || "forest";
  let visualType = currentWeather.type;
  
  if (biomeKey === "dungeon") visualType = "";

  if (scene.weather !== visualType) {
    console.log(`D&D Weather | Применяем "${visualType}" к сцене "${scene.name}"`);
    await scene.update({ weather: visualType });
  }
}

// ═══════════════════════════════════════════
// 5. ХУК: ЗАГРУЗКА СЦЕНЫ → синхронизация
// ═══════════════════════════════════════════
Hooks.on("canvasReady", async () => {
  if (!game.user.isGM || !canvas.scene) return;
  
  console.log(`D&D Weather | Сцена "${canvas.scene.name}" загружена, синхронизируем...`);
  setTimeout(async () => {
    await applyWeatherToScene(canvas.scene);
  }, 200);
});

// ═══════════════════════════════════════════
// 6. ХУК: ПРОВЕРКА ПРИ КАЖДОМ ИЗМЕНЕНИИ ВРЕМЕНИ
// ═══════════════════════════════════════════
Hooks.on("updateWorldTime", async (worldTime) => {
  if (!game.user.isGM) return;

  await checkAndUpdateWeather();
});

// ═══════════════════════════════════════════
// 7. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ МИРА
// ═══════════════════════════════════════════
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  
  console.log("D&D Weather System v2.0 | Модуль готов к работе.");

  const stored = game.settings.get("dnd-weather", "current-weather");
  
  // Если погода не задана или событие уже закончилось — генерируем новое
  if (!stored || !stored.startedAt || (game.time.worldTime >= stored.startedAt + stored.duration * 3600)) {
    const newWeather = generateNewWeatherEvent();
    await game.settings.set("dnd-weather", "current-weather", newWeather);
    console.log("D&D Weather | Сгенерировано новое событие:", newWeather);
  } else {
    console.log(`D&D Weather | Текущее событие: "${stored.label}" (осталось ${Math.ceil((stored.startedAt + stored.duration * 3600 - game.time.worldTime) / 3600)} ч.)`);
  }
  
  for (const scene of game.scenes) {
    await applyWeatherToScene(scene);
  }
});

console.log("D&D Weather System v2.0 | Модуль загружен.");