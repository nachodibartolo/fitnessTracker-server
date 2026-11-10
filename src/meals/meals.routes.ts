import { Router } from 'express';
import { z } from 'zod';
import { dateInTz, dayRangeInTz, todayInTz } from '../lib/dates.js';
import { prisma } from '../lib/prisma.js';
import { requireUser, userId } from '../middleware/user.js';
import { analyzeAndLogMeal } from './meal-agent.js';

export const mealsRouter = Router();
mealsRouter.use(requireUser); //Chequea contra la base el token del usuario, corre antes de todas las rutas.

const mealInclude = { items: { orderBy: { order: 'asc' as const } } };

const dayQuery = z.object({
  date: z.iso.date().optional(),
});

mealsRouter.get('/', async (req, res) => {
  const uid = userId(res);
  const q = dayQuery.parse(req.query);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid } });
  const date = q.date ?? todayInTz(user.timezone);
  const { from, to } = dayRangeInTz(date, user.timezone);

  const meals = await prisma.meal.findMany({
    where: { userId: uid, eatenAt: { gte: from, lt: to } },
    orderBy: { eatenAt: 'desc' },
    include: mealInclude,
  });

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      proteinG: acc.proteinG + (m.proteinG ?? 0),
      carbsG: acc.carbsG + (m.carbsG ?? 0),
      fatG: acc.fatG + (m.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  res.json({ date, meals, totals });
});

/* Molde que dice que forma tiene que tener el body de analyze*/
const analyzeBody = z // 3 campos, string, string, timestampz todos opcionales. 
  .object({
    description: z.string().trim().max(1000).optional(),
    image: z
      .string()
      .regex(/^data:image\/(jpeg|png|webp|heic);base64,/, 'Tiene que ser un data URL de imagen')
      .optional(),
    eatenAt: z.iso.datetime().optional(),
  })
  .refine((b) => b.description || b.image, { message: 'Mandá una descripción, una foto, o ambas' }); // Check sobre toda la fila, los 3 son opcionales, pero si o si tiene que haber 1

mealsRouter.post('/analyze', async (req, res) => {
  const body = analyzeBody.parse(req.body); // Hace el chequeo del body contra, AnalyzeBody, si falla tira ZodError 
  const meal = await analyzeAndLogMeal(userId(res), {
    description: body.description || undefined,
    image: body.image,
    eatenAt: body.eatenAt ? new Date(body.eatenAt) : undefined,
  });
  res.status(201).json(meal);
});

const createBody = z.object({
  name: z.string().trim().min(1).max(200),
  calories: z.number().min(0).optional(),
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
});

mealsRouter.post('/', async (req, res) => {
  const body = createBody.parse(req.body);
  const meal = await prisma.meal.create({
    data: {
      userId: userId(res),
      eatenAt: new Date(),
      name: body.name,
      calories: body.calories,
      proteinG: body.proteinG,
      carbsG: body.carbsG,
      fatG: body.fatG,
      source: 'MANUAL',
    },
    include: mealInclude,
  });
  res.status(201).json(meal);
});

const recentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

mealsRouter.get('/recent', async (req, res) => {
  const uid = userId(res);
  const q = recentQuery.parse(req.query);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid } });
  const { from } = dayRangeInTz(todayInTz(user.timezone), user.timezone);

  const meals = await prisma.meal.findMany({
    where: { userId: uid, eatenAt: { lt: from } },
    orderBy: { eatenAt: 'desc' },
    take: q.limit,
    include: mealInclude,
  });

  const groups: { date: string; meals: typeof meals }[] = [];
  for (const meal of meals) {
    const date = dateInTz(meal.eatenAt, user.timezone);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.meals.push(meal);
    } else {
      groups.push({ date, meals: [meal] });
    }
  }

  res.json(groups);
});

mealsRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.meal.deleteMany({ where: { id: req.params.id, userId: userId(res) } });
  if (count === 0) {
    res.status(404).json({ error: 'Comida no encontrada' });
    return;
  }
  res.status(204).end();
});
