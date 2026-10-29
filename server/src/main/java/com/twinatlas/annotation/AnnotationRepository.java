package com.twinatlas.annotation;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AnnotationRepository extends JpaRepository<AnnotationEntity, UUID> {}
