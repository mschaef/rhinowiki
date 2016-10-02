title: SRFI-74: Octet-Addressed Binary Blocks
date: 2005-11-04
filename: ./tech/lisp/srfi_74.txt

<a href="http://www-pu.informatik.uni-tuebingen.de/users/sperber/">
Michael Sperver has written an <a href="http://srfi.schemers.org/">SRFI</a>
that documents <a href="http://srfi.schemers.org/srfi-74/srfi-74.html">
"Octet-Addressed Binary Blocks"</a>. Basically these things are like
BLOBs in SQL: blocks of memory, opaque to the data model
of the language, that can be used to store arbitrary binary data. I can think
of a bunch of applications for this:

* An internal representation for compiled byte code functions.

* A way to interoperate with C code that expects binary data formats. 
  (<i>Like the Win32 API, for example.</i> )
  
* A way to represent binary data longer than a byte that's written to and
  read from binary ports.
