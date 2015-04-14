var vec3 = require('gl-vec3');
var Vec2 = require('vec2');
var Polygon = require('polygon');
var orient = require('robust-orientation')[2];

// enable webworker debugging
if (typeof self !== 'undefined' && !self.console) {
  self.console = {
    log : function(msg) {
      var args = [];
      Array.prototype.push.apply(args, arguments)
      self.postMessage({ name : 'debug', data: args });
    }
  };
}

function Vertex(x, y, z) {
  if (x instanceof Float32Array) {
    this.position = x;
  } else if (Array.isArray(x)) {
    this.position = vec3.fromValues(x[0], x[1], x[2]);
  } else {
    this.position = vec3.fromValues(x, y, z);
  }

  this.id = Vertex.id++;
}

Vertex.id = 0;

Vertex.toString = function(x, y, z) {
  if (x instanceof Float32Array) {
    return '(' + [x[0], x[1], x[2]].join(',') + ')'
  } else {
    if (!Array.isArray(x)) {
      x = [x, y, z];
    }
    return '(' + x.join(',') + ')'
  }
};

Vertex.prototype = {
  toString : function() {
    return Vertex.toString(this.position);
  }
};

function Triangle(a, b, c, normal) {
  this.verts = [a, b, c];
  this.normal = normal;

  this.sortByZ();
  this.id = Triangle.id++;
}

Triangle.id = 0;

Triangle.prototype.sortByZAscending = function(a, b) {
  return a.position[2] > b.position[2] ? -1 : 1;
};

Triangle.prototype.sortByZ = function() {
  // TODO SORT: reverse sort if milling/printing
  this.verts.sort(this.sortByZAscending);
};

Triangle.prototype.toString = function() {
  return '[' + this.id + ':' + [this.verts[0].id, this.verts[1].id, this.verts[2].id].join(',') + ']';
};

function ZPlane(sliceZ) {
  this.position = vec3.fromValues(0,0,sliceZ);
  this.normal = vec3.fromValues(0, 0, 1);
}

ZPlane.prototype.intersect = function(start, end) {
  var tmp = vec3.create();
  var num = vec3.dot(
    this.normal,
    vec3.subtract(
      tmp,
      this.position,
      start.position
    )
  );

  var line = vec3.subtract(
    tmp,
    end.position,
    start.position
  );

  var den = vec3.dot(this.normal,line);

  var res = num/den;
  if (!isNaN(res) && 0 <= res && res <= 1.0) {

    var isect = vec3.add(
      tmp,
      start.position,
      vec3.multiply(
        tmp,
        line,
        vec3.fromValues(res, res, res)
      )
    );

    return isect;
  }
};

function MeshSlicePolygon() {
  if (!(this instanceof MeshSlicePolygon)) {
    return new MeshSlicePolygon();
  }

  this.plane = new ZPlane(0)
  this.seenVerts = {};
  this.sharedTriangles = {};
  this.triangles = [];
  this.bounds = {
    max : [-Infinity, -Infinity, -Infinity],
    min : [Infinity, Infinity, Infinity]
  };

  this.groups = [];
  this.group = [];
}

MeshSlicePolygon.prototype.trackBounds = function(coords) {
  var bounds = this.bounds;

  for (var i = 0; i<3; i++) {
    if (coords[i] > bounds.max[i]) {
      bounds.max[i] = coords[i];
    }

    if (coords[i] < bounds.min[i]) {
      bounds.min[i] = coords[i];
    }
  }
};

MeshSlicePolygon.prototype.upsertVert = function(x, y, z) {
  var key = Vertex.toString(x, y, z);

  if (!this.seenVerts[key]) {
    this.seenVerts[key] = new Vertex(x, y, z);
    this.trackBounds(this.seenVerts[key].position);
  }

  return this.seenVerts[key];
}

MeshSlicePolygon.prototype.sharedTriangle = function(a, b, ignore) {
  var aa = this.sharedTriangles[a.id];
  var ab = this.sharedTriangles[b.id];
  if (aa && aa.length && ab && ab.length) {
    for (var i = 0; i<aa.length; i++) {
      var ai = aa[i];
      for (var j = 0; j<ab.length; j++) {
        if (ai.id === ab[j].id && ignore.indexOf(ai.id) === -1) {
          return ai;
        }
      }
    }
  }

  return false;
};

MeshSlicePolygon.prototype.addTriangle = function(a, b, c) {
  if (Array.isArray(a)) {
    b = a[1];
    c = a[2];
    a = a[0];
  }

  this.dirty = true;
  a = this.upsertVert(a[0], a[1], a[2]);
  b = this.upsertVert(b[0], b[1], b[2]);
  c = this.upsertVert(c[0], c[1], c[2]);

  var triangle = new Triangle(a, b, c);

  if (!this.sharedTriangles[a.id]) {
    this.sharedTriangles[a.id] = [triangle];
  } else {
    this.sharedTriangles[a.id].push(triangle);
  }

  if (!this.sharedTriangles[b.id]) {
    this.sharedTriangles[b.id] = [triangle];
  } else {
    this.sharedTriangles[b.id].push(triangle);
  }

  if (!this.sharedTriangles[c.id]) {
    this.sharedTriangles[c.id] = [triangle];
  } else {
    this.sharedTriangles[c.id].push(triangle);
  }

  this.triangles.push(triangle);
};

var sortShared = function(a, b) {
  return (a.id > b.id) ? -1 : 1;
};

var clean = function(v) {
  return Math.round(v * 10000)/10000;
}

var collinear = function(a, b, c) {
  return orient(a.toArray(), b.toArray(), c.toArray()) === 0;
};

var rotateArray = function(array, count) {
  var len = array.length >>> 0,
      count = count >> 0;

  Array.prototype.unshift.apply(array, Array.prototype.splice.call(array, count % len, len));
  return array;
};

MeshSlicePolygon.prototype.sort = function() {
  Object.keys(this.sharedTriangles).forEach(function(key) {
    this.sharedTriangles[key].sort(sortShared);
  }.bind(this));

  this.triangles.sort(function(a, b) {
    return (a.verts[0].position[2] < b.verts[0].position[2]) ? -1 : 1;
  });
};

var isectTests = [[0,1], [0, 2], [1, 2]];

MeshSlicePolygon.prototype.followIntersectionChain = function(tri, startTri) {
  this.group = [];
  var last = startTri;
  var sentinal = this.triangles.length*2
  while (tri && sentinal--) {

    this.seenTriangles[tri.id] = true;

    var isects = [], shared = null;
    for (var i=0; i<isectTests.length; i++) {
      var test = isectTests[i];
      var isect = this.plane.intersect(tri.verts[test[0]], tri.verts[test[1]])
      if (isect) {
        //console.log('isect', isect);
        var vert = new Vertex(isect[0], isect[1], isect[2]);
        vert.shared = test;


        isects.push(vert);

        shared = this.sharedTriangle(
          tri.verts[test[0]],
          tri.verts[test[1]],
          [tri.id, last, startTri]
        );

        if (shared) {

          this.group.push(
            new Vec2(isect[0], isect[1])
          );

          if (tri.id !== startTri) {
            break;
          }
        }
      }
    }

    if (shared) {
      last = tri.id;
      tri = shared;
    } else {
      if (this.group && this.group.length > 0) {
        this.group.push(this.group[0]);

        var poly = new Polygon(this.group);
        poly.clean();

        // var newPoly = [];
        // for (var i = 0; i<poly.points.length; i++) {
        //   var p = poly.point(i-1);
        //   var n = poly.point(i+1);
        //   var c = poly.point(i);
        //   newPoly.push(c);
        // }

        // poly.points = newPoly;


        // Rotate the array to start nearest the lowest extent
        var min = Vec2(this.bounds.min[0], this.bounds.min[1]);

        if (poly && poly.length) {
          var closestToMinIdx = 0;
          var closestToMinVal = min.subtract(poly.points[0], true).lengthSquared()
          for (var i=1; i<poly.points.length; i++) {
            var currentVal = min.subtract(poly.points[i], true).lengthSquared();
            if (currentVal < closestToMinVal) {
              closestToMinIdx = i;
              closestToMinVal = currentVal;
            }
          }

          rotateArray(poly.points, closestToMinIdx);
          this.groups.push(poly);
        }
        this.group = [];
      }

      break;
    }
  }

  if (sentinal <= 0) {
    console.error('infinite loop')
  }
};

MeshSlicePolygon.prototype.sortByAreaDescending = function(a, b) {
  return (Math.abs(a.area()) > Math.abs(b.area())) ? -1 : 1;
};

MeshSlicePolygon.prototype.slice = function(z) {
  this.plane.position[2] = z;

  if (this.dirty) {
    this.dirty = false;
    this.sort();
  }

  var l = this.triangles.length;
  this.groups = [];
  this.group = [];

  this.seenTriangles = {};
  while (l--) {
    var startTri = this.triangles[l].id;

    if (!this.seenTriangles[startTri]) {
      var triVerts = this.triangles[l].verts;

      if (triVerts[0].position[2] >= z) {
        this.followIntersectionChain(this.triangles[l], startTri);
      } else {
        break;
      }
    }
  }

  // Ensure the groups are ordered by area
  this.groups.sort(this.sortByAreaDescending);

  return this.groups;
};

MeshSlicePolygon.prototype.markHoles = function(hulls) {
  var holes = 0, i;
  if (hulls && hulls.length) {

    for (var i = 1; i<hulls.length; i++) {
      hulls[i].rewind(true);
    }

    hulls.sort(this.sortByAreaDescending);

    for (i = 1; i<hulls.length; i++) {

      var subject = hulls[i];
      for (var j = i; j>=0; j--) {
        var target = hulls[j];
        if (target.containsPolygon(subject)) {
          subject.isHole = !target.isHole;
          if (subject.isHole) {
            // subject.rewind(false);
          }
          break;
        }
      }
    }
  }
};

module.exports = MeshSlicePolygon;
