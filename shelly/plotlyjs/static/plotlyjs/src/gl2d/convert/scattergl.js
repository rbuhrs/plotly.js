'use strict';

var createScatter = require('gl-scatter2d');
var createLine   = require('gl-line2d');
var str2RGBArray = require('../../gl3d/lib/str2rgbarray');

function LineWithMarkers(scene, uid) {
  this.scene = scene;
  this.uid = uid;
  this.name = '';
  this.color = 'rgb(0,0,0)';

  this.xData = [];
  this.yData = [];
  this.textLabels = [];

  this.scatterOptions = {
    positions:    new Float32Array(),
    size:         12,
    borderSize:   1,
    color:        [0, 0, 0, 1],
    borderColor:  [0, 0, 0, 1]
  };
  this.scatter = createScatter(scene.glplot, this.scatterOptions);
  this.scatter._trace = this;

  this.lineOptions = {
    positions:  new Float32Array(),
    color:      [0, 0, 0, 1],
    width:      1,
    fill:       [false, false, false, false],
    fillColor:  [
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1]]
  };
  this.line = createLine(scene.glplot, this.lineOptions);
  this.line._trace = this;

  this.bounds = [0,0,0,0];
}

var proto = LineWithMarkers.prototype;

proto.handlePick = function(pickResult) {
  var id = pickResult.pointId;
  return {
    trace: this,
    dataCoord: pickResult.dataCoord,
    traceCoord: [
      this.xData[id],
      this.yData[id]
    ],
    name: this.name,
    color: this.color,
    text: this.text && this.text[id]
  };
};

proto.update = function(options) {
  var x = options.x;
  var y = options.y;
  var i;

  var xaxis = this.scene.fullLayout.scene2d.xaxis;
  var yaxis = this.scene.fullLayout.scene2d.yaxis;

  this.name = options.name;

  this.xData = x;
  this.yData = y;
  this.textLabels = options.text;

  var numPoints = x.length;
  var positions = new Float32Array(2 * numPoints);
  var ptr = 0;
  for(i=0; i<x.length; ++i) {
    positions[ptr++] = xaxis.d2l(x[i]);
    positions[ptr++] = yaxis.d2l(y[i]);
  }

  var mode = options.mode;
  if(mode.indexOf('marker') >= 0) {
    this.scatterOptions.positions = positions;
  } else {
    this.scatterOptions.positions = new Float32Array();
  }

  if(mode.indexOf('line') >= 0) {
    this.lineOptions.positions = positions;
  } else {
    this.lineOptions.positions = new Float32Array();
  }

  if('marker' in options) {
    this.scatterOptions.size = options.marker.size;
    this.scatterOptions.borderSize = options.marker.line.width;

    var color = options.marker.color;
    var borderColor = options.marker.line.color;

    this.color = color;

    var colorArray = str2RGBArray(color);
    var borderColorArray = str2RGBArray(borderColor);

    var opacity = +options.marker.opacity;
    colorArray[3] *= opacity;
    borderColorArray[3] *= opacity;

    this.scatterOptions.color = colorArray;
    this.scatterOptions.borderColor = borderColorArray;
  }

  this.scatter.update(this.scatterOptions);

  if('line' in options) {
    var lineColor = str2RGBArray(options.line.color);
    lineColor[3] *= options.line.opacity;
    this.lineOptions.color = lineColor;
    this.lineOptions.width = options.line.width;
  }

  switch(options._input.fill) {
    case 'tozeroy':
      this.lineOptions.fill = [false, true, false, false];
    break;
    case 'tozerox':
      this.lineOptions.fill = [true, false, false, false];
    break;
    default:
      this.lineOptions.fill = [false, false, false, false];
    break;
  }

  this.line.update(this.lineOptions);

  this.bounds = this.scatter.bounds.slice();
};

proto.dispose = function() {
  this.line.dispose();
  this.scatter.dispose();
};

function createLineWithMarkers(scene, data) {
  var plot = new LineWithMarkers(scene, data.uid);
  plot.update(data);
  return plot;
}

module.exports = createLineWithMarkers;
