-- Migration 005: Add bike model type and remove legacy components field

alter table if exists bike_models
  add column if not exists type text;

alter table if exists bike_models
  drop column if exists components;
