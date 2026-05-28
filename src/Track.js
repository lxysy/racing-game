import * as THREE from 'three';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.curve = null;
    this.roadWidth = 8; // half-width of the road
    this.group = new THREE.Group();
  }

  create() {
    // Define control points for the racing circuit
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 0, -30),
      new THREE.Vector3(20, 0, -90),
      new THREE.Vector3(80, 2, -110),
      new THREE.Vector3(140, 0, -60),
      new THREE.Vector3(120, -2, 20),
      new THREE.Vector3(60, 0, 60),
      new THREE.Vector3(-10, 2, 40),
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);

    // Generate road mesh
    this._createRoadMesh();
    // Generate curbs
    this._createCurbs();
    // Generate center line
    this._createCenterLine();
    // Visualize the curve (debug)
    // this._createCurveLine();

    this.scene.add(this.group);
  }

  _createRoadMesh() {
    const samples = 400;
    const curvePoints = this.curve.getSpacedPoints(samples + 1); // +1 for closed loop overlap
    const N = curvePoints.length - 1;
    const vertices = [];
    const indices = [];
    const colors = [];

    for (let i = 0; i < N; i++) {
      const point = curvePoints[i];
      const next = curvePoints[i + 1];
      const tangent = new THREE.Vector3().subVectors(next, point).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      vertices.push(
        point.x - normal.x * this.roadWidth, 0.05, point.z - normal.z * this.roadWidth,
        point.x + normal.x * this.roadWidth, 0.05, point.z + normal.z * this.roadWidth,
      );

      const darkGray = 0.2 + (i % 2) * 0.02;
      colors.push(darkGray, darkGray, darkGray, darkGray, darkGray, darkGray);

      if (i < curvePoints.length - 1) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      vertexColors: false,
    });

    const roadMesh = new THREE.Mesh(geometry, material);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);
  }

  _createCurbs() {
    const samples = 400;
    const curvePoints = this.curve.getSpacedPoints(samples + 1);
    const N = curvePoints.length - 1;
    const curbWidth = 1.5;
    const curbHeight = 0.3;

    const vertices = [];
    const indices = [];

    for (let i = 0; i < N; i++) {
      const point = curvePoints[i];
      const next = curvePoints[i + 1];
      const tangent = new THREE.Vector3().subVectors(next, point).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftInner = this.roadWidth;
      const leftOuter = this.roadWidth + curbWidth;
      const rightInner = -this.roadWidth;
      const rightOuter = -(this.roadWidth + curbWidth);

      // Left curb (bottom + top)
      vertices.push(
        point.x + normal.x * leftInner, 0.05, point.z + normal.z * leftInner,
        point.x + normal.x * leftOuter, 0.05, point.z + normal.z * leftOuter,
        point.x + normal.x * leftInner, curbHeight, point.z + normal.z * leftInner,
        point.x + normal.x * leftOuter, curbHeight, point.z + normal.z * leftOuter,
      );
      // Right curb (bottom + top)
      vertices.push(
        point.x + normal.x * rightInner, 0.05, point.z + normal.z * rightInner,
        point.x + normal.x * rightOuter, 0.05, point.z + normal.z * rightOuter,
        point.x + normal.x * rightInner, curbHeight, point.z + normal.z * rightInner,
        point.x + normal.x * rightOuter, curbHeight, point.z + normal.z * rightOuter,
      );

      // Left curb
      const lb0 = i * 8;
      const lb1 = i * 8 + 1;
      const lt0 = i * 8 + 2;
      const lt1 = i * 8 + 3;
      const nlb0 = (i + 1) * 8;
      const nlb1 = (i + 1) * 8 + 1;
      const nlt0 = (i + 1) * 8 + 2;
      const nlt1 = (i + 1) * 8 + 3;

      indices.push(lb0, lb1, nlb0, lb1, nlb1, nlb0);
      indices.push(lt0, lt1, nlt0, lt1, nlt1, nlt0);
      indices.push(lb0, lt0, nlb0, lt0, nlt0, nlb0);
      indices.push(lb1, lt1, nlb1, lt1, nlt1, nlb1);

      // Right curb
      const rb0 = i * 8 + 4;
      const rb1 = i * 8 + 5;
      const rt0 = i * 8 + 6;
      const rt1 = i * 8 + 7;
      const nrb0 = (i + 1) * 8 + 4;
      const nrb1 = (i + 1) * 8 + 5;
      const nrt0 = (i + 1) * 8 + 6;
      const nrt1 = (i + 1) * 8 + 7;

      indices.push(rb0, rb1, nrb0, rb1, nrb1, nrb0);
      indices.push(rt0, rt1, nrt0, rt1, nrt1, nrt0);
      indices.push(rb0, rt0, nrb0, rt0, nrt0, nrb0);
      indices.push(rb1, rt1, nrb1, rt1, nrt1, nrb1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xcc3333,
      roughness: 0.6,
    });

    const curbs = new THREE.Mesh(geometry, material);
    curbs.receiveShadow = true;
    curbs.castShadow = true;
    this.group.add(curbs);
  }

  _createCenterLine() {
    const samples = 400;
    const curvePoints = this.curve.getSpacedPoints(samples + 1);
    const dashLength = 4;
    const gapLength = 3;

    const vertices = [];
    const indices = [];
    let vi = 0;
    let accumulated = 0;
    let drawing = true;

    for (let i = 1; i < curvePoints.length; i++) {
      const seg = curvePoints[i].distanceTo(curvePoints[i - 1]);
      accumulated += seg;

      if (drawing && accumulated > dashLength) {
        drawing = false;
        accumulated = 0;
      } else if (!drawing && accumulated > gapLength) {
        drawing = true;
        accumulated = 0;
      }

      if (drawing) {
        const prev = curvePoints[i - 1];
        const curr = curvePoints[i];
        const tangent = new THREE.Vector3().subVectors(curr, prev).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

        const halfWidth = 0.15;
        vertices.push(
          prev.x - normal.x * halfWidth, 0.08, prev.z - normal.z * halfWidth,
          prev.x + normal.x * halfWidth, 0.08, prev.z + normal.z * halfWidth,
          curr.x - normal.x * halfWidth, 0.08, curr.z - normal.z * halfWidth,
          curr.x + normal.x * halfWidth, 0.08, curr.z + normal.z * halfWidth,
        );

        indices.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
        vi += 4;
      }
    }

    if (vertices.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: 0x222222,
    });

    const centerLine = new THREE.Mesh(geometry, material);
    centerLine.receiveShadow = true;
    this.group.add(centerLine);
  }

  _createCurveLine() {
    const points = this.curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const line = new THREE.Line(geometry, material);
    this.group.add(line);
  }

  /**
   * Get position and tangent at parameter t (0-1)
   */
  getTrackData(t) {
    const point = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).normalize();
    return { point, tangent };
  }
}
