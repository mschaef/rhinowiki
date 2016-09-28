title: Programming Well: Write (and Read) your Data ASAP
date: 2005-09-07
filename: ./tech/programming/dumper.txt


One of the first functions I like to write when creating
a new data structure is a human-readable dumper. This
is a simple function that takes the data you're working
with and dumps it to an output stream in a readable way.
I've found that these things can save huge amounts of
debugging time: rather than paging through debugger watch
windows, you can assess your program's state by calling
a function and reading it out by eye.

A few tips for dump functions:

* The more use this kind of scaffolding code gets, it
  gets progressively more cost effective to write. Time
  spent before dumpers are in place reduces the amount
  of use they can get and makes them progressively less
  cost effective. Implement them early, if you can.

* Look for cheap alternatives already in your toolkit:
  Lisp can already print most of its structures, and .Net
  includes object serialization to XML. The standard
  solution might not be perfect, but it is 'free'.

* Make sure your dumpers are correct from the outset.
  The whole point of this is to save debugging time
  later on, if you can't trust your view into your
  data structures during debugging, it will cost you
  time.

* Dump into standard formats. If you can, dump into
  something like CSV, XML, S-expressions, or 
  <a href="http://seclab.cs.ucdavis.edu/~hoagland/Dot.html">
  Dotty</a>. If you have a considerable amount of data
  to analyze, this'll make it easier to use other tools
  to do some of the work.

* Maintain your dumpers.  Your software isn't going to
  go away, and neither are your data structures. If it's
  useful during initial development, it's likely to be
  useful during maintenance.

* For structures that might be shared, or exist on the
  system heap, printing object addresses and reference
  counts can be very useful.

* For big structures, it can be useful to elide specific
  content. For example: a list of 1000 items can be printed
  as (item_0, item_1, item_2, ..., item_999 ).

* This stuff works for disk files too. For binary save
  formats, specific tooling to examine files can save time
  compared to an on-disk hex-editor/viewer. (Since you have
  code to read your disk format into a data structure
  in memory, if you also have code to dump your in-memory
  structure, this does not have to be much more work.
  Sharing code between the dump utility and the actual
  application also makes it more likely the dumper
  will show you the same view your application will see.)

* Reading dumped structures back in can also be useful.

