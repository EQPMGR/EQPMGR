-- Migration 006: Ensure master_components.slug exists for dedupe lookup

alter table if exists master_components
  add column if not exists slug text;

create unique index if not exists master_components_slug_unique on master_components(slug) where slug is not null;
