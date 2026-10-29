package com.twinatlas.annotation.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnotationRepository extends JpaRepository<AnnotationEntity, UUID> {

  /** An annotation only counts as found when it belongs to the scene in the URL. */
  Optional<AnnotationEntity> findByIdAndSceneId(UUID id, UUID sceneId);
}
