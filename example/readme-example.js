var createSlicer = require('../mesh-slice-polygon');
var slicer = createSlicer();
var stl = require('stl')
var fs = require('fs');

fs.createReadStream(__dirname + '/../test/stl/cube-20mm.stl')
  .pipe(stl.createParseStream())
  .on('data', function(obj) {
    // add an array of vertices
    // [[x, y, z], [x, y, z], [x,y,z]]
    obj && obj.verts && slicer.addTriangle(obj.verts)
  })
  .on('end', function() {
    // slize at z=0
    console.log(slicer.slice(0).map(function(polygon) {
      return polygon.points;
    }));
  });
