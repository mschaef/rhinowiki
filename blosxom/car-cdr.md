title: CAR, CDR, and Lisp...
date: 2008-02-14
filename: ./tech/lisp/car-cdr.txt


A couple weeks ago, I got into a brief <a href="http://www.reddit.com">reddit</a> <a
href="http://reddit.com/info/677u6/comments/c031w9f">discussion</a> on the relative merits
of Lisp's <a
href="http://www.lisp.org/HyperSpec/Body/acc_carcm_cdr_darcm_cddddr.html"><tt>car</tt> and
<tt>cdr</tt></a> functions. Given a Lisp list, applying <tt>car</tt> to the list returns
the first element of the list and applying <tt>cdr</tt> to the list returns a list of
every element excluding the first.  For someone new to Lisp (as we all were once), these
names can be a bit awkward. However, like many other aspects of the language, there is
more to <tt>car</tt> and <tt>cdr</tt> than meets the eye.

<br><br>

The first implementation of Lisp was done by <a
href="http://en.wikipedia.org/wiki/Steve_Russell">Steve Russell</a> on an <a
href="http://en.wikipedia.org/wiki/IBM_704">IBM 704</a>. The 704 was a 36-bit vacuum tube
machine that IBM started selling in 1954. By the time it was discontinued in 1960, they
had sold a total of 123 of the machines, each capable of a whopping 40,000 calculations
per second. Russell's original 1959 implementation of Lisp on this machine took advantage
of the fact that the 704's instruction set had special capabilities for accessing two
distinct 15 bit fields of a 36 bit value loaded into a machine register: the
<b>a</b>ddress and <b>d</b>ecrement fields.  In <a
href="http://www.iwriteiam.nl/HaCAR_CDR.html">Russell's own words</a>: <i> "Because of an
unfortunate temporary lapse of inspiration, we couldn't think of any other names for the 2
pointers in a list node than 'address' and 'decrement', so we called the functions CAR for
'Contents of Address of Register' and CDR for 'Contents of Decrement of Register'."</i>
Interestingly enough, he continues with this: <i>"After several months and giving a few
classes in LISP, we realized that 'first' and 'rest' were better names, and we (John
McCarthy, I and some of the rest of the AI Project) tried to get people to use them
instead. ... Alas, it was too late! We couldn't make it stick at all. So we have CAR and
CDR. "</i> So there you have it: <tt>car</tt> and <tt>cdr</tt>, two of the most famous and
widely used functions of Lisp and its descendents, owe their names to a bizarre quirk of a
computer architecture that's been obsolete for close to fifty years. For the record,
here's a source listing for the original 704 implementataion of <tt>car</tt> taken from <a
href="ftp://publications.ai.mit.edu/ai-publications/pdf/AIM-006.pdf">MIT AI Lab Memo
6</a>:

<pre class="syntax">
LXD JLOC, 4
CLA 0,4
PAX 0,4
PSX 0,4
</pre>

But the story of <tt>car</tt> and <tt>cdr</tt> doesn't stop there.  In the 1960's and
early 70's, the <a href="http://www.utexas.edu">University of Texas at Austin</a> ran a
computer called a <a href="http://en.wikipedia.org/wiki/CDC_6600">CDC 6600</a>. The 6600
was one of <a href="http://en.wikipedia.org/wiki/Seymour_Cray">Seymour Cray</a>'s first
big supercomputer designs, and was the fastest computer in the world for a time.  It had a
60-bit machine word and an 18-bit address space, so you can probably see where this is
going.  The designers of UT's Lisp for the CDC 6600 added a third field to <tt>cons</tt>
cells, giving them each three pointers, the <a
href="http://groups.google.com/group/alt.folklore.computers/browse_thread/thread/a1c2c48abe467f3c/b6217d9e521e043d?hl=en&lnk=st&q=car+cdr+csr+cdc+6600+lisp#b6217d9e521e043d"><tt>car</tt>,
<tt>cdr</tt>, and <tt>csr</tt></a>. I'm sure the third pointer was useful for implementing
things like trees of nodes and lists of key/value pairs, although apparantly not useful
enough to stick around. Two pointer cons cells are a better fit for modern hardware, and
two two pointer cons cells can represent everything that a single three pointer cons cell
can represent.

<br><br>

Back at MIT in the 70's, and before things like <a
href="http://www.lisp.org/HyperSpec/Body/mac_defstruct.html"><tt>defstruct</tt></a>, <a
href="http://www.multicians.org/lcp.html">Maclisp</a> took the idea of multi-pointer cons
cells to what must be its logical extreme: <a
href="http://www.maclisp.info/pitmanual/hunks.html">hunks</a>. A Maclisp hunk was a
structure like a cons cell that could hold an arbitrary number of pointers, up to total of
512. Each of these slots in a hunk was referred to as a numbered <tt>cxr</tt>, with a
numbering scheme that went like this: <tt>( cxr-1 cxr-2 cxr-3 ... cxr-<i>n</i> cxr-0
)</tt>. No matter how many slots were in the hunk, <tt>car</tt> was equivalent to <tt>(cxr
1 <i>hunk</i>)</tt> and <tt>cdr</tt> was equivalent to <tt>(cxr 0 <i>hunk</i>)</tt>. This is
a nice generalization of the basic idea of a cons cell, but modern Lisps offer other ways
to structure data that are both possibly more useful and more readable: structures for a fixed 
collection of named slots, hash tables for a variable collection of named slots, and vectors
for a collection of numbered slots.

<br><br>

After these historical blind alleys, it's interesting to think about why <tt>car</tt> and
<tt>cdr</tt> still persist fifty years after McCarthy and Russell roamed the halls of MIT
evangelising <tt>first</tt> and <tt>rest</tt>. Common Lisp does at least have
<tt>first</tt> and <tt>rest</tt> as part of the standard. However, when I was taught Lisp
in the mid-90's, I was encouraged to primarily favor the older <tt>car</tt> and
<tt>cdr</tt>. I remember two primary reasons for this. The first was that existing code
favored <tt>car</tt> and <tt>cdr</tt>, so it was important to be able to read code written
in that style. The second reason was that <tt>first</tt> and <tt>rest</tt> impose a
particular meaning on the fields of a cons cell that may or may not be appropriate. In the
common case of a linear list, <tt>first</tt> and <tt>rest</tt> work rather well. If you
call <tt>first</tt> on the list, you get the first element, if you call <tt>rest</tt>, you
get the rest. In the case of a cons cell as a node of an association list, they work less
well, unless, that is, you can figure out a reason why <tt>first</tt> makes sense as
'key', and <tt>rest</tt> makes sense as 'value'.

<br><br>

Some of this confusion stems from the fact that most Lisps, despite the name <b>Lis</b>t
<b>P</b>rocessing, don't have an official list data type. What they have instead is a two
element cons cell and a set of conventions in the library, reader, and writer for using
the to make linear lists. In a sense, this is a lot like strings in C. C doesn't have a
string type, what it has instead is a pointer to character data (<tt>char *</tt>) and a
set of library conventions for using blocks of memory as strings of characters. This
laxness on the part of both languages comes with the advantages and disadvantages you'd
expect from letting the deatils of an underlying implementation leak through. In the case
of C 'strings', the representation lends itself both to things like Rob Pike's beautiful
<a href="http://cm.bell-labs.com/cm/cs/tpop/grep.c">regex implementation</a> in <a
href="http://cm.bell-labs.com/cm/cs/tpop/">The Practice of Programming</a> and a seemingly
never ending series of buffer overrun attacks. In the case of Lisp cons cells, it provides
both an incredibly flexible data structure, and confusion over such basic notions as
the 'first', 'second', and 'rest' of a list.

<br><br>

If something as baroque as 'car' actually makes more sense than 'first' because 'first'
doesn't match up well to underlying abstraction, it might them make sense to
reconsider the underlying implementation. Some modern Lisps like <a
href="http://clojure.sourceforge.net/">Clojure</a> do just that; A Clojure 'list' isn't a
string of cons cells, but rather an instance of a JVM object that implements the
interface <tt>ISeq</tt>:

<pre class="syntax">
public interface ISeq extends IPersistentCollection{
   Object first();
   ISeq rest();
   ISeq cons(Object o);
}
</pre>

Clojure's user-visible <tt>first</tt> and <tt>rest</tt> functions ultimately call into
their like-named methods in <tt>ISeq</tt>:

<pre class="syntax">
static public Object first(Object x){
	ISeq seq = seq(x);
	if(seq == null)
		return null;
	return seq.first();
}

// ...

static public ISeq rest(Object x){
	ISeq seq = seq(x);
	if(seq == null)
		return null;
	return seq.rest();
}
</pre>

A noteworthy difference between this and a 'conventional' Lisp is the return type of
<tt>rest</tt>: it's another <tt>ISeq</tt>, rather than a <tt>Object</tt>. Because of this,
the 'CDR' of a Clojure cons cell has a new constraint: it is constrained to be another
sequence, increasing greatly the likelihood that 'rest' really is 'the rest'. While
this could be done even if <tt>rest</tt> returned an <tt>Object</tt>, constraining
rest to be a sequence eliminates a number of edge cases in the language that arise
when you allow the rest of a list to be something other than a list itself. This altered 
representation also fits in nicely with Clojure's host JVM: there's nothing that says
<tt>ISeq</tt> has to be implemented by a two-element pointer. Indeed, Closure 
<a href="http://reddit.com/r/programming/info/68sll/comments/c036rc6">
<i>"also implements first and rest for vectors, strings, arrays, maps, Java Iterables,
lazily calculated and infinite sequences etc."</i></a>  All these implementations of
<tt>ISeq</tt> make it easier for Clojure sequences to interoperate with Java,
and it makes it easier to build a sequence library that works on all kinds of sequences.
What's lost with this choice is the ability to use a cons cell as an informal two-element
structure.  Even then, this style of <tt>first</tt> and <tt>rest</tt> could co-exist
with implementations of <tt>car</tt> and <tt>cdr</tt> that work the 'old way'.

<br><br>

So in the end, maybe <tt>car</tt> and <tt>cdr</tt> are all right. They aren't the best
names in the world, but they fit nicely the semantics of a unrestricted two-pointer
cons cell. For those cases where you really are finding the first and rest of a 
list of cons cells, it is easy to use the <tt>first</tt> and <tt>rest</tt> functions in
lieu of <tt>car</tt> and <tt>cdr</tt>. Then, for dialects like Clojure, your code is
automatically portable to other sequence types. If you're using cons cells as a
ad hoc structure, then you can either use <tt>car</tt> and <tt>cdr</tt> and accept those
names as  historical baggage of the second oldest major programming language, or
investigate some of  the other more modern ways of structuring data in Lisp programs. 
