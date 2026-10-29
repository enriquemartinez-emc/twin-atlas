package com.twinatlas.scene;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SceneRepository extends JpaRepository<SceneEntity, UUID> {}
