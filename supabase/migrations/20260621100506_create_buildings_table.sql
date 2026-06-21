/*
# Campus Map: Buildings Table

## Overview
Creates the core `buildings` table for the Campus Map application.
Buildings represent physical structures on a campus, drawn as polygons on a map.

## New Tables

### buildings
- `id` (uuid, primary key) — unique identifier, auto-generated
- `name` (text, not null) — human-readable building name (e.g. "Main Building")
- `code` (text, not null) — short identifier code (e.g. "MB-01")
- `description` (text) — optional longer description
- `floors` (int, default 1) — number of floors/storeys in the building
- `area` (numeric, default 0) — footprint area in square metres
- `polygon` (jsonb, default '[]') — ordered array of {lat, lng} coordinate objects
  forming the building outline polygon on the map
- `is_public` (boolean, default false) — when true, all authenticated users can see this
  building; when false, only the owner sees it
- `user_id` (uuid, not null, DEFAULT auth.uid()) — the owner; populated automatically
  from the authenticated session so inserts can safely omit this column
- `created_at` (timestamptz) — creation timestamp

## Security

### Row Level Security
RLS is enabled. Four separate policies are created (one per verb):

1. **SELECT** — authenticated user sees rows they own OR rows marked is_public
2. **INSERT** — authenticated user may only insert rows where user_id matches their session
3. **UPDATE** — authenticated user may only update rows they own
4. **DELETE** — authenticated user may only delete rows they own

## Indexes
- `idx_buildings_user_id` on `user_id` for fast per-user lookups
- `idx_buildings_is_public` on `is_public` for fast public-filter queries

## Notes
- Polygon data is stored as JSONB to allow arbitrary coordinate arrays without
  a separate geometry extension dependency.
- `user_id` has DEFAULT auth.uid() so Angular inserts like `.from('buildings').insert({name, ...})`
  succeed without the client passing user_id explicitly.
*/

CREATE TABLE IF NOT EXISTS buildings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  code        text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  floors      int         NOT NULL DEFAULT 1,
  area        numeric     NOT NULL DEFAULT 0,
  polygon     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_public   boolean     NOT NULL DEFAULT false,
  user_id     uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buildings_user_id  ON buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_is_public ON buildings(is_public);

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows + public rows
DROP POLICY IF EXISTS "select_own_or_public_buildings" ON buildings;
CREATE POLICY "select_own_or_public_buildings" ON buildings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

-- INSERT: only own rows (user_id default covers omitted column)
DROP POLICY IF EXISTS "insert_own_buildings" ON buildings;
CREATE POLICY "insert_own_buildings" ON buildings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: only own rows
DROP POLICY IF EXISTS "update_own_buildings" ON buildings;
CREATE POLICY "update_own_buildings" ON buildings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: only own rows
DROP POLICY IF EXISTS "delete_own_buildings" ON buildings;
CREATE POLICY "delete_own_buildings" ON buildings
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
