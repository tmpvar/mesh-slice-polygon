var MeshSlicePolygon = require("../mesh-slice-polygon.js");
var stl = require('stl');
var fs = require('fs');
var path = require('path');
var vec2 = require('vec2');

var stldir = path.join(__dirname, 'stl');

var ok = function(a, msg) { if (!a) throw new Error(msg || "not ok"); };
var eq = function(a, b) { if (a!==b) throw new Error(a + " !== " + b); };
var near = function(a, b, t) {
  if (Math.abs(a - b) > (t || .0000000001)) {
    throw new Error(a + " !== " + b);
  }
};

var allEqual = function(expected, points) {
  points.forEach(function(point, idx) {
    near(expected[idx], point);
  });
};

var dumpVecs = function(array) {
  console.log('var expect = [');

  console.log(array.map(function(poly) {
    return '  [\n' + poly.points.map(function(v) {
      return '    vec2' + v.toString()
    }).join(',\n') + '\n  ]'
  }).join(',\n'));

  console.log('];');
};

var dumpJSON = function(array) {
  console.log(JSON.stringify(array));
};


var testStl = function(file, compare, done) {
  file = path.join(stldir, file);

  var slicer = new MeshSlicePolygon();

  fs.createReadStream(file)
    .pipe(stl.createParseStream())
    .on('data', function(obj) {
      obj && obj.verts && slicer.addTriangle(obj.verts)
    })
    .on('end', function() {
      var bounds = slicer.bounds

      eq(slicer.slice(bounds.max[2] + 0.1).length, 0)
      eq(slicer.slice(bounds.min[2] - 0.1).length, 0)

      for (var z = bounds.max[2]; z>bounds.min[2]+.1; z-=.1) {
        var res = slicer.slice(z);
        compare(res, z);
      }

      compare(slicer.slice(bounds.min[2]), bounds.min[2]);
      compare(slicer.slice(bounds.max[2]), bounds.max[2]);

      done();
    });
};


describe('MeshSlicePolygon', function() {
  describe('#slice', function() {
    it('cube-20mm.stl', function(t) {

      testStl('cube-20mm.stl', function(array, z) {
        eq(array.length, 1);
        eq(array[0].points.length, 4);

        allEqual([
          vec2(-10, -10),
          vec2(10, -10),
          vec2(10, 10),
          vec2(-10, 10)
        ], array[0].points);
      }, t);
    });

    it('cube-20mm-with-hole.stl', function(t) {
      testStl('cube-20mm-with-hole.stl', function(array, z) {
        if (array.length > 2) {
          console.log(JSON.stringify(array, null, '  '));
        }

        eq(array.length, 2);
        eq(array[0].points.length, 4);
        eq(array[1].points.length, 4);

        var e1 = [
          vec2(0, 0),
          vec2(20, 0),
          vec2(20, 20),
          vec2(0, 20)
        ];

        var e2 = [
          vec2(5, 5),
          vec2(5, 15),
          vec2(15, 15),
          vec2(15, 5)
        ];

        allEqual(e1, array[0].points);
        allEqual(e2, array[1].points);
      }, t);
    });

    it('cube-bevel-8.stl', function(t) {
      testStl('cube-bevel-8.stl', function(array, z) {

        eq(array.length, 1);
        eq(array[0].points.length, 12);


        var expect = [
          [
            vec2(-2.3606, -2.3606),
            vec2(0.0743, -2.3606),
            vec2(0.5203, -2.3167),
            vec2(0.9492, -2.1866),
            vec2(1.3445, -1.9753),
            vec2(1.691, -1.691),
            vec2(1.9753, -1.3445),
            vec2(2.1866, -0.9492),
            vec2(2.3167, -0.5203),
            vec2(2.3606, -0.0743),
            vec2(2.3606, 2.3606),
            vec2(-2.3606, 2.3606)
          ]
        ];

        array.forEach(function(poly, idx) {
          allEqual(expect[idx], poly.points);
        });
      }, t);
    });

    it('cube-20mm-monohole.stl', function(t) {
      testStl('cube-20mm-monohole.stl', function(array, z) {

        if (array.length > 2) {
          console.log(JSON.stringify(array, null, '  '));
        }

        var expect = [
          [
            vec2(-10, -10),
            vec2(10, -10),
            vec2(10, 10),
            vec2(-10, 10)
          ],
          [
            vec2(-6.1305, -6.1305),
            vec2(-8.0099, -3.3178),
            vec2(-8.6699, 0),
            vec2(-8.0099, 3.3178),
            vec2(-6.1305, 6.1305),
            vec2(-3.3178, 8.0099),
            vec2(0, 8.6699),
            vec2(3.3178, 8.0099),
            vec2(6.1305, 6.1305),
            vec2(8.0099, 3.3178),
            vec2(8.6699, 0),
            vec2(8.0099, -3.3178),
            vec2(6.1305, -6.1305),
            vec2(3.3178, -8.0099),
            vec2(0, -8.6699),
            vec2(-3.3178, -8.0099)
          ]
        ];

        eq(array.length, expect.length);

        array.forEach(function(poly, idx) {
          allEqual(expect[idx], poly.points);
        });
      }, t);
    });

    it('cube-30mm-concave-filletEdge-squareCut2-roundHole-squareHole.stl', function(t) {
      testStl('cube-30mm-concave-filletEdge-squareCut2-roundHole-squareHole.stl', function(array, z) {

        var expect = [
          [
            vec2(-20, -2.61039066),
            vec2(-10, -2.61039066),
            vec2(-9.85800934, -4.05203152),
            vec2(-9.43749809, -5.43827152),
            vec2(-8.75462532, -6.715837),
            vec2(-7.83563328, -7.83563328),
            vec2(-6.71583652, -8.75462627),
            vec2(-5.43827105, -9.43749809),
            vec2(-4.05203056, -9.85801029),
            vec2(-2.61039066, -10),
            vec2(10, -10),
            vec2(10, -3.33333302),
            vec2(-3.58796835, -3.33333302),
            vec2(-3.58796835, 6.8877821),
            vec2(2.76307058, 6.8877821),
            vec2(2.76307058, 3.33333302),
            vec2(10, 3.33333302),
            vec2(10, 20),
            vec2(-20, 20)
          ],
          [
            vec2(-2.8644073, 10.38831139),
            vec2(-1.38169074, 9.39759159),
            vec2(0.36729202, 9.04969788),
            vec2(2.11627531, 9.39759159),
            vec2(3.59899163, 10.38831139),
            vec2(4.58971214, 11.87102795),
            vec2(4.93760681, 13.62001228),
            vec2(4.58971214, 15.36899567),
            vec2(3.59899163, 16.85171318),
            vec2(2.11627436, 17.84243202),
            vec2(0.36729276, 18.19032478),
            vec2(-1.38169074, 17.84243202),
            vec2(-2.8644073, 16.85171318),
            vec2(-3.8551271, 15.36899567),
            vec2(-4.203022, 13.62001228),
            vec2(-3.8551271, 11.87102795)
          ],
          [
            vec2(-18.42219353, 4.92640591),
            vec2(-18.42219353, 12.46320248),
            vec2(-10, 12.46320248),
            vec2(-10, 4.92640591)
          ]
        ];

        eq(array.length, expect.length);

        array.forEach(function(poly, idx) {
          ok(expect[idx]);
          eq(expect[idx].length, poly.points.length);
          allEqual(expect[idx], poly.points);
        });
      }, t);
    });


  });
});
