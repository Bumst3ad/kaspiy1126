---
name: open-design
description: >-
  Use this skill to apply Apple Human Interface Guidelines and minimalist enterprise design principles,
  strictly eliminating AI-slop (no cyan neon borders, no tacky gradients), establishing clean graphite
  materials, hairline borders, and Apple-grade typography.
---

# Apple HIG & Minimalist Enterprise Design Protocol

Этот навык предписывает строгую эстетику премиальных продуктов Apple (Apple Maps, Find My, Linear, macOS):

## 1. Ликвидация AI-Slop (Чего делать категорически нельзя):
- ❌ Никаких кислотных неоновых бирюзовых/голубых подсветок (`#00E5FF`, `#06B6D4`) вокруг карточек.
- ❌ Никаких грязно-синих фонов из 2018 года (`#090D16`, `#060A12`).
- ❌ Никаких кричащих градиентов на всех кнопках подряд.
- ❌ Никаких поломанных карт с водяными знаками "API KEY REQUIRED".

## 2. Каноны эстетики Apple (Что использовать):
1. **Материалы и глубина (Frosted Glass & Vibrancy):**
   - Холст: Глубокий благородный нейтральный графит `#0B0C0E` или `#0F1012`.
   - Карточки: `bg-[#18191D]/85 backdrop-blur-2xl border border-white/[0.08] shadow-2xl rounded-2xl`.
   - Разделители: тонкие `border-white/[0.06]`.
2. **Семантическая палитра Apple HIG:**
   - Apple Blue: `#0A84FF`
   - Apple Green: `#30D158`
   - Apple Orange: `#FF9F0A`
   - Apple Red: `#FF453A`
   - Apple Slate Label: `#8E8E93`
3. **Типографика:**
   - Шрифтовой стек: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif`.
   - Четкая визуальная иерархия без лишнего жирного текста. Табулярные цифры для таймеров и координат.
4. **Интерактивные элементы:**
   - Pill-контролы со скруглением `rounded-full` или `rounded-xl`.
   - Мягкие микро-анимации переходов (`transition-all duration-200 ease-out`).
