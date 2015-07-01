
var UT = { // Hook 'em Horns!

  testFiles: [ ],
  loadedTestFiles: [ ],

  tests: { },

  checks: 0,
  failures: [ ],

  addTest: function(testFn) {
    ensureType(testFn, 'function');

    var testName = testFn.name;

    if (testName.length === 0)
      error("Test functions must have names.", testFn);

    if (this.tests.hasOwnProperty(testName))
      logWarn("Test already added: " + testName);

    this.tests[testName] = testFn;
  },

  // REVISIT: This lazy laoding infrastructure would be more generally useful,
  // particularly when combined with an autoload facility.

  addTestFile: function(fileName) {
    if (this.testFiles.findObject(fileName) == null)
      this.testFiles.push(fileName);
  },

  loadTestFile: function(fileName) {
    try {
      load(fileName);

      this.loadedTestFiles.push(fileName);
    } catch(ex) {
      logError("Exception while loading test file: " + ex);
      throw ex;
    }
  },

  loadNeededFiles: function() {
    var that = this;

    this.testFiles.forEach(
      function (fileName) {
        if (that.loadedTestFiles.findObject(fileName))
          return;

        that.loadTestFile(fileName);
      });
  },

  assert: function(cond) {
    if (!cond)
      this.failures.push(this.checks);

    this.checks = this.checks + 1;
  },

  runTest: function(testFn) {
    var testName = testFn.name;

    this.checks = 0;
    this.failures = [];

    try {
      testFn();

      if (this.failures.length === 0) {
        logInfo("Successfully run test: " + testName + " (" + this.checks + " condition(s) tested)");
        return;
      }

      logInfo("FAILED Assertations in test: " + testName + ": " + this.failures);
    } catch(ex) {
      logInfo("FAILED: " + testName + ": " + " with exception: " + ex + ", after " + this.checks + " test cases/");
    }

  },

  run: function() {
    var that = this;

    that.tests.forLocalKeys(function(testName) {
                              that.runTest(that.tests[testName]);
                            });
  }
}