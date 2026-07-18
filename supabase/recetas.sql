-- =====================================================================
-- Recetas de GymTrack Pro (v2, pasos con metodo y tiempo estructurados).
--
-- Cada paso guarda, ademas del texto: el metodo (oven/stovetop/blender/chill/
-- prep), los minutos y la temperatura del horno cuando aplica. Asi la app puede
-- mostrar "Oven · 12 min · 200C" como etiqueta y ofrecer un temporizador, en vez
-- de esconder el tiempo dentro del parrafo.
--
-- Los macros se calcularon desde los gramos y cuadran con la regla 4/4/9.
-- Ejecutar una vez en el SQL Editor. Es idempotente.
-- =====================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type meal_type as enum ('breakfast','lunch','dinner','snack');
  end if;
end $$;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  meal_type meal_type not null,
  description text not null,
  difficulty text not null default 'easy',
  prep_minutes integer not null default 0,
  cook_minutes integer not null default 0,
  active_minutes integer not null default 0,   -- tiempo con las manos ocupadas
  servings integer not null default 1,
  calories integer not null,
  protein_g numeric(6,1) not null,
  carbs_g numeric(6,1) not null,
  fat_g numeric(6,1) not null,
  fiber_g numeric(6,1) not null default 0,
  ingredients jsonb not null default '[]'::jsonb,
  -- steps ahora es jsonb: [{ "text":..., "method":..., "minutes":..., "temp_c":... }]
  steps jsonb not null default '[]'::jsonb,
  tips text[] not null default '{}',
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

-- Pone al dia una tabla de version anterior sin perderla.
alter table public.recipes add column if not exists name text;
alter table public.recipes add column if not exists meal_type meal_type;
alter table public.recipes add column if not exists description text;
alter table public.recipes add column if not exists difficulty text not null default 'easy';
alter table public.recipes add column if not exists prep_minutes integer not null default 0;
alter table public.recipes add column if not exists cook_minutes integer not null default 0;
alter table public.recipes add column if not exists active_minutes integer not null default 0;
alter table public.recipes add column if not exists servings integer not null default 1;
alter table public.recipes add column if not exists calories integer not null default 0;
alter table public.recipes add column if not exists protein_g numeric(6,1) not null default 0;
alter table public.recipes add column if not exists carbs_g numeric(6,1) not null default 0;
alter table public.recipes add column if not exists fat_g numeric(6,1) not null default 0;
alter table public.recipes add column if not exists fiber_g numeric(6,1) not null default 0;
alter table public.recipes add column if not exists ingredients jsonb not null default '[]'::jsonb;
alter table public.recipes add column if not exists tips text[] not null default '{}';
alter table public.recipes add column if not exists tags text[] not null default '{}';
alter table public.recipes add column if not exists allergens text[] not null default '{}';
alter table public.recipes add column if not exists image_url text;
alter table public.recipes add column if not exists created_at timestamptz not null default now();
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name='recipes' and column_name='steps' and data_type='ARRAY') then
    alter table public.recipes drop column steps;
  end if;
  alter table public.recipes add column if not exists steps jsonb not null default '[]'::jsonb;
end $$;

create index if not exists idx_recipes_meal_type on public.recipes (meal_type);
create index if not exists idx_recipes_tags on public.recipes using gin (tags);

alter table public.recipes enable row level security;
drop policy if exists "recipes are readable by signed in users" on public.recipes;
create policy "recipes are readable by signed in users" on public.recipes
  for select to authenticated using (true);

delete from public.recipes;


insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('protein-oats-berries','Protein Oats with Berries','breakfast','The breakfast that actually holds until lunch. Slow oats for steady energy, whey for the protein your muscles are waiting for after the overnight fast.',
  'easy',5,5,5,1,
  501,43.0,65.6,9.1,12.1,
  '[{"name": "rolled oats", "grams": 60, "note": null}, {"name": "skim milk", "grams": 200, "note": null}, {"name": "whey protein powder", "grams": 30, "note": "vanilla or unflavoured"}, {"name": "blueberries", "grams": 60, "note": null}, {"name": "chia seeds", "grams": 10, "note": null}, {"name": "cinnamon", "grams": 1, "note": "a pinch"}]'::jsonb,
  '[{"text": "Put the oats and the milk in a small pot over medium heat.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Stir for about 4 minutes, until it thickens and the oats stop looking dry.", "method": "prep", "minutes": 4, "temp_c": null}, {"text": "Take it OFF the heat and wait one minute. Adding whey to boiling liquid makes it clump.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Stir in the protein powder until smooth, then the chia seeds.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Top with the blueberries and a pinch of cinnamon.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['If it gets too thick, loosen it with a splash of milk, not water.','No whey? Swap for 150g of Greek yogurt stirred in at the end. Slightly less protein, still good.']::text[],array['high-protein','muscle-gain','quick']::text[],array['milk']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('spinach-feta-omelette','Spinach and Feta Omelette','breakfast','Three eggs, two whites, a fistful of spinach. Ready before your coffee finishes brewing.',
  'easy',5,8,5,1,
  410,36.4,6.2,26.2,1.9,
  '[{"name": "whole eggs", "grams": 150, "note": "about 3 eggs"}, {"name": "egg whites", "grams": 100, "note": "about 3 whites"}, {"name": "spinach", "grams": 80, "note": null}, {"name": "feta cheese", "grams": 30, "note": null}, {"name": "olive oil", "grams": 5, "note": null}, {"name": "salt", "grams": 1, "note": null}, {"name": "black pepper", "grams": 0.5, "note": null}]'::jsonb,
  '[{"text": "Beat the whole eggs and the whites together with the salt and pepper until fully combined.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Heat the olive oil in a non-stick pan over MEDIUM heat. High heat makes eggs rubbery.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Add the spinach and cook for 1 minute, just until it wilts.", "method": "stovetop", "minutes": 1, "temp_c": null}, {"text": "Pour in the eggs. Let them set for 30 seconds without touching them.", "method": "stovetop", "minutes": 1, "temp_c": null}, {"text": "Drag the edges toward the middle with a spatula, letting the raw egg run underneath.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "When the top is still slightly wet, crumble the feta over one half and fold it closed.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Slide it out after 30 more seconds. It keeps cooking on the plate.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['Slightly wet in the middle is correct. Dry omelette means you cooked it 40 seconds too long.']::text[],array['high-protein','low-carb','quick']::text[],array['egg','milk']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('greek-yogurt-bowl','Greek Yogurt Power Bowl','breakfast','No cooking, no excuses. Assembled in the time it takes to find a spoon.',
  'easy',5,0,5,1,
  520,35.8,51.5,21.9,9.5,
  '[{"name": "Greek yogurt, 0% fat", "grams": 250, "note": null}, {"name": "banana", "grams": 100, "note": "1 medium"}, {"name": "almonds", "grams": 20, "note": "chopped"}, {"name": "peanut butter", "grams": 15, "note": null}, {"name": "honey", "grams": 10, "note": null}, {"name": "chia seeds", "grams": 10, "note": null}]'::jsonb,
  '[{"text": "Spoon the yogurt into a bowl.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Slice the banana over it.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Warm the peanut butter for 10 seconds so it drizzles instead of clumping.", "method": "prep", "minutes": 1, "temp_c": null}, {"text": "Add the almonds, chia seeds, peanut butter and honey.", "method": null, "minutes": null, "temp_c": null}, {"text": "Eat immediately, or let it sit 10 minutes if you like the chia softer.", "method": null, "minutes": 10, "temp_c": null}]'::jsonb,
  array['Skip the honey if you are cutting. It costs 30 kcal and adds nothing but sweetness.']::text[],array['high-protein','no-cook','quick']::text[],array['milk','nuts','peanut']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('egg-avocado-toast','Eggs and Avocado on Toast','breakfast','The classic, with enough protein to earn its place. Two slices, two eggs, half an avocado.',
  'easy',5,6,5,1,
  474,23.2,36.0,27.2,9.7,
  '[{"name": "whole grain bread", "grams": 70, "note": "2 slices"}, {"name": "whole eggs", "grams": 100, "note": "2 eggs"}, {"name": "avocado", "grams": 70, "note": "half a medium one"}, {"name": "lemon juice", "grams": 5, "note": null}, {"name": "olive oil", "grams": 5, "note": null}, {"name": "salt", "grams": 1, "note": null}, {"name": "black pepper", "grams": 0.5, "note": null}]'::jsonb,
  '[{"text": "Toast the bread while you cook the eggs, so everything lands hot at once.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Heat the oil in a pan over medium-low. Crack the eggs in.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Cook 3 to 4 minutes for a runny yolk, 6 for firm.", "method": "stovetop", "minutes": 3, "temp_c": null}, {"text": "Mash the avocado with the lemon juice, salt and pepper. The lemon keeps it green.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Spread the avocado on the toast and slide the eggs on top.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['Lemon juice is not optional if you are making this ahead. Without it the avocado browns in minutes.']::text[],array['balanced','quick']::text[],array['egg','gluten']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('cottage-cheese-pancakes','Cottage Cheese Protein Pancakes','breakfast','Pancakes that fit a cut. The cottage cheese disappears into the batter and leaves the protein behind.',
  'medium',10,10,10,1,
  593,50.1,48.3,22.4,7.6,
  '[{"name": "cottage cheese, 2%", "grams": 150, "note": null}, {"name": "whole eggs", "grams": 100, "note": "2 eggs"}, {"name": "rolled oats", "grams": 50, "note": "blended into flour"}, {"name": "whey protein powder", "grams": 15, "note": null}, {"name": "cinnamon", "grams": 1, "note": null}, {"name": "strawberries", "grams": 80, "note": "to serve"}, {"name": "olive oil", "grams": 5, "note": null}]'::jsonb,
  '[{"text": "Blend the oats alone until they look like flour.", "method": "blender", "minutes": null, "temp_c": null}, {"text": "Add the cottage cheese, eggs, protein powder and cinnamon. Blend until smooth.", "method": "blender", "minutes": null, "temp_c": null}, {"text": "Let the batter REST for 5 minutes. The oats absorb liquid and the pancakes hold together.", "method": null, "minutes": 5, "temp_c": null}, {"text": "Heat a non-stick pan over medium-low with a few drops of oil.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Pour small pancakes, about 3 tablespoons each. Small ones flip cleanly, big ones tear.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Wait for bubbles across the surface before flipping, about 2 minutes. Then 1 minute on the other side.", "method": "stovetop", "minutes": 2, "temp_c": null}, {"text": "Serve with the strawberries.", "method": null, "minutes": null, "temp_c": null}]'::jsonb,
  array['Medium-low heat, always. Protein batters burn outside and stay raw inside on high heat.']::text[],array['high-protein','muscle-gain']::text[],array['egg','milk']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('arepa-huevo-perico','Arepa with Scrambled Eggs','breakfast','Breakfast the way half of Colombia and Venezuela eats it, with the eggs scrambled with tomato and onion.',
  'medium',10,15,14,1,
  472,22.3,44.0,23.1,4.6,
  '[{"name": "pre-cooked corn flour (arepa)", "grams": 80, "note": "corn flour"}, {"name": "whole eggs", "grams": 100, "note": "2 eggs"}, {"name": "tomato", "grams": 60, "note": "diced"}, {"name": "onion", "grams": 40, "note": "diced"}, {"name": "olive oil", "grams": 8, "note": null}, {"name": "salt", "grams": 2, "note": null}, {"name": "mozzarella", "grams": 20, "note": null}]'::jsonb,
  '[{"text": "Mix the corn flour with 120ml of warm water and 1g of salt. Knead 2 minutes until it stops cracking.", "method": "prep", "minutes": 2, "temp_c": null}, {"text": "Rest the dough 5 minutes, then shape 2 discs about 1cm thick.", "method": "prep", "minutes": 5, "temp_c": null}, {"text": "Cook them on a dry hot pan, 5 minutes per side, until a crust forms and they sound hollow.", "method": "stovetop", "minutes": 5, "temp_c": null}, {"text": "In another pan, soften the onion in half the oil for 2 minutes, then add the tomato for 2 more.", "method": "stovetop", "minutes": 2, "temp_c": null}, {"text": "Beat the eggs with the remaining salt, pour them in, and stir slowly off the edges.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Pull the eggs off while still glossy. Split the arepas, add the cheese and the eggs.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['If the dough cracks when you shape it, it needs more water. Wet hands help too.']::text[],array['balanced','traditional']::text[],array['egg','milk']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('chicken-rice-broccoli','Chicken, Rice and Broccoli','lunch','The meal that built more muscle than any supplement. Boring on purpose, and it works.',
  'easy',10,20,30,1,
  646,50.8,73.6,16.1,6.0,
  '[{"name": "chicken breast, raw", "grams": 180, "note": null}, {"name": "white rice, dry", "grams": 75, "note": null}, {"name": "broccoli", "grams": 150, "note": null}, {"name": "olive oil", "grams": 10, "note": null}, {"name": "garlic", "grams": 6, "note": "2 cloves"}, {"name": "salt", "grams": 2, "note": null}, {"name": "black pepper", "grams": 1, "note": null}, {"name": "paprika", "grams": 2, "note": null}]'::jsonb,
  '[{"text": "Rinse the rice until the water runs clear, then cook it with 150ml of water for 15 minutes, lid on.", "method": "prep", "minutes": 15, "temp_c": null}, {"text": "Season the chicken with the salt, pepper and paprika on BOTH sides.", "method": null, "minutes": null, "temp_c": null}, {"text": "Heat the oil over medium-high. Lay the chicken down and DO NOT touch it for 5 minutes.", "method": null, "minutes": 5, "temp_c": null}, {"text": "Flip once. Cook 4 to 6 more minutes depending on thickness. It is done at 74C in the centre.", "method": "oven", "minutes": null, "temp_c": 74}, {"text": "Rest the chicken 5 minutes on a plate. Cutting it early loses the juice.", "method": "prep", "minutes": 5, "temp_c": null}, {"text": "Steam the broccoli 4 minutes, until bright green and still firm.", "method": "oven", "minutes": 4, "temp_c": null}, {"text": "Crush the garlic into the pan juices for 30 seconds and pour them over everything.", "method": "stovetop", "minutes": 1, "temp_c": null}]'::jsonb,
  array['Rest the chicken. Five minutes of patience is the difference between juicy and dry.','Cook the rice in chicken broth instead of water if you find it bland.']::text[],array['high-protein','muscle-gain','meal-prep']::text[],'{}'::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('tuna-quinoa-salad','Tuna and Quinoa Salad','lunch','Cold, portable, and it doesn''t get sad in a lunchbox. High protein without touching a stove twice.',
  'easy',15,15,15,1,
  617,43.5,60.4,23.3,11.4,
  '[{"name": "quinoa, dry", "grams": 70, "note": null}, {"name": "canned tuna in water, drained", "grams": 120, "note": null}, {"name": "tomato", "grams": 80, "note": null}, {"name": "red bell pepper", "grams": 60, "note": null}, {"name": "onion", "grams": 30, "note": "red, thinly sliced"}, {"name": "avocado", "grams": 50, "note": null}, {"name": "olive oil", "grams": 10, "note": null}, {"name": "lemon juice", "grams": 15, "note": null}, {"name": "fresh parsley", "grams": 10, "note": null}, {"name": "salt", "grams": 2, "note": null}]'::jsonb,
  '[{"text": "Rinse the quinoa well. Unrinsed quinoa tastes bitter, and most people blame the recipe.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Cook it in 140ml of water, 15 minutes, then leave it covered 5 minutes off the heat.", "method": null, "minutes": 15, "temp_c": null}, {"text": "Spread it on a plate to cool. Hot quinoa turns the vegetables limp.", "method": null, "minutes": null, "temp_c": null}, {"text": "Dice the tomato, pepper and onion. Slice the avocado last so it stays green.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Whisk the olive oil, lemon juice and salt into a dressing.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Fold everything together with the drained tuna and the parsley.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Make a double batch of quinoa. It keeps 4 days and turns any protein into a meal.']::text[],array['high-protein','meal-prep','no-reheat']::text[],array['fish']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('beef-sweet-potato-bowl','Lean Beef and Sweet Potato Bowl','lunch','Iron, creatine and slow carbs. A bowl that eats like a treat and trains like a tool.',
  'easy',10,25,10,1,
  604,44.3,63.1,20.0,11.8,
  '[{"name": "lean ground beef (5% fat)", "grams": 170, "note": null}, {"name": "sweet potato", "grams": 250, "note": null}, {"name": "spinach", "grams": 100, "note": null}, {"name": "onion", "grams": 50, "note": null}, {"name": "garlic", "grams": 6, "note": null}, {"name": "olive oil", "grams": 10, "note": null}, {"name": "cumin", "grams": 2, "note": null}, {"name": "paprika", "grams": 2, "note": null}, {"name": "salt", "grams": 2, "note": null}, {"name": "black pepper", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Cube the sweet potato into 2cm pieces. Toss with half the oil, salt and paprika.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Roast at 200C for 22 to 25 minutes, turning once, until the edges caramelise.", "method": "oven", "minutes": 22, "temp_c": 200}, {"text": "Meanwhile heat the rest of the oil and brown the beef over high heat, breaking it apart.", "method": null, "minutes": null, "temp_c": null}, {"text": "Do not stir constantly. Let it sit and get colour, that is where the flavour is.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Add the onion, garlic and cumin. Cook 3 minutes.", "method": "oven", "minutes": 3, "temp_c": null}, {"text": "Throw in the spinach and turn off the heat. It wilts on residual heat alone.", "method": "oven", "minutes": null, "temp_c": null}, {"text": "Build the bowl: sweet potato, beef, spinach.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Any leftover roasted sweet potato is tomorrow''s breakfast with eggs on top.']::text[],array['high-protein','muscle-gain','iron']::text[],'{}'::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('lentil-veggie-stew','Hearty Lentil Stew','lunch','Plant protein, fibre for days, and it gets better the next morning. Cheap food that fights above its weight.',
  'easy',10,30,27,2,
  388,21.9,58.7,9.4,20.6,
  '[{"name": "cooked lentils", "grams": 200.0, "note": null}, {"name": "carrot", "grams": 60.0, "note": null}, {"name": "onion", "grams": 50.0, "note": null}, {"name": "tomato", "grams": 100.0, "note": null}, {"name": "garlic", "grams": 5.0, "note": null}, {"name": "low-sodium chicken broth", "grams": 200.0, "note": null}, {"name": "olive oil", "grams": 7.5, "note": null}, {"name": "cumin", "grams": 1.5, "note": null}, {"name": "paprika", "grams": 1.5, "note": null}, {"name": "salt", "grams": 1.5, "note": null}, {"name": "fresh cilantro", "grams": 7.5, "note": null}]'::jsonb,
  '[{"text": "Dice the onion and carrot small so they cook at the same speed.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Sweat them in the oil over medium heat for 6 minutes, until the onion turns translucent.", "method": null, "minutes": 6, "temp_c": null}, {"text": "Add the garlic, cumin and paprika. Stir for 45 seconds, until you can smell them. Do not let them burn.", "method": "prep", "minutes": 1, "temp_c": null}, {"text": "Add the tomato and cook 5 minutes, mashing it into the base.", "method": "prep", "minutes": 5, "temp_c": null}, {"text": "Pour in the broth and the lentils. Simmer 15 minutes, uncovered, so it thickens.", "method": "stovetop", "minutes": 15, "temp_c": null}, {"text": "Salt at the END. Salting lentils early keeps them tough.", "method": null, "minutes": null, "temp_c": null}, {"text": "Finish with the fresh cilantro off the heat.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['This is the one recipe here that is honestly better on day two.','Blend a cup of it and stir it back in if you want it creamy without cream.']::text[],array['vegetarian','high-fiber','budget','meal-prep']::text[],'{}'::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('chicken-pasta-primavera','Chicken Pasta Primavera','lunch','Carbs before a hard afternoon session, with enough protein to make it a real meal.',
  'medium',10,20,11,1,
  745,57.6,79.0,24.7,11.9,
  '[{"name": "whole wheat pasta, dry", "grams": 90, "note": null}, {"name": "chicken breast, raw", "grams": 150, "note": null}, {"name": "zucchini", "grams": 100, "note": null}, {"name": "red bell pepper", "grams": 80, "note": null}, {"name": "mushrooms", "grams": 80, "note": null}, {"name": "garlic", "grams": 6, "note": null}, {"name": "olive oil", "grams": 12, "note": null}, {"name": "mozzarella", "grams": 25, "note": null}, {"name": "oregano", "grams": 2, "note": null}, {"name": "salt", "grams": 2, "note": null}, {"name": "black pepper", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Boil the pasta in well salted water. Pull it 1 minute BEFORE the box says.", "method": "stovetop", "minutes": 1, "temp_c": null}, {"text": "Save a cup of the pasta water before draining. This is not optional.", "method": null, "minutes": null, "temp_c": null}, {"text": "Cut the chicken into strips and season it. Sear in half the oil over high heat, 3 minutes per side. Remove.", "method": "stovetop", "minutes": 3, "temp_c": null}, {"text": "Same pan, rest of the oil: mushrooms first, alone, 3 minutes, until they release and reabsorb their water.", "method": "stovetop", "minutes": 3, "temp_c": null}, {"text": "Add the zucchini and pepper for 4 minutes, then the garlic and oregano for 30 seconds.", "method": "stovetop", "minutes": 4, "temp_c": null}, {"text": "Return the chicken and the pasta. Add a splash of pasta water and toss hard.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "The starch in that water is what makes the sauce cling instead of slide off. Finish with the cheese.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['Mushrooms need space and no salt at the start, or they steam instead of browning.']::text[],array['balanced','pre-workout']::text[],array['gluten','milk']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('shrimp-black-bean-tacos','Shrimp and Black Bean Tacos','lunch','Fast protein, real fibre, and it feels like a Friday. Three tacos that don''t wreck your day.',
  'easy',15,10,15,1,
  739,57.4,88.5,20.3,24.1,
  '[{"name": "raw shrimp", "grams": 180, "note": null}, {"name": "cooked black beans", "grams": 150, "note": null}, {"name": "corn tortillas", "grams": 90, "note": "3 tortillas"}, {"name": "avocado", "grams": 50, "note": null}, {"name": "tomato", "grams": 80, "note": null}, {"name": "onion", "grams": 30, "note": null}, {"name": "fresh cilantro", "grams": 10, "note": null}, {"name": "lemon juice", "grams": 20, "note": null}, {"name": "olive oil", "grams": 8, "note": null}, {"name": "cumin", "grams": 2, "note": null}, {"name": "salt", "grams": 2, "note": null}]'::jsonb,
  '[{"text": "Pat the shrimp completely dry. Wet shrimp steams and turns rubbery.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Toss them with the cumin, half the salt and half the lime.", "method": null, "minutes": null, "temp_c": null}, {"text": "Sear in the hot oil, 90 seconds per side. They are done the moment they curl into a C.", "method": "stovetop", "minutes": 2, "temp_c": null}, {"text": "A shrimp curled into a tight O is overcooked. Watch for the C.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Warm the beans with the rest of the cumin, mashing about a third of them for texture.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Char the tortillas directly on the pan, 20 seconds a side.", "method": "stovetop", "minutes": 1, "temp_c": null}, {"text": "Build: beans, shrimp, diced tomato and onion, avocado, cilantro, the rest of the lime.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Frozen shrimp works. Thaw it in cold water, then dry it like you mean it.']::text[],array['high-protein','quick']::text[],array['shellfish']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('baked-salmon-asparagus','Baked Salmon with Vegetables','dinner','Omega-3s, one tray, almost no washing up. The dinner that makes tomorrow''s training feel easier.',
  'easy',10,18,10,1,
  721,46.9,52.3,37.4,9.9,
  '[{"name": "salmon fillet", "grams": 180, "note": null}, {"name": "broccoli", "grams": 150, "note": null}, {"name": "zucchini", "grams": 120, "note": null}, {"name": "potato", "grams": 200, "note": null}, {"name": "olive oil", "grams": 12, "note": null}, {"name": "garlic", "grams": 6, "note": null}, {"name": "lemon juice", "grams": 15, "note": null}, {"name": "salt", "grams": 2, "note": null}, {"name": "black pepper", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Heat the oven to 200C. Cube the potato small, 1.5cm, or it will not finish in time.", "method": "oven", "minutes": null, "temp_c": 200}, {"text": "Give the potato a 10 minute head start on the tray with half the oil and salt.", "method": null, "minutes": 10, "temp_c": null}, {"text": "Add the broccoli and zucchini, push everything to the sides, and lay the salmon in the middle.", "method": "oven", "minutes": null, "temp_c": null}, {"text": "Brush the salmon with the rest of the oil, the garlic and the lemon.", "method": null, "minutes": null, "temp_c": null}, {"text": "Bake 12 to 14 minutes. The salmon is ready when it flakes with light pressure and the centre is just opaque.", "method": "oven", "minutes": 12, "temp_c": null}, {"text": "If it flakes apart on its own, it is already overdone. Aim for one minute earlier.", "method": null, "minutes": null, "temp_c": null}]'::jsonb,
  array['Skin on, skin down. It protects the flesh from the tray''s direct heat.']::text[],array['omega-3','high-protein','one-pan']::text[],array['fish']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('turkey-style-chicken-stirfry','Ginger Chicken Stir Fry','dinner','Fifteen minutes, one pan, and more vegetables than most people eat in a day.',
  'medium',15,12,27,1,
  712,53.8,84.5,17.8,10.9,
  '[{"name": "chicken breast, raw", "grams": 180, "note": null}, {"name": "broccoli", "grams": 120, "note": null}, {"name": "red bell pepper", "grams": 80, "note": null}, {"name": "carrot", "grams": 80, "note": null}, {"name": "onion", "grams": 50, "note": null}, {"name": "fresh ginger", "grams": 10, "note": null}, {"name": "garlic", "grams": 8, "note": null}, {"name": "low-sodium soy sauce", "grams": 20, "note": null}, {"name": "olive oil", "grams": 10, "note": null}, {"name": "brown rice, dry", "grams": 70, "note": null}]'::jsonb,
  '[{"text": "Start the brown rice first, it takes 30 minutes. Everything else takes 12.", "method": null, "minutes": 30, "temp_c": null}, {"text": "Cut ALL the vegetables before you turn on the heat. A stir fry gives you no time to chop.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Slice the chicken thin, against the grain.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Get the pan properly hot. Smoking hot. This is the whole technique.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Chicken first, in one layer, 2 minutes without moving. Then toss 2 minutes. Remove.", "method": "stovetop", "minutes": 2, "temp_c": null}, {"text": "Carrot and broccoli 2 minutes, pepper and onion 2 minutes, ginger and garlic 30 seconds.", "method": null, "minutes": 2, "temp_c": null}, {"text": "Chicken back in, soy sauce down the side of the hot pan so it sizzles. Toss and serve.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['A crowded pan steams. Cook in two batches if your pan is small; it is worth the extra 3 minutes.']::text[],array['high-protein','vegetables']::text[],array['soy']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('tofu-veggie-curry','Tofu and Chickpea Curry','dinner','Plant protein that actually satisfies. Freezes well, reheats better.',
  'medium',15,25,33,2,
  583,39.6,54.9,26.6,17.1,
  '[{"name": "firm tofu", "grams": 150.0, "note": null}, {"name": "cooked chickpeas", "grams": 120.0, "note": null}, {"name": "tomato", "grams": 125.0, "note": null}, {"name": "onion", "grams": 60.0, "note": null}, {"name": "spinach", "grams": 60.0, "note": null}, {"name": "garlic", "grams": 5.0, "note": null}, {"name": "fresh ginger", "grams": 6.0, "note": null}, {"name": "olive oil", "grams": 9.0, "note": null}, {"name": "cumin", "grams": 2.0, "note": null}, {"name": "paprika", "grams": 2.0, "note": null}, {"name": "low-sodium chicken broth", "grams": 125.0, "note": "or vegetable broth"}, {"name": "salt", "grams": 1.5, "note": null}]'::jsonb,
  '[{"text": "Press the tofu between two plates with something heavy on top for 10 minutes. Squeeze the water out.", "method": "prep", "minutes": 10, "temp_c": null}, {"text": "Cube it and sear in half the oil until golden on at least two sides. Set aside.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Soft, wet tofu will never brown. Pressing it is the difference between curry and mush.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Cook the onion in the rest of the oil for 6 minutes, then the garlic and ginger for 1.", "method": "stovetop", "minutes": 6, "temp_c": null}, {"text": "Add cumin and paprika, stir 45 seconds to wake them up.", "method": "prep", "minutes": 1, "temp_c": null}, {"text": "Add the tomato, crush it down, and cook 6 minutes until it darkens.", "method": "stovetop", "minutes": 6, "temp_c": null}, {"text": "Pour in the broth and the chickpeas. Simmer 10 minutes.", "method": "stovetop", "minutes": 10, "temp_c": null}, {"text": "Return the tofu, fold in the spinach, salt, and take it off the heat.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Double it. This is one of the few high-protein meals that freezes without ruining the texture.']::text[],array['vegetarian','high-fiber','meal-prep']::text[],array['soy']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('pork-loin-roasted-veg','Pork Loin with Roasted Vegetables','dinner','Lean, cheap, and it slices like something far more expensive if you rest it properly.',
  'medium',10,25,10,1,
  615,44.4,57.7,23.4,9.9,
  '[{"name": "pork loin", "grams": 180, "note": null}, {"name": "potato", "grams": 220, "note": null}, {"name": "carrot", "grams": 100, "note": null}, {"name": "onion", "grams": 60, "note": null}, {"name": "olive oil", "grams": 12, "note": null}, {"name": "garlic", "grams": 6, "note": null}, {"name": "oregano", "grams": 2, "note": null}, {"name": "salt", "grams": 2, "note": null}, {"name": "black pepper", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Oven at 200C. Cube the potato and carrot, toss with half the oil, salt and oregano, and roast 20 minutes.", "method": "oven", "minutes": 20, "temp_c": 200}, {"text": "Season the pork all over. Sear it in the rest of the oil over high heat, 2 minutes per side, until brown.", "method": "stovetop", "minutes": 2, "temp_c": null}, {"text": "Move the pork onto the vegetable tray and roast 12 to 15 minutes.", "method": "oven", "minutes": 12, "temp_c": null}, {"text": "Pull it at 63C in the centre. Pork does NOT need to be grey to be safe.", "method": "oven", "minutes": null, "temp_c": 63}, {"text": "Rest it 8 minutes under loose foil before slicing. This is the whole recipe.", "method": null, "minutes": 8, "temp_c": null}, {"text": "Slice against the grain and spoon the tray juices over it.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Slicing pork straight out of the oven costs you a third of its juice. Wait the eight minutes.']::text[],array['high-protein','budget']::text[],'{}'::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('chicken-lettuce-wraps','Light Chicken Lettuce Wraps','dinner','A late dinner that won''t sit on your chest. Low carb, high protein, done in a quarter of an hour.',
  'easy',15,12,15,1,
  418,41.1,20.6,19.7,6.4,
  '[{"name": "chicken thigh, skinless", "grams": 180, "note": null}, {"name": "romaine lettuce", "grams": 120, "note": "whole leaves"}, {"name": "mushrooms", "grams": 80, "note": null}, {"name": "carrot", "grams": 60, "note": "grated"}, {"name": "onion", "grams": 40, "note": null}, {"name": "garlic", "grams": 6, "note": null}, {"name": "fresh ginger", "grams": 8, "note": null}, {"name": "low-sodium soy sauce", "grams": 15, "note": null}, {"name": "olive oil", "grams": 8, "note": null}, {"name": "fresh cilantro", "grams": 10, "note": null}]'::jsonb,
  '[{"text": "Chop the chicken thigh into small pieces, roughly the size of a chickpea.", "method": null, "minutes": null, "temp_c": null}, {"text": "Brown it in the hot oil for 4 minutes without stirring much.", "method": "prep", "minutes": 4, "temp_c": null}, {"text": "Add the mushrooms and onion. Cook 4 minutes, until the water they release evaporates.", "method": null, "minutes": 4, "temp_c": null}, {"text": "Garlic and ginger, 30 seconds. Then the soy sauce and the grated carrot for 1 minute.", "method": null, "minutes": 1, "temp_c": null}, {"text": "Wash and dry the lettuce leaves. Wet leaves make a wrap that falls apart.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Spoon the filling into the leaves, top with cilantro, and eat with your hands.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Thigh over breast here. It stays tender in small pieces where breast goes stringy.']::text[],array['low-carb','high-protein','quick']::text[],array['soy']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('baked-cod-style-tuna-patties','Tuna and Potato Patties','dinner','Pantry dinner. Canned tuna, a potato, an egg, and you eat like you planned ahead.',
  'medium',15,15,23,1,
  568,50.4,49.8,18.7,6.8,
  '[{"name": "canned tuna in water, drained", "grams": 150, "note": null}, {"name": "potato", "grams": 250, "note": null}, {"name": "whole eggs", "grams": 50, "note": "1 egg"}, {"name": "onion", "grams": 40, "note": null}, {"name": "fresh parsley", "grams": 10, "note": null}, {"name": "olive oil", "grams": 12, "note": null}, {"name": "lemon juice", "grams": 10, "note": null}, {"name": "salt", "grams": 2, "note": null}, {"name": "black pepper", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Boil the potato whole, skin on, until a knife slides in, about 20 minutes. Skin on keeps it from going watery.", "method": "stovetop", "minutes": 20, "temp_c": null}, {"text": "Peel and mash it while hot, then let it COOL before adding the egg, or you will cook the egg.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Squeeze the tuna genuinely dry. Any water left will make the patties fall apart.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Mix the tuna, potato, egg, finely diced onion, parsley, lemon, salt and pepper.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Shape 4 patties and chill them 10 minutes if you have time. They hold together far better cold.", "method": "chill", "minutes": 10, "temp_c": null}, {"text": "Fry over medium heat, 3 to 4 minutes per side, until a real crust forms. Flip once, gently.", "method": "stovetop", "minutes": 3, "temp_c": null}]'::jsonb,
  array['Dry tuna, cool potato, chilled patties. Skip any of the three and you get scrambled tuna.']::text[],array['budget','high-protein','pantry']::text[],array['fish','egg']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('banana-peanut-protein-shake','Banana Peanut Protein Shake','snack','Post-workout, or any time the gap to dinner is too long. Ninety seconds from fridge to done.',
  'easy',3,0,3,1,
  543,44.0,66.6,14.3,8.3,
  '[{"name": "banana", "grams": 120, "note": "1 large"}, {"name": "whey protein powder", "grams": 30, "note": null}, {"name": "peanut butter", "grams": 20, "note": null}, {"name": "skim milk", "grams": 250, "note": null}, {"name": "cinnamon", "grams": 1, "note": null}, {"name": "rolled oats", "grams": 30, "note": "optional, for a fuller shake"}]'::jsonb,
  '[{"text": "Put the liquid in the blender FIRST. It saves the blades and the noise.", "method": "blender", "minutes": null, "temp_c": null}, {"text": "Add the oats and blend 10 seconds alone if you are using them.", "method": "blender", "minutes": 1, "temp_c": null}, {"text": "Add the banana, peanut butter, protein and cinnamon.", "method": null, "minutes": null, "temp_c": null}, {"text": "Blend 30 seconds. Do not over-blend whey, it foams and turns thin.", "method": "blender", "minutes": 1, "temp_c": null}]'::jsonb,
  array['Freeze the banana in slices. A frozen banana is the whole difference between a shake and a milkshake.','Drop the oats to cut about 115 kcal if you are in a deficit.']::text[],array['post-workout','high-protein','quick']::text[],array['milk','peanut']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('cottage-cheese-berry-cup','Cottage Cheese and Berry Cup','snack','Slow protein before bed. Casein digests overnight, which is exactly what you want while you sleep.',
  'easy',3,0,3,1,
  342,27.1,27.6,14.8,7.1,
  '[{"name": "cottage cheese, 2%", "grams": 200, "note": null}, {"name": "blueberries", "grams": 80, "note": null}, {"name": "almonds", "grams": 15, "note": null}, {"name": "chia seeds", "grams": 8, "note": null}, {"name": "cinnamon", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Spoon the cottage cheese into a cup.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Add the blueberries, chopped almonds, chia and cinnamon.", "method": null, "minutes": null, "temp_c": null}, {"text": "Stir once and eat. That is the entire recipe.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['This is the best pre-sleep snack in this whole list. Cottage cheese is mostly casein, which releases slowly.']::text[],array['pre-sleep','high-protein','no-cook']::text[],array['milk','nuts']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('chocolate-chia-pudding','Chocolate Chia Pudding','snack','Dessert that behaves. Make it at night, find it waiting in the morning.',
  'easy',5,0,5,1,
  333,24.8,35.7,14.6,16.2,
  '[{"name": "chia seeds", "grams": 30, "note": null}, {"name": "unsweetened almond milk", "grams": 250, "note": null}, {"name": "cocoa powder", "grams": 10, "note": null}, {"name": "whey protein powder", "grams": 20, "note": "chocolate"}, {"name": "honey", "grams": 10, "note": null}, {"name": "strawberries", "grams": 80, "note": "to serve"}]'::jsonb,
  '[{"text": "Whisk the cocoa and the protein into the almond milk until there are no lumps. Lumps now stay lumps forever.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Add the chia and the honey. Whisk again.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Wait 5 minutes and whisk ONE more time. This second whisk stops the seeds settling into a brick.", "method": "prep", "minutes": 5, "temp_c": null}, {"text": "Cover and refrigerate at least 4 hours, ideally overnight.", "method": "chill", "minutes": 480, "temp_c": null}, {"text": "Top with strawberries before eating.", "method": "prep", "minutes": null, "temp_c": null}]'::jsonb,
  array['Too thick in the morning? A splash of milk fixes it. Too thin? Another 5g of chia and another hour.']::text[],array['make-ahead','high-fiber','dessert']::text[],array['milk','nuts']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('apple-almond-butter-snack','Apple with Almonds and Yogurt','snack','Crunch, protein, and no dishes. For the 4pm hole in the afternoon.',
  'easy',3,0,3,1,
  329,20.9,36.4,13.4,8.0,
  '[{"name": "apple", "grams": 180, "note": "1 medium"}, {"name": "almonds", "grams": 25, "note": null}, {"name": "Greek yogurt, 0% fat", "grams": 150, "note": null}, {"name": "cinnamon", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Slice the apple.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Stir the cinnamon through the yogurt.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Dip the apple, eat the almonds alongside.", "method": null, "minutes": null, "temp_c": null}]'::jsonb,
  array['Twenty-five grams of almonds is about 20 nuts. Count them once so you know what it looks like.']::text[],array['no-cook','quick','high-fiber']::text[],array['milk','nuts']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('mango-green-smoothie','Mango Green Smoothie','snack','Where the spinach goes when you don''t want to taste it. You genuinely won''t.',
  'easy',5,0,5,1,
  269,20.6,36.2,6.7,7.8,
  '[{"name": "mango", "grams": 150, "note": null}, {"name": "spinach", "grams": 60, "note": null}, {"name": "Greek yogurt, 0% fat", "grams": 150, "note": null}, {"name": "unsweetened almond milk", "grams": 200, "note": null}, {"name": "chia seeds", "grams": 10, "note": null}, {"name": "lemon juice", "grams": 10, "note": null}]'::jsonb,
  '[{"text": "Blend the spinach with the almond milk FIRST, alone, until no flecks remain.", "method": "blender", "minutes": null, "temp_c": null}, {"text": "This order is the trick. Blend it last and you drink leaves.", "method": "blender", "minutes": null, "temp_c": null}, {"text": "Add the mango, yogurt, chia and lime. Blend 30 more seconds.", "method": "blender", "minutes": null, "temp_c": null}]'::jsonb,
  array['Frozen mango, no ice. Ice waters it down; frozen fruit thickens it.']::text[],array['quick','vegetables','high-fiber']::text[],array['milk','nuts']::text[]);

insert into public.recipes
 (slug,name,meal_type,description,difficulty,prep_minutes,cook_minutes,active_minutes,servings,
  calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,steps,tips,tags,allergens)
values ('hummus-style-chickpea-snack','Smashed Chickpea Toast','snack','Savoury, filling, and cheap. The snack for when another shake would be one shake too many.',
  'easy',8,2,8,1,
  480,19.3,61.5,19.4,17.1,
  '[{"name": "cooked chickpeas", "grams": 150, "note": null}, {"name": "whole grain bread", "grams": 35, "note": "1 slice"}, {"name": "avocado", "grams": 40, "note": null}, {"name": "lemon juice", "grams": 10, "note": null}, {"name": "olive oil", "grams": 8, "note": null}, {"name": "garlic", "grams": 3, "note": null}, {"name": "cumin", "grams": 1, "note": null}, {"name": "paprika", "grams": 1, "note": null}, {"name": "salt", "grams": 1, "note": null}]'::jsonb,
  '[{"text": "Toast the bread.", "method": "stovetop", "minutes": null, "temp_c": null}, {"text": "Smash the chickpeas roughly with a fork. Leave some whole, texture is the point.", "method": null, "minutes": null, "temp_c": null}, {"text": "Mix in the crushed garlic, cumin, lemon, olive oil and salt.", "method": "prep", "minutes": null, "temp_c": null}, {"text": "Spread the avocado on the toast, pile the chickpeas on, dust with paprika.", "method": "stovetop", "minutes": null, "temp_c": null}]'::jsonb,
  array['Smashed, not blended. Blend it and you have made hummus, which is a different and lonelier snack.']::text[],array['vegetarian','high-fiber','budget']::text[],array['gluten']::text[]);


select meal_type, count(*) as recetas,
       round(avg(active_minutes),0) as activo_medio
from public.recipes group by meal_type order by 1;
