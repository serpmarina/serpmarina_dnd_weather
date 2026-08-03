// ═══════════════════════════════════════════
// D&D WEATHER SYSTEM - MAIN ENTRY POINT (v1.1)
// ═══════════════════════════════════════════

import { BIOMES, BIOME_LABELS, SEASON_LABELS, getSeason, getRandomWeather, getWeatherDescription } from "./weather-data.js";

// ═══════════════════════════════════════════
// 1. РЕГИСТРАЦИЯ НАСТРОЕК
// ═══════════════════════════════════════════
Hooks.once("init", () => {
  console.log("D&D Weather System | Инициализация модуля");

  game.settings.register("dnd-weather", "current-weather", {
    scope: "world",
    config: false,
    type: Object,
    default: { type: "", label: "Ясно", description: "", day: -1 }
  });

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
// 2. ДОБАВЛЕНИЕ UI В НАСТРОЙКИ СЦЕНЫ
// ═══════════════════════════════════════════
Hooks.on("renderSceneConfig", (app, html, data) => {
  const scene = app.document;
  const currentBiome = scene.getFlag("world", "weather-biome") || "forest";
  const useGlobal = scene.getFlag("world", "weather-use-global") ?? true; // По умолчанию true

  const customHtml = `
    <div class="form-group">
      <label>🌤 Биом погоды</label>
      <select name="flags.world.weather-biome">
        ${Object.entries(BIOME_LABELS).map(([key, label]) => 
          `<option value="${key}" ${currentBiome === key ? "selected" : ""}>${label}</option>`
        ).join("")}
      </select>
      <p class="notes">Биом, используемый для генерации глобальной погоды.</p>
    </div>
    <div class="form-group">
      <label>🌍 Использовать глобальную погоду</label>
      <input type="checkbox" name="flags.world.weather-use-global" ${useGlobal ? "checked" : ""}>
      <p class="notes">Если снято, сцена будет использовать погоду, выбранную вручную в поле "Погодные эффекты" ниже, игнорируя глобальный прогноз (идеально для подземелий или других измерений).</p!>
    </div>
  `;

  const $html = $(html);
  // Пытаемся найти вкладку "Окружение", если нет - добавляем в конец формы
  const target = $html.find('[data-tab="environment"] .form-group').last();
  if (target.length > 0) {
    target.after(customHtml);
  } else {
    $html.find('.sheet-body').append(customHtml);
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
// 4. ПРИМЕНЕНИЕ ПОГОДЫ К СЦЕНЕ (с учётом ручного overrides)
// ═══════════════════════════════════════════
async function applyWeatherToScene(scene) {
  // ПРОВЕРКА: Если мастер снял галочку, мы НЕ трогаем эту сцену!
  const useGlobal = scene.getFlag("world", "weather-use-global") ?? true;
  if (!useGlobal) {
    console.log(`D&D Weather | Сцена "${scene.name}" использует ручную настройку погоды (игнорируем).`);
    return;
  }

  const globalWeather = game.settings.get("dnd-weather", "current-weather");
  const biome = scene.getFlag("world", "weather-biome") || "forest";
  
  let visualType = globalWeather.type;
  if (biome === "dungeon") visualType = "";

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
  
  console.log(`D&D Weather | Сцена "${canvas.scene.name}" загружена, проверяем синхронизацию...`);
  setTimeout(async () => {
    await applyWeatherToScene(canvas.scene);
  }, 200);
});

// ═══════════════════════════════════════════
// 6. ХУК: ГЕНЕРАЦИЯ ПОГОДЫ ПРИ СМЕНЕ ДНЯ
// ═══════════════════════════════════════════
Hooks.on("updateWorldTime", async (worldTime, dt) => {
  if (!game.user.isGM) return;

  const generateHour = game.settings.get("dnd-weather", "generate-hour");
  const currentDay = Math.floor(worldTime / 86400);
  const currentHour = Math.floor((worldTime % 86400) / 3600);

  const stored = game.settings.get("dnd-weather", "current-weather");
  const alreadyGeneratedToday = stored && stored.day === currentDay;

  // Генерируем, если: сегодня ещё не генерировали И текущий час >= часа генерации
  if (!alreadyGeneratedToday && currentHour >= generateHour) {
    console.log(`D&D Weather | Наступило ${generateHour}:00 дня ${currentDay}. Генерируем погоду!`);
    
    const newWeather = generateWorldWeather();
    await game.settings.set("dnd-weather", "current-weather", newWeather);

    // Применяем ко всем сценам
    for (const scene of game.scenes) {
      await applyWeatherToScene(scene);
    }

    // Отправляем сообщение в чат
    await ChatMessage.create({
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
});

// ═══════════════════════════════════════════
// 7. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ МИРА
// ═══════════════════════════════════════════
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  
  console.log("D&D Weather System | Отслеживание времени инициализировано.");

  const stored = game.settings.get("dnd-weather", "current-weather");
  const currentDay = Math.floor(game.time.worldTime / 86400);
  
  if (!stored || stored.day < currentDay) {
    const newWeather = generateWorldWeather();
    await game.settings.set("dnd-weather", "current-weather", newWeather);
    console.log("D&D Weather | Погода устарела или отсутствует, сгенерирована новая:", newWeather);
  }
  
  for (const scene of game.scenes) {
    await applyWeatherToScene(scene);
  }
});

console.log("D&D Weather System | Модуль загружен.");