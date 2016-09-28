title: Anaphoric Macros in Emacs Lisp
date: 2012-05-30
filename: ./tech/emacs/anaphoric_macros.txt

In my Lisp programming, I find myself using <a
href="http://c2.com/cgi/wiki?AnaphoricLispMacros">Anaphoric Macros</a>
quite a bit.  My first exposure to this type of macro (and deliberate
variable capture) was in <a href="http://www.paulgraham.com/">Paul
Graham</a>'s <a href="http://www.paulgraham.com/onlisp.html">On
Lisp</a>. Since I haven't been able to find Emacs Lisp implementations
of these macos, I wrote my own.

The first of the two macros is an anaphoric version of the standard
`if` special form:

```lisp
(defmacro aif (test if-expr &optional else-expr)
  "An anaphoric variant of (if ...). The value of the test
expression is locally bound to 'it' during execution of the
consequent clauses. The binding is present in both consequent
branches."
  (declare (indent 1))
  `(let ((it ,test))
     (if it ,if-expr ,else-expr)))
```

The second macro is an anaphoric version of `while`:

```lisp
(defmacro awhile (test &rest body)
  "An anaphoric varient of (while ...). The value of the test
expression is locally bound to 'it' during execution of the body
of the loop."
  (declare (indent 1))
  (let ((escape (gensym "awhile-escape-")))
    `(catch ',escape
       (while t
         (let ((it ,test))
           (if it
               (progn ,@body)
             (throw ',escape ())))))))
```

What both of these macros have in common is that they emulate an
existing conditional special form, while adding a local binding that
makes it possible to access the result of the condition. This is
particularly useful in scenarios where a predicate function returns a
true value that contains useful information beyond `t` or
`nil`.
