title: A few interesing software books.
date: 2007-07-02
filename: ./tech/general/book_list.txt

I wrote this list of good software books a few years ago, in an
effort to write down books that I've found to be interesting and/or
useful.  None of these books are of the 'X in Y days' variety, and
very few qualify as reference books likely to be useful in your day
to day work.  That said, move of them will still make you a better
developer.

# Software Structure and Algorithms

* [**Code Complete: A Practical Handbook of Software Construction**](http://www.amazon.com/exec/obidos/tg/detail/-/1556154844/qid=1061504556/sr=8-1/ref=sr_8_1/002-0808278-8839253?v=glance&amp;s=books&amp;n=507846) - *Steve McConnell* - 
   This book is a classic reference on how code should be constructed,
   when working at the level of program statements and functions. While
   it does not cover some of the newer programming constructs or languages,
   this book should be considered essential reading for any working programmer.

* [**Programming Pearls, 2nd Edition**](http://www.amazon.com/exec/obidos/tg/detail/-/0201657880/qid=1061504884/sr=8-1/ref=sr_8_1/002-0808278-8839253?v=glance&amp;s=books&amp;n=507846) - *Jon Bentley* -
   As the author puts in the preface, this book talks about the more
   glamourous aspects of programming. Culled from a series of articles
   in Communications of the ACM, Bentley presents a series of 
   insights on solving common programming problems.

* [**The Art of Computer Programming, Vols. 1-3**](http://www.amazon.com/exec/obidos/ASIN/0201485419/qid=1061504903/sr=2-1/ref=sr_2_1/002-0808278-8839253) - *Donald Knuth* -
   This is <b>the</b> series on the common algorithms used in software. Knuth
   presents, in gory detail, a series of algorithms and the mathematics on
   which they depend. You probably should not expect to read (or understand)
   everything that's here, but if you're in a bind, these books can be
   invaluable references. Robert Sedgewick also has an [alternative](http://www.amazon.com/exec/obidos/ASIN/0201756080/qid=1061504963/sr=2-2/ref=sr_2_2/002-0808278-8839253) that might be more accessible.

* [**Compilers: Principles, Techniques, and Tools**](http://www.amazon.com/exec/obidos/tg/detail/-/0201100886/qid=1061505039/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *Alfred V. Aho, Ravi Sethi, and Jeffrey D. Ullman* -
   The definitive reference on compiler design. If you have to do anything 
   with expression parsing, analysis, or translation this is a good introduction.

# C and C++

* [**C Traps and Pitfalls**](http://www.amazon.com/exec/obidos/tg/detail/-/0201179288/qid=1061505116/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *Andrew Koenig* -
   C is a language notoriously full of little oddities that can
   make programmers' lives more difficult. This book documents a lot
   of them, explaining a little about why the language works the way
   it does. Reading it is a good way to help become a more seasoned
   user of C (and by implication C++). <a 
href="http://www.amazon.com/exec/obidos/tg/detail/-/0131774298/ref=pd_bxgy_text_1/002-0808278-8839253?v=glance&amp;s=books&amp;st=*">
   Expert C Programming</a> by Peter van der Linden also appears quite good
   too, although I've not read it all the way through.

* [**The Design and Evolution of C++**](http://www.amazon.com/exec/obidos/tg/detail/-/0201543303/qid=1061505218/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *Bjarne Stroustrup* -
   Ever wonder why C++ works the way it does? This book, documenting
   the history of C++ and C with Classes, talks a lot about the design
   decisions made while the language was being developed. It's a dry
   read at times, but understanding the intent of the designers of a
   tool can really help while using the tool.


* [**Advanced C++: Programming Styles and Idioms**](http://www.amazon.com/exec/obidos/tg/detail/-/0201548550/qid=1061505234/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *James Coplien* -
   In the C++ world, this book is <b>old</b>: It predates the ANSI standard,
   and many of the features introduced later on in the standardization effort
   (like STL). Despite that, Coplien describes techniques that give C++ programs
   a level of flexibility approaching that of languages like Lisp and Smalltalk.
   He covers garbage collection, multi-method dispatch, and replacment of code at
   runtime, among other techniques. If you need those capabilities, I'd reccomend
   another language. If you have to use C++, I'd reccomend this book.

# Win32 Programming

* [**Win32 Programming**](http://www.amazon.com/exec/obidos/tg/detail/-/0201634929/qid=1061505254/sr=1-3/ref=sr_1_3/002-0808278-8839253?v=glance&amp;s=books) - *Brent Rector and Joseph Newcomer* -
   This is one of the most detailed books on the core Win32 API
   I've ever seen. If you need to work with Win32, you need good
   documentation, and this is the book to get. Not only does it
   talk in great detail about API functions, it also talks about
   some of the differences between the various platforms extant
   in 1997. I can't reccomend it enough, but I do hope it gets updated
   to include Windows 2000 and XP.

* [**Windows++**](http://www.amazon.com/exec/obidos/tg/detail/-/020160891X/qid=1061505338/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *Paul DiLascia* -
   First things first: this book is centered around Windows 3.1. While
   a lot has changed, a lot has stayed the same about the Windows API.
   Keeping that in mind, DiLascia's narrative through the process of
   encapsulating the Win16 API in C++ is a perfect example of how to
   manage the complexity of a difficult API using an object oriented
   programming environment. Even if you never write a Windows framework
   yourself, it's still good reading on the issues involved in both
   Windows programming and framework design in general.

# Graphics and Visualization

* [**Computer Graphics: Principles and Practice in C**](http://www.amazon.com/exec/obidos/ASIN/0201848406/qid=1061505353/sr=2-1/ref=sr_2_1/002-0808278-8839253) - *Foley, van Dam, Femer, Hughes* -
   A good introduction to a wide variety of graphics algorithms and
   techniques. Serious work in the field will require more specialized
   books, however.

* [**The Visual Display of Quantitative Information**](http://www.amazon.com/exec/obidos/ASIN/096139210X/qid%3D1061505501/sr%3D11-1/ref%3Dsr%5F11%5F1/002-0808278-8839253) - *Edward R. Tufte* -
   A good, and beautiful, discussion on how to graphically depict
   numerical information, and do so reliably and clearly.

* [**Practical Reusable Unix Software**](http://www.amazon.com/exec/obidos/ASIN/0471058076/qid%3D1061505543/sr%3D11-1/ref%3Dsr%5F11%5F1/002-0808278-8839253) - *Edited by Balachander Krishnamurthy* -
   Not really a visualization or graphics book, except for the
   material covering the <a href="http://www.research.att.com/sw/tools/graphviz/">
   AT&amp;T GraphViz (dotty and lefty)</a> toolset. If you're programming with
   data structures more elaborate than lists, this tool can be an easy way
   to interpret data structures dumped to disk. With lefty, it's even possible
   to program specific user interfaces to edit graphical displays.


# "Advanced" Languages

* [**Shared Source CLI Essentials**](http://www.amazon.com/exec/obidos/ASIN/059600351X/qid%3D1061505559/sr%3D11-1/ref%3Dsr%5F11%5F1/002-0808278-8839253) - *David Stutz, Ted Neward, and Geoff Shilling* -
   This book is dense, but essential reading. With the two biggest
   emergent platforms (Java and .Net) depending on advanced runtime
   support, these more advanced runtime engines are now a fact of
   life. While this book focuses on the shared source implenentation
   of the .Net runtime, it is an excellent introduction to the ideas
   behind Java, .Net, and even languages like Smalltalk, Scheme, and
   Lisp.	

* [**The Art of the Metaobject Protocol**](http://www.amazon.com/exec/obidos/search-handle-form/ref=dp_sr_00/002-0808278-8839253) - *Gregor Kiczales, Jim des Rivieres, and Danial G. Bobrow* -
   This book documents something called the Metaobject-protocol as 
   found in the object oriented part of some Common Lisp implementations.
   If you need to use metaobjects, it's of course a useful book, but it's
   also informative in general about the implementation of dynamic
   languages. I particularly liked the coverage on method dispatch and
   selection.


* [**Common Lisp: The Language, 2nd Edition**](http://www.amazon.com/exec/obidos/tg/detail/-/1555580416/qid=1061505589/sr=1-7/ref=sr_1_7/002-0808278-8839253?v=glance&amp;s=books) - *Guy Steele* -
   While it's been superceded by the <a href="http://www.lispworks.com/reference/HyperSpec/">
   ANSI Hyperspec for Lisp</a>, as a reference for Common Lisp, this is still
   a good reference to the language. For programmers in general, and particularly
   language implementors, this book is also full of good ideas on algorithms and 
   software design.

* [**On Lisp**](http://www.amazon.com/exec/obidos/tg/detail/-/0130305529/qid=1061505607/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *Paul Graham* -
   Macros (code-rewrite rules) are one of the hardest things to understand
   in Common Lisp, and other similar languages. Graham goes into a lot of
   detail about how they can be used in real-world development, and includes
   a bunch of good examples. It is available free of charge
  <a href="http://www.paulgraham.com/onlisp.html"> online</a>.


* [**Structure and Interpretation of Computer Programs**](http://www.amazon.com/exec/obidos/tg/detail/-/0262011530/qid=1061505635/sr=1-1/ref=sr_1_1/002-0808278-8839253?v=glance&amp;s=books) - *Harold Abelson, Gerald Jay Sussman, and Julie Sussman* -
   This is one of those books that has the potential to seriously change
   the way you think. Written as a textbook for an introductory programming
   course at MIT, this book talks a lot about varying styles of computation
   and how they can be used. 
