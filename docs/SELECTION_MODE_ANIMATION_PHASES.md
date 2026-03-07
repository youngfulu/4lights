# Фазы анимации при активации Selection Mode

Документ описывает все фазы анимации при входе и выходе из режима выбора проекта (selection mode).  
**Важно:** пофазовая анимация камеры (zoom/pan) работает только на **desktop**. На мобильных используется вертикальный layout без этих фаз.

---

## Константы

| Константа | Значение | Назначение |
|-----------|----------|------------|
| `SELECTION_PHASE1_DURATION` | 1200 ms (1.2 s) | Длительность фазы 1 и обратной фазы -1 |
| `SELECTION_PHASE_DELAY` | 250 ms | Пауза между фазой 1 и фазой 2 |
| `SELECTION_PHASE2_DURATION` | 1200 ms (1.2 s) | Длительность фазы 2 и обратной фазы -2 |
| `alignmentAnimationDuration` | 1200 ms (1.2 s) | Длительность движения/масштаба картинок к целевым позициям |
| `FADE_OUT_DURATION_MS` | 250 ms | Затухание невыбранных картинок (desktop) |
| `MOBILE_GRID_FADE_OUT_DURATION_MS` | 300 ms | Затухание сетки на мобильных |
| Easing | `easeOutExpoInertia` | Для zoom/pan (лёгкий overshoot в конце) |
| Easing (картинки) | `easeOutLog` | Для позиции и размера картинок |

---

## Вход в Selection Mode (Desktop)

Триггер: клик по папке/проекту. Вызываются `layoutAlignedEmojisDesktop(true)`, затем при новом выравнивании (`selectionAnimationPhase === 0`) стартует пофазная анимация.

### Фаза 0 — до анимации
- Состояние покоя: `selectionAnimationPhase = 0`.
- При первом входе в selection после клика по папке считается «новое выравнивание» (`isNewAlignment`).

### Фаза 1 — Zoom in на ряд + pan к центру (1.2 s)
- **Устанавливается:** `selectionAnimationPhase = 1`, `selectionPhaseStartTime = now`.
- **Камера:**
  - Zoom: от `selectionStartZoom` к `selectionTargetZoomIn` (zoom in на line image grid).
  - Pan: к центру (`cameraPanX` → `selectionZoomOutPanX`, `cameraPanY` → 0).
- **Картинки:** выбранные начинают двигаться и масштабироваться из текущих позиций сетки к целевым позициям в горизонтальном ряду (интерполяция за `alignmentAnimationDuration` = 1.2 s).
- **Невыбранные картинки:** `targetOpacity = 0`; затухание за **250 ms** (`FADE_OUT_SPEED`).
- По истечении 1.2 s фаза 1 завершается → переход в фазу 1.5.

### Фаза 1.5 — Пауза (250 ms)
- **Устанавливается:** `selectionAnimationPhase = 1.5`, время фазы сбрасывается.
- Камера зафиксирована: zoom = `selectionTargetZoomIn`, pan по центру.
- Картинки продолжают дотягивать позицию/размер до целевых (если 1.2 s не хватило).
- Через **250 ms** переход в фазу 2.

### Фаза 2 — Плавный scroll/pan к выбранному изображению (1.2 s)
- **Устанавливается:** `selectionAnimationPhase = 2`, `selectionPhaseStartTime` и стартовые значения pan обновляются.
- **Камера:**
  - Zoom: остаётся `selectionTargetZoomIn` (ряд уже в нужном масштабе с фазы 1).
  - Pan: плавный scroll от центра к **изображению, на которое кликнул пользователь** (или center-closest при входе из меню). Easing: `easeOutCubic`.
- По истечении 1.2 s: `selectionAnimationPhase = 0`, камера остаётся в финальном состоянии. Анимация входа завершена.

### Параллельно при входе в selection (desktop и mobile)
- **Текст about/more:** блок `#projectAboutText` показывается с **fade-in строчка за строчкой**: сначала название (0 ms), затем каждая строка about (180 ms между строками), в конце блок more.
- **Кнопки Prev/Next (только desktop):** показ через `showSelectionNavButtons()`: сначала `opacity: 0`, затем в следующем кадре (`requestAnimationFrame`) `opacity: 1`, transition **0.45s cubic-bezier(0.4, 0, 0.2, 1)**.
- **Кнопка Back:** показывается при `alignedEmojiIndex !== null` через `updateBackButtonVisibility()`.

---

## Выход из Selection Mode (Desktop) — обратная анимация

Триггер: нажатие «back». Вызывается код выхода, который выставляет `selectionAnimationPhase = -1`.

### Фаза -1 — Zoom out (на 20% ближе, чем полный zoom out) (1.2 s)
- **Устанавливается:** `selectionAnimationPhase = -1`, `selectionPhaseStartTime = now`, `selectionZoomOutExit = selectionTargetZoomOut + (1 - selectionTargetZoomOut) * 0.2` (цель zoom на выходе на 20% ближе).
- **Камера:**
  - Zoom: от текущего к `selectionZoomOutExit` (не до полного zoom out, а на 20% ближе к зрителю).
  - Pan: к центру (`selectionZoomOutPanX`, `cameraPanY` → 0).
- **Картинки:** выбранные начинают возвращаться к исходным позициям в сетке (те же `alignmentAnimationDuration` и `easeOutLog`).
- По истечении 1.2 s → переход в фазу -2.

### Фаза -2 — Zoom к 1.0 и pan в ноль (1.2 s)
- **Устанавливается:** `selectionAnimationPhase = -2`, время фазы сбрасывается.
- **Камера:**
  - Zoom: от `selectionZoomOutExit` к **1.0**.
  - Pan: от `selectionZoomOutPanX` к 0.
- Картинки продолжают возвращаться в сетку.
- По истечении 1.2 s: `selectionAnimationPhase = 0`, zoom = 1.0, pan = 0, массив выравнивания очищается. Режим выбора полностью выключен.

### Параллельно при выходе
- **Текст about/more:** скрывается через `hideProjectAboutText()` (короткий fade 0.1 s, затем `display: none`).
- **Кнопки Prev/Next:** `hideSelectionNavButtons()` — fade out 0.25 s, затем `display: none`.
- **Невыбранные картинки:** снова получают `targetOpacity = 1.0` и возвращаются к интерактивности.

---

## Мобильная версия

- Пофазного zoom/pan (1 → 1.5 → 2) **нет**: используется `layoutAlignedEmojisMobileVertical(true)` и сразу целевые позиции/масштаб (или одна плавная перекладка).
- Затухание фона сетки: **300 ms** (`MOBILE_GRID_FADE_OUT_SPEED`).
- Текст about/more: те же параметры появления (500 ms, 0.5s ease-out); блок more при наличии показывается в потоке прокрутки после первого изображения.
- Кнопки Prev/Next в мобильном selection не показываются (горизонтальная карусель только на desktop).

---

## Краткая схема (desktop)

```
Вход:
  [Фаза 1]  1.2 s   zoom in на ряд + pan to center + fade out остальных
      ↓
  [Фаза 1.5] 0.25 s пауза
      ↓
  [Фаза 2]  1.2 s   плавный scroll/pan к кликнутой картинке
      ↓
  Фаза 0 (selection активен)

Выход:
  [Фаза -1] 1.2 s   zoom out + pan to center
      ↓
  [Фаза -2] 1.2 s   zoom to 1.0 + pan to 0
      ↓
  Фаза 0 (сетка)
```

Общее время входа: **1.2 + 0.25 + 1.2 = 2.65 s** (без учёта длительности fade текста и кнопок).
