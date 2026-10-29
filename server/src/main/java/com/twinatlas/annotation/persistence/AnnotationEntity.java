package com.twinatlas.annotation.persistence;

import com.twinatlas.annotation.AnnotationKind;
import com.twinatlas.annotation.AnnotationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

/**
 * Persistence shape of an annotation. Never leaves the shell: endpoints map it to DTOs. Updates
 * load an entity and change it, they never rebuild a detached one.
 */
@Entity
@Table(name = "annotation")
public class AnnotationEntity {

  @Id private UUID id;

  @Column(name = "scene_id", nullable = false)
  private UUID sceneId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AnnotationKind kind;

  @Column(nullable = false)
  private String title;

  private String body;

  @Column(name = "geom", nullable = false, columnDefinition = "geometry(Geometry,4326)")
  private Geometry geom;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AnnotationStatus status;

  @Version private Long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getSceneId() {
    return sceneId;
  }

  public void setSceneId(UUID sceneId) {
    this.sceneId = sceneId;
  }

  public AnnotationKind getKind() {
    return kind;
  }

  public void setKind(AnnotationKind kind) {
    this.kind = kind;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  public Geometry getGeom() {
    return geom;
  }

  public void setGeom(Geometry geom) {
    this.geom = geom;
  }

  public AnnotationStatus getStatus() {
    return status;
  }

  public void setStatus(AnnotationStatus status) {
    this.status = status;
  }

  public Long getVersion() {
    return version;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
