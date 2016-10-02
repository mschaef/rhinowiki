title: Whither XML?
date: 2006-06-21
filename: ./tech/general/whither_xml.txt

I was skimming <a href="http://blogs.msdn.com/vincem/">Vincent
Maraia's</a> (he has a blog!)  book, <a
href="http://www.awprofessional.com/bookstore/product.asp?isbn=0321332059&rl=1">
<i>The Build Master: Microsoft's Software Configuration Management
Best Practices</i></a>, and ran across the following quote:

> Thus, if you want to learn one languauge that will cover many tools and
> technologies no matter what platform you are working on, that language
> is XML.
	
On the surface, this is a true statement.  Since XML's introduction
it's shown up virtually everywhere: XML has been used for everything
from configuration files to RPC protocols. Better still, all these XML
documents have the same understandable syntax and can be parsed by the
same, standard tools (which exist virtually everywhere).  If you want
to work with XML files, chances are your favorite text editor has
built in XML support; If you want something more structured, Excel has
a powerful XML import capability, as do most databases.  However, as
nice as all this is, it glosses over one fundamental fact: XML, by
itself, doesn't mean anything.

Saying that a document is in XML is basically the same as saying it's
in CSV: it implies the format that contains the data, but it doesn't
imply anything about the data itself.  There are still a bunch of
unresolved questions: What tags are supported?  How are attributes
parsed? What do the tags actually mean? These are the types of
questions you'll find yourself asking about five seconds after
receiving an XML document in a new format. While some of these
questions can be answered by a Schema or DTD, the last question, the
key question, isn't addressed by a schema at all. As anybody who has
had to reverse engineeer an otherwise unknown XML document can tell
you: even if you know a document is in XML, the things you really care
about are still left unspecified.

So, XML isn't really the 'language' Mr. Maraia states it to be, which
is why his comment is so optimistic.  While it is true that XML is
useful and universal, you'll also need to learn schemas for the
documents you'll be working with; That's where the bulk of the work
will be. (Syntax is generally an easy thing to learn, and developing
syntax processing code is a well understood branch of computer
science.) So, while you should learn XML, if learning XML itself is
the kind of decision you have to mull over, you probably aren't
prepared for steps you'll be taking immediately after learning XML.
(This is particularly true if you're using XML to configure build
tools, as in Maraia's book. If you're in that role and are having
trouble with XML, you should just quit now.)

<a href="http://naggum.no/">Erik Naggum</a>, of <a href="http://groups.google.com/group/comp.lang.lisp">comp.lang.lisp</a>
fame, <a href="http://groups.google.com/group/comp.lang.lisp/browse_thread/thread/6812d19d7e252ee1/7d410e0ae791d1cb?lnk=st&rnum=1#7d410e0ae791d1cb">
summed this up</a> quite nicely:

> Structure is <b>nothing</b> if it is all you got.  Skeletons <b>spook</b>
> people if they try to walk around on their own.  I really wonder why XML does not.

