package com.twinatlas;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ArchitectureTest {

  private static final String ROOT = "com.twinatlas";
  private static final List<String> SLICES = List.of("annotation", "scene", "asset", "importing");

  private static JavaClasses classes;

  @BeforeAll
  static void importClasses() {
    classes =
        new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages(ROOT);
  }

  @Test
  void corePackagesArePure() {
    noClasses()
        .that()
        .resideInAPackage("..core..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage("org.springframework..", "jakarta..", "org.hibernate..")
        .allowEmptyShould(true)
        .because("the functional core is plain Java: no framework, persistence or I/O")
        .check(classes);
  }

  /** A slice's core is its public face. Everything else (endpoints, entities...) stays private. */
  @ParameterizedTest
  @ValueSource(strings = {"annotation", "scene", "asset", "importing"})
  void slicesDoNotReachIntoEachOthersInternals(String slice) {
    String[] otherSlices =
        SLICES.stream()
            .filter(s -> !s.equals(slice))
            .map(s -> ROOT + "." + s + "..")
            .toArray(String[]::new);
    String sliceInternals = ROOT + "." + slice + "..";
    String sliceCore = ROOT + "." + slice + ".core..";

    noClasses()
        .that()
        .resideInAnyPackage(otherSlices)
        .should()
        .dependOnClassesThat(resideInAPackage(sliceInternals).and(not(resideInAPackage(sliceCore))))
        .allowEmptyShould(true)
        .check(classes);
  }

  @Test
  void platformDoesNotDependOnAnySlice() {
    String[] slices = SLICES.stream().map(s -> ROOT + "." + s + "..").toArray(String[]::new);

    noClasses()
        .that()
        .resideInAPackage(ROOT + ".platform..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(slices)
        .allowEmptyShould(true)
        .check(classes);
  }
}
