package com.twinatlas.scene;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Polygon;

@Entity
@Table(name = "scene")
class SceneEntity {

  @Id private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false, columnDefinition = "geometry(Polygon,4326)")
  private Polygon extent;

  @Version private Long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected SceneEntity() {}

  SceneEntity(UUID id, String name, Polygon extent, Instant createdAt) {
    this.id = id;
    this.name = name;
    this.extent = extent;
    this.createdAt = createdAt;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public Polygon getExtent() {
    return extent;
  }

  public Long getVersion() {
    return version;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
