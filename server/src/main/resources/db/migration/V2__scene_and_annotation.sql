CREATE TABLE scene (
    id         uuid PRIMARY KEY,
    name       text                    NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    extent     geometry(Polygon, 4326) NOT NULL CHECK (ST_IsValid(extent)),
    version    bigint                  NOT NULL,
    created_at timestamptz             NOT NULL
);

CREATE INDEX ix_scene_extent ON scene USING gist (extent);

CREATE TABLE annotation (
    id         uuid PRIMARY KEY,
    scene_id   uuid                      NOT NULL,
    kind       text                      NOT NULL,
    title      text                      NOT NULL,
    body       text,
    geom       geometry(Geometry, 4326)  NOT NULL,
    status     text                      NOT NULL,
    version    bigint                    NOT NULL,
    created_at timestamptz               NOT NULL,
    CONSTRAINT fk_annotation_scene FOREIGN KEY (scene_id) REFERENCES scene (id),
    CONSTRAINT ck_annotation_kind CHECK (kind IN ('MARKER', 'NOTE', 'OUTLINE')),
    CONSTRAINT ck_annotation_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT ck_annotation_title CHECK (length(title) BETWEEN 1 AND 120),
    CONSTRAINT ck_annotation_body CHECK (body IS NULL OR length(body) <= 2000),
    CONSTRAINT ck_annotation_geom_valid CHECK (ST_IsValid(geom) AND NOT ST_IsEmpty(geom)),
    CONSTRAINT ck_annotation_kind_geom CHECK (
        (kind IN ('MARKER', 'NOTE') AND GeometryType(geom) = 'POINT')
        OR (kind = 'OUTLINE' AND GeometryType(geom) = 'POLYGON')
    )
);

-- Final enforcer of "a title is used once per scene" (case-insensitive). The core rule is advisory.
CREATE UNIQUE INDEX ux_annotation_scene_title ON annotation (scene_id, lower(title));

CREATE INDEX ix_annotation_geom ON annotation USING gist (geom);
