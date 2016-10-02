title: vCalc, what's next?
date: 2006-01-03
filename: ./tech/ectworks/vcalc/vcalc_11.txt

Despite outward appearances, there is (really!) another release of <a
href="http://www.icegiant.com/vcalc.shtml">vCalc</a> in the works. I'm
not going to be so silly as to speak to a timeline (probably 2006Q2),
but here's a brief list of planned features for the next release or
two:

* <b>Constant Library</b> - A library of a few hundred constants.

* <b>Interface improvements</b> - The current UI is functional but
  rather plain both in appearance and the interactivity it supports. 
  The next version of vCalc will dress up the UI bit and start the 
  process of making it more interactive.
  
* <b>Macro Recorder</b> - To aid programming, there's a macro recorder
  that records sequences of commands as programs written in the
  language described above.

* <b>New Data Types</b> - There are more first-class data types,
  including complex numbers, lists, tagged numbers, and programs.

* <b>User Programability</b> - There's a user programming 
  language including conditional branches, loops, and
  <a href="http://en.wikipedia.org/wiki/Higher-order_functions">higher 
  order functions.</a> This language looks a lot like a lexically
  scoped variant of <a href="http://www.hpmuseum.org/rpl.htm">RPL</a>,
  the language used by HP in its more modern calculators.

* <b>Better interoperability with other data sources</b> - This means
  import/export of CSV, through both the clipboard and by file.

* <b>Financial Math</b> - This is mainly planned to be Time Value
  of Money.  There's actually interface in vCalc
  1.0 to support this functionality, but I released vCalc before
  getting it to work reliably and disabled the code that implements
  it.  This is going to be an ongoing area for devevlopment.

* <b>Infix notation</b> - There needs to be a way to enter an
  expression like 'sin(x)'. This is both a programmability feature
  and the core of things like symbolic algebra and calculus.

* <b>Graphics</b> - Function plotting.

In a more general sense, there are a few other issues that are
important, but have a slightly lower priority level. These are general
issues that are too big to be 'fixed' in one release, but nonetheless
are important areas for work.  The first of these is performance and
the second is openness.

Performance is the easier of the two issues to describe: I want vCalc
to be usable to interactively perform simple (mean, max, min, linear
regrssion, historgram, etc.) analysis of datasets with 100K-1,000K
observations of 10-20 variables each. The worst case scenario means
that vCalc needs to be able to manage a in-memory image around
500-600MB in size and be able to compute 20-30M floating point
operations within 5-10 seconds. That's a stretch for vCalc, but I
think it's doable within a year or two.  Right now, development copies
of vCalc can reasonably manage 100K observations of 50 variables
each. The biggest weakness is the CSV file importer, which is
glacially slow: it reads CSV files at around 30K/second. I'll speak to
these issuses in more detail later on, but the fix for this will be a
staged rewrite of the Lisp engine and garbage collector at the core of
vCalc.

The other issue that will have to be fixed over time is the issue of
openness.  One of the things I'd like this blog to be is a way to
communicate with the audience of vCalc users. That means example code,
demonstrations of how to use vCalc to solve specific problems, and
descriptions of the guts of vCalc, at the very least. For that to be
useful, there needs to be an audience, and for there to be an audience
the vCalc bits need to be availble for people to use and good enough
for them to care about using it. There's a lot to be done between here
and there, but I've come to believe that open sourcing parts of vCalc
and releasing more frequent development builds of the closed source
parts will end up being key. We'll see.
