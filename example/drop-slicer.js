var createDropTarget = require('drop-stl-to-json');
var fc = require('fc');
var createSlicer = require('../mesh-slice-polygon');
var min = Math.min;
var max = Math.max;

var distance = function(a, b) {
  return Math.abs(a - b);
}

var slice;
var translation = [0, 0];
var scale = 2;
var layer = 0;
var ctx = fc(function(){
  ctx.clear('#112')
  ctx.fillStyle = "white"
  ctx.font = "16px monospace"
  ctx.fillText('layer: ' + layer, 50, 50);
  if (slice) {
    var w = (ctx.canvas.width/2)|0;
    var h = (ctx.canvas.height/2)|0;
    slice.forEach(function(polygon) {
      ctx.save();
        ctx.translate(w, h);
        ctx.scale(scale,scale);
        ctx.translate(translation[0], translation[1])
        ctx.lineWidth = 1/(scale);
        ctx.beginPath();
          polygon.points.forEach(function(point, i) {
            i > 0 ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y);
          });
        ctx.closePath();
        ctx.strokeStyle = "#FF5703";
        ctx.stroke();

        ctx.save();
          if (polygon.isHole) {
            ctx.fillStyle = '#112'
          } else {
            ctx.fillStyle = '#B04300'
          }
          ctx.fill();
        ctx.restore();
      ctx.restore();
    });
  }
}, false);

var target = createDropTarget(document);
target.on('dropped', function() {
  console.log('dropped!')
});

var sliceTimer = null;
window.t = translation;
target.on('stream', function(stream) {
  var slicer = createSlicer();
  if (sliceTimer) {
    clearTimeout(sliceTimer);
  }

  stream.on('data', function(d) {
    d && d.verts && slicer.addTriangle(d.verts);
  }).on('end', function() {
    var cmin = min(ctx.canvas.width, ctx.canvas.height);
    var dx = distance(slicer.bounds.min[0], slicer.bounds.max[0]);
    var dy = distance(slicer.bounds.min[1], slicer.bounds.max[1]);
    var smin = max(dx, dy);

    translation[0] = (-slicer.bounds.min[0] - dx/2)|0;
    translation[1] = (-slicer.bounds.min[1] - dy/2)|0;

    // translation[0] = slicer.bounds.min[0]+dx/2;
    // translation[1] = slicer.bounds.min[1]+dy/2;
// console.log(translation);
    scale = (cmin/smin)|0;

    // begin slicing
    var layerHeight = .1;
    layer = 0;
    var timeout = 10;
    sliceTimer = setTimeout(function performSlice() {
      var z = slicer.bounds.max[2] - layer*layerHeight;
      slice = slicer.slice(z);
      slicer.markHoles(slice);
      layer++;

      ctx.dirty();
      if (z > slicer.bounds.min[2]) {
        sliceTimer = setTimeout(performSlice, timeout);
      } else {
        console.log('done');
      }
    }, timeout)
  });
});
