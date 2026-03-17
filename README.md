# MySQL ERD Creator

Десктопное приложение: загружаете SQL-файл со структурой БД — получаете **физическую** и **логическую** ERD-диаграмму в тёмном интерфейсе с видимыми связями и экспортом в JPG.

## Возможности

- Загрузка SQL (один файл): перетаскивание или кнопка «Загрузить SQL» (в Electron — системный диалог)
- Поддержка дампов: из файла автоматически выкидываются комментарии (`--`, `#`, `/* */`), `SET`, `USE`, `LOCK` и т.п., парсятся только DDL
- **Физическая ERD** — таблицы с колонками и типами (INT, VARCHAR и т.д.)
- **Логическая ERD** — те же таблицы без типов
- Связи между таблицами: линии со стрелками (явные `FOREIGN KEY` + вывод по колонкам `*_id`)
- Подписи на карточках: **PK** у первичных ключей, **→ table** у внешних ключей
- Панель в левом нижнем углу: зум, подгонка вида, миникарта, кнопка **JPG** — сохранение всей схемы в один файл

## Стек

- **Electron** + **Vite** + **React 18** + **TypeScript**
- **React Flow (@xyflow/react)** — канвас диаграмм
- **Dagre** — авто-раскладка
- **sql-ddl-to-json-schema** — парсинг MySQL DDL
- **html-to-image** — экспорт схемы в JPG

## Запуск

```bash
npm install
npm run dev
```

Откроется окно Electron. Загрузите `.sql` с `CREATE TABLE` (и при необходимости `ALTER TABLE` с внешними ключами).

## Сборка (релиз)

```bash
npm run build
```

Собранное приложение — в каталоге `release/`.

## Структура проекта

```
├── electron/
│   ├── main/index.ts     # Процесс Electron, диалог выбора файла
│   └── preload/index.ts   # Preload, API для renderer
├── src/
│   ├── components/        # UploadZone, ErdCanvas, TableNode, Tabs, ErdToolbar
│   ├── store/             # SchemaProvider, useSchemaStore
│   ├── services/          # sqlParser (DDL + вывод связей по *_id)
│   ├── lib/               # dagreLayout
│   ├── types/             # schema.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
└── tailwind.config.js
```

Поддерживается MySQL/MariaDB DDL.
