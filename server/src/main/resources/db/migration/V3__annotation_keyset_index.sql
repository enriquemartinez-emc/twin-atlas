-- Keyset pagination orders by (created_at, id) inside a scene.
CREATE INDEX ix_annotation_scene_created ON annotation (scene_id, created_at, id);
