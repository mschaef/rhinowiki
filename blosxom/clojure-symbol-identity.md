title: Symbol Identity in Lisp and Clojure
date: 2011-06-29
filename: ./tech/lisp/clojure-symbol-identity.txt


One typical property of Lisp systems is that they they intern
symbols. Roughly speaking, when symbols are interned, two symbols with
the same print name will also have the same identity. This design
choice has several significant implications elsewhere in the Lisp
implementation. It is also one of the places where Clojure differs
from Lisp tradition.

<br><br>

In code, the most basic version of the intern algorithm is easy to
express:

<pre class="syntax">
(define (intern! symbol-name)
   (unless (hash-has? *symbol-table* symbol-name)
      (hash-set! *symbol-table* symbol-name (make-symbol symbol-name)))
   (hash-ref *symbol-table* symbol-name))
</pre>

This code returns the symbol with the given name in the global symbol
table. If there's not already a symbol under that name in the global
table, it creates a symbol with that name and stores it in the hash
prior to returning it.. This ensures that <tt>make-symbol</tt> is only
called once for each <tt>symbol-name</tt>, and the symbol stored in
<tt>*symbol-table*</tt> is always the symbol returned for a given
name. Any two calls to <tt>intern!</tt> with the same name are
therefore guaranteed to return the exact, same, <tt>eq?</tt> symbol
object. At a vCalc REPL, this looks like so (The fact that both
symbols are printed with <tt>##0</tt> implies that they have the same
identity.):

<pre class="syntax">
user&gt; (intern! "test-symbol")
<b>; ##0 = test-symbol</b>
user&gt; (intern! "test-symbol")
<b>; ##0 = test-symbol</b>
</pre>

This design has several properties that have historially been useful
when implementing a Lisp. First, by sharing the internal
representation of symbols with the same print name, interning can
reduce memory consumption. A careful programmer can write an
implementation of interned symbols that doesn't allocate any memory on
the heap unless it sees a new, distinct symbol.  Interning also gives
a (theoretically) cheaper mechanism for comparing two symbols for
equality.  Enforcing symbol identity equality for symbol name equality
implies that symbol name equality can be reduced to a single machine
instruction. In the early days of Lisp, these were very significant
advantages. With modern hardware, they are less important. However,
the semantics of interned symbols do still differ in important ways.

<br><br>

One example of this is that interned symbols make it easy to provide a
global environment 'for free'. To see what I mean by this, here is
the vCalc declaration of a symbol:

<pre class="syntax">
...
          struct
          {
               ...
               lref_t vcell;  // Current Global Variable Binding
               ...
          } symbol;
...
</pre>

Each symbol carries with it three fields that are specific to each
symbol, and are created and initialized at the time the symbol is
created. Because <tt>vcell</tt> for the symbol is created at the same
time as the symbol, the global variable named by the symbol is created
at the same time as the symbol itself.  Accessing the value of that
global variable is done through a field stored at an offset relative
to the beginning of the symbol. These benefits also accrue to property
lists, as they can also be stored in a field of a symbol. This is a
cheap implementation strategy for global variables and property lists,
but it comes at the cost of imposing a tight coupling between two
distinct concepts: symbols and the global environment.

<br><br>

The upside of this coupling is that it encourages the use of global
symbol attributes (bindings and properties). During interactive
programming at a REPL, global bindings turn out to be useful because
they make it easy to 'say the name' of the bindings to the
environment. For bindingsthat directly map to symbols, the symbol
itself is sufficient to name the binding and use it during
debugging. Consider this definition:

<pre class="syntax">
(define *current-counter-value* 0)

(define (next-counter-value)
   (incr! *current-counter-value*)
   *current-counter-value*)
</pre>

This definition of <tt>next-counter-value</tt> makes it easy to
inspect the current counter value. It's stored in a global variable
binding, so it can be inspected and modified during debugging using
its name: <tt>*current-counter-value*</tt>. A more modular style of
programming would store the current counter value in a binding local
to the definition of <tt>next-counter-value</tt>:

<pre class="syntax">
(let ((current-counter-value 0))
  (define (next-counter-value)
    (incr! current-counter-value)
    current-counter-value))
</pre>

This is 'better' from a stylistic point of view, because it reduces
the scope of the binding of <tt>current-counter-value</tt> entirely to
the scope of the <tt>next-counter-value</tt> function. This eliminates
the chance that 'somebody else' will break encapsulation and modify
the counter value in a harmful fashion. Unfortunately, 'somebody else'
also includes the REPL itself. The 'better' design imposes the cost
that it's no longer as easy to inspect or modify the
<tt>current-counter-value</tt> from the REPL. (Doing so requires the
ability to inspect or name the local bindings captured in the
<tt>next-counter-value</tt> closure.)

<br><br>

The tight coupling between interned symbols and global variable
bindings should not come as a suprise, because interning a symbol
necessarily makes the symbol itself global. In a Lisp that interns
symbols, the following code fragment creates two distinct local
variable bindings, despite the fact that the bindings are named by the
same, <tt>eq?</tt> symbol: <tt>local-variable</tt>.

<pre class="syntax">
(let ((local-variable 0))
   (let ((local-variable 0))
      local-variable))
</pre>

The mismatch between globally interned symbols and local bindings
implies that symbols cannot as directly be involved in talking about
local bindings. A Common Lisp type declaration is an S-expression that
says something about the variable named by a symbol.

<pre class="syntax">
...
        (declare (fixnum el))
...
</pre>


In contrast, a Clojure type declaration is a reader expression that
<i>attaches metadata to the symbol itself</i>:

<pre class="syntax">
...
        ^String x
...
</pre>

The <tt>^</tt> syntax in Clojure gathers up metadata and then applies
it using <tt>withMeta</tt> to the next expression in the input
stream. In the case of a type declaration, the metadata gets applied
to the symbol naming the binding. This can be done in one of two
ways. The first is to destructively update metadata attached to an
interned symbol. If Clojure had done this, then each occurrance of
symbol metadata would overwrite whatever metadata was there before,
and that one copy of the metadata would apply to every occurance of
the symbol in the source text. Every variable with the same name would
have to have the same type declarations.

<br><br>

Clojure took the other approach, and avoids the problem by not
interning symbols. This allows metadata to be bound to a symbol
locally. In the Clojure equivalent of the <tt>local-variable</tt>
example, there are two local variables and each are named by two
distinct symbols (but with the same name).

<pre class="syntax">
(let [local-variable 0]
   (let [local-variable 0]
      local-variable))
</pre>

The flexibility of this approch is useful, but it comes at the cost of
losing the ability to store values in the symbols themselves. Global
symbol property lists in Lisp have to be modeled using some other
means. Global variable bindings are not stored in symbols, but rather
in <tt>Vars</tt>. (This is something that compiled Lisps tend to do
anyway.)  These changes result in symbols in Clojure becoming slightly
'smaller' than in Lisp, and more well aligned with how they are used
in moodern, lexically scoped Lisps. Because there are still global
variable bindings availble in the language, the naming benefits of
globals are still available for use in the REPL. It's taken a while
for me to get there, but the overall effect of un-interned symbols on
the design of a Lisp seems generally positive.