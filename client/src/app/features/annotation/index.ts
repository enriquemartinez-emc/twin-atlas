// Public entry point of the annotation feature. Other features import only from here.
export { annotationData, type AnnotationData } from './annotation-data';
export { AnnotationEditor } from './components/annotation-editor';
export { AnnotationForm } from './components/annotation-form';
export { AnnotationList } from './components/annotation-list';
export {
  buildCreateRequest,
  buildUpdateRequest,
  focusPoint,
  isDraftReady,
  OUTLINE_MIN_POINTS,
  toMapFeature,
} from './annotation-draft';
export { KIND_ICONS, KIND_META, type KindMeta } from './kind-meta';
export type { AnnotationFormValue, AnnotationKind } from './annotation-draft';
