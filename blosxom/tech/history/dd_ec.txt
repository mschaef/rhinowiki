title: Dusty Decks, Lisp, and Early Computing
date: 2005-09-07
filename: ./tech/history/dd_ec.txt


I've found a couple interesting websites related to computer
history. The first is <a href="http://www.mcjones.org/dustydecks/">Dusty
Decks</a>, a blog related to some efforts to reconstruct Lisp and
FORTRAN history. A highlight of this is a discussion on the <a 
href="http://www.mcjones.org/dustydecks/archives/2005/08/07/46/">Birth
of the FORTRAN subroutine</a>.  Also via Dusty Decks is 
<a href="http://community.computerhistory.org/scc/projects/LISP/">
a website on the early history of the Lisp Programming Language</a>.

<p><p>

That leads me to a couple books I've been reading lately. The 
first is
<a href="http://www.amazon.com/exec/obidos/tg/detail/-/0521562473/qid=1126133594/sr=8-2/ref=pd_bbs_2/104-0331972-1127976?v=glance&s=books&n=507846">
Lisp in Small Pieces</a>, by <a href="http://www-spi.lip6.fr/~queinnec/WWW/Queinnec.html">
Christian Queinnec</a>.  I'm only a couple chapters in (stuck on continuations
right now), but it's already been pretty profound.  So far, the aspect
of the book that's been the most useful is that it has gone through several
core design choices Lisp implementors have to make (
  <a href="http://www.nhplace.com/kent/Papers/Technical-Issues.html">Lisp-1 vs. Lisp-2</a>, 
  <a href="http://www-pu.informatik.uni-tuebingen.de/users/sperber/papers/dynamic-scope-analysis.pdf">Lexical Scope vs. Dynamic Scope</a>, 
  <a href="http://www.brics.dk/~hosc/local/HOSC-11-2-pp125-143.pdf">types of continuations to support</a>),
and goes into depth regarding the implications and history of the choices involved.
I think I'm finally starting to understand more of the significance of
funcall and function in Common Lisp, not to mention throw/catch and
block/return-from.

<p><p>

Book two is <a href="http://mitpress.mit.edu/catalog/item/default.asp?ttype=2&tid=3731">The
First Computers--History and Architectures</a>, edited by
<a href="http://page.mi.fu-berlin.de/~rojas/">Raul Rojas</a>. This book is a collection
of papers discussing the architecture of significant early computers from the late 
30's and 40's.  The thing that's so unique about the book is that it focuses on
the architectural issues surrounding these machines: the kinds of hardware they
were built with, how they processed information, and how they were programmed. Just
as an example, it has a detailed description of many of ENIAC's functional units,
even going into descriptions of how problems were set up on the machine. Another
highlight of the book for me (so far) has been a description of Konrad Zuse's
relay-based Z3, down to the level of a system architectural diagram, schematics of
a few key circuits, and coverage of its microprogramming (!). 
