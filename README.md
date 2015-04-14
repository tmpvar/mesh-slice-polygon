## mesh-slice-polygon

slice a mesh with a plane and return the resulting polygon(s)

## install

`npm install mesh-slice-polygon`

## use

the following code is an extraction of [example/readme-example.js](example/readme-example.js)

```javascript
var createSlicer = require('./mesh-slice-polygon');
var slicer = createSlicer();
var stl = require('stl')
var fs = require('fs');

fs.createReadStream(__dirname + '/test/stl/cube-20mm.stl')
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

```

which outputs:
```
[ [ { x: -10, y: -10 },
    { x: 0, y: -10 },
    { x: 10, y: -10 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: -10, y: 10 },
    { x: -10, y: 0 } ] ]
```


### example

`npm run drop-slicer` (you will need [beefy](https://github.com/chrisdickinson/beefy) globally installed)

[example/drop-slicer.js](example/drop-slicer.js) allows someone to drop an stl anywhere in the document and it will slice from the maxZ to the minZ and render the resulting polygons to a canvas.

for example:

dropping [this thingiverse thing](http://www.thingiverse.com/thing:768730):

![thingiverse thing](http://thingiverse-production-new.s3.amazonaws.com/renders/83/11/4c/bc/77/castillo_alcoy_preview_featured.jpg)

ends up looking like:

![gif](http://i.imgur.com/7Z0ywKT.gif)

### license

MIT (see: [license.txt](blob/master/license.txt))
