// ═══════════════════════════════════════════
// D&D WEATHER SYSTEM - MAIN ENTRY POINT (v2.2)
// Логика: последовательная смена событий + умный UI + мгновенное обновление
// ═══════════════════════════════════════════

import { BIOMES, BIOME_LABELS, SEASON_LABELS, getSeason, getRandomWeather, getWeatherDescription } from "./weather-data.js";

// ═══════════════════════════════════════════
// 1. РЕГИСТРАЦИЯ НАСТРОЕК МОДУЛЯ
// ═══════════════════════════════════════════
Hooks.once("init", () => {
  console.log("D&D Weather System | Инициализация модуля v2.2");

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

  game.settings.register("dnd-weather", "default-biome", {
    scope: "world",
    config: true,
    name: "Биом по умолчанию",
    hint: "Биом для генерации погоды, если у сцены не задан локальный биом",
    type: String,
    choices: BIOME_LABELS,
    default: "forest"
  });

  game.settings.register("dnd-weather", "min-duration", {
    scope: "world",
    config: true,
    name: "Минимальная продолжительность (часы)",
    hint: "Минимальное время погодного события",
    type: Number,
    default: 1,
    range: { min: 1, max: 24, step: 1 }
  });

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
  // ИСПРАВЛЕНИЕ: Убрали дублирование длительности из описания
  const description = desc ? `<em>"${desc.text}"</em>` : "";

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

  const endTime = currentWeather.startedAt + (currentWeather.duration * 3600);
  
  if (worldTime >= endTime) {
    console.log(`D&D Weather | Событие "${currentWeather.label}" закончилось. Генерируем новое...`);
    
    const newWeather = generateNewWeatherEvent();
    await game.settings.set("dnd-weather", "current-weather", newWeather);

    for (const scene of game.scenes) {
      await applyWeatherToScene(scene);
    }

    // ИСПРАВЛЕНИЕ: Отправка в личку ГМ (WHISPER)
    await ChatMessage.create({
      user: game.users.find(u => u.isGM)?.id || game.user.id,
      content: `
        <div style="border-left: 4px solid #7b3f00; padding: 12px 16px; background: rgba(0,0,0,0.08); border-radius: 4px;">
          <h3 style="margin: 0 0 6px 0; font-size: 1.15em;">🌦 Смена погоды</h3>
          <p style="margin: 0 0 4px 0; font-size: 0.85em; opacity: 0.7;">${newWeather.seasonLabel} · Биом: ${newWeather.biomeLabel}</p>
          <p style="margin: 0 0 6px 0;"><strong>Новая погода:</strong> ${newWeather.label}</p>
          <p style="margin: 0 0 10px 0; font-size: 0.9em; opacity: 0.8;"><strong>⏱ Продлится:</strong> ~${newWeather.duration} ч.</p>
          ${newWeather.description ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.15);">${newWeather.description}</div>` : ""}
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.WHISPER,
      whisper: [game.users.find(u => u.isGM)?.id || game.user.id]
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

  // ИСПРАВЛЕНИЕ: Локальный биом имеет приоритет над глобальным
  let biomeKey = localBiome || game.settings.get("dnd-weather", "default-biome") || "forest";
  let visualType = currentWeather.type;
  
  if (biomeKey === "dungeon") visualType = "";

  if (scene.weather !== visualType) {
    console.log(`D&D Weather | Применяем "${visualType}" к сцене "${scene.name}" (биом: ${biomeKey})`);
    await scene.update({ weather: visualType });
  }
}

// ══════════════════════════════════════════
// 5. ХУК: НАСТРОЙКИ СЦЕНЫ (UI для биома)
// ═══════════════════════════════════════════
Hooks.on("renderSceneConfig", (app, html, data) => {
  const scene = app.document;
  const currentBiome = scene.getFlag("world", "weather-biome") || game.settings.get("dnd-weather", "default-biome") || "forest";
  const useGlobal = scene.getFlag("world", "weather-use-global") ?? true;

  const customHtml = `
    <div class="form-group" style="border-top: 2px solid #7b3f00; padding-top: 10px; margin-top: 10px;">
      <label><strong>🌤 Настройки погоды D&D Weather</strong></label>
    </div>
    <div class="form-group">
      <label>Биом сцены</label>
      <select name="flags.world.weather-biome">
        ${Object.entries(BIOME_LABELS).map(([key, label]) => 
          `<option value="${key}" ${currentBiome === key ? "selected" : ""}>${label}</option>`
        ).join("")}
      </select>
      <p class="notes">Биом, используемый для генерации погоды на этой сцене (имеет приоритет над глобальным).</p>
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" name="flags.world.weather-use-global" ${useGlobal ? "checked" : ""}>
        Использовать глобальную погоду
      </label>
      <p class="notes">Если снято, сцена будет использовать погоду, выбранную вручную в поле "Погодные эффекты" выше (идеально для подземелий или других измерений).</p>
    </div>
  `;

  const $html = $(html);
  const ambienceTab = $html.find('[data-tab="ambience"]');
  
  if (ambienceTab.length > 0) {
    const basicsSection = ambienceTab.find('[data-tab="basics"]');
    if (basicsSection.length > 0) {
      // Ищем поле "Погодные эффекты" и вставляем ПОСЛЕ него
      const weatherEffectsField = basicsSection.find('select[name="weather"]').closest('.form-group');
      if (weatherEffectsField.length > 0) {
        weatherEffectsField.after(customHtml);
      } else {
        basicsSection.append(customHtml);
      }
    } else {
      ambienceTab.prepend(customHtml);
    }
  } else {
    $html.find('.sheet-body').append(customHtml);
  }
});

// ═══════════════════════════════════════════
// 6. НОВЫЙ ХУК: МГНОВЕННОЕ ОБНОВЛЕНИЕ ПРИ СОХРАНЕНИИ СЦЕНЫ
// ═══════════════════════════════════════════
Hooks.on("updateScene", (scene, update, options, userId) => {
  if (!game.user.isGM) return;
  
  // Проверяем, менялись ли флаги, связанные с погодой
  const flagsChanged = update.flags?.world?.['weather-biome'] !== undefined || 
                       update.flags?.world?.['weather-use-global'] !== undefined;

  if (flagsChanged) {
    console.log(`D&D Weather | Настройки биома сцены "${scene.name}" изменены, мгновенно обновляем погоду...`);
    // Небольшая задержка, чтобы Foundry успела применить флаги
    setTimeout(() => applyWeatherToScene(scene), 100);
  }
});

// ═══════════════════════════════════════════
// 7. ХУК: ЗАГРУЗКА СЦЕНЫ → синхронизация
// ═══════════════════════════════════════════
Hooks.on("canvasReady", async () => {
  if (!game.user.isGM || !canvas.scene) return;
  
  console.log(`D&D Weather | Сцена "${canvas.scene.name}" загружена, синхронизируем...`);
  setTimeout(async () => {
    await applyWeatherToScene(canvas.scene);
  }, 200);
});

// ═══════════════════════════════════════════
// 8. ХУК: ПРОВЕРКА ПРИ КАЖДОМ ИЗМЕНЕНИИ ВРЕМЕНИ
// ═══════════════════════════════════════════
Hooks.on("updateWorldTime", async (worldTime) => {
  if (!game.user.isGM) return;
  await checkAndUpdateWeather();
});

// ══════════════════════════════════════════
// 9. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ МИРА
// ═══════════════════════════════════════════
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  
  console.log("D&D Weather System v2.2 | Модуль готов к работе.");

  const stored = game.settings.get("dnd-weather", "current-weather");
  
  if (!stored || !stored.startedAt || (game.time.worldTime >= stored.startedAt + stored.duration * 3600)) {
    const newWeather = generateNewWeatherEvent();
    await game.settings.set("dnd-weather", "current-weather", newWeather);
    console.log("D&D Weather | Сгенерировано новое событие:", newWeather);
  } else {
    const hoursLeft = Math.ceil((stored.startedAt + stored.duration * 3600 - game.time.worldTime) / 3600);
    console.log(`D&D Weather | Текущее событие: "${stored.label}" (осталось ~${hoursLeft} ч.)`);
  }
  
  for (const scene of game.scenes) {
    await applyWeatherToScene(scene);
  }
});

console.log("D&D Weather System v2.2 | Модуль загружен.");