// ═══════════════════════════════════════════
// ДАННЫЕ ПОГОДЫ: БИОМЫ, СЕЗОНЫ, ОПИСАНИЯ
// ═══════════════════════════════════════════

export const BIOMES = {
  forest: [
    { type: "", weight: 50, label: "Ясно" },
    { type: "rain", weight: 30, label: "Дождь" },
    { type: "fog", weight: 15, label: "Туман" },
    { type: "autumn-leaves", weight: 5, label: "Листопад" }
  ],
  arctic: [
    { type: "", weight: 40, label: "Ясно" },
    { type: "snow", weight: 40, label: "Снег" },
    { type: "blizzard", weight: 20, label: "Метель" }
  ],
  dungeon: [{ type: "", weight: 100, label: "Спокойно" }],
  swamp: [
    { type: "", weight: 30, label: "Ясно" },
    { type: "fog", weight: 50, label: "Густой туман" },
    { type: "rain", weight: 20, label: "Морось" }
  ],
  city: [
    { type: "", weight: 60, label: "Ясно" },
    { type: "rain", weight: 30, label: "Дождь" },
    { type: "fog", weight: 10, label: "Смог" }
  ],
  mountains: [
    { type: "", weight: 40, label: "Ясно" },
    { type: "fog", weight: 30, label: "Облака" },
    { type: "snow", weight: 20, label: "Снег" },
    { type: "rain", weight: 10, label: "Дождь" }
  ],
  jungle: [
    { type: "rain", weight: 50, label: "Ливень" },
    { type: "", weight: 30, label: "Ясно" },
    { type: "fog", weight: 20, label: "Влажный туман" }
  ],
  coast: [
    { type: "", weight: 50, label: "Ясно" },
    { type: "rain", weight: 30, label: "Дождь" },
    { type: "fog", weight: 20, label: "Морской туман" }
  ],
  plains: [
    { type: "", weight: 70, label: "Ясно" },
    { type: "rain", weight: 20, label: "Дождь" },
    { type: "autumn-leaves", weight: 10, label: "Ветер" }
  ],
  desert: [
    { type: "", weight: 80, label: "Ясно" },
    { type: "fog", weight: 15, label: "Пыльная буря" },
    { type: "rain", weight: 5, label: "Редкий дождь" }
  ]
};

export const BIOME_LABELS = {
  forest: "Лес", arctic: "Арктика", dungeon: "Подземелье", swamp: "Болото",
  city: "Город", mountains: "Горы", jungle: "Джунгли", coast: "Побережье",
  plains: "Равнины", desert: "Пустыня"
};

export const SEASON_LABELS = {
  winter: "Зима", spring: "Весна", summer: "Лето", autumn: "Осень"
};

export const DESCRIPTIONS = {
  city: {
    autumn: {
      "autumn-leaves": [
        { text: "Листопад. Улицы и площади покрыты толстым слоем золотых и багряных листьев. Они красиво шуршат под ногами, но делают любое скрытное передвижение почти невозможным.", duration: 4 },
        { text: "Ветер гоняет по мостовым сухие листья, сбивая их в шуршащие вихри у стен. Торговцы на рынках ворчливо сметают их с прилавков.", duration: 6 }
      ],
      "rain": [
        { text: "Затяжные дожди. Дождь идёт вторую неделю без просвета. Улицы раскисли, стены отсырели, а в домах не просыхает бельё. Город стал серым и злым.", duration: 50 },
        { text: "Краткий, но сильный ливень. Водосточные желоба не справляются, и на мостовых образуются бурлящие ручьи.", duration: 2 }
      ],
      "fog": [
        { text: "Густой смогу стелется между крыш. Фонари горят даже днём, а прохожие видят друг друга лишь в последний момент.", duration: 8 }
      ],
      "": [
        { text: "Ясный осенний день. Солнце низкое, тени длинные, а в воздухе пахнет дымом из печных труб и жареными каштанами.", duration: 12 }
      ]
    },
    winter: {
      "snow": [
        { text: "Снег падает крупными хлопьями, укрывая крыши и мостовые белым пушистым одеялом. Город затих, слышен лишь скрип саней.", duration: 24 }
      ],
      "": [
        { text: "Морозное ясное утро. Дым из труб стоит ровными столбами, а на окнах — узоры инея.", duration: 10 }
      ]
    },
    spring: {
      "rain": [
        { text: "Тёплый весенний дождь. На улицах — лужи, но в воздухе пахнет сыростью и первой зеленью.", duration: 6 }
      ],
      "": [
        { text: "Ясный весенний день. Город оживает: открыты окна, на рынках — первая редиска и молодая зелень.", duration: 14 }
      ]
    },
    summer: {
      "": [
        { text: "Жаркий летний полдень. Мостовые раскалены, а над городом дрожит марево. Люди прячутся в тени.", duration: 10 }
      ],
      "rain": [
        { text: "Короткая летняя гроза. Сверкает молния, гремит гром, и тёплый ливень смывает пыль с черепичных крыш.", duration: 2 }
      ]
    }
  },
  forest: {
    autumn: {
      "rain": [{ text: "В лесу моросит холодный дождь. С веток капает, под ногами хлюпает прелая листва.", duration: 8 }],
      "": [{ text: "Тихий лесной день. Солнце пробивается сквозь желтеющую листву, пахнет грибами и прелой листвой.", duration: 12 }]
    },
    winter: {
      "snow": [{ text: "Лес стоит белый и тихий. Снег глушит все звуки, лишь изредка треснет ветка под тяжестью.", duration: 24 }]
    },
    spring: {
      "": [{ text: "Молодая зелень, пение птиц и запах распустившихся почек. Лес полон жизни.", duration: 14 }]
    },
    summer: {
      "": [{ text: "Густая зелёная листва даёт прохладную тень. В воздухе звенят цикады.", duration: 12 }]
    }
  }
};

// ═══════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════

export function getSeason(dayOfYear) {
  const d = ((dayOfYear - 1) % 360) + 1;
  if (d <= 90) return "winter";
  if (d <= 180) return "spring";
  if (d <= 270) return "summer";
  return "autumn";
}

export function getRandomWeather(biomeKey) {
  const weatherTable = BIOMES[biomeKey] || BIOMES.forest;
  const total = weatherTable.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of weatherTable) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return weatherTable[0];
}

export function getWeatherDescription(biomeKey, season, weatherType) {
  const biomeDesc = DESCRIPTIONS[biomeKey]?.[season]?.[weatherType];
  if (!biomeDesc || biomeDesc.length === 0) return "";
  
  const picked = biomeDesc[Math.floor(Math.random() * biomeDesc.length)];
  return {
    text: picked.text,
    duration: picked.duration
  };
}