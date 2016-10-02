title: Not tested? Then it doesn't work.
date: 2008-01-20
filename: ./tech/programming/not_tested_not_working.txt

The other day, I had the following (abbreviated) dialog with my little 
Scheme interpreter:


```scheme
scheme> (intern! 'xyzzy2 (find-package "keyword"))
; Fatal Error: Assertation Failed: STRINGP(pname) @ (oblist.cpp:451)
c:\vcalc>vcsh.exe

scheme> (intern! 12)
; Fatal Error: Assertation Failed: STRINGP(sym_name) @ (oblist.cpp:269)
c:\vcalc>
```

Needless to say, 'Fatal errors' aren't good things, and fatal errors 
in <tt>intern!</tt>, a core function, are even worse. Without going 
into too many details, the first call should be returning 
successfully, and the second should be throwing a runtime type check 
error. However, the implementation of <tt>intern!</tt> wasn't 
checking argument types and passing invalid arguments into lower 
layers of the interpreter's oblist (symbol table) code, which died 
with an assertation failure.

To put this in perspective, my implentation of <tt>intern!</tt> is 
about five years old, and something that I thought to be a fairly 
reliable piece of code. At the very least, I didn't think it was 
susceptable to something as simple as a type checking error that
would crash the entire interpreter. Of course, when I looked at my 
test suite, there wasn't a set of tests for <tt>intern!</tt>. That
might have something to do with it, don't you think?  

Here are the morals I'm taking from this little story:

* Do not assume something works, unless you have a complete
  test suite for it. (Even then be wary, because your test suite
  is probably not complete.)

* Shoot for more than 60% code coverage on your test cases.

* Don't write your own interpreter, because there are probably
  hundreds of other bugs just like this one. :-)

