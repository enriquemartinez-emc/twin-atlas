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
  toMapFeature,
} from './annotation-draft';
export type { AnnotationFormValue, AnnotationKind } from './annotation-draft';
