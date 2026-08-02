// ═══════════════════════════════════════════
// D&D WEATHER SYSTEM - MAIN ENTRY POINT
// ═══════════════════════════════════════════

import { BIOMES, BIOME_LABELS, SEASON_LABELS, getSeason, getRandomWeather, getWeatherDescription } from "./weather-data.js";

// ═══════════════════════════════════════════
// 1. РЕГИСТРАЦИЯ НАСТРОЕК
// ═══════════════════════════════════════════
Hooks.once("init", () => {
  console.log("D&D Weather System | Инициализация модуля");

  // Глобальное хранилище текущей погоды
  game.settings.register("dnd-weather", "current-weather", {
    scope: "world",
    config: false,
    type: Object,
    default: { type: "", label: "Ясно", description: "", day: -1 }
  });

  // Настройка: время генерации погоды (по умолчанию 6 утра)
  game.settings.register("dnd-weather", "generate-hour", {
    scope: "world",
    config: true,
    name: "Время генерации погоды",
    hint: "В каком часу автоматически генерировать новую погоду (0-23)",
    type: Number,
    default: 6,
    range: { min: 0, max: 23, step: 1 }
  });
});

// ═══════════════════════════════════════════
// 2. ДОБАВЛЕНИЕ ВКЛАДКИ БИОМА В НАСТРОЙКИ СЦЕНЫ
// ═══════════════════════════════════════════
Hooks.on("renderSceneConfig", (app, html, data) => {
  const scene = app.document;
  const currentBiome = scene.getFlag("world", "weather-biome") || "forest";

  // Создаём HTML для вкладки биома
  const biomeHtml = `
    <div class="form-group">
      <label>Биом погоды</label>
      <select name="flags.world.weather-biome">
        ${Object.entries(BIOME_LABELS).map(([key, label]) => 
          `<option value="${key}" ${currentBiome === key ? "selected" : ""}>${label}</option>`
        ).join("")}
      </select>
      <p class="notes">Выберите биом для автоматической генерации погоды на этой сцене.</p>
    </div>
  `;

  // Добавляем в секцию "Environment" (или создаём новую)
  const envTab = html.find('[data-tab="environment"]');
  if (envTab.length > 0) {
    envTab.find('.form-group').last().after(biomeHtml);
  } else {
    // Если вкладки нет, добавляем в конец
    html.find('.sheet-body').append(biomeHtml);
  }
});

// ═══════════════════════════════════════════
// 3. ФУНКЦИЯ ГЕНЕРАЦИИ МИРОВОЙ ПОГОДЫ
// ═══════════════════════════════════════════
function generateWorldWeather() {
  const referenceScene = game.scenes.find(s => s.getFlag("world", "weather-biome") !== "dungeon") || game.scenes[0];
  const biomeKey = referenceScene?.getFlag("world", "weather-biome") || "forest";
  const weather = getRandomWeather(biomeKey);

  const dayOfYear = Math.floor(game.time.worldTime / 86400) % 360 + 1;
  const season = getSeason(dayOfYear);

  const desc = getWeatherDescription(biomeKey, season, weather.type);
  const description = desc 
    ? `<em>"${desc.text}"</em><br><small style="opacity:0.7">⏱ Ожидается: ~${desc.duration} ч.</small>`
    : "";

  return {
    type: weather.type,
    label: weather.label,
    description,
    biomeKey,
    biomeLabel: BIOME_LABELS[biomeKey],
    season,
    seasonLabel: SEASON_LABELS[season],
    day: Math.floor(game.time.worldTime / 86400)
  };
}

// ═══════════════════════════════════════════
// 4. ПРИМЕНЕНИЕ ПОГОДЫ К СЦЕНЕ
// ═══════════════════════════════════════════
function applyWeatherToScene(scene) {
  const globalWeather = game.settings.get("dnd-weather", "current-weather");
  const biome = scene.getFlag("world", "weather-biome") || "forest";

  let visualType = globalWeather.type;
  if (biome === "dungeon") visualType = "";

  return scene.update({ weather: visualType });
}

// ═══════════════════════════════════════════
// 5. ХУК: ЗАГРУЗКА СЦЕНЫ → синхронизация
// ═══════════════════════════════════════════
Hooks.on("canvasReady", () => {
  if (!game.user.isGM || !canvas.scene) return;
  
  const globalWeather = game.settings.get("dnd-weather", "current-weather");
  const biome = canvas.scene.getFlag("world", "weather-biome") || "forest";
  
  let visualType = globalWeather.type;
  if (biome === "dungeon") visualType = "";
  
  setTimeout(async () => {
    if (canvas.scene.weather !== visualType) {
      console.log(`D&D Weather | Синхронизация "${canvas.scene.name}": ${visualType}`);
      await canvas.scene.update({ weather: visualType });
    }
  }, 150);
});

// ═══════════════════════════════════════════
// 6. ХУК: ГЕНЕРАЦИЯ ПОГОДЫ В ЗАДАННЫЙ ЧАС
// ═══════════════════════════════════════════
let lastCheckedTime = game.time.worldTime;
let lastCheckedDate = Math.floor(lastCheckedTime / 86400);

Hooks.on("updateWorldTime", (worldTime) => {
  if (!game.user.isGM) return;

  const generateHour = game.settings.get("dnd-weather", "generate-hour");
  const currentDay = Math.floor(worldTime / 86400);
  const currentHour = (worldTime % 86400) / 3600;
  const previousHour = (lastCheckedTime % 86400) / 3600;

  const crossedGenerateHour = (previousHour < generateHour && currentHour >= generateHour) ||
                               (currentDay > lastCheckedDate && currentHour >= generateHour);

  if (crossedGenerateHour) {
    const newWeather = generateWorldWeather();
    game.settings.set("dnd-weather", "current-weather", newWeather);

    console.log(`D&D Weather | Новый день ${currentDay}. Погода:`, newWeather);

    game.scenes.forEach(scene => applyWeatherToScene(scene));

    ChatMessage.create({
      user: game.users.find(u => u.isGM)?.id || game.user.id,
      content: `
        <div style="border-left: 4px solid #7b3f00; padding: 12px 16px; background: rgba(0,0,0,0.08); border-radius: 4px;">
          <h3 style="margin: 0 0 6px 0; font-size: 1.15em;">🌅 Утро нового дня</h3>
          <p style="margin: 0 0 4px 0; font-size: 0.85em; opacity: 0.7;">День ${currentDay} · ${newWeather.seasonLabel}</p>
          <p style="margin: 0 0 6px 0;"><strong>📍 Биом:</strong> ${newWeather.biomeLabel}</p>
          <p style="margin: 0 0 10px 0;"><strong>🌦 Погода:</strong> ${newWeather.label}</p>
          ${newWeather.description ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.15);">${newWeather.description}</div>` : ""}
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  lastCheckedTime = worldTime;
  lastCheckedDate = currentDay;
});

// ═══════════════════════════════════════════
// 7. СИНХРОНИЗАЦИЯ ПРИ ЗАГРУЗКЕ МИРА
// ═══════════════════════════════════════════
Hooks.once("canvasReady", () => {
  if (!game.user.isGM) return;
  
  const stored = game.settings.get("dnd-weather", "current-weather");
  const currentDay = Math.floor(game.time.worldTime / 86400);
  
  if (!stored || stored.day < currentDay) {
    const newWeather = generateWorldWeather();
    game.settings.set("dnd-weather", "current-weather", newWeather);
    console.log("D&D Weather | Погода устарела, сгенерирована новая:", newWeather);
  }
  
  game.scenes.forEach(scene => applyWeatherToScene(scene));
});

console.log("D&D Weather System | Модуль загружен.");