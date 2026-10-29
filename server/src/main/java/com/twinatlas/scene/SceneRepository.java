package com.twinatlas.scene;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SceneRepository extends JpaRepository<SceneEntity, UUID> {

  List<SceneEntity> findTop100ByOrderByCreatedAtDescIdDesc();
}
