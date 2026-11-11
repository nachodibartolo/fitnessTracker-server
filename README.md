# Fitness Tracker – API

API REST de Fitness Tracker, una app móvil de seguimiento de salud, entrenamiento y comida con un chat de IA que responde preguntas sobre tus datos.

La app móvil está en un repositorio aparte: [fitnessTracker](https://github.com/nachodibartolo/fitnessTracker).

- **API:** Express 5 + TypeScript.
- **ORM:** Prisma 7 con el adaptador `@prisma/adapter-pg`.
- **Base:** PostgreSQL (alojada en Supabase, solo como base de datos).
- **Auth:** propia. Email + contraseña con hash scrypt y sesiones con token en la tabla `AuthSession`.
- **IA:** OpenRouter, usando el SDK `openai`.

## Requisitos

- Node.js 20 o superior y **pnpm** (`npm i -g pnpm`).
- Un proyecto en [Supabase](https://supabase.com) (plan gratuito) solo para la base PostgreSQL. La autenticación no usa Supabase Auth.

## Levantar en local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar las variables de entorno

1. En Supabase: **Connect** → **Session pooler** → copiá la connection string. Tiene que usar el puerto **5432** (no 6543).
2. Creá `.env` a partir del ejemplo y pegá la URL con tu contraseña:

```bash
cp .env.example .env
```

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | Sí | Connection string de PostgreSQL |
| `PORT` | No | Puerto de la API (default `3000`) |
| `OPENROUTER_API_KEY` | Solo para IA | Se crea en [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys). El resto de la API levanta sin ella |
| `OPENROUTER_MODEL` | No | Modelo del chat. Tiene que soportar tools |
| `OPENROUTER_VISION_MODEL` | No | Modelo para analizar fotos de comidas. Si falta se usa `OPENROUTER_MODEL` |

### 3. Generar el cliente de Prisma y aplicar el esquema

```bash
pnpm db:generate
pnpm db:migrate
```

> Usá siempre `pnpm exec prisma` o los scripts `pnpm db:*`. No uses `npx prisma`: puede resolver una versión distinta a la del proyecto.

### 4. Levantar la API

```bash
pnpm dev
```

Comprobá que conecta a la base:

```bash
curl http://localhost:3000/health
# {"ok":true,"db":"connected"}
```

## Endpoints

Todas las rutas bajo `/api` (salvo `register` y `login`) piden el header `Authorization: Bearer <token>`.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Verifica la conexión a la base |
| POST | `/api/auth/register` | Crea un usuario y devuelve un token |
| POST | `/api/auth/login` | Inicia sesión y devuelve un token |
| POST | `/api/auth/logout` | Cierra la sesión |
| GET | `/api/me` | Perfil del usuario |
| PATCH | `/api/me` | Actualiza el perfil |
| POST | `/api/health/sync` | Recibe días, entrenamientos y mediciones desde la app |
| POST | `/api/health/import` | Recibe el `export.xml` de Apple Health y lo procesa |
| GET | `/api/health/last-sync` | Fecha de la última sincronización |
| GET | `/api/health/days` | Resúmenes diarios de salud |
| PATCH | `/api/health/days/:date` | Edita a mano los datos de un día |
| GET | `/api/health/workouts` | Entrenamientos |
| GET | `/api/health/imports` | Historial de importaciones |
| GET | `/api/meals` | Comidas registradas |
| GET | `/api/meals/recent` | Comidas recientes |
| POST | `/api/meals` | Registra una comida |
| POST | `/api/meals/analyze` | Analiza la descripción o la foto de una comida con IA y la registra |
| DELETE | `/api/meals/:id` | Borra una comida |
| POST | `/api/chat` | Chat con IA sobre los datos del usuario |

Ejemplo del chat:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"messages":[{"role":"user","content":"¿Cómo dormí esta semana?"}]}'
# {"reply":"...","toolCalls":[{"name":"get_daily_health","args":"{...}"}],"model":"..."}
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | API con recarga automática |
| `pnpm db:generate` | Genera el cliente de Prisma |
| `pnpm db:migrate` | Crea y aplica una migración a partir del schema |
| `pnpm db:push` | Sincroniza el schema sin migración (solo prototipado) |
| `pnpm db:studio` | Abre Prisma Studio para ver los datos |
| `pnpm build` / `pnpm start` | Compila y corre la API en producción |

## Estructura

```
fitnessTracker-server/
├── src/
│   ├── index.ts        # entrada del servidor
│   ├── auth/           # registro, login y hash de contraseñas
│   ├── me/             # perfil del usuario
│   ├── health/         # ingesta (sync / import de Apple Health) y consultas
│   ├── meals/          # comidas y análisis de fotos con IA
│   ├── chat/           # ruta /api/chat, loop con OpenRouter y tools de lectura
│   ├── middleware/     # autenticación y manejo de errores
│   └── lib/            # cliente de Prisma y helpers de fechas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── prisma.config.ts
```

La arquitectura general y las decisiones técnicas están en [ARQUITECTURA.md](https://github.com/nachodibartolo/fitnessTracker/blob/main/ARQUITECTURA.md), en el repo de la app.
