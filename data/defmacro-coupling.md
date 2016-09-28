title: defmacro and coupling.
date: 2008-04-10
filename: ./tech/lisp/defmacro-coupling.txt

A few months ago, I ran into a problem with a macro that seriously
changed my opinions on how they should be used. It all comes down to
the fact that macro are incorporated into compiler output. Two pieces
of code that look nicely decoupled in the source text can end up very
entwined with each other, once they are compiled.

To illustrate, I'll use the macro in question, something I once used
to accept a sort of simulated 'multiple return value' in a dialect of
Scheme. This is a low level example, something from my hobby work, but
it can apply equally well to other uses of macros.

```scheme
(defmacro (values-bind form vars . body)
  (with-gensyms (form-rv-sym)
    `(let ((,form-rv-sym ,form))
       (list-let ,vars (if (%values-tuple? ,form-rv-sym)
                           (slot-ref ,form-rv-sym 'v)
                           (list ,form-rv-sym))
         ,@body))))
```

This macro expands code like this:

```scheme
(values-bind (returns-2-args 'foo) (arg-1 arg-2)
   (+ arg-1 arg-2))
```

Into code that looks like this:

```scheme
(let ((#:form-rv-sym-69@00beeec4 (returns-2-args 'foo)))
   (list-let (arg-1 arg-2) (if (%values-tuple? #:form-rv-sym-69@00beeec4)
                              (slot-ref #:form-rv-sym-69@00beeec4 'v)
                              (list #:form-rv-sym-69@00beeec4))
     (+ arg-1 arg-2)))
```

And then, the compiler compiles that form and drops the result into
the output file, which now contains several pretty deep assumptions
about the simulated multiple value protocol it needs to honor:

* Values are returned in a single value that satifies `%values-tuple?`.
* Values are extracted from a tuple with a call to `slot-ref` for slot `v`.
* Values are stored within slot as a list.

While the source text that uses `values-bind` doesn't need to
know any of these details, the compiler output does. This results in
compiler output that is very closely tied to the value protocol;
Compiler output that is likely to be incompatible with any changes to
that protocol.

In many development scenarios, this doesn't matter.  Within a single
project, if compiled file A comes to depend on assumptions embedded in
macros from file B, it's less of an issue: both files are usually
compiled at the same time. If both files can't be simultaneously
compiled, things start to go wrong. I ran into this issue myself when
trying to change the multiple value protocol I was using in my
compiler. My core library was built with the old protocol, my new
library was to be built with the new protocol, and the two could not
interoperate for the brief period of time necessary to produce a
compiled version of the new library. There are several possible
approaches to solving this, but but one I took was the two step of
building a new 'old' library that can handle <b>both</b> protocols,
using it to compile a version that works only with the new protocol,
and then switching over completely. It was a mess, and a mess I
created myself with a macro that expanded into something that assumed
way too much. The better approach, the approach that I switched to, is
this:

```scheme
(define (call-with-values proc vals)
  (apply proc (%values->list vals)))

(defmacro (values-bind form vars . body)
  `(call-with-values (lambda ,vars ,@body) ,form))
```

This expands the above code to something more palatable:

```scheme
(call-with-values (lambda (arg-1 arg-2)
                     (+ arg-1 arg-2))
                  (returns-2-args 'foo))
```

The only assumption this makes in the compiled output is that there's
a function `call-with-values` that calls its first argument
with values passed in as its second argument. All of the gory details,
which could easily be the same three from my list, are hidden behind
function calls and dynamic linkage. This is actually the
representation that made the two-step cutover approach
plausible. Switching to this version of the `values-bind` macro
removed assumptions about the value protocol from every call site, and
made it easy to switch.

The upshot of this is something that's, I'm sure, pretty common
knowledge in Lisp/Scheme circles: macros are best when limited to
syntax, with the underlying functionality implemented in a more
functional interface. The functional interface keeps things more
decoupled, even when compiled, and leaves your software more
managable. It also provides a second way to 'get at' the functionality
provided by the underlying code. With the function/macro split, the
macro expansionn can be avoided entirely, in the case when you already
have a closure that contains the code you need to run.

One more brief example, a bit higher up the 'stack' in the
language environment is the transformation of this macro:

```scheme
(defmacro (with-output-to-string . code)
  (with-gensyms (saved-output-port-sym output-string-sym)
    `(let ((,saved-output-port-sym (current-output-port))
           (,output-string-sym (open-output-string)))
       (unwind-protect (lambda ()
                         (set-current-output-port ,output-string-sym)
                         ,@code
                         (get-output-string ,output-string-sym))
                       (lambda ()
                         (set-current-output-port ,saved-output-port-sym))))))
```

Into this macro/function pair:

```scheme
(define (call-with-output-to-string fn)
  (let ((saved-output-port (current-output-port))
        (output-string (open-output-string)))
    (unwind-protect (lambda ()
                      (set-current-output-port output-string)
                      (fn)
                      (get-output-string output-string))
                    (lambda ()
                      (set-current-output-port saved-output-port)))))

(defmacro (with-output-to-string . code)
  `(call-with-output-to-string (lambda () ,@code)))
```
