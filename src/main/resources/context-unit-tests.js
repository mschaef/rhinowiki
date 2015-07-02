
(function() {
   var root = {
     A: { x: 3,  y: 4 },
     B: { x: { w: 1,  z: 2 }}
   };

   var ctx = Context.clone({root: root});


   UT.addTest(function testCtxResolveAtRoot() {
                var result = ctx.resolvePath("/A");

                UT.assert(result.path == "/A");
                UT.assert(result.parent == root);
                UT.assert(("obj" in result));
                UT.assert(result.obj === root.A);
                UT.assert(result.objName == "A");
                UT.assert(result.format == null);
              });

   UT.addTest(function testCtxResolveAtRootWithFormat() {
                var result = ctx.resolvePath("/A.html");

                UT.assert(result.path == "/A.html");
                UT.assert(result.parent == root);
                UT.assert(("obj" in result));
                UT.assert(result.obj === root.A);
                UT.assert(result.objName == "A");
                UT.assert(result.format == "html");
              });

   UT.addTest(function testCtxResolveBelowRoot() {
                var result = ctx.resolvePath("/B/x");

                UT.assert(result.path == "/B/x");
                UT.assert(result.parent == root.B);
                UT.assert(("obj" in result));
                UT.assert(result.obj === root.B.x);
                UT.assert(result.objName == "x");
                UT.assert(result.format == null);
              });


   UT.addTest(function testCtxResolveBelowRootWithFormat() {
                var result = ctx.resolvePath("/B/x.html");

                UT.assert(result.path == "/B/x.html");
                UT.assert(result.parent == root.B);
                UT.assert(("obj" in result));
                UT.assert(result.obj === root.B.x);
                UT.assert(result.objName == "x");
                UT.assert(result.format == "html");
              });


   UT.addTest(function testCtxResolve2BelowRoot() {
                var result = ctx.resolvePath("/B/x/w");

                UT.assert(result.path == "/B/x/w");
                UT.assert(result.parent == root.B.x);
                UT.assert(("obj" in result));
                UT.assert(result.obj === root.B.x.w);
                UT.assert(result.objName == "w");
                UT.assert(result.format == null);
              });


   UT.addTest(function testCtxResolve2BelowRootWithFormat() {
                var result = ctx.resolvePath("/B/x/w.html");

                UT.assert(result.path == "/B/x/w.html");
                UT.assert(result.parent == root.B.x);
                UT.assert(("obj" in result));
                UT.assert(result.obj === root.B.x.w);
                UT.assert(result.objName == "w");
                UT.assert(result.format == "html");
              });


      UT.addTest(function testCtxResolveMissingAtRoot() {
                var result = ctx.resolvePath("/missing-A");

                UT.assert(result.path == "/missing-A");
                UT.assert(result.parent == root);
                UT.assert(!("obj" in result));
                UT.assert(result.objName == "missing-A");
                UT.assert(result.format == null);
              });

   UT.addTest(function testCtxResolveMissingAtRootWithFormat() {
                var result = ctx.resolvePath("/missing-A.html");

                UT.assert(result.path == "/missing-A.html");
                UT.assert(result.parent == root);
                UT.assert(!("obj" in result));
                UT.assert(result.objName == "missing-A");
                UT.assert(result.format == "html");
              });

   UT.addTest(function testCtxResolveMissingBelowRoot() {
                var result = ctx.resolvePath("/B/missing-x");

                UT.assert(result.path == "/B/missing-x");
                UT.assert(result.parent == root.B);
                UT.assert(!("obj" in result));
                UT.assert(result.objName == "missing-x");
                UT.assert(result.format == null);
              });


   UT.addTest(function testCtxResolveMissingBelowRootWithFormat() {
                var result = ctx.resolvePath("/B/missing-x.html");

                UT.assert(result.path == "/B/missing-x.html");
                UT.assert(result.parent == root.B);
                UT.assert(!("obj" in result));
                UT.assert(result.objName == "missing-x");
                UT.assert(result.format == "html");
              });


   UT.addTest(function testCtxResolveMissing2BelowRoot() {
                var result = ctx.resolvePath("/B/x/missing-w");

                UT.assert(result.path == "/B/x/missing-w");
                UT.assert(result.parent == root.B.x);
                UT.assert(!("obj" in result));
                UT.assert(result.objName == "missing-w");
                UT.assert(result.format == null);
              });


   UT.addTest(function testCtxResolveMissing2BelowRootWithFormat() {
                var result = ctx.resolvePath("/B/x/missing-w.html");

                UT.assert(result.path == "/B/x/missing-w.html");
                UT.assert(result.parent == root.B.x);
                UT.assert(!("obj" in result));
                UT.assert(result.objName == "missing-w");
                UT.assert(result.format == "html");
              });

   UT.addTest(function testCtxResolveBadPath() {
                var result = ctx.resolvePath("/B/missing-x/w");

                UT.assert(result === null);
              });

   print("Hello World");
 })();