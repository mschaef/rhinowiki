title: Anti Grain Geometry
date: 2005-05-27
filename: ./tech/general/agg.txt

I just found about it, but I already think it might end up in vCalc.  <a 
href="http://www.antigrain.com/">Anti Grain Geometry</a> is a open source 2D rendering library with a 
very liberal license. The feature set looks pretty comprehesive: it supports anti-aliasing, affine 
transforms, sub-pixel resolution, and alpha blending. Even better, it's designed as a lightweight set of 
C++ classes, so it shouldn't bloat or slow down vCalc too much. About the only hole is that it doesn't 
have any kind of built in text rendering; However, even there there are are detailed instructions for 
using the Windows True Type renderer to generate glpyhs.

All I need now is time... 

<img src="http://www.antigrain.com/demo/graph_test.gif" width="613" height="591">
