import type * as CesiumNamespace from 'cesium';
import type { CustomDataSource, Entity, Viewer } from 'cesium';
import { type FeatureDescriptor, describeDraft, describeFeature } from './descriptors';
import type { LonLat, MapFeature } from './features';
import { PALETTE } from './palette';

type Cesium = typeof CesiumNamespace;

/** `ground` for the OSM globe, `tiles` when the scene is the photorealistic 3D tileset. */
export type ClampTarget = 'ground' | 'tiles';

export class FeatureLayer {
  private readonly features: CustomDataSource;
  private readonly draft: CustomDataSource;

  constructor(
    private readonly cesium: Cesium,
    private readonly viewer: Viewer,
    private readonly clampTo: ClampTarget,
  ) {
    this.features = new cesium.CustomDataSource('annotations');
    this.draft = new cesium.CustomDataSource('draft');
    void viewer.dataSources.add(this.features);
    void viewer.dataSources.add(this.draft);
  }

  setFeatures(features: readonly MapFeature[], selectedId: string | null): void {
    const entities = this.features.entities;
    // Removed before the batch starts: inside one batch Cesium treats an entity that is removed and
    // added again under the same id as changed, and keeps drawing the old colour.
    entities.removeAll();
    entities.suspendEvents();
    for (const feature of features) {
      const descriptor = describeFeature(feature, selectedId);
      if (descriptor) entities.add(this.entityFor(descriptor));
    }
    entities.resumeEvents();
  }

  setDraft(points: readonly LonLat[], asArea: boolean): void {
    const { Cartesian3, Color, PolygonHierarchy } = this.cesium;
    const entities = this.draft.entities;
    entities.suspendEvents();
    entities.removeAll();
    const draft = describeDraft(points, asArea);
    const color = Color.fromCssColorString(PALETTE.DRAFT);
    for (const point of draft.points) {
      entities.add({
        position: Cartesian3.fromDegrees(point.longitude, point.latitude),
        point: {
          pixelSize: 10,
          color,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          heightReference: this.pointHeight(),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    if (draft.points.length >= 2) {
      entities.add({
        polyline: {
          positions: Cartesian3.fromDegreesArray([...draft.degrees]),
          width: 3,
          material: color,
          clampToGround: true,
          classificationType: this.classification(),
        },
      });
    }
    if (draft.area) {
      entities.add({
        polygon: {
          hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray([...draft.degrees])),
          material: color.withAlpha(0.3),
          classificationType: this.classification(),
        },
      });
    }
    entities.resumeEvents();
  }

  destroy(): void {
    if (this.viewer.isDestroyed()) return;
    this.viewer.dataSources.remove(this.features, true);
    this.viewer.dataSources.remove(this.draft, true);
  }

  private entityFor(descriptor: FeatureDescriptor): Entity.ConstructorOptions {
    const {
      Cartesian2,
      Cartesian3,
      Color,
      DistanceDisplayCondition,
      LabelStyle,
      PolygonHierarchy,
    } = this.cesium;
    const color = Color.fromCssColorString(descriptor.color);
    if (descriptor.shape === 'point') {
      return {
        id: descriptor.id,
        position: Cartesian3.fromDegrees(descriptor.longitude, descriptor.latitude),
        point: {
          pixelSize: 13,
          color,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          heightReference: this.pointHeight(),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: descriptor.label,
          font: '14px sans-serif',
          fillColor: Color.fromCssColorString(PALETTE.LABEL),
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -20),
          distanceDisplayCondition:
            descriptor.labelRange === null
              ? undefined
              : new DistanceDisplayCondition(0, descriptor.labelRange),
          heightReference: this.pointHeight(),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      };
    }
    const outline = [...descriptor.degrees, descriptor.degrees[0] ?? 0, descriptor.degrees[1] ?? 0];
    return {
      id: descriptor.id,
      polygon: {
        hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray([...descriptor.degrees])),
        material: color.withAlpha(0.3),
        classificationType: this.classification(),
      },
      polyline: {
        positions: Cartesian3.fromDegreesArray(outline),
        width: 3,
        material: color,
        clampToGround: true,
        classificationType: this.classification(),
      },
    };
  }

  private pointHeight() {
    const { HeightReference } = this.cesium;
    return this.clampTo === 'tiles'
      ? HeightReference.CLAMP_TO_3D_TILE
      : HeightReference.CLAMP_TO_GROUND;
  }

  private classification() {
    const { ClassificationType } = this.cesium;
    return this.clampTo === 'tiles'
      ? ClassificationType.CESIUM_3D_TILE
      : ClassificationType.TERRAIN;
  }
}
