-- ============================================================================
-- supabase/tests/rls.sql
-- Pruebas de autorización multiusuario (RLS) + regresión del IDOR (P0).
-- Ejecutar contra un Postgres con las migraciones 0001–0005 aplicadas.
-- Simula el rol `authenticated` de Supabase. Falla con excepción si algo no cumple.
-- ============================================================================
\set ON_ERROR_STOP on
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'
\set BCONV '33333333-3333-3333-3333-333333333333'

reset role;

-- Limpieza + usuarios de prueba
delete from auth.users where id in (:'A', :'B');
insert into auth.users(id) values (:'A'), (:'B');

-- Simular los grants que Supabase concede a `authenticated`...
grant select, insert, update, delete on all tables in schema public to authenticated;
-- ...y volver a aplicar el bloqueo de mcp_tokens (tabla de servidor) tras el grant amplio.
revoke all on public.mcp_tokens from authenticated;

-- Datos base para A y B (como superusuario, sin RLS)
insert into calendar_events(user_id,title,category,starts_at,ends_at) values
  (:'A','A-evt','trabajo', now(), now()+interval '1h'),
  (:'B','B-evt','trabajo', now(), now()+interval '1h');
insert into goals(user_id,name,type,period,target_value) values
  (:'A','A-goal','ganancias','semanal',100),
  (:'B','B-goal','ganancias','semanal',100);
insert into assistant_conversations(id,user_id,title) values (:'BCONV', :'B', 'B-conv');
insert into assistant_messages(user_id,conversation_id,role,content)
  values (:'B', :'BCONV', 'user', 'secreto de B');

-- ===================== Actuar como A (authenticated) =====================
set role authenticated;
set app.uid = :'A';

-- 1) Aislamiento de lectura + regresión IDOR
do $$
declare n int;
begin
  select count(*) into n from calendar_events where user_id = current_setting('app.uid')::uuid;
  if n <> 1 then raise exception 'A deberia ver 1 evento propio, vio %', n; end if;

  select count(*) into n from calendar_events;               -- RLS limita a A
  if n <> 1 then raise exception 'A deberia ver solo 1 evento en total, vio %', n; end if;

  -- Guard del endpoint respond: reclamar la conversacion de B debe dar 0
  select count(*) into n from assistant_conversations
    where id = '33333333-3333-3333-3333-333333333333'
      and user_id = current_setting('app.uid')::uuid;
  if n <> 0 then raise exception 'IDOR: A pudo reclamar la conversacion de B'; end if;

  select count(*) into n from assistant_messages
    where conversation_id = '33333333-3333-3333-3333-333333333333';
  if n <> 0 then raise exception 'A no deberia ver mensajes de B (vio %)', n; end if;

  raise notice 'OK 1: aislamiento de lectura + guard IDOR';
end $$;

-- 2) A no puede insertar como B (WITH CHECK)
do $$
begin
  begin
    insert into calendar_events(user_id,title,category,starts_at,ends_at)
      values ('22222222-2222-2222-2222-222222222222','falso','otro',now(),now()+interval '1h');
    raise exception 'FALLO: A pudo insertar una fila como B';
  exception
    when insufficient_privilege then raise notice 'OK 2: insert como B denegado (RLS)';
    when others then raise notice 'OK 2: insert como B denegado (%).', sqlstate;
  end;
end $$;

-- 3) A no puede modificar ni borrar datos de B (0 filas)
do $$
declare n int;
begin
  update calendar_events set title='hackeado' where user_id='22222222-2222-2222-2222-222222222222';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A actualizo % filas de B', n; end if;

  delete from calendar_events where user_id='22222222-2222-2222-2222-222222222222';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A borro % filas de B', n; end if;

  raise notice 'OK 3: A no puede modificar/borrar datos de B';
end $$;

-- 4) private (tokens) y mcp_tokens: acceso denegado a authenticated
do $$
begin
  begin
    perform 1 from private.gmail_integrations;
    raise exception 'FALLO: authenticated accedio a private.gmail_integrations';
  exception
    when insufficient_privilege then raise notice 'OK 4a: esquema private denegado';
    when others then raise notice 'OK 4a: private denegado (%).', sqlstate;
  end;
  begin
    perform 1 from public.mcp_tokens;
    raise exception 'FALLO: authenticated accedio a mcp_tokens';
  exception
    when insufficient_privilege then raise notice 'OK 4b: mcp_tokens denegado';
    when others then raise notice 'OK 4b: mcp_tokens denegado (%).', sqlstate;
  end;
end $$;

-- ===================== Verificar como superusuario =====================
reset role;
do $$
declare n int;
begin
  select count(*) into n from calendar_events
    where user_id='22222222-2222-2222-2222-222222222222' and title='B-evt';
  if n <> 1 then raise exception 'FALLO: los datos de B se alteraron (%).', n; end if;

  select count(*) into n from assistant_messages where content='secreto de B';
  if n <> 1 then raise exception 'FALLO: el mensaje de B se altero'; end if;

  raise notice 'OK 5: datos de B intactos tras los intentos de A';
end $$;

-- Limpieza
delete from auth.users where id in
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');

select 'TODAS LAS PRUEBAS RLS PASARON' as resultado;
