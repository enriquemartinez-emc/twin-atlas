package com.twinatlas;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.List;
import java.util.stream.Stream;
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
  void pureCodeIsFreeOfFrameworks() {
    noClasses()
        .that()
        .resideInAnyPackage("..core..", ROOT + ".platform.kernel..", ROOT + ".geo..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage("org.springframework..", "jakarta..", "org.hibernate..")
        .allowEmptyShould(true)
        .because("the functional core is plain Java: no framework, persistence or I/O")
        .check(classes);
  }

  @Test
  void sharedKernelAndGeoDependOnNoSliceAndNoShell() {
    String[] forbidden =
        Stream.concat(
                SLICES.stream().map(s -> ROOT + "." + s + ".."), Stream.of(ROOT + ".platform"))
            .toArray(String[]::new);

    noClasses()
        .that()
        .resideInAnyPackage(ROOT + ".platform.kernel..", ROOT + ".geo..")
        .should()
        .dependOnClassesThat(
            resideInAnyPackage(forbidden)
                .and(not(resideInAnyPackage(ROOT + ".platform.kernel..", ROOT + ".geo.."))))
        .allowEmptyShould(true)
        .check(classes);
  }

  @Test
  void roleFoldersDependOneWay() {
    noClasses()
        .that()
        .resideInAPackage("..persistence..")
        .should()
        .dependOnClassesThat()
        .resideInAPackage("..web..")
        .allowEmptyShould(true)
        .because("the database side must not know about the HTTP side")
        .check(classes);

    noClasses()
        .that()
        .resideInAPackage(ROOT + ".annotation")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(ROOT + ".annotation.web..", ROOT + ".annotation.persistence..")
        .allowEmptyShould(true)
        .because("the shapes a feature returns are the base of its folders, not built on them")
        .check(classes);

    noClasses()
        .that()
        .resideInAPackage("..core..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage("..web..", "..persistence..", ROOT + ".platform.config..")
        .allowEmptyShould(true)
        .because("the functional core knows nothing about how it is called or stored")
        .check(classes);
  }

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
