var MeshSlicePolygon = require("../mesh-slice-polygon.js");
var stl = require('stl');
var fs = require('fs');
var path = require('path');
var vec2 = require('vec2');

var stldir = path.join(__dirname, 'stl');

var ok = function(a, msg) { if (!a) throw new Error(msg || "not ok"); };
var eq = function(a, b) { if (a!==b) throw new Error(a + " !== " + b); };

describe('MeshSlicePolygon', function() {
  describe('#slice', function() {
    it('cube-20mm.stl', function(t) {

      var slicer = new MeshSlicePolygon();

      fs.createReadStream(path.join(stldir, 'cube-20mm.stl'))
        .pipe(stl.createParseStream())
        .on('data', function(obj) {
          obj && obj.verts && slicer.addTriangle(obj.verts)
        })
        .on('end', function() {
          eq(slicer.slice(10.1).length, 0)
          eq(slicer.slice(-10.1).length, 0)


          var compare = function(points) {
            var expect = [
              vec2(-10, -10),
              vec2(10, -10),
              vec2(10, 10),
              vec2(-10, 10)
            ];

            points.forEach(function(point, idx) {
              eq(expect[idx].toString(), point.toString());
            });
          }

          for (var z = 10; z>-10; z-=.1) {
            var res = slicer.slice(z);
            eq(res.length, 1);

            eq(res[0].points.length, 4);
            compare(res[0].points);
          }

          compare(slicer.slice(10)[0].points);

          t();
        });
    });
  });
});
