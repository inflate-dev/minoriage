-- 3D空間ビュー機能（動画スキャン → SfM/YOLO → 3D空間表示）のためのテーブル
-- 仕様書: doc/spec.md 10章

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  company_id uuid not null,
  jetson_scan_id text,
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'done', 'failed')),
  error_message text,
  pointcloud_url text,
  camera_trajectory jsonb,
  video_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists scans_user_id_created_at_idx
  on public.scans (user_id, created_at desc);

create table if not exists public.scan_objects (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  label text not null,
  position_x double precision not null,
  position_y double precision not null,
  position_z double precision not null,
  confidence real,
  view_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists scan_objects_scan_id_idx
  on public.scan_objects (scan_id);

alter table public.scans enable row level security;
alter table public.scan_objects enable row level security;

-- ユーザーは自分のスキャンのみ参照・作成・更新できる
create policy "scans_select_own" on public.scans
  for select using (auth.uid() = user_id);

create policy "scans_insert_own" on public.scans
  for insert with check (auth.uid() = user_id);

create policy "scans_update_own" on public.scans
  for update using (auth.uid() = user_id);

-- scan_objectsは親scanが自分のものである場合のみ参照・作成できる
create policy "scan_objects_select_own" on public.scan_objects
  for select using (
    exists (
      select 1 from public.scans
      where scans.id = scan_objects.scan_id
        and scans.user_id = auth.uid()
    )
  );

create policy "scan_objects_insert_own" on public.scan_objects
  for insert with check (
    exists (
      select 1 from public.scans
      where scans.id = scan_objects.scan_id
        and scans.user_id = auth.uid()
    )
  );
