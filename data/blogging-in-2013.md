title: Recent Blog Posts
date: 2014-03-26
filename: ./tech/blogging-in-2013.txt

Sorry for the radio silence, but recently I've been focusing my
writing time on the <a href="https://www.ksmpartners.com/blog/">KSM
Partners Blog</a>. My writing there is still technical in nature, but
it tends to be more heavily focused on the JVM. If you're interested,
here are a few of what I consider to be the highlights.

In mid-2013, I started out writing about how to use <a
href="http://docs.oracle.com/javase/6/docs/api/java/lang/Runnable.html"><tt>Runnable</tt></a>
to explictly enforce <a
href="https://www.ksmpartners.com/2013/06/dynamic-extent-in-java/">dynamic
extent</a> in Java. In a nutshell, this is a way to implement <a
href="http://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html">try...with...resources</a>
in versions of Java that don't have it built in to the language.  I
then used the dynamic extent technique to build a <a
href="http://docs.oracle.com/javase/6/docs/api/java/lang/ThreadLocal.html"><tt>ThreadLocal</tt></a>
that <a
href="https://www.ksmpartners.com/2013/07/thread-local-state-and-its-interaction-with-thread-pools/">plays
nicely with thread pools</a>. This is useful because thread pools
require an understanding of which thread you're running on, which
thread pooling techniques can abstract away.

Later in the year, I focused more on <a
href="http://clojure.org/">Clojure</a>, starting off with a <a
href="https://www.ksmpartners.com/2013/08/clojure-closures-in-java/">quick
bit</a> on the relationship of lexical closures to Java inner
classes. I also wrote about a particular kind of stack overflow
exception that can happen with <a
href="https://www.ksmpartners.com/2014/01/clojure-lazy-seq-and-the-stackoverflowexception/">lazy
sequences</a>. Lazy sequences can nicely remove the need to use
recursion while traversing their length, but each time two unrealized
lazy sequences are combined, it adds to the recursive depth required
to compute the first element. For me, this stack overflow was a
difficult error to diagnose, because it seemed so counter-intuitive.

I'm also in the middle of a series of posts that relate the GoF
command pattern to functional programming. The posts start off with
Java, but will ultimately describe a Clojure implementation that
compiles a stack based expression language into optimized Java
bytecode. If you'd like to play with the code,
<a href="https://github.com/ksmpartners/blog-rpncalc"> it's on github</a>

* <a href="https://www.ksmpartners.com/2013/10/middle-school-math-reverse-polish-notation-and-software-design/">Middle School Math, Reverse Polish Notation, and Software Design</a>
* <a href="https://www.ksmpartners.com/2013/10/rpn-calc-part-1-a-simple-calculator-in-java-and-the-command-pattern/">RPN Calc, Part 1 - A Simple Calculator in Java and the Command Pattern</a>
* <a href="https://www.ksmpartners.com/2013/10/rpn-calc-part-2-composite-commands/">RPN Calc, Part 2 - Composite Commands</a>
* <a href="https://www.ksmpartners.com/2013/11/rpn-calc-part-3-undo/">RPN Calc, Part 3 - Undo</a>
* <a href="https://www.ksmpartners.com/2013/12/rpn-calc-part-4-a-noun-for-state/">RPN Calc, Part 4 - A Noun for State</a>
* <a href="https://www.ksmpartners.com/2013/12/rpn-calc-part-5-eliminating-the-globals/">RPN Calc, Part 5 - Eliminating the Globals</a>
* <a href="https://www.ksmpartners.com/2014/01/rpn-calc-part-6-refactoring-the-repl-with-an-iterator/">RPN Calc, Part 6 - Refactoring the REPL with an Iterator</a>
* <a href="https://www.ksmpartners.com/2014/01/rpn-calc-part-7-refactoring-loops-with-reduce/">RPN Calc, Part 7 - Refactoring Loops with Reduce</a>

