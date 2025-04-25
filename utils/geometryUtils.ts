export function distanceSqFromPointToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
  }
  
  
  function sign(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }
  
  export function isPointInsideTriangle(
    point: { x: number; y: number },
    v1: { x: number; y: number },
    v2: { x: number; y: number },
    v3: { x: number; y: number }
  ): boolean {
    const d1 = sign(point, v1, v2);
    const d2 = sign(point, v2, v3);
    const d3 = sign(point, v3, v1);
    const has_neg = d1 < 0 || d2 < 0 || d3 < 0;
    const has_pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(has_neg && has_pos);
  }
  
  type Point = { x: number; y: number };
  
  export function calculateStarVertices(
    center: Point,
    outerRadius: number,
    innerRadiusRatio: number = 0.5,
    spikes: number
  ): Point[] {
    const vertices: Point[] = [];
    const angleStep = Math.PI / spikes;
    const innerRadius = outerRadius * innerRadiusRatio;
    for (let i = 0; i < 2 * spikes; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * angleStep - Math.PI / 2;
      vertices.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    }
    return vertices;
  }
  
  export function isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
    let isInside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  }
  
  export function getPointOnQuadraticBezier(
    p0: Point,
    cp: Point,
    p1: Point,
    t: number
  ): Point {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x,
      y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y,
    };
  }
  
  export function getPointsOnSmoothedPathQuadratic(
    points: Point[],
    density: number = 10
  ): Point[] {
    if (!points || points.length < 2) return points || [];
    const smoothedPoints: Point[] = [];
    smoothedPoints.push(points[0]);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midPoint = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      let cp: Point;
      cp = i === 0 ? p0 : points[i];
      const startPoint = i === 0 ? p0 : { x: (points[i - 1].x + p0.x) / 2, y: (points[i - 1].y + p0.y) / 2 };
      const endPoint = midPoint;
      const controlPoint = p0;
      for (let t = 1; t <= density; t++) {
        const step = t / density;
        smoothedPoints.push(getPointOnQuadraticBezier(startPoint, controlPoint, endPoint, step));
      }
      if (i === points.length - 2) {
        const lastMid = midPoint;
        const lastPoint = p1;
        const lastControl = lastPoint;
        for (let t = 1; t <= density; t++) {
          const step = t / density;
          smoothedPoints.push(getPointOnQuadraticBezier(lastMid, lastControl, lastPoint, step));
        }
        if (
          smoothedPoints[smoothedPoints.length - 1].x !== lastPoint.x ||
          smoothedPoints[smoothedPoints.length - 1].y !== lastPoint.y
        ) {
          smoothedPoints.push(lastPoint);
        }
      }
    }
    return smoothedPoints;
  }

 
  
  export function isPointNearPolygonOutline(
    point: { x: number; y: number },
    vertices: Array<{ x: number; y: number }>,
    checkRadius: number
  ): boolean {
    if (!vertices || vertices.length === 0 || checkRadius < 0) return false;
    const checkRadiusSq = checkRadius ** 2;
    
    // Adjust radii for better detection precision
    const vertexCheckRadiusMultiplier = 1.2; // Reduce from 1.5 to 1.2
    const vertexCheckRadiusSq = checkRadiusSq * vertexCheckRadiusMultiplier;
  
    // 1. Check vertices first (optimized)
    for (const vertex of vertices) {
      const dx = point.x - vertex.x;
      const dy = point.y - vertex.y;
      const distSqVertex = dx * dx + dy * dy;
      if (distSqVertex <= vertexCheckRadiusSq) {
        return true;
      }
    }
  
    // 2. Check edges
    if (vertices.length >= 2) {
      for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        const distSqSegment = distanceSqFromPointToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y);
        if (distSqSegment <= checkRadiusSq) {
          return true;
        }
      }
    }
  
    // 3. Check if point is inside polygon (for filled shapes)
    // This is important for shapes that might be filled
    if (vertices.length >= 3 && isPointInsidePolygon(point, vertices)) {
      return true;
    }
    
    return false;
  }
  
  // --- Apply similar logic to isPointNearPolyline ---
  
  export function isPointNearPolyline(
    point: { x: number; y: number },
    pathPoints: Array<{ x: number; y: number }>,
    checkRadius: number // Single combined radius
  ): boolean {
    if (!pathPoints || pathPoints.length === 0 || checkRadius < 0) return false;
    const checkRadiusSq = checkRadius ** 2;
  
    // Reduce vertex multiplier for more precision (was 1.5)
    const vertexCheckRadiusMultiplier = 1.5; // Increase from 1.2 to 1.5 for better vertex detection  
    const vertexCheckRadiusSq = checkRadiusSq * vertexCheckRadiusMultiplier;
  
    // --- DEBUG LOG ---
    // console.log(`[isPointNearPolyline] Point=(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
    // console.log(`  BaseRadius=${checkRadius.toFixed(2)} (Sq=${checkRadiusSq.toFixed(2)})`);
    // console.log(`  VertexCheckRadiusSq=${vertexCheckRadiusSq.toFixed(2)} (Multiplier=${vertexCheckRadiusMultiplier})`);
    // --- END DEBUG LOG ---
  
    // 1. Check distance to vertices using the *enlarged* vertexCheckRadiusSq
    for (const vertex of pathPoints) {
      const dx = point.x - vertex.x;
      const dy = point.y - vertex.y;
      const distSqVertex = dx * dx + dy * dy;
      // console.log(`  Polyline Vertex Check: V=(${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)}), distSq=${distSqVertex.toFixed(2)}, checkSq=${vertexCheckRadiusSq.toFixed(2)}, hit=${distSqVertex <= vertexCheckRadiusSq}`); // DEBUG
      if (distSqVertex <= vertexCheckRadiusSq) { // Use enlarged radius
        // console.log("  => Polyline Vertex Hit!"); // DEBUG
        return true;
      }
    }
  
    // 2. Check distance to segments using the *original* checkRadiusSq
    if (pathPoints.length >= 2) {
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        const distSq = distanceSqFromPointToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y);
        // console.log(`  Polyline Segment Check ${i}: distSq=${distSq.toFixed(2)}, checkSq=${checkRadiusSq.toFixed(2)}, hit=${distSq <= checkRadiusSq}`); // DEBUG
        if (distSq <= checkRadiusSq) { // Use original radius
          // console.log("  => Polyline Segment Hit!"); // DEBUG
          return true;
        }
      }
    }
  
    // console.log("  => Polyline No Hit"); // DEBUG
    return false;
  }