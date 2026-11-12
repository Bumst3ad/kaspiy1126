---
name: predictive-ml-delay
description: >-
  Use this skill to design, train, and serve the machine learning model that predicts multimodal transit
  delays and bottleneck risks along the Caspian North-South corridor based on weather, port congestion,
  and customs pre-clearance status.
---

# Predictive ML Delay Skill

Этот навык описывает, как обучить и подключить легкую, высокоточную модель прогнозирования задержек для МТК «Север-Юг».

## 1. Входные признаки (Features)
Модель принимает на вход параметры конкретного рейса/плеча маршрута:

| Признак | Тип | Описание |
| :--- | :--- | :--- |
| `origin_port` | Categorical | Порт отправления (напр. `RU_AST`, `RU_MCX`) |
| `destination_port` | Categorical | Порт назначения (напр. `IR_ANZ`, `IR_AMI`) |
| `transport_mode` | Categorical | `sea_vessel`, `rail_ferry`, `container_train`, `truck` |
| `season_month` | Integer | Месяц (1..12, учитывает зимний лед и сезонные ветра) |
| `wind_speed_ms` | Float | Скорость ветра в акватории (м/с) |
| `wave_height_m` | Float | Высота волны (метры) |
| `port_congestion_pct` | Float | Загруженность терминала назначения (0.0 .. 1.0) |
| `customs_precleared` | Binary (0/1) | Наличие предварительного электронного декларирования |
| `cargo_tonnage` | Float | Вес партии (тонн) |
| `vessel_ice_class` | Binary (0/1) | Наличие ледового класса у судна |

## 2. Целевые переменные (Targets)
1. **Регрессия (`delay_hours`):** Прогнозируемая задержка в часах относительно нормативного расписания (0 .. 96+ ч).
2. **Классификация (`delay_risk_level`):**
   - `ON_TIME` (задержка < 2ч)
   - `MODERATE` (2–8ч — рассинхронизация с поездом)
   - `HIGH` (8–24ч — пропуск слота парома)
   - `CRITICAL` (> 24ч — срыв контракта, простой в море/на рейде)

## 3. Выбор алгоритма и пайплайн
- Для хакатона идеально подходит **LightGBM** или **RandomForestRegressor / HistGradientBoostingRegressor** из `scikit-learn` (не требует тяжелых библиотек, обучается за секунды, выдаёт отличную точность на табличных данных).
- Сохранение: `backend/app/ml/delay_model.joblib`.
- Функция объяснения причин (XAI / Feature Importance):
  Модель должна возвращать не только число часов, но и **топ-причину задержки** (например: *"Шторм на юге Каспия: волна 2.8м (+14ч)"* или *"Отсутствие pre-clearance: ожидание таможенного досмотра в порту Энзели (+32ч)"*).
